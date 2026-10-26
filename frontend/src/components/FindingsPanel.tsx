"use client";

import React, { useState } from "react";

type Finding = {
  question: string;
  answer: string;
  sources: string[];
};

type Props = {
  findings: Finding[];
  subQuestions: string[];
};

export default function FindingsPanel({ findings, subQuestions }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!findings.length && !subQuestions.length) return null;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600 }}>
          🔍 Research ({findings.length}/{subQuestions.length} questions answered)
        </h3>
      </div>

      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {subQuestions.map((q, i) => {
          const finding = findings.find((f) => f.question === q);
          const isExpanded = expandedIndex === i;

          return (
            <div
              key={i}
              style={{
                borderBottom: "1px solid var(--border)",
              }}
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                style={{
                  width: "100%",
                  padding: "12px 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.85rem",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    background: finding ? "var(--success)" : "var(--border)",
                    color: finding ? "#fff" : "var(--text-dim)",
                    flexShrink: 0,
                  }}
                >
                  {finding ? "✓" : i + 1}
                </span>
                <span style={{ flex: 1 }}>{q}</span>
                <span
                  style={{
                    transform: isExpanded ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                    color: "var(--text-dim)",
                  }}
                >
                  ▾
                </span>
              </button>

              {isExpanded && finding && (
                <div
                  style={{
                    padding: "0 1.25rem 1rem",
                    fontSize: "0.85rem",
                    lineHeight: 1.6,
                    color: "var(--text-dim)",
                  }}
                >
                  <p>{finding.answer}</p>
                  {finding.sources.length > 0 && (
                    <div style={{ marginTop: "0.75rem", fontSize: "0.8rem" }}>
                      <strong style={{ color: "var(--text)" }}>Sources:</strong>
                      <ul style={{ paddingLeft: "1.25rem", marginTop: "0.25rem" }}>
                        {finding.sources.map((s, j) => (
                          <li key={j}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
