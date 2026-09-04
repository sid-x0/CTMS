"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle, Clock, ChevronRight, RefreshCw,
  CheckCircle2, Users, Activity, ArrowRight,
} from "lucide-react";

interface DashboardViewProps {
  data: any;
  onNavigateTab: (tab: string, studyId?: number) => void;
  loading?: boolean;
  onRetry?: () => void;
}

/* ── helpers ──────────────────────────────────────────────────────────────── */
function riskColors(level: string) {
  switch (level) {
    case "CRITICAL": return { score: "text-red-700", badge: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-500", row: "bg-red-50" };
    case "HIGH":     return { score: "text-amber-700", badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500", row: "bg-amber-50" };
    case "MEDIUM":   return { score: "text-blue-700",  badge: "bg-blue-50 text-blue-700 border-blue-200",  bar: "bg-blue-400",  row: "bg-blue-50" };
    default:         return { score: "text-green-700", badge: "bg-green-50 text-green-700 border-green-200", bar: "bg-green-400", row: "" };
  }
}

function sevColors(sev: string) {
  switch (sev) {
    case "CRITICAL": return { border: "border-l-red-500",   bg: "bg-red-50",    badge: "bg-red-50 text-red-700 border-red-200" };
    case "HIGH":     return { border: "border-l-amber-500", bg: "bg-amber-50",  badge: "bg-amber-50 text-amber-700 border-amber-200" };
    default:         return { border: "border-l-blue-400",  bg: "bg-blue-50",   badge: "bg-blue-50 text-blue-800 border-blue-200" };
  }
}

function EnrollBar({ current, target, pct }: { current: number; target: number; pct: number }) {
  const color = pct >= 75 ? "bg-green-500" : pct >= 45 ? "bg-blue-500" : pct >= 20 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="font-semibold text-slate-700">{current}/{target}</span>
        <span className="text-slate-500">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export const DashboardView: React.FC<DashboardViewProps> = ({ data, onNavigateTab, loading, onRetry }) => {
  const router = useRouter();
  const [expandedRisk, setExpandedRisk] = useState<Set<number>>(new Set());

  const toggleRisk = (id: number) =>
    setExpandedRisk(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleTriageAction = (item: any) => {
    if (item.action_target === "safety")     router.push("/safety");
    else if (item.action_target === "milestones") router.push("/milestones");
    else if (item.action_target === "sites") router.push("/sites");
    else if (item.study_id)                  router.push(`/studies/${item.study_id}`);
    else onNavigateTab(item.action_target);
  };

  if (!data || !data.kpis) {
    if (loading === false) return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4 bg-white border border-slate-200 rounded-md p-12 text-center">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <p className="text-sm font-semibold text-slate-700">Failed to load dashboard data</p>
        {onRetry && <button onClick={onRetry} className="ctms-btn-secondary"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>}
      </div>
    );
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3 bg-white border border-slate-200 rounded-md p-12 text-center">
        <RefreshCw className="w-5 h-5 text-[#1e3a5f] animate-spin" />
        <p className="text-sm text-slate-500">Loading portfolio data…</p>
      </div>
    );
  }

  const { kpis, attention_required, studies, upcoming_deadlines } = data;
  const sortedStudies = [...(studies as any[])].sort((a, b) => {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const d = (order[a.risk?.risk_level] ?? 4) - (order[b.risk?.risk_level] ?? 4);
    return d !== 0 ? d : (b.risk?.score ?? 0) - (a.risk?.score ?? 0);
  });
  const attnSorted = [...(attention_required as any[])].sort((a, b) => {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });
  const studiesWithSAE = (studies as any[]).filter(s => s.open_safety_events > 0);

  return (
    <div className="space-y-5 max-w-7xl">

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ctms-page-title">Clinical Research Operations</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              AIIA · NPvCC portfolio · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              <span className="italic text-slate-400">Synthetic data prototype</span>
            </p>
          </div>
          <button onClick={onRetry} className="ctms-btn-ghost text-xs" aria-label="Refresh">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI STRIP ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Active Studies",
            value: kpis.active_studies ?? 0,
            sub: `of ${kpis.total_studies ?? 0} total`
          },
          {
            label: "Total Enrolled",
            value: (kpis.total_enrolled ?? 0).toLocaleString(),
            sub: `of ${(kpis.total_target_enrollment ?? kpis.total_target ?? 0).toLocaleString()} target`
          },
          {
            label: "Recruitment",
            value: `${kpis.overall_recruitment_percentage ?? kpis.overall_recruitment_pct ?? 0}%`,
            sub: "portfolio avg"
          },
          {
            label: "Open SAEs",
            value: kpis.open_safety_events ?? 0,
            sub: "under review",
            alert: (kpis.open_safety_events ?? 0) > 0
          },
          {
            label: "Overdue Milestones",
            value: kpis.overdue_milestones_count ?? kpis.overdue_milestones ?? 0,
            sub: "need action",
            alert: (kpis.overdue_milestones_count ?? kpis.overdue_milestones ?? 0) > 0
          },
        ].map(k => (
          <div key={k.label} className={`ctms-kpi ${k.alert ? "border-red-200 bg-red-50" : ""}`}>
            <div className={`ctms-kpi-value ${k.alert ? "text-red-700" : "text-[#0f172a]"}`}>{k.value}</div>
            <div className="ctms-kpi-label">{k.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── NEEDS ATTENTION ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Needs Attention</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {attnSorted.length} item{attnSorted.length !== 1 ? "s" : ""} requiring action · sorted by severity
            </p>
          </div>
          {attnSorted.length > 0 && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
              attnSorted[0]?.severity === "CRITICAL" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {attnSorted.filter(i => i.severity === "CRITICAL").length} critical
            </span>
          )}
        </div>

        {attnSorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            No attention items — all studies within operating parameters
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {attnSorted.map((item: any, idx: number) => {
              const sc = sevColors(item.severity);
              return (
                <div key={idx} className={`px-4 py-3 border-l-2 ${sc.border} grid grid-cols-12 gap-3 items-start hover:bg-slate-50 transition-colors`}>
                  <div className="col-span-1 pt-0.5">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${sc.badge}`}>
                      {item.severity.slice(0, 4)}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <p className="text-[11px] font-semibold text-slate-700">{item.study_protocol}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.study_name}</p>
                  </div>
                  <div className="col-span-4">
                    <p className="text-xs font-medium text-slate-800">{item.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{item.evidence}</p>
                  </div>
                  <div className="col-span-2 text-[10px] text-slate-500">
                    <p className="font-medium text-slate-600">{item.responsible_role}</p>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => handleTriageAction(item)}
                      className="ctms-btn-secondary text-[10px] py-1 px-2"
                      aria-label={`Act on: ${item.title}`}
                    >
                      {item.recommended_action} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PORTFOLIO TABLE ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Study Portfolio</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">All protocols · sorted by risk score</p>
          </div>
          <button onClick={() => onNavigateTab("studies")} className="ctms-btn-ghost text-[11px]">
            All Studies <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="ctms-table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Study</th>
                <th>Phase</th>
                <th>Sites</th>
                <th>Enrollment</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedStudies.map((s: any) => {
                const rc = riskColors(s.risk?.risk_level);
                const isHighest = s.risk?.risk_level === "CRITICAL";
                return (
                  <tr key={s.id} className={isHighest ? "bg-red-50" : ""}>
                    <td className="font-mono text-[11px] font-semibold text-[#1e3a5f]">{s.protocol_number}</td>
                    <td>
                      <p className="text-xs font-medium text-slate-800 max-w-[220px] truncate">{s.short_title}</p>
                      <p className="text-[10px] text-slate-400">{s.principal_investigator}</p>
                    </td>
                    <td><span className="ctms-badge-neutral">{s.phase}</span></td>
                    <td className="text-slate-600">{s.site_count ?? "—"}</td>
                    <td className="min-w-[130px]">
                      <EnrollBar current={s.current_enrollment ?? 0} target={s.target_enrollment ?? 0} pct={s.recruitment_percentage ?? 0} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-base font-black font-mono ${rc.score}`}>{s.risk?.score ?? "—"}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${rc.badge}`}>
                          {s.risk?.risk_level}
                        </span>
                      </div>
                      {/* factor bars */}
                      {expandedRisk.has(s.id) && s.risk?.factors && (
                        <div className="mt-2 space-y-1 min-w-[160px]">
                          {Object.entries(s.risk.factors).map(([k, v]: [string, any]) => (
                            <div key={k} className="flex items-center gap-2 text-[10px]">
                              <span className="w-20 truncate text-slate-500 capitalize">{k.replace(/_/g," ")}</span>
                              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full ${rc.bar} rounded-full`} style={{ width: `${Math.min(100, v)}%` }} />
                              </div>
                              <span className="w-5 text-right text-slate-600">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${
                        s.status?.toLowerCase().includes("recruit") ? "bg-green-50 text-green-700 border-green-200" :
                        s.status?.toLowerCase().includes("complet") ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>{s.status}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleRisk(s.id)} className="ctms-btn-ghost py-1 px-2 text-[10px]">
                          {expandedRisk.has(s.id) ? "▲" : "▼"}
                        </button>
                        <button onClick={() => router.push(`/studies/${s.id}`)} className="ctms-btn-secondary py-1 px-2 text-[10px]">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ENROLLMENT + SAFETY + UPCOMING ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Enrollment summary */}
        <div className="bg-white border border-slate-200 rounded-md shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-800">Enrollment Performance</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {sortedStudies.map((s: any) => (
              <div key={s.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-semibold text-[#1e3a5f]">{s.protocol_number}</span>
                  <span className="text-[10px] text-slate-500">{s.recruitment_percentage ?? 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(s.recruitment_percentage ?? 0) >= 75 ? "bg-green-500" : (s.recruitment_percentage ?? 0) >= 45 ? "bg-blue-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, s.recruitment_percentage ?? 0)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.current_enrollment ?? 0} / {s.target_enrollment} enrolled</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safety snapshot */}
        <div className="bg-white border border-slate-200 rounded-md shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Safety Snapshot</h2>
            <button onClick={() => onNavigateTab("safety")} className="text-[10px] text-[#1e3a5f] hover:underline">View all</button>
          </div>
          {studiesWithSAE.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              No open SAEs across portfolio
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {studiesWithSAE.map((s: any) => (
                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-mono font-semibold text-[#1e3a5f]">{s.protocol_number}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{s.short_title}</p>
                  </div>
                  <span className="ctms-badge-critical">{s.open_safety_events} open SAE</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming milestones */}
        <div className="bg-white border border-slate-200 rounded-md shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Upcoming Milestones</h2>
            <button onClick={() => onNavigateTab("milestones")} className="text-[10px] text-[#1e3a5f] hover:underline">View all</button>
          </div>
          {(!upcoming_deadlines || upcoming_deadlines.length === 0) ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">No upcoming milestones</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(upcoming_deadlines as any[]).slice(0, 6).map((m: any, i: number) => {
                const overdue = m.planned_date < new Date().toISOString().split("T")[0];
                return (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{m.planned_date}</p>
                    </div>
                    {overdue
                      ? <span className="ctms-badge-critical flex-shrink-0">Overdue</span>
                      : <span className="ctms-badge-warning flex-shrink-0">Due</span>
                    }
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
