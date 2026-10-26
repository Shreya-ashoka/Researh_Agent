"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import WorkflowTracker from "@/components/WorkflowTracker";
import ReviewPanel from "@/components/ReviewPanel";
import FindingsPanel from "@/components/FindingsPanel";

type ResearchData = {
  thread_id: string;
  status: string;
  step: string;
  data: {
    topic?: string;
    sub_questions?: string[];
    findings?: { question: string; answer: string; sources: string[] }[];
    draft_report?: string;
    final_report?: string;
    revision_count?: number;
    error?: string;
  };
};

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [error, setError] = useState("");

  const pollResearch = async (initial: ResearchData) => {
    let current = initial;
    while (current.status === "running") {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 900));
      const res = await fetch(`/api/research/${current.thread_id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      current = await res.json();
      setResearch(current);
    }
    if (current.status === "error") {
      setError(current.data.error || "Research failed");
    }
  };

  const startResearch = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setResearch(null);

    try {
      const res = await fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResearch(data);
      await pollResearch(data);
    } catch (e: any) {
      setError(e.message || "Failed to start research");
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (decision: string, feedback: string) => {
    if (!research) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/research/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: research.thread_id,
          decision,
          feedback,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResearch(data);
    } catch (e: any) {
      setError(e.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setTopic("");
    setResearch(null);
    setError("");
  };

  const report = research?.data?.final_report || research?.data?.draft_report;
  const subQuestions = research?.data?.sub_questions || [];
  const findings = research?.data?.findings || [];
  const activity = [
    ...(subQuestions.length
      ? [
          `Planner created ${subQuestions.length} research questions.`,
          ...subQuestions.map((question, index) => `${index + 1}. ${question}`),
        ]
      : []),
    ...findings.map((finding) => `Research complete: ${finding.question}`),
    ...(research?.data?.draft_report ? ["Draft ready for review."] : []),
    ...(research?.status === "published" ? ["Report published."] : []),
  ];
  const currentActivity =
    research?.status === "running"
      ? research.step === "planner"
        ? "Planning research questions..."
        : research.step === "researcher"
          ? `Researching questions (${findings.length}/${subQuestions.length})...`
          : research.step === "writer"
            ? "Writing the report..."
            : "Agent is working..."
      : "";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--accent), #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
            }}
          >
            🔬
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700 }}>LangGraph Research Agent</h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              AI-powered multi-step research assistant
            </p>
          </div>
        </div>
        {research && (
          <button
            onClick={resetAll}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            New Research
          </button>
        )}
      </header>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex" }}>
        {/* If no research yet — show landing */}
        {!research && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
            }}
          >
            <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔬</div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Research any topic
              </h2>
              <p
                style={{
                  color: "var(--text-dim)",
                  marginBottom: "2rem",
                  lineHeight: 1.6,
                }}
              >
                The AI agent will plan sub-questions, research each one, write a
                report, and let you review and refine it — all powered by your
                local Ollama LLM.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "6px",
                }}
              >
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startResearch()}
                  placeholder="e.g. How does RAG work in LLMs?"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text)",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
                <button
                  onClick={startResearch}
                  disabled={loading || !topic.trim()}
                  style={{
                    padding: "12px 28px",
                    borderRadius: "8px",
                    border: "none",
                    background: loading ? "var(--border)" : "var(--accent)",
                    color: "#fff",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading ? "Starting..." : "Research →"}
                </button>
              </div>

              {error && (
                <p
                  style={{
                    color: "var(--error)",
                    marginTop: "1rem",
                    fontSize: "0.85rem",
                  }}
                >
                  ⚠️ {error}
                </p>
              )}

              {/* How it works */}
              <div
                style={{
                  marginTop: "3rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "12px",
                  textAlign: "center",
                }}
              >
                {[
                  { icon: "🗺️", label: "Plan" },
                  { icon: "🔍", label: "Research" },
                  { icon: "✍️", label: "Write" },
                  { icon: "👀", label: "Review" },
                  { icon: "🎉", label: "Publish" },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "1rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                      {s.icon}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Research in progress */}
        {research && (
          <>
            {/* Left sidebar — workflow tracker */}
            <aside
              style={{
                width: 280,
                borderRight: "1px solid var(--border)",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  RESEARCHING
                </div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    marginTop: "4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {research.data.topic}
                </div>
              </div>
              <WorkflowTracker currentStep={research.step} status={research.status} />

              <div style={{ flex: 1 }} />

              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderTop: "1px solid var(--border)",
                  fontSize: "0.75rem",
                  color: "var(--text-dim)",
                }}
              >
                Thread: {research.thread_id}
              </div>
            </aside>

            {/* Main area */}
            <main
              style={{
                flex: 1,
                padding: "2rem",
                overflowY: "auto",
                maxHeight: "calc(100vh - 60px)",
              }}
            >
              <div style={{ maxWidth: 800, margin: "0 auto" }}>
                {error && (
                  <div
                    style={{
                      padding: "1rem",
                      background: `${("var(--error)")}15`,
                      border: "1px solid var(--error)",
                      borderRadius: "8px",
                      color: "var(--error)",
                      fontSize: "0.85rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    ⚠️ {error}
                  </div>
                )}

                <section
                  aria-live="polite"
                  style={{
                    marginBottom: "1.5rem",
                    padding: "1rem 1.25rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Agent activity
                  </h3>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1.25rem",
                      color: "var(--text-dim)",
                      fontSize: "0.85rem",
                      lineHeight: 1.7,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {activity.map((message, index) => (
                      <li key={`${index}-${message}`}>{message}</li>
                    ))}
                    {currentActivity && <li>{currentActivity}</li>}
                  </ul>
                </section>

                {/* Findings accordion */}
                <FindingsPanel
                  findings={findings}
                  subQuestions={subQuestions}
                />

                {/* Draft/Final report */}
                {report && (
                  <div
                    style={{
                      marginTop: "1.5rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "1rem 1.25rem",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <h3 style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                        {research.status === "published"
                          ? "🎉 Final Report"
                          : `📄 Draft Report (Revision #${research.data.revision_count || 0})`}
                      </h3>
                      {research.status === "published" && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            background: "var(--success)",
                            color: "#fff",
                          }}
                        >
                          Published
                        </span>
                      )}
                    </div>
                    <div className="markdown-content" style={{ padding: "1.5rem" }}>
                      <ReactMarkdown>{report}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Review panel */}
                {research.status === "reviewing" && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <ReviewPanel onSubmit={submitReview} loading={loading} />
                  </div>
                )}

                {/* Loading indicator */}
                {loading && (
                  <div
                    style={{
                      marginTop: "1.5rem",
                      textAlign: "center",
                      padding: "2rem",
                      color: "var(--text-dim)",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        border: "3px solid var(--border)",
                        borderTopColor: "var(--accent)",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        margin: "0 auto 1rem",
                      }}
                    />
                    <p>Agent is working...</p>
                    <style>{`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                    `}</style>
                  </div>
                )}
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  );
}
