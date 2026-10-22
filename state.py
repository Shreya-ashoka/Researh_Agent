"""Typed state shared by the LangGraph research workflow."""

import operator
from typing import Annotated, TypedDict


class Finding(TypedDict):
    question: str
    answer: str
    sources: list[str]


class ResearchState(TypedDict, total=False):
    topic: str
    sub_questions: list[str]
    question: str
    findings: Annotated[list[Finding], operator.add]
    draft_report: str
    review_decision: str
    review_feedback: str
    revision_count: int
    final_report: str
