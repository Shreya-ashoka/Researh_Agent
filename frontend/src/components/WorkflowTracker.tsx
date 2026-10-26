"use client";

import React from "react";

const STEPS = [
  { key: "planner", label: "Planning", icon: "🗺️", desc: "Breaking topic into sub-questions" },
  { key: "researcher", label: "Researching", icon: "🔍", desc: "Investigating each question" },
  { key: "writer", label: "Writing", icon: "✍️", desc: "Drafting the report" },
  { key: "reviewer", label: "Reviewing", icon: "👀", desc: "Waiting for your feedback" },
  { key: "publisher", label: "Published", icon: "🎉", desc: "Report is ready!" },
];

type Props = {
  currentStep: string;
  status: string;
};

export default function WorkflowTracker({ currentStep, status }: Props) {
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "1.5rem" }}>
      {STEPS.map((step, i) => {
        const isActive = step.key === currentStep;
        const isDone = i < stepIndex || status === "published";
        const isPending = i > stepIndex && status !== "published";

        return (
          <div
            key={step.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "10px",
              background: isActive ? "var(--accent-glow)" : "transparent",
              border: isActive ? "1px solid var(--accent)" : "1px solid transparent",
              opacity: isPending ? 0.4 : 1,
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                background: isDone
                  ? "var(--success)"
                  : isActive
                  ? "var(--accent)"
                  : "var(--border)",
                color: isDone || isActive ? "#fff" : "var(--text-dim)",
                flexShrink: 0,
              }}
            >
              {isDone ? "✓" : step.icon}
            </div>
            <div>
              <div
                style={{
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.9rem",
                  color: isActive ? "var(--text)" : isDone ? "var(--success)" : "var(--text-dim)",
                }}
              >
                {step.label}
              </div>
              {isActive && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 2 }}>
                  {step.desc}
                </div>
              )}
            </div>
            {isActive && status !== "published" && (
              <div
                style={{
                  marginLeft: "auto",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  animation: "pulse 1.5s infinite",
                }}
              />
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
