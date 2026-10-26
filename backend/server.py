"""FastAPI server exposing the LangGraph research agent over HTTP."""

import uuid
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from pydantic import BaseModel

from graph import build_graph

# ── In-memory checkpointer (swap for SqliteSaver for persistence) ────────
checkpointer = MemorySaver()
app_graph = build_graph(checkpointer)
run_topics: dict[str, str] = {}
run_errors: dict[str, str] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="LangGraph Research Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ────────────────────────────────────────────
class StartRequest(BaseModel):
    topic: str


class StartResponse(BaseModel):
    thread_id: str
    status: str
    step: str
    data: dict


class ReviewRequest(BaseModel):
    thread_id: str
    decision: str  # approve | revise | research_more
    feedback: str = ""


class StatusResponse(BaseModel):
    thread_id: str
    status: str  # planning | researching | writing | reviewing | published | error
    step: str
    data: dict


# ── Helpers ──────────────────────────────────────────────────────────────
def _get_status(thread_id: str) -> StatusResponse:
    """Inspect the graph state and return a structured status."""
    config = {"configurable": {"thread_id": thread_id}}
    if thread_id in run_errors:
        return StatusResponse(
            thread_id=thread_id,
            status="error",
            step="error",
            data={"topic": run_topics.get(thread_id, ""), "error": run_errors[thread_id]},
        )

    try:
        snapshot = app_graph.get_state(config)
    except Exception:
        if thread_id in run_topics:
            return StatusResponse(
                thread_id=thread_id,
                status="running",
                step="planner",
                data={"topic": run_topics[thread_id], "sub_questions": [], "findings": []},
            )
        raise HTTPException(404, f"Thread {thread_id} not found")

    values = snapshot.values
    if not values:
        if thread_id in run_topics:
            return StatusResponse(
                thread_id=thread_id,
                status="running",
                step="planner",
                data={"topic": run_topics[thread_id], "sub_questions": [], "findings": []},
            )
        raise HTTPException(404, f"Thread {thread_id} not found")

    # Check for pending interrupt (human review)
    for task in snapshot.tasks:
        if task.interrupts:
            review_data = task.interrupts[0].value
            return StatusResponse(
                thread_id=thread_id,
                status="reviewing",
                step="reviewer",
                data={
                    "topic": values.get("topic", ""),
                    "draft_report": values.get("draft_report", ""),
                    "revision_count": values.get("revision_count", 0),
                    "findings": values.get("findings", []),
                    "sub_questions": values.get("sub_questions", []),
                },
            )

    # Check if published
    if values.get("final_report"):
        return StatusResponse(
            thread_id=thread_id,
            status="published",
            step="publisher",
            data={
                "topic": values.get("topic", ""),
                "final_report": values.get("final_report", ""),
                "findings": values.get("findings", []),
                "sub_questions": values.get("sub_questions", []),
                "revision_count": values.get("revision_count", 0),
            },
        )

    # Still running
    current_step = "planner"
    for node in ("planner", "researcher", "writer", "reviewer", "publisher"):
        if node in snapshot.next:
            current_step = node
            break
    else:
        if values.get("draft_report"):
            current_step = "reviewer"
        elif values.get("findings"):
            current_step = "writer"

    return StatusResponse(
        thread_id=thread_id,
        status="running",
        step=current_step,
        data={
            "topic": values.get("topic", ""),
            "sub_questions": values.get("sub_questions", []),
            "findings": values.get("findings", []),
        },
    )


def _run_research(thread_id: str, topic: str) -> None:
    """Run the graph outside the request so clients can poll its progress."""
    config = {"configurable": {"thread_id": thread_id}, "max_concurrency": 3}
    try:
        app_graph.invoke(
            {"topic": topic, "findings": [], "revision_count": 0},
            config,
        )
    except Exception as error:
        run_errors[thread_id] = str(error)


# ── Routes ───────────────────────────────────────────────────────────────
@app.post("/api/research/start", response_model=StatusResponse)
def start_research(req: StartRequest, background_tasks: BackgroundTasks):
    """Start a new research thread. Runs until it hits the reviewer interrupt."""
    if not req.topic.strip():
        raise HTTPException(400, "Topic is required")

    thread_id = uuid.uuid4().hex[:12]
    topic = req.topic.strip()
    run_topics[thread_id] = topic
    background_tasks.add_task(_run_research, thread_id, topic)
    return _get_status(thread_id)


@app.post("/api/research/review", response_model=StatusResponse)
def submit_review(req: ReviewRequest):
    """Submit a human review decision for a paused thread."""
    if req.decision not in ("approve", "revise", "research_more"):
        raise HTTPException(400, "Decision must be approve, revise, or research_more")
    if req.decision != "approve" and not req.feedback.strip():
        raise HTTPException(400, "Feedback is required for revise or research_more")

    config = {"configurable": {"thread_id": req.thread_id}, "max_concurrency": 3}

    try:
        app_graph.invoke(
            Command(resume={"decision": req.decision, "feedback": req.feedback.strip()}),
            config,
        )
    except Exception as e:
        raise HTTPException(500, f"Agent error: {e}")

    return _get_status(req.thread_id)


@app.get("/api/research/{thread_id}", response_model=StatusResponse)
def get_research_status(thread_id: str):
    """Get the current status of a research thread."""
    return _get_status(thread_id)


@app.get("/api/health")
def health():
    return {"status": "ok", "agent": "langgraph-research-agent"}
