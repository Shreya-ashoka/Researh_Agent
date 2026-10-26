"use client";

import React, { useState } from "react";

type Props = {
  onSubmit: (decision: string, feedback: string) => void;
  loading: boolean;
};

export default function ReviewPanel({ onSubmit, loading }: Props) {
  const [decision, setDecision] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (!decision) return;
    if (decision !== "approve" && !feedback.trim()) return;
    onSubmit(decision, feedback);
    setDecision(null);
    setFeedback("");
  };

  const buttons = [
    { key: "approve", label: "✅ Approve & Publish", color: "var(--success)" },
    { key: "revise", label: "✏️ Revise", color: "var(--warning)" },
    { key: "research_more", label: "🔍 Dig Deeper", color: "var(--accent)" },
  ];

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.5rem",
      }}
    >
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
        What would you like to do?
      </h3>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1rem" }}>
        {buttons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setDecision(btn.key)}
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: decision === btn.key ? `2px solid ${btn.color}` : "2px solid var(--border)",
              background: decision === btn.key ? `${btn.color}20` : "transparent",
              color: decision === btn.key ? btn.color : "var(--text-dim)",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {decision && decision !== "approve" && (
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={
            decision === "revise"
              ? "What should be revised in the report?"
              : "What topic should the agent research more?"
          }
          disabled={loading}
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: "0.875rem",
            resize: "vertical",
            outline: "none",
            marginBottom: "1rem",
          }}
        />
      )}

      {decision && (
        <button
          onClick={handleSubmit}
          disabled={loading || (decision !== "approve" && !feedback.trim())}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: loading ? "var(--border)" : "var(--accent)",
            color: "#fff",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Processing..." : "Submit"}
        </button>
      )}
    </div>
  );
}
