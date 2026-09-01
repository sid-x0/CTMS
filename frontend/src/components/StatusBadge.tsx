"use client";

import React from "react";

interface StatusBadgeProps {
  status: string;
  type?: "study" | "site" | "participant" | "milestone";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = "study" }) => {
  let badgeStyle = "bg-slate-800 text-slate-300 border-slate-700";

  const lower = status.toLowerCase();

  if (lower.includes("recruiting") || lower.includes("enrolled") || lower.includes("active")) {
    badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  } else if (lower.includes("completed")) {
    badgeStyle = "bg-teal-500/10 text-teal-300 border-teal-500/30";
  } else if (lower.includes("pending") || lower.includes("draft") || lower.includes("screened")) {
    badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
  } else if (lower.includes("overdue") || lower.includes("suspended") || lower.includes("withdrawn") || lower.includes("failure")) {
    badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/30";
  } else if (lower.includes("ctri") || lower.includes("eligible") || lower.includes("randomized")) {
    badgeStyle = "bg-sky-500/10 text-sky-400 border-sky-500/30";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};
