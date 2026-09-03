"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Users,
  FlaskConical,
  ChevronRight,
  RefreshCw,
  Info,
  Lightbulb,
  Activity,
  TrendingDown,
  Shield,
  FileText,
  BookOpen,
  Eye,
} from "lucide-react";

interface DashboardViewProps {
  data: any;
  onNavigateTab: (tab: string, studyId?: number) => void;
  loading?: boolean;
  onRetry?: () => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const SEVERITY_META: Record<string, { bg: string; border: string; text: string; badge: string; dot: string; label: string }> = {
  CRITICAL: {
    bg: "bg-rose-950/25",
    border: "border-rose-600/50",
    text: "text-rose-300",
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    dot: "bg-rose-500",
    label: "CRITICAL",
  },
  HIGH: {
    bg: "bg-amber-950/20",
    border: "border-amber-600/40",
    text: "text-amber-300",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    dot: "bg-amber-400",
    label: "HIGH",
  },
  MEDIUM: {
    bg: "bg-sky-950/15",
    border: "border-sky-700/35",
    text: "text-sky-300",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    dot: "bg-sky-400",
    label: "MEDIUM",
  },
};

const RISK_META: Record<string, { score_color: string; badge: string; bar: string }> = {
  CRITICAL: { score_color: "text-rose-400", badge: "bg-rose-500/20 text-rose-300 border-rose-500/40", bar: "bg-rose-500" },
  HIGH:     { score_color: "text-amber-400", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40", bar: "bg-amber-400" },
  MEDIUM:   { score_color: "text-sky-400",  badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",   bar: "bg-sky-400" },
  LOW:      { score_color: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", bar: "bg-emerald-400" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META["MEDIUM"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${meta.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function RiskScorePill({ risk }: { risk: any }) {
  const meta = RISK_META[risk.risk_level] ?? RISK_META["LOW"];
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xl font-black font-mono ${meta.score_color}`}>{risk.score}</span>
      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.badge}`}>
        {risk.risk_level}
      </span>
    </div>
  );
}

function EnrollmentBar({ current, target, pct }: { current: number; target: number; pct: number }) {
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-teal-400" : pct >= 30 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-slate-200 font-bold">{current}/{target}</span>
        <span className="text-slate-400">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

// ─── Empty / Loading / Error states ─────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 ctms-card rounded-xl p-12 text-center">
      <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
      <p className="font-semibold text-slate-200 text-sm">Loading Clinical Research Intelligence…</p>
      <span className="text-xs text-slate-500">Synchronising sites, protocols and pharmacovigilance registry</span>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 ctms-card rounded-xl p-12 text-center">
      <AlertTriangle className="w-7 h-7 text-rose-500" />
      <div>
        <p className="font-semibold text-rose-400 text-sm">Failed to load Intelligence Data</p>
        <span className="text-xs text-slate-500">The backend connection could not be established.</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
        </button>
      )}
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      {label}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const DashboardView: React.FC<DashboardViewProps> = ({ data, onNavigateTab, loading, onRetry }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [expandedRisk, setExpandedRisk] = useState<Set<number>>(new Set());

  const toggleRisk = (id: number) =>
    setExpandedRisk(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleTriageAction = (item: any) => {
    if (item.action_target === "safety") router.push("/safety");
    else if (item.action_target === "milestones") router.push("/milestones");
    else if (item.action_target === "sites") router.push("/sites");
    else if (item.study_id) router.push(`/studies/${item.study_id}`);
    else onNavigateTab(item.action_target);
  };

  // ── guards ──
  if (!data || !data.kpis) {
    return loading === false ? <ErrorState onRetry={onRetry} /> : <LoadingState />;
  }

  const { kpis, risk_distribution, attention_required, studies, upcoming_deadlines } = data;

  const openSafetyEventsCount: number = studies
    ? studies.reduce((acc: number, s: any) => acc + (s.open_safety_events || 0), 0)
    : 0;

  const criticalItems = (attention_required as any[]).filter(i => i.severity === "CRITICAL");
  const highItems     = (attention_required as any[]).filter(i => i.severity === "HIGH");
  const otherItems    = (attention_required as any[]).filter(i => i.severity !== "CRITICAL" && i.severity !== "HIGH");

  // Safety snapshot – studies with open SAEs
  const studiesWithSAE = (studies as any[]).filter(s => s.open_safety_events > 0);

  // Sorted studies: CRITICAL first, then HIGH, then by score desc
  const riskOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sortedStudies = [...(studies as any[])].sort((a, b) => {
    const ro = (riskOrder[a.risk.risk_level] ?? 4) - (riskOrder[b.risk.risk_level] ?? 4);
    if (ro !== 0) return ro;
    return b.risk.score - a.risk.score;
  });

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════════════
          1. HEADER — Clinical Research Command Centre
      ══════════════════════════════════════════════════════════════ */}
      <div className="ctms-card rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <h1 className="text-base font-black text-slate-100 tracking-tight">
              AIIA Clinical Research Intelligence
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 ml-1">
              NPvCC Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Portfolio command centre — All India Institute of Ayurveda, Ministry of Ayush
          </p>
          <p className="text-[10px] text-slate-600 italic">
            Synthetic clinical-trial data · DPDP-aligned privacy-by-design prototype
          </p>
        </div>

        {/* Quick status summary */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {criticalItems.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {criticalItems.length} Critical
            </div>
          )}
          {openSafetyEventsCount > 0 && (
            <button
              onClick={() => onNavigateTab("safety")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/30 border border-rose-700/40 text-rose-300 text-xs font-bold hover:bg-rose-950/50 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {openSafetyEventsCount} Open SAE{openSafetyEventsCount !== 1 ? "s" : ""}
            </button>
          )}
          {kpis.overdue_milestones_count > 0 && (
            <button
              onClick={() => onNavigateTab("milestones")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-700/40 text-amber-300 text-xs font-bold hover:bg-amber-950/50 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              {kpis.overdue_milestones_count} Overdue
            </button>
          )}
          {criticalItems.length === 0 && openSafetyEventsCount === 0 && kpis.overdue_milestones_count === 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-700/40 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> No Critical Issues
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. KPI STRIP — compact, no equal-weight cards
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

        <button onClick={() => onNavigateTab("studies")} className="ctms-card ctms-card-hover rounded-xl p-4 text-left group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Studies</span>
            <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-100">{kpis.active_studies}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">of {kpis.total_studies} total</div>
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(kpis.active_studies / Math.max(1, kpis.total_studies)) * 100}%` }} />
          </div>
        </button>

        <button onClick={() => onNavigateTab("participants")} className="ctms-card ctms-card-hover rounded-xl p-4 text-left group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Enrolled</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-100">{kpis.total_enrolled}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">of {kpis.total_target_enrollment} target</div>
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, kpis.overall_recruitment_percentage)}%` }} />
          </div>
        </button>

        <button
          onClick={() => onNavigateTab("studies")}
          className="ctms-card ctms-card-hover rounded-xl p-4 text-left border-rose-900/50 group"
          style={{ borderColor: kpis.at_risk_studies_count > 0 ? "rgba(225,29,72,0.35)" : undefined }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Needs Attention</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${kpis.at_risk_studies_count > 0 ? "text-rose-400" : "text-slate-600"}`} />
          </div>
          <div className={`text-2xl font-black font-mono ${kpis.at_risk_studies_count > 0 ? "text-rose-300" : "text-slate-400"}`}>
            {kpis.at_risk_studies_count}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">High or critical risk</div>
        </button>

        <button onClick={() => onNavigateTab("safety")} className="ctms-card ctms-card-hover rounded-xl p-4 text-left group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Open SAEs</span>
            <ShieldAlert className={`w-3.5 h-3.5 ${openSafetyEventsCount > 0 ? "text-rose-400" : "text-slate-600"}`} />
          </div>
          <div className={`text-2xl font-black font-mono ${openSafetyEventsCount > 0 ? "text-rose-300" : "text-slate-400"}`}>
            {openSafetyEventsCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Under review</div>
        </button>

        <button onClick={() => onNavigateTab("milestones")} className="ctms-card ctms-card-hover rounded-xl p-4 text-left group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overdue Milestones</span>
            <Clock className={`w-3.5 h-3.5 ${kpis.overdue_milestones_count > 0 ? "text-amber-400" : "text-slate-600"}`} />
          </div>
          <div className={`text-2xl font-black font-mono ${kpis.overdue_milestones_count > 0 ? "text-amber-300" : "text-slate-400"}`}>
            {kpis.overdue_milestones_count}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">SLA breached</div>
        </button>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          3. ATTENTION REQUIRED — PRIMARY, most visual weight
      ══════════════════════════════════════════════════════════════ */}
      <div className="ctms-card rounded-xl overflow-hidden">
        {/* Section header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              {criticalItems.length > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${criticalItems.length > 0 ? "bg-rose-500" : "bg-teal-500"}`} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Attention Required</h2>
              <p className="text-[11px] text-slate-500">Prioritized issues across the research portfolio</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500">{attention_required.length} items</span>
        </div>

        {attention_required.length === 0 ? (
          <EmptySection label="No attention items. Portfolio is on track." />
        ) : (
          <div className="divide-y divide-slate-800/60">
            {/* CRITICAL items — full-width, most prominent */}
            {criticalItems.map((item: any) => (
              <AttentionRow key={item.id} item={item} onAction={handleTriageAction} />
            ))}
            {/* HIGH items */}
            {highItems.map((item: any) => (
              <AttentionRow key={item.id} item={item} onAction={handleTriageAction} />
            ))}
            {/* MEDIUM / WARNING */}
            {otherItems.map((item: any) => (
              <AttentionRow key={item.id} item={item} onAction={handleTriageAction} />
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          4. PORTFOLIO RISK OVERVIEW — sorted by risk, cards
      ══════════════════════════════════════════════════════════════ */}
      <div className="ctms-card rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100">Portfolio Risk</h2>
              <p className="text-[11px] text-slate-500">
                Multi-factor composite score · Accrual (30%) · Regulatory (25%) · Data (20%) · Safety (15%) · Deviations (10%)
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">CRITICAL {risk_distribution.CRITICAL}</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">HIGH {risk_distribution.HIGH}</span>
            <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">MEDIUM {risk_distribution.MEDIUM}</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">LOW {risk_distribution.LOW}</span>
          </div>
        </div>

        <div className="divide-y divide-slate-800/50">
          {sortedStudies.map((st: any) => {
            const risk = st.risk;
            const meta = RISK_META[risk.risk_level] ?? RISK_META["LOW"];
            const isExpanded = expandedRisk.has(st.id);

            return (
              <div key={st.id} className="px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: study info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-teal-400">{st.protocol_number}</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${meta.badge}`}>{risk.risk_level}</span>
                    </div>
                    <p className="font-semibold text-slate-100 text-xs leading-snug truncate">{st.short_title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">PI: {st.principal_investigator}</p>
                  </div>

                  {/* Center: risk score + enrollment */}
                  <div className="hidden sm:flex flex-col gap-2 flex-shrink-0 min-w-[140px]">
                    <RiskScorePill risk={risk} />
                    <EnrollmentBar current={st.current_enrollment} target={st.target_enrollment} pct={st.recruitment_percentage} />
                  </div>

                  {/* Right: driver + action */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <div className="text-[10px] text-slate-400 text-right max-w-[140px] hidden lg:block">
                      <span className="text-[9px] uppercase font-bold text-slate-600 block">Primary Driver</span>
                      <span className="text-slate-300 text-[10px] leading-tight">{risk.primary_driver}</span>
                    </div>
                    <button
                      onClick={() => router.push(`/studies/${st.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 text-[11px] font-bold transition-colors flex items-center gap-1"
                    >
                      Open <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Risk factor bar */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-800 gap-px">
                    <div style={{ width: `${Math.min(100, risk.recruitment_score * 2.5)}%` }} className="bg-amber-500"  title={`Recruitment: +${risk.recruitment_score}`} />
                    <div style={{ width: `${Math.min(100, risk.compliance_score  * 2.5)}%` }} className="bg-cyan-500"   title={`Regulatory: +${risk.compliance_score}`} />
                    <div style={{ width: `${Math.min(100, risk.data_quality_score * 2.5)}%` }} className="bg-blue-500"  title={`Data Quality: +${risk.data_quality_score}`} />
                    <div style={{ width: `${Math.min(100, risk.safety_score      * 2.5)}%` }} className="bg-rose-500"   title={`Safety: +${risk.safety_score}`} />
                    <div style={{ width: `${Math.min(100, risk.deviation_score   * 2.5)}%` }} className="bg-purple-500" title={`Deviations: +${risk.deviation_score}`} />
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-slate-600 font-mono">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" />Accrual +{risk.recruitment_score}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-500" />Regulatory +{risk.compliance_score}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" />Data +{risk.data_quality_score}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500 shrink-0" />Safety +{risk.safety_score}</span>
                  </div>
                </div>

                {/* Recommended actions — toggle */}
                {risk.recommended_actions?.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => toggleRisk(st.id)}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      <Lightbulb className="w-3 h-3" />
                      {risk.recommended_actions.length} recommended action{risk.recommended_actions.length > 1 ? "s" : ""}
                      <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>
                    {isExpanded && (
                      <ul className="mt-1.5 space-y-1 pl-4">
                        {risk.recommended_actions.map((action: string, idx: number) => {
                          const roleMatch = action.match(/^\[([^\]]+)\]/);
                          const roleLabel = roleMatch ? roleMatch[1] : null;
                          const text = roleMatch ? action.slice(roleMatch[0].length + 1) : action;
                          return (
                            <li key={idx} className="text-[10px] text-slate-400 flex gap-1.5">
                              <span className="text-amber-500 font-bold">›</span>
                              {roleLabel && (
                                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 mr-1 shrink-0">{roleLabel}</span>
                              )}
                              {text}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          5+6. ENROLLMENT OVERVIEW + SAFETY SNAPSHOT (side by side)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 5. Enrollment Overview */}
        <div className="ctms-card rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Enrollment Overview</h2>
            </div>
            <button onClick={() => onNavigateTab("participants")} className="text-[10px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-0.5 transition-colors">
              All Participants <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/50">
            {studies.length === 0 ? (
              <EmptySection label="No studies found" />
            ) : (
              sortedStudies.map((st: any) => (
                <div key={st.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-800/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-200 truncate">{st.short_title}</p>
                    <p className="text-[10px] font-mono text-slate-500">{st.protocol_number}</p>
                  </div>
                  <div className="w-36 shrink-0">
                    <EnrollmentBar current={st.current_enrollment} target={st.target_enrollment} pct={st.recruitment_percentage} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Portfolio total */}
          <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">Portfolio total</span>
            <span className="font-bold text-slate-200">
              {kpis.total_enrolled} / {kpis.total_target_enrollment}
              <span className="text-slate-500 ml-1">({kpis.overall_recruitment_percentage}%)</span>
            </span>
          </div>
        </div>

        {/* 6. Safety Snapshot + Compliance Snapshot stacked */}
        <div className="space-y-4">

          {/* Safety Snapshot */}
          <div className="ctms-card rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold text-slate-100">Safety Snapshot</h2>
              </div>
              <button onClick={() => onNavigateTab("safety")} className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-700/40 text-rose-300 text-[10px] font-bold hover:bg-rose-950/60 transition-colors flex items-center gap-1">
                Open Safety <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="px-5 py-3.5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className={`text-xl font-black font-mono ${openSafetyEventsCount > 0 ? "text-rose-300" : "text-slate-400"}`}>
                    {openSafetyEventsCount}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Open SAEs under review</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className={`text-xl font-black font-mono ${studiesWithSAE.length > 0 ? "text-amber-300" : "text-slate-400"}`}>
                    {studiesWithSAE.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Studies with active SAEs</div>
                </div>
              </div>

              {studiesWithSAE.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Potential Safety Signals</p>
                  {studiesWithSAE.slice(0, 3).map((st: any) => (
                    <div key={st.id} className="flex items-center justify-between p-2 rounded-lg bg-rose-950/20 border border-rose-800/30 text-[10px]">
                      <span className="text-slate-300 font-semibold truncate">{st.short_title}</span>
                      <span className="font-mono text-rose-400 font-bold shrink-0 ml-2">{st.open_safety_events} SAE</span>
                    </div>
                  ))}
                  <p className="text-[9px] text-slate-600 italic pt-0.5">
                    Potential signals — not confirmed causality. Prototype state transition only; no external DCGI filing occurs.
                  </p>
                </div>
              ) : (
                <EmptySection label="No active safety events requiring review" />
              )}
            </div>
          </div>

          {/* Compliance Snapshot */}
          <div className="ctms-card rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-100">Compliance Snapshot</h2>
              </div>
              <button onClick={() => onNavigateTab("compliance")} className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-[10px] font-bold hover:bg-emerald-950/60 transition-colors flex items-center gap-1">
                Open Compliance <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="px-5 py-3.5 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className={`text-xl font-black font-mono ${kpis.overdue_milestones_count > 0 ? "text-amber-300" : "text-emerald-400"}`}>
                    {kpis.overdue_milestones_count}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Overdue milestones</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-xl font-black font-mono text-slate-300">
                    {upcoming_deadlines?.length ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Upcoming deadlines</div>
                </div>
              </div>

              {upcoming_deadlines?.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Next Deadlines</p>
                  {upcoming_deadlines.slice(0, 3).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px]">
                      <span className="text-slate-300 truncate font-medium">{m.name}</span>
                      <span className="font-mono text-slate-500 shrink-0 ml-2">{m.planned_date}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptySection label="No upcoming compliance deadlines" />
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          8. QUICK ACTIONS — minimal, bottom of page
      ══════════════════════════════════════════════════════════════ */}
      <div className="ctms-card rounded-xl px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Studies",       icon: FlaskConical, tab: "studies"    },
            { label: "Safety",        icon: ShieldAlert,  tab: "safety"     },
            { label: "Compliance",    icon: CheckCircle2, tab: "compliance" },
            { label: "Alerts",        icon: AlertTriangle, tab: "alerts"   },
            { label: "Audit Trail",   icon: Eye,          tab: "audit"      },
            { label: "Milestones",    icon: Clock,        tab: "milestones" },
            { label: "Participants",  icon: Users,        tab: "participants"},
          ].map(({ label, icon: Icon, tab }) => (
            <button
              key={tab}
              onClick={() => onNavigateTab(tab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold transition-all"
              aria-label={`Navigate to ${label}`}
            >
              <Icon className="w-3.5 h-3.5 text-teal-400" />
              {label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

// ─── Attention Row (sub-component) ───────────────────────────────────────────

function AttentionRow({ item, onAction }: { item: any; onAction: (item: any) => void }) {
  const meta = SEVERITY_META[item.severity] ?? SEVERITY_META["MEDIUM"];
  const isCritical = item.severity === "CRITICAL";

  return (
    <div className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 ${meta.bg} border-l-4 ${meta.border.replace("border-", "border-l-")} hover:brightness-110 transition-all`}>

      {/* Severity badge — left anchor */}
      <div className="shrink-0 w-20">
        <SeverityBadge severity={item.severity} />
        {isCritical && item.time_remaining && (
          <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-rose-400">
            <Clock className="w-2.5 h-2.5" />
            {item.time_remaining}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] text-teal-400 font-bold">{item.study_protocol}</span>
        </div>
        <p className="font-bold text-slate-100 text-xs leading-snug">{item.title}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">{item.issue}</p>
        {item.metric_detail && (
          <p className="text-[10px] font-mono text-slate-500">{item.metric_detail}</p>
        )}
      </div>

      {/* Role + action */}
      <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
        <div className="text-[10px] text-slate-500">
          <span className="text-[9px] uppercase font-bold text-slate-600 block">Owner</span>
          <span className="text-slate-400">{item.responsible_role}</span>
        </div>
        <button
          onClick={() => onAction(item)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
            isCritical
              ? "bg-rose-600 hover:bg-rose-500 text-white"
              : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300"
          }`}
          aria-label={item.action_label}
        >
          {item.action_label} <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
