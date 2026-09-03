"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Users,
  Building2,
  Activity,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  Calendar,
  XCircle,
  Wrench,
  FlaskConical,
  Eye,
  FileText,
  TrendingDown,
  Info,
  ArrowRight,
  Shield,
  Database,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

/* ─── Design tokens ──────────────────────────────────────────────────────── */

const RISK_META: Record<string, {
  scoreColor: string; badgeBg: string; badgeBorder: string; badgeText: string;
  headerBorder: string; headerBg: string; barColor: string;
}> = {
  CRITICAL: {
    scoreColor: "text-rose-400",
    badgeBg: "bg-rose-500/15", badgeBorder: "border-rose-500/40", badgeText: "text-rose-300",
    headerBorder: "border-rose-700/50", headerBg: "bg-rose-950/10",
    barColor: "bg-rose-500",
  },
  HIGH: {
    scoreColor: "text-amber-400",
    badgeBg: "bg-amber-500/15", badgeBorder: "border-amber-500/40", badgeText: "text-amber-300",
    headerBorder: "border-amber-700/40", headerBg: "bg-amber-950/10",
    barColor: "bg-amber-400",
  },
  MEDIUM: {
    scoreColor: "text-sky-400",
    badgeBg: "bg-sky-500/15", badgeBorder: "border-sky-500/40", badgeText: "text-sky-300",
    headerBorder: "border-sky-700/40", headerBg: "bg-sky-950/10",
    barColor: "bg-sky-400",
  },
  LOW: {
    scoreColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/15", badgeBorder: "border-emerald-500/40", badgeText: "text-emerald-300",
    headerBorder: "border-emerald-700/40", headerBg: "bg-emerald-950/10",
    barColor: "bg-emerald-500",
  },
};

const MILESTONE_STATUS_META: Record<string, { icon: React.ReactNode; border: string; bg: string; badge: string }> = {
  Completed: {
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    border: "border-l-emerald-500",
    bg: "bg-slate-950/80",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  },
  Overdue: {
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
    border: "border-l-rose-500",
    bg: "bg-rose-950/15",
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/25",
  },
  Pending: {
    icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
    border: "border-l-amber-500",
    bg: "bg-slate-900/80",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  },
  "In Progress": {
    icon: <Activity className="w-3.5 h-3.5 text-sky-400" />,
    border: "border-l-sky-500",
    bg: "bg-sky-950/10",
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/25",
  },
};

/* ─── Small re-usable pieces ─────────────────────────────────────────────── */

