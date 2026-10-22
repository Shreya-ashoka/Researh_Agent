"""CLI for the checkpointed LangGraph research agent."""

import argparse
from pathlib import Path
import uuid

try:
    from langgraph.checkpoint.sqlite import SqliteSaver
    from langgraph.types import Command
except ModuleNotFoundError as error:
    if error.name and error.name.startswith("langgraph"):
        raise SystemExit(
            "LangGraph is required to run this application. Install dependencies "
            "with: python -m pip install -r requirements.txt"
        ) from error
    raise

from graph import build_graph


CHECKPOINT_DB = Path(__file__).resolve().with_name("research_checkpoints.sqlite")


def _pending_review(app, config):
    snapshot = app.get_state(config)
    for task in snapshot.tasks:
        if task.interrupts:
            return task.interrupts[0].value
    return None


def _collect_review(review: dict) -> dict:
    print("\n" + "=" * 70)
    print(f"REPORT FOR REVIEW: {review['topic']}")
    print("=" * 70)
    print(review["draft_report"])
    print("=" * 70)
    print(f"Revision #{review['revision_count']}")
    print("[a] Approve and publish")
    print("[r] Revise with feedback")
    print("[d] Research another question")

    choices = {"a": "approve", "r": "revise", "d": "research_more"}
    while True:
        choice = input("Choose a/r/d: ").strip().lower()
        if choice in choices:
            break
        print("Enter a, r, or d.")

    decision = choices[choice]
    feedback = ""
    if decision != "approve":
        prompt = (
            "What should be revised? "
            if decision == "revise"
            else "What should the agent research? "
        )
        while not feedback:
            feedback = input(prompt).strip()
    return {"decision": decision, "feedback": feedback}


def _continue_reviews(app, config) -> None:
    while True:
        review = _pending_review(app, config)
        if review is None:
            return
        decision = _collect_review(review)
        app.invoke(Command(resume=decision), config)


def main() -> None:
    parser = argparse.ArgumentParser(description="Research a topic with local Ollama.")
    parser.add_argument("topic", nargs="*", help="research topic")
    parser.add_argument(
        "--resume",
        metavar="THREAD_ID",
        help="resume a saved research run paused for review",
    )
    args = parser.parse_args()

    topic = " ".join(args.topic).strip()
    if args.resume and topic:
        parser.error("provide a topic for a new run or --resume, not both")
    if not args.resume and not topic:
        topic = input("What would you like to research? ").strip()
    if not args.resume and not topic:
        parser.error("a research topic is required")

    thread_id = args.resume or uuid.uuid4().hex
    config = {"configurable": {"thread_id": thread_id}, "max_concurrency": 3}
    print(f"Research run: {thread_id}")

    with SqliteSaver.from_conn_string(str(CHECKPOINT_DB)) as checkpointer:
        app = build_graph(checkpointer)
        if args.resume:
            if _pending_review(app, config) is None:
                parser.error(f"thread {thread_id} has no pending review to resume")
        else:
            print(f"\nStarting research on: {topic}\n")
            app.invoke(
                {
                    "topic": topic,
                    "findings": [],
                    "revision_count": 0,
                },
                config,
            )

        try:
            _continue_reviews(app, config)
        except KeyboardInterrupt:
            print(
                f"\nReview paused. Resume it with:\n"
                f"  python main.py --resume {thread_id}"
            )
            return

        final_state = app.get_state(config).values
        if final_state.get("final_report"):
            print(
                "\nResearch complete. Final report length:",
                len(final_state["final_report"]),
                "characters.",
            )
            print(f"Checkpoint database: {CHECKPOINT_DB}")


if __name__ == "__main__":
    main()
