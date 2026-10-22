"""LangGraph workflow with parallel research and interruptible review."""

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from nodes import (
    planner_node,
    publisher_node,
    researcher_node,
    reviewer_node,
    writer_node,
)
from state import ResearchState


def dispatch_research(state: ResearchState) -> list[Send]:
    """Fan out one independent research task per planned question."""
    return [
        Send("researcher", {"topic": state["topic"], "question": question})
        for question in state["sub_questions"]
    ]


def route_after_review(state: ResearchState) -> str | list[Send]:
    """Route approval, revision, or more research after human review."""
    decision = state["review_decision"]
    if decision == "approve":
        return "publisher"
    if decision == "revise":
        if state.get("revision_count", 0) >= 3:
            print("Maximum revisions reached; publishing the current draft.")
            return "publisher"
        return "writer"
    if decision == "research_more":
        return [
            Send(
                "researcher",
                {
                    "topic": state["topic"],
                    "question": state["review_feedback"],
                },
            )
        ]
    raise ValueError(f"Unsupported review decision: {decision}")


def build_graph(checkpointer=None):
    """Build the compiled, checkpointable research graph."""
    workflow = StateGraph(ResearchState)
    workflow.add_node("planner", planner_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("writer", writer_node)
    workflow.add_node("reviewer", reviewer_node)
    workflow.add_node("publisher", publisher_node)

    workflow.add_edge(START, "planner")
    workflow.add_conditional_edges("planner", dispatch_research)
    workflow.add_edge("researcher", "writer")
    workflow.add_edge("writer", "reviewer")
    workflow.add_conditional_edges("reviewer", route_after_review)
    workflow.add_edge("publisher", END)
    return workflow.compile(checkpointer=checkpointer)
