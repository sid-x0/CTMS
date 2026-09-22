"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuditLogsView } from "@/components/views/AuditLogsView";

function AuditContent() {
  const searchParams = useSearchParams();
  return <AuditLogsView initialEntityType={searchParams.get("entity") || ""} />;
}

export default function AuditPage() {
  return <Suspense fallback={<div className="text-sm text-slate-400">Loading audit trail…</div>}><AuditContent /></Suspense>;
}