function SectionHeader({ icon, title, sub, right }: {
  icon: React.ReactNode; title: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-sm font-bold text-slate-100">{title}</h2>
          {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function RiskDimBar({ label, score, max, color, desc }: {
  label: string; score: number; max: number; color: string; desc?: string;
}) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const isEmpty = score === 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400 font-semibold">{label}</span>
        <span className="font-mono font-bold text-slate-200">
          {score}<span className="text-slate-500 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isEmpty ? "bg-emerald-600/30" : color}`}
          style={{ width: isEmpty ? "4%" : `${pct}%` }}
        />
      </div>
      {desc && <p className="text-[10px] text-slate-600">{desc}</p>}
    </div>
  );
}

function EvidenceChip({ label, value, onClick, severity = "neutral" }: {
  label: string; value: string | number; onClick?: () => void; severity?: "critical" | "warning" | "good" | "neutral";
}) {
  const colorMap = {
    critical: "border-rose-700/40 bg-rose-950/20 text-rose-300",
    warning:  "border-amber-700/30 bg-amber-950/15 text-amber-300",
    good:     "border-emerald-700/30 bg-emerald-950/15 text-emerald-300",
    neutral:  "border-slate-700/50 bg-slate-900 text-slate-300",
  };
  const base = `px-3 py-2 rounded-lg border text-xs ${colorMap[severity]}`;
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} hover:brightness-125 transition-all text-left`}>
        <div className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{label}</div>
        <div className="font-bold">{value}</div>
      </button>
    );
  }
  return (
    <div className={base}>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function EnrollmentBar({ current, target, pct }: { current: number; target: number; pct: number }) {
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 45 ? "bg-teal-400" : pct >= 25 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-slate-200 font-bold">{current}/{target}</span>
        <span className="text-slate-500">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

/* ─── Main page component ────────────────────────────────────────────────── */

export default function StudyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { loadData: refreshPortfolio } = useApp();

  const studyId = Number(params.id);
  const today = new Date().toISOString().split("T")[0];

  const canResolve =
    user?.user_role === "Administrator" ||
    user?.user_role === "Principal Investigator" ||
    user?.user_role === "Study Coordinator" ||
    user?.user_role === "Ethics Committee Member";

  const [data, setData]               = useState<any | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [resolving, setResolving]     = useState<number | null>(null);
  const [resolveOk, setResolveOk]     = useState<Set<number>>(new Set());
  const [preflightData, setPreflight] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [detail, pf] = await Promise.all([
        fetchAPI(`/dashboard/studies/${studyId}`),
        fetchAPI(`/compliance/studies/${studyId}/preflight`).catch(() => null),
      ]);
      setData(detail);
      setPreflight(pf);
    } catch (e: any) {
      setError(e.message || "Failed to load study");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (studyId) load(); }, [studyId]);

  const handleResolveMilestone = async (milestoneId: number) => {
    if (!studyId || !milestoneId) return;
    setResolving(milestoneId);
    try {
      const updatedPf = await fetchAPI(
        `/compliance/studies/${studyId}/milestones/${milestoneId}/complete`,
        { method: "POST" }
      );
      setPreflight(updatedPf);
      setResolveOk(prev => new Set(prev).add(milestoneId));
      await load();
      refreshPortfolio();
    } catch (e) {
      console.error("Failed to resolve milestone", e);
    } finally {
      setResolving(null);
    }
  };

  /* ── loading / error ── */
  if (loading) return (
    <div className="min-h-[360px] flex flex-col items-center justify-center gap-3 ctms-card rounded-xl p-12 text-center">
      <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
      <p className="font-semibold text-slate-200 text-sm">Loading Study Intelligence…</p>
      <span className="text-xs text-slate-500 font-mono">Fetching risk scores, milestones, sites and pharmacovigilance data</span>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 ctms-card rounded-xl p-12 text-center">
      <XCircle className="w-7 h-7 text-rose-400" />
      <p className="text-sm font-semibold text-rose-300">{error || "Study not found"}</p>
      <button onClick={() => router.push("/studies")} className="text-teal-400 text-xs flex items-center gap-1 hover:text-teal-300 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Portfolio
      </button>
    </div>
  );

  const { study, kpis, risk, sites, milestones, alerts } = data;
  const riskMeta = RISK_META[risk.risk_level] ?? RISK_META["LOW"];

  /* Derived */
  const preflightMilestoneMap: Record<number, any> = {};
  if (preflightData?.checklist) {
    preflightData.checklist.forEach((item: any) => {
      if (item.milestone_id) preflightMilestoneMap[item.milestone_id] = item;
    });
  }

  const openSAEs = alerts.filter((a: any) => a.alert_type === "SAE_DEADLINE" || a.severity === "CRITICAL");

  const overdueMilestones = milestones.filter(
    (m: any) => m.is_overdue || (m.planned_date < today && m.status !== "Completed")
  );
  const completedMilestones = milestones.filter((m: any) => m.status === "Completed");
  const upcomingMilestones  = milestones.filter(
    (m: any) => m.status !== "Completed" && m.planned_date >= today
  );

  // Sort milestones: overdue first, then upcoming, then completed
  const sortedMilestones = [
    ...overdueMilestones,
    ...upcomingMilestones.sort((a: any, b: any) => a.planned_date.localeCompare(b.planned_date)),
    ...completedMilestones.sort((a: any, b: any) => (b.actual_date || b.planned_date).localeCompare(a.actual_date || a.planned_date)),
  ];

  // Sort sites by recruitment % ascending (worst first)
  const sortedSites = [...sites].sort((a: any, b: any) => a.recruitment_percentage - b.recruitment_percentage);

  const dimensions = [
    { label: "Accrual Velocity",    score: risk.recruitment_score, max: 30, color: "bg-amber-500" },
    { label: "IEC / Compliance",    score: risk.compliance_score,  max: 25, color: "bg-cyan-500" },
    { label: "Data Quality",        score: risk.data_quality_score, max: 20, color: "bg-blue-500" },
    { label: "Protocol Deviations", score: risk.deviation_score,    max: 15, color: "bg-purple-500" },
    { label: "Safety / SAE",        score: risk.safety_score,       max: 15, color: "bg-rose-500" },
  ];

  const funnelSteps = [
    { label: "Screened",   count: kpis.screened_count,   color: "bg-slate-500" },
    { label: "Eligible",   count: kpis.eligible_count,   color: "bg-sky-500" },
    { label: "Enrolled",   count: kpis.enrolled_count,   color: "bg-teal-500" },
    { label: "Randomized", count: kpis.randomized_count, color: "bg-cyan-500" },
    { label: "Completed",  count: kpis.completed_count,  color: "bg-emerald-500" },
    { label: "Withdrawn",  count: kpis.withdrawn_count,  color: "bg-rose-500" },
  ];
  const maxFunnel = Math.max(...funnelSteps.map(s => s.count), 1);

  /* ── Action navigation helper ── */
  const navTo = (path: string) => router.push(path);

  return (
    <div className="space-y-4 pb-10">

      {/* ══════════════════════════════════════════════════════════════
          BREADCRUMB + BACK
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/studies")}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/40 transition-all"
          aria-label="Back to portfolio"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="hover:text-teal-400 cursor-pointer transition-colors" onClick={() => router.push("/studies")}>
            Portfolio
          </span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-mono text-teal-400 font-bold">{study.protocol_number}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-400">Intelligence Workspace</span>
        </div>
        <button
          onClick={load}
          className="ml-auto p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh"
          aria-label="Refresh study data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          1. STUDY HEADER
      ══════════════════════════════════════════════════════════════ */}
      <div className={`ctms-card rounded-xl border ${riskMeta.headerBorder} ${riskMeta.headerBg} px-6 py-5`}>
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Left: identity */}
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-black text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/30">
                {study.protocol_number}
              </span>
              <StatusBadge status={study.status} />
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                {study.phase} · {study.study_type}
              </span>
              {preflightData && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider flex items-center gap-1 ${
                  preflightData.ready_for_activation
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                }`}>
                  {preflightData.ready_for_activation
                    ? <><CheckCircle2 className="w-3 h-3" /> Activation Ready</>
                    : <><AlertTriangle className="w-3 h-3" /> Activation Blocked</>
                  }
                </span>
              )}
            </div>

            <h1 className="text-lg font-black text-slate-100 leading-tight">{study.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                PI: <strong className="text-slate-300 ml-0.5">{study.principal_investigator}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {study.sponsor}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {study.start_date || "—"} — {study.expected_end_date || "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {kpis.active_sites}/{kpis.total_sites} sites active
              </span>
            </div>

            {study.intervention_type && (
              <p className="text-[11px] text-slate-500">
                Intervention: <span className="text-slate-300 font-medium">{study.intervention_type}</span>
              </p>
            )}
          </div>

          {/* Right: risk score — visually prominent */}
          <div className="flex-shrink-0 flex flex-col items-end justify-center gap-1">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Risk Score</div>
            <div className={`text-5xl font-black font-mono leading-none ${riskMeta.scoreColor}`}>
              {risk.score}
            </div>
            <div className="text-[10px] font-bold text-slate-500 font-mono">/ 100</div>
            <span className={`mt-1 px-3 py-1 rounded text-xs font-black uppercase tracking-wider border ${riskMeta.badgeBg} ${riskMeta.badgeBorder} ${riskMeta.badgeText}`}>
              {risk.risk_level}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. WHY IS THIS STUDY AT RISK? (hero section)
          + 3. EVIDENCE (inline)
          + 4. RECOMMENDED ACTIONS (inline)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left 2 cols: Risk breakdown */}
        <div className="xl:col-span-2 ctms-card rounded-xl p-5 space-y-5">
          <SectionHeader
            icon={<Shield className="w-4 h-4 text-teal-400" />}
            title="Why is this study at risk?"
            sub="Multi-factor composite score: Accrual (30%) · Regulatory (25%) · Data (20%) · Deviations (15%) · Safety (15%)"
          />

          {/* Primary driver callout */}
          <div className={`p-3.5 rounded-lg border ${riskMeta.headerBorder} ${riskMeta.headerBg} flex items-start gap-3`}>
            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${riskMeta.scoreColor}`} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Primary Driver</div>
              <p className="text-sm font-bold text-slate-100 leading-snug">{risk.primary_driver}</p>
              <div className="flex items-center gap-4 font-mono text-[10px] text-slate-500 mt-1.5">
                <span>Current pace: <strong className="text-slate-300">{risk.current_recruitment_pace}/wk</strong></span>
                <span>Expected: <strong className="text-slate-300">{risk.expected_recruitment_pace}/wk</strong></span>
              </div>
            </div>
          </div>

          {/* Dimension bars */}
          <div className="space-y-3">
            {dimensions.map(d => (
              <RiskDimBar key={d.label} label={d.label} score={d.score} max={d.max} color={d.color} />
            ))}
          </div>

          {/* Evidence grid */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Evidence behind the risk</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <EvidenceChip
                label="Enrollment"
                value={`${kpis.current_enrollment} / ${kpis.target_enrollment} (${kpis.recruitment_percentage}%)`}
                severity={kpis.recruitment_percentage < 40 ? "critical" : kpis.recruitment_percentage < 70 ? "warning" : "good"}
                onClick={() => navTo("/participants")}
              />
              <EvidenceChip
                label="Open Data Queries"
                value={`${study.open_data_queries_count ?? 0} queries`}
                severity={(study.open_data_queries_count ?? 0) >= 5 ? "critical" : (study.open_data_queries_count ?? 0) >= 2 ? "warning" : "good"}
              />
              <EvidenceChip
                label="Protocol Deviations"
                value={`${study.protocol_deviations_count ?? 0} recorded`}
                severity={(study.protocol_deviations_count ?? 0) >= 3 ? "critical" : (study.protocol_deviations_count ?? 0) >= 1 ? "warning" : "good"}
              />
              <EvidenceChip
                label="Overdue Milestones"
                value={`${kpis.overdue_milestones_count} overdue`}
                severity={kpis.overdue_milestones_count > 0 ? "critical" : "good"}
                onClick={() => navTo("/milestones")}
              />
              <EvidenceChip
                label="Active SAEs"
                value={`${risk.safety_score > 0 ? Math.ceil(risk.safety_score / 8) : 0} under review`}
                severity={risk.safety_score >= 8 ? "critical" : risk.safety_score > 0 ? "warning" : "good"}
                onClick={() => navTo("/safety")}
              />
              <EvidenceChip
                label="Active Sites"
                value={`${kpis.active_sites} of ${kpis.total_sites} active`}
                severity={kpis.active_sites < kpis.total_sites ? "warning" : "good"}
                onClick={() => navTo("/sites")}
              />
            </div>
            <p className="text-[9px] text-slate-600 italic mt-2">
              Click evidence items to navigate to the relevant module. All values derived from database state.
            </p>
          </div>
        </div>

        {/* Right 1 col: Recommended Actions */}
        <div className="ctms-card rounded-xl p-5 space-y-4 flex flex-col">
          <SectionHeader
            icon={<Lightbulb className="w-4 h-4 text-amber-400" />}
            title="What should happen next?"
            sub="Role-mapped actions from risk engine"
          />

          {risk.recommended_actions?.length > 0 ? (
            <div className="space-y-3 flex-1">
              {risk.recommended_actions.map((action: string, idx: number) => {
                const roleMatch = action.match(/^\[([^\]]+)\]/);
                const roleLabel = roleMatch ? roleMatch[1] : null;
                const text = roleMatch ? action.slice(roleMatch[0].length + 1) : action;

                // Map role → destination
                const dest =
                  roleLabel?.includes("Pharmacovigilance") ? "/safety" :
                  roleLabel?.includes("Study Coordinator")  ? "/participants" :
                  roleLabel?.includes("Ethics")             ? "/compliance" :
                  roleLabel?.includes("Principal")          ? "/studies" :
                  null;

                return (
                  <div key={idx} className="p-3.5 rounded-lg bg-amber-950/15 border border-amber-700/30 space-y-2">
                    {roleLabel && (
                      <div className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                        {roleLabel}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-300 leading-snug">{text}</p>
                    {dest && (
                      <button
                        onClick={() => navTo(dest)}
                        className="text-[10px] font-bold text-teal-300 hover:text-teal-200 flex items-center gap-1 transition-colors"
                        aria-label={`Navigate to ${dest}`}
                      >
                        Go to module <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-xs text-slate-500">No specific actions required. Study is on track.</p>
            </div>
          )}

          {/* Quick navigation */}
          <div className="border-t border-slate-800 pt-3 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">Quick Navigation</div>
            {[
              { icon: ShieldAlert, label: "Safety Center", path: "/safety" },
              { icon: CheckCircle2, label: "Compliance",   path: "/compliance" },
              { icon: Users,        label: "Participants", path: "/participants" },
              { icon: Eye,          label: "Audit Trail",  path: "/audit" },
            ].map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => navTo(path)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-all"
                aria-label={`Navigate to ${label}`}
              >
                <Icon className="w-3.5 h-3.5 text-teal-400" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          5. ENROLLMENT — overview + per-site performance
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Funnel (2 cols) */}
        <div className="lg:col-span-2 ctms-card rounded-xl p-5">
          <SectionHeader
            icon={<TrendingDown className="w-4 h-4 text-cyan-400" />}
            title="Participant Flow"
            sub="Enrollment pipeline"
            right={
              <button onClick={() => navTo("/participants")} className="text-[10px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-0.5 transition-colors">
                All Participants <ArrowRight className="w-3 h-3" />
              </button>
            }
          />

          <div className="space-y-2">
            {funnelSteps.map((step) => (
              <div key={step.label} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-semibold">{step.label}</span>
                  <span className="font-mono font-bold text-slate-200">{step.count}</span>
                </div>
                <div className="h-4 bg-slate-800 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${step.color} opacity-85 flex items-center justify-end pr-1.5 transition-all duration-700`}
                    style={{ width: `${Math.max((step.count / maxFunnel) * 100, step.count > 0 ? 6 : 0)}%` }}
                  >
                    {step.count > 0 && <span className="text-white text-[9px] font-black">{step.count}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Overall Progress</span>
              <span className="font-mono font-bold text-slate-200">{kpis.current_enrollment}/{kpis.target_enrollment}</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  kpis.recruitment_percentage >= 70 ? "bg-emerald-500" :
                  kpis.recruitment_percentage >= 45 ? "bg-teal-400" : "bg-amber-400"
                }`}
                style={{ width: `${Math.min(100, kpis.recruitment_percentage)}%` }}
              />
            </div>
            <p className="text-right text-[10px] font-mono text-teal-400 font-bold">{kpis.recruitment_percentage}% of target</p>
          </div>
        </div>

        {/* Per-site performance (3 cols) */}
        <div className="lg:col-span-3 ctms-card rounded-xl p-5">
          <SectionHeader
            icon={<Building2 className="w-4 h-4 text-teal-400" />}
            title="Site Performance"
            sub={`${sites.length} site(s) — sorted by recruitment pace (worst first)`}
          />

          <div className="space-y-3">
            {sortedSites.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">No sites assigned to this study.</p>
            ) : sortedSites.map((site: any) => (
              <div key={site.id} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{site.site_name}</p>
                    <p className="text-[10px] text-slate-500">{site.location} · {site.investigator}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      site.status === "Active"    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" :
                      site.status === "Suspended" ? "bg-rose-500/10 text-rose-300 border-rose-500/30" :
                      site.status === "Pending"   ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
                                                    "bg-slate-800 text-slate-400 border-slate-700"
                    }`}>{site.status}</span>
                    <span className="font-mono text-[10px] font-bold text-slate-300">
                      {site.current_enrollment}/{site.target_enrollment}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        site.recruitment_percentage >= 70 ? "bg-emerald-500" :
                        site.recruitment_percentage >= 40 ? "bg-amber-400" : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, site.recruitment_percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{site.recruitment_percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          6. MILESTONES / TIMELINE
      ══════════════════════════════════════════════════════════════ */}
      <div className="ctms-card rounded-xl p-5">
        <SectionHeader
          icon={<Activity className="w-4 h-4 text-teal-400" />}
          title="Regulatory Milestone Timeline"
          sub="Ordered: overdue → upcoming → completed"
          right={
            <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
              <span className="text-rose-400">✗ {overdueMilestones.length} overdue</span>
              <span className="text-amber-400">◷ {upcomingMilestones.length} upcoming</span>
              <span className="text-emerald-400">✓ {completedMilestones.length} done</span>
            </div>
          }
        />

        {milestones.length === 0 ? (
          <p className="text-center text-slate-500 italic text-xs py-6">No milestones recorded for this study.</p>
        ) : (
          <div className="space-y-2">
            {sortedMilestones.map((m: any) => {
              const isOverdue   = m.is_overdue || (m.planned_date < today && m.status !== "Completed");
              const isCompleted = m.status === "Completed";
              const daysOverdue = isOverdue
                ? Math.floor((new Date().getTime() - new Date(m.planned_date).getTime()) / 86400000)
                : 0;

              const mStatus = isCompleted ? "Completed" : isOverdue ? "Overdue" : (m.status || "Pending");
              const statusMeta = MILESTONE_STATUS_META[mStatus] ?? MILESTONE_STATUS_META["Pending"];
              const preflightItem = preflightMilestoneMap[m.id];
              const canMarkComplete = !isCompleted && preflightItem && !preflightItem.passed && canResolve;

              return (
                <div
                  key={m.id}
                  className={`px-4 py-3 rounded-lg border-l-4 border flex items-start justify-between gap-4 transition-all ${statusMeta.border} ${statusMeta.bg} border-slate-800/60`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">{statusMeta.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-100 text-xs leading-snug">{m.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${statusMeta.badge}`}>
                          {mStatus}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-500 border border-slate-700">
                          {m.milestone_type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-500">
                        <span>Planned: <strong className="text-slate-400">{m.planned_date}</strong></span>
                        {m.actual_date && <span>Completed: <strong className="text-emerald-400">{m.actual_date}</strong></span>}
                        {isOverdue && <span className="text-rose-400 font-bold">{daysOverdue} day(s) overdue</span>}
                      </div>
                      {m.notes && <p className="mt-1 text-[10px] text-slate-600 italic">{m.notes}</p>}
                    </div>
                  </div>

                  {/* Resolve button */}
                  {canMarkComplete && (
                    <div className="shrink-0">
                      {resolveOk.has(m.id) ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleResolveMilestone(m.id)}
                          disabled={resolving === m.id}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 text-[10px] font-bold border border-teal-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                          aria-label={`Mark milestone ${m.name} as complete`}
                        >
                          <Wrench className="w-3 h-3" />
                          {resolving === m.id ? "Resolving…" : "Mark Complete"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          7. SAFETY + 8. COMPLIANCE side by side
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Safety Snapshot */}
        <div className="ctms-card rounded-xl p-5">
          <SectionHeader
            icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
            title="Safety Snapshot"
            right={
              <button onClick={() => navTo("/safety")} className="px-2.5 py-1 rounded-lg bg-rose-950/30 border border-rose-700/35 text-rose-300 text-[10px] font-bold hover:bg-rose-950/50 transition-colors flex items-center gap-1" aria-label="Open Safety Center">
                Open Safety <ArrowRight className="w-3 h-3" />
              </button>
            }
          />

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className={`text-2xl font-black font-mono ${risk.safety_score > 0 ? "text-rose-300" : "text-emerald-400"}`}>
                  {risk.safety_score > 0 ? Math.ceil(risk.safety_score / 8) : 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">SAEs under review</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className={`text-2xl font-black font-mono ${alerts.length > 0 ? "text-amber-300" : "text-slate-400"}`}>
                  {alerts.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Active alerts</div>
              </div>
            </div>

            {alerts.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Potential Safety Signals</p>
                {alerts.slice(0, 3).map((alert: any) => (
                  <div key={alert.id} className={`p-2.5 rounded-lg border text-[11px] ${
                    alert.severity === "CRITICAL" ? "bg-rose-950/20 border-rose-700/40" :
                    alert.severity === "HIGH"     ? "bg-amber-950/15 border-amber-700/30" :
                                                    "bg-slate-900 border-slate-800"
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-100 truncate">{alert.title}</p>
                      <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                        alert.severity === "CRITICAL" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" :
                        alert.severity === "HIGH"     ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                                                        "bg-slate-800 text-slate-500 border-slate-700"
                      }`}>{alert.severity}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                ))}
                <p className="text-[9px] text-slate-600 italic">Potential signals — not confirmed causality. Prototype state transition only; no external DCGI filing occurs.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-slate-500">No active safety alerts for this study.</p>
              </div>
            )}
          </div>
        </div>

        {/* Compliance Snapshot */}
        <div className="ctms-card rounded-xl p-5">
          <SectionHeader
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            title="Compliance Status"
            right={
              <button onClick={() => navTo("/compliance")} className="px-2.5 py-1 rounded-lg bg-emerald-950/30 border border-emerald-700/35 text-emerald-300 text-[10px] font-bold hover:bg-emerald-950/50 transition-colors flex items-center gap-1" aria-label="Open Compliance">
                Open Compliance <ArrowRight className="w-3 h-3" />
              </button>
            }
          />

          {/* Preflight status */}
          {preflightData && (
            <div className={`mb-4 p-3 rounded-lg border flex items-center gap-3 ${
              preflightData.ready_for_activation
                ? "bg-emerald-950/20 border-emerald-700/30"
                : "bg-rose-950/15 border-rose-700/35"
            }`}>
              {preflightData.ready_for_activation
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              }
              <div>
                <div className={`text-xs font-bold ${preflightData.ready_for_activation ? "text-emerald-300" : "text-rose-300"}`}>
                  Pre-flight: {preflightData.ready_for_activation ? "PASS — Activation Ready" : "ATTENTION REQUIRED — Activation Blocked"}
                </div>
                {!preflightData.ready_for_activation && preflightData.checklist && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {preflightData.checklist.filter((c: any) => !c.passed).length} check(s) not passed
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {preflightData?.checklist?.map((item: any) => (
              <div key={item.check} className="flex items-center gap-2.5 text-xs">
                {item.passed
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                }
                <span className={item.passed ? "text-slate-400" : "text-slate-200 font-semibold"}>{item.label}</span>
                {!item.passed && (
                  <span className="ml-auto text-[9px] font-bold text-rose-400 uppercase px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    Failed
                  </span>
                )}
              </div>
            ))}
            {!preflightData && (
              <p className="text-xs text-slate-500 italic text-center py-4">Preflight data unavailable.</p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
              <div className={`text-xl font-black font-mono ${kpis.overdue_milestones_count > 0 ? "text-amber-300" : "text-emerald-400"}`}>
                {kpis.overdue_milestones_count}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 uppercase font-semibold">Overdue</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
              <div className="text-xl font-black font-mono text-slate-300">{kpis.upcoming_milestones_count}</div>
              <div className="text-[9px] text-slate-500 mt-0.5 uppercase font-semibold">Upcoming</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          9. DATA QUALITY / PROTOCOL
      ══════════════════════════════════════════════════════════════ */}
      <div className="ctms-card rounded-xl p-5">
        <SectionHeader
          icon={<Database className="w-4 h-4 text-blue-400" />}
          title="Data Quality & Protocol Integrity"
          sub="Operational indicators that contribute to the composite risk score"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Open Data Queries",
              value: study.open_data_queries_count ?? 0,
              sub: "Unresolved CRF queries",
              color: (study.open_data_queries_count ?? 0) >= 5 ? "text-rose-300" : (study.open_data_queries_count ?? 0) >= 2 ? "text-amber-300" : "text-emerald-400",
              riskNote: `+${risk.data_quality_score} pts risk contribution`,
            },
            {
              label: "Protocol Deviations",
              value: study.protocol_deviations_count ?? 0,
              sub: "Recorded deviations",
              color: (study.protocol_deviations_count ?? 0) >= 3 ? "text-rose-300" : (study.protocol_deviations_count ?? 0) >= 1 ? "text-amber-300" : "text-emerald-400",
              riskNote: `+${risk.deviation_score} pts risk contribution`,
            },
            {
              label: "Active Sites",
              value: kpis.active_sites,
              sub: `of ${kpis.total_sites} total sites`,
              color: kpis.active_sites < kpis.total_sites ? "text-amber-300" : "text-emerald-400",
              riskNote: "",
            },
            {
              label: "Enrollment Pace",
              value: `${risk.current_recruitment_pace}/wk`,
              sub: `Expected: ${risk.expected_recruitment_pace}/wk`,
              color: risk.recruitment_score >= 20 ? "text-rose-300" : risk.recruitment_score >= 10 ? "text-amber-300" : "text-emerald-400",
              riskNote: `+${risk.recruitment_score} pts risk contribution`,
            },
          ].map((item) => (
            <div key={item.label} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.label}</div>
              <div className={`text-xl font-black font-mono ${item.color}`}>{item.value}</div>
              <div className="text-[10px] text-slate-500">{item.sub}</div>
              {item.riskNote && (
                <div className="text-[9px] font-mono text-slate-600 border-t border-slate-800 pt-1 mt-1">{item.riskNote}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          10. RECENT ACTIVITY (compact audit excerpt)
      ══════════════════════════════════════════════════════════════ */}
      {alerts.length > 0 && (
        <div className="ctms-card rounded-xl p-5">
          <SectionHeader
            icon={<FileText className="w-4 h-4 text-teal-400" />}
            title="Recent Activity"
            sub="Latest alerts and events for this study"
            right={
              <button onClick={() => navTo("/audit")} className="text-[10px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-0.5 transition-colors" aria-label="View full audit trail">
                View Audit Trail <ArrowRight className="w-3 h-3" />
              </button>
            }
          />

          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert: any) => (
              <div key={alert.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                  alert.severity === "CRITICAL" ? "text-rose-400" :
                  alert.severity === "HIGH"     ? "text-amber-400" : "text-slate-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200 truncate">{alert.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{alert.message}</p>
                </div>
                <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                  alert.severity === "CRITICAL" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" :
                  alert.severity === "HIGH"     ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                                                  "bg-slate-800 text-slate-500 border-slate-700"
                }`}>{alert.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
