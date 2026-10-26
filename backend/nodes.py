"""Research workflow nodes and direct client for the local Ollama HTTP API."""

import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from langgraph.types import interrupt

from state import Finding, ResearchState


class OllamaClient:
    def __init__(self) -> None:
        self.model = os.getenv("OLLAMA_MODEL", "llama3")
        self.endpoint = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")

    def invoke(
        self,
        prompt: str,
        response_format: str | dict[str, object] | None = None,
    ) -> str:
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {"temperature": 0.3},
        }
        if response_format is not None:
            payload["format"] = response_format
        request = Request(
            f"{self.endpoint}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=300) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Ollama returned HTTP {error.code}: {details}") from error
        except URLError as error:
            raise RuntimeError(
                "Could not connect to Ollama. Start Ollama and confirm it is "
                f"available at {self.endpoint}."
            ) from error

        try:
            content = payload["message"]["content"]
        except (KeyError, TypeError) as error:
            raise ValueError("Ollama returned an unexpected chat response.") from error
        if not isinstance(content, str):
            raise TypeError("Ollama response message content must be text.")
        return content


def _safe_json_loads(text: str) -> object:
    text = text.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline == -1:
            raise ValueError("Ollama returned an incomplete Markdown code fence.")
        text = text[first_newline + 1:].strip()
        if text.endswith("```"):
            text = text[:-3].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as original_error:
        for opening, closing in (("[", "]"), ("{", "}")):
            start = text.find(opening)
            end = text.rfind(closing)
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start:end + 1])
                except json.JSONDecodeError:
                    continue
        raise ValueError(
            f"Ollama response did not contain valid JSON: {original_error.msg} "
            f"(line {original_error.lineno}, column {original_error.colno})."
        ) from original_error


def get_llm() -> OllamaClient:
    return OllamaClient()


def planner_node(state: ResearchState) -> dict:
    topic = state["topic"]
    response = get_llm().invoke(
        f"""Break this research topic into 3-5 distinct, focused sub-questions.
Return ONLY a JSON array of strings, with no markdown.

Topic: {topic}

Example: ["What is X?", "How does X work?", "What are its limitations?"]""",
        response_format={
            "type": "array",
            "items": {"type": "string"},
        },
    )
    questions = _safe_json_loads(response)
    if not isinstance(questions, list) or not questions or not all(
        isinstance(question, str) and question.strip() for question in questions
    ):
        raise ValueError("Planner response must be a non-empty JSON array of strings.")

    print(f"\nPlanner created {len(questions)} research questions.")
    for index, question in enumerate(questions, 1):
        print(f"  {index}. {question}")
    return {"sub_questions": questions}


def researcher_node(state: ResearchState) -> dict:
    question = state["question"]
    response = get_llm().invoke(
        f"""Research this question thoroughly. Give a concise, factual answer
with useful details and examples. Return ONLY a JSON object with the keys
"question", "answer", and "sources" (an array of source names or URLs).

Question: {question}

Example: {{"question":"...","answer":"...","sources":["..."]}}""",
        response_format={
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "answer": {"type": "string"},
                "sources": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": ["question", "answer", "sources"],
        },
    )
    finding = _safe_json_loads(response)
    if not isinstance(finding, dict):
        raise ValueError("Researcher response must be a JSON object.")
    if not isinstance(finding.get("answer"), str):
        raise ValueError("Researcher response is missing its string 'answer' field.")

    sources = finding.get("sources", [])
    if not isinstance(sources, list) or not all(isinstance(source, str) for source in sources):
        raise ValueError("Researcher response 'sources' must be an array of strings.")
    normalized: Finding = {
        "question": question,
        "answer": finding["answer"],
        "sources": sources,
    }
    print(f"  Research complete: {question[:75]}")
    return {"findings": [normalized]}


def writer_node(state: ResearchState) -> dict:
    revision_count = state.get("revision_count", 0)
    feedback = state.get("review_feedback", "")
    question_positions = {
        question: index
        for index, question in enumerate(state.get("sub_questions", []))
    }
    findings = sorted(
        enumerate(state.get("findings", [])),
        key=lambda item: (
            question_positions.get(item[1]["question"], len(question_positions)),
            item[0],
        ),
    )
    ordered_findings = [finding for _, finding in findings]
    revision_instruction = ""
    if state.get("review_decision") == "revise":
        revision_count += 1
        revision_instruction = f"""
Revise the previous draft using this reviewer feedback:
{feedback}

Previous draft:
{state.get("draft_report", "")}
"""

    response = get_llm().invoke(
        f"""Write a clear, well-structured Markdown research report.
Include a title, executive summary, sections synthesizing the findings,
conclusion, and sources. Clearly distinguish sourced facts from uncertainty.

Topic: {state["topic"]}

Research findings:
{json.dumps(ordered_findings, ensure_ascii=False, indent=2)}

{revision_instruction}"""
    )
    if not response.strip():
        raise ValueError("Writer returned an empty report.")
    print(f"\nDraft ready ({len(response)} characters).")
    return {"draft_report": response, "revision_count": revision_count}


def reviewer_node(state: ResearchState) -> dict:
    decision = interrupt(
        {
            "type": "human_review",
            "topic": state["topic"],
            "draft_report": state["draft_report"],
            "revision_count": state.get("revision_count", 0),
            "choices": ["approve", "revise", "research_more"],
        }
    )
    if not isinstance(decision, dict):
        raise ValueError("Review resume data must be an object.")
    choice = decision.get("decision")
    if choice not in {"approve", "revise", "research_more"}:
        raise ValueError("Review decision must be approve, revise, or research_more.")
    feedback = decision.get("feedback", "")
    if not isinstance(feedback, str):
        raise ValueError("Review feedback must be text.")
    if choice != "approve" and not feedback.strip():
        raise ValueError("Feedback is required for revise or research_more.")
    return {"review_decision": choice, "review_feedback": feedback.strip()}


def publisher_node(state: ResearchState) -> dict:
    report = state["draft_report"]
    topic_slug = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", state["topic"][:60])
    topic_slug = topic_slug.strip(" ._").replace(" ", "_").lower() or "research"
    filename = f"report_{topic_slug}.md"

    with open(filename, "w", encoding="utf-8") as report_file:
        report_file.write(report)
    print(f"\nReport published to {filename}")
    return {"final_report": report}
