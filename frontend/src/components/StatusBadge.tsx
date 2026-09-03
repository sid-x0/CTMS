"use client";

import React from "react";

interface StatusBadgeProps {
  status: string;
  type?: "study" | "site" | "participant" | "milestone";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const lower = status.toLowerCase();
  let cls = "bg-slate-100 text-slate-600 border-slate-200";

  if (lower.includes("recruiting") || lower.includes("active") || lower.includes("enrolled")) {
    cls = "bg-green-50 text-green-700 border-green-200";
  } else if (lower.includes("completed")) {
    cls = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (
    lower.includes("pending") || lower.includes("draft") ||
    lower.includes("screened") || lower.includes("in progress")
  ) {
    cls = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (
    lower.includes("overdue") || lower.includes("suspended") ||
    lower.includes("withdrawn") || lower.includes("failure") ||
    lower.includes("screen failure")
  ) {
    cls = "bg-red-50 text-red-700 border-red-200";
  } else if (lower.includes("eligible") || lower.includes("randomized") || lower.includes("ctri")) {
    cls = "bg-slate-100 text-slate-700 border-slate-200";
  } else if (lower.includes("reported") || lower.includes("under review")) {
    cls = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (lower.includes("closed")) {
    cls = "bg-slate-100 text-slate-500 border-slate-200";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${cls}`}>
      {status}
    </span>
  );
};
