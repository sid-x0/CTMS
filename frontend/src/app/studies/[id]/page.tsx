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

/* ─── Light Clinical Design Tokens ────────────────────────────────────────── */

const RISK_META: Record<string, {
  scoreColor: string; badgeBg: string; badgeBorder: string; badgeText: string;
  headerBorder: string; headerBg: string; barColor: string;
}> = {
  CRITICAL: {
    scoreColor: "text-red-700",
    badgeBg: "bg-red-50", badgeBorder: "border-red-200", badgeText: "text-red-700",
    headerBorder: "border-red-200", headerBg: "bg-red-50/50",
    barColor: "bg-red-600",
  },
  HIGH: {
    scoreColor: "text-amber-700",
    badgeBg: "bg-amber-50", badgeBorder: "border-amber-200", badgeText: "text-amber-700",
    headerBorder: "border-amber-200", headerBg: "bg-amber-50/50",
    barColor: "bg-amber-500",
  },
  MEDIUM: {
    scoreColor: "text-blue-700",
    badgeBg: "bg-blue-50", badgeBorder: "border-blue-200", badgeText: "text-blue-700",
    headerBorder: "border-blue-200", headerBg: "bg-blue-50/50",
    barColor: "bg-blue-500",
  },
  LOW: {
    scoreColor: "text-green-700",
    badgeBg: "bg-green-50", badgeBorder: "border-green-200", badgeText: "text-green-700",
    headerBorder: "border-green-200", headerBg: "bg-green-50/50",
    barColor: "bg-green-600",
  },
};

const MILESTONE_STATUS_META: Record<string, { icon: React.ReactNode; border: string; bg: string; badge: string }> = {
  Completed: {
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
    border: "border-l-green-600",
    bg: "bg-white",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  Overdue: {
    icon: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />,
    border: "border-l-red-600",
    bg: "bg-red-50/30",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  Pending: {
    icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    border: "border-l-amber-500",
    bg: "bg-white",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "In Progress": {
    icon: <Activity className="w-3.5 h-3.5 text-blue-600" />,
    border: "border-l-blue-600",
    bg: "bg-blue-50/20",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

/* ─── Small Re-usable Components ─────────────────────────────────────────── */

function SectionHeader({ icon, title, sub, right }: {
  icon: React.ReactNode; title: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
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
        <span className="text-slate-600 font-semibold">{label}</span>
        <span className="font-mono font-bold text-slate-800">
          {score}<span className="text-slate-400 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isEmpty ? "bg-green-300" : color}`}
          style={{ width: isEmpty ? "4%" : `${pct}%` }}
        />
      </div>
      {desc && <p className="text-[10px] text-slate-500">{desc}</p>}
    </div>
  );
}

function EvidenceChip({ label, value, onClick, severity = "neutral" }: {
  label: string; value: string | number; onClick?: () => void; severity?: "critical" | "warning" | "good" | "neutral";
}) {
  const colorMap = {
    critical: "border-red-200 bg-red-50/70 text-red-800",
    warning:  "border-amber-200 bg-amber-50/70 text-amber-800",
    good:     "border-green-200 bg-green-50/70 text-green-800",
    neutral:  "border-slate-200 bg-slate-50 text-slate-700",
  };
  const base = `px-3 py-2 rounded-md border text-xs ${colorMap[severity]} transition-colors`;
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} hover:border-slate-400 hover:shadow-xs text-left w-full`}>
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-0.5">{label}</div>
        <div className="font-bold truncate">{value}</div>
      </button>
    );
  }
  return (
    <div className={base}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-0.5">{label}</div>
      <div className="font-bold truncate">{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN STUDY DETAIL WORKSPACE
═══════════════════════════════════════════════════════════════════════════ */

export default function StudyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { loadData } = useApp();

  const studyId = Number(params?.id);
  const today = new Date().toISOString().split("T")[0];

  const [data, setData] = useState<any | null>(null);
  const [preflight, setPreflight] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState<number | null>(null);
  const [resolveOk, setResolveOk] = useState<Set<number>>(new Set());

  const canResolve =
    user?.user_role === "Administrator" ||
    user?.user_role === "Principal Investigator" ||
    user?.user_role === "Study Coordinator" ||
    user?.user_role === "Ethics Committee Member";

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
      loadData();
    } catch (e) {
      console.error("Failed to resolve milestone", e);
    } finally {
      setResolving(null);
    }
  };

  /* ── loading / error ── */
  if (loading) return (
    <div className="min-h-[360px] flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
      <RefreshCw className="w-6 h-6 text-[#1e3a5f] animate-spin" />
      <p className="font-semibold text-slate-800 text-sm">Loading Study Intelligence Workspace…</p>
      <span className="text-xs text-slate-500 font-mono">Fetching risk scores, regulatory milestones, sites, and safety data</span>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
      <XCircle className="w-7 h-7 text-red-600" />
      <p className="text-sm font-semibold text-red-700">{error || "Study not found"}</p>
      <button onClick={() => router.push("/studies")} className="ctms-btn-primary text-xs flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Clinical Studies
      </button>
    </div>
  );

  const { study, kpis, risk, sites, milestones, alerts } = data;
  const riskMeta = RISK_META[risk.risk_level] ?? RISK_META["LOW"];

  /* Derived */
  const preflightMilestoneMap: Record<number, any> = {};
  if (preflight?.checklist) {
    preflight.checklist.forEach((item: any) => {
      if (item.milestone_id) preflightMilestoneMap[item.milestone_id] = item;
    });
  }

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
    { label: "IEC / Compliance",    score: risk.compliance_score,  max: 25, color: "bg-[#0f7b6c]" },
    { label: "Data Quality",        score: risk.data_quality_score, max: 20, color: "bg-blue-600" },
    { label: "Protocol Deviations", score: risk.deviation_score,    max: 15, color: "bg-purple-600" },
    { label: "Safety / SAE",        score: risk.safety_score,       max: 15, color: "bg-red-600" },
  ];

  const funnelSteps = [
    { label: "Screened",   count: kpis.screened_count,   color: "bg-slate-400" },
    { label: "Eligible",   count: kpis.eligible_count,   color: "bg-blue-400" },
    { label: "Enrolled",   count: kpis.enrolled_count,   color: "bg-[#0f7b6c]" },
    { label: "Randomized", count: kpis.randomized_count, color: "bg-teal-500" },
    { label: "Completed",  count: kpis.completed_count,  color: "bg-green-600" },
    { label: "Withdrawn",  count: kpis.withdrawn_count,  color: "bg-red-500" },
  ];
  const maxFunnel = Math.max(...funnelSteps.map(s => s.count), 1);

  /* ── Action navigation helper ── */
  const navTo = (path: string) => router.push(path);

  return (
    <div className="space-y-4 pb-10 max-w-7xl">

      {/* ══════════════════════════════════════════════════════════════
          BREADCRUMB + BACK
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/studies")}
          className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
          aria-label="Back to clinical studies"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="hover:text-[#1e3a5f] cursor-pointer transition-colors font-medium" onClick={() => router.push("/studies")}>
            Clinical Studies
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-[#1e3a5f] font-bold">{study.protocol_number}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-600 font-medium">Study Workspace</span>
        </div>
        <button
          onClick={load}
          className="ml-auto p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
          title="Refresh"
          aria-label="Refresh study data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          1. STUDY HEADER
      ══════════════════════════════════════════════════════════════ */}
      <div className={`bg-white rounded-lg border ${riskMeta.headerBorder} ${riskMeta.headerBg} p-5 shadow-xs`}>
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Left: identity */}
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#1e3a5f] bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                {study.protocol_number}
              </span>
              <StatusBadge status={study.status} />
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                {study.phase} · {study.study_type}
              </span>
              {preflight && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider flex items-center gap-1 ${
                  preflight.ready_for_activation
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  {preflight.ready_for_activation
                    ? <><CheckCircle2 className="w-3 h-3" /> Activation Ready</>
                    : <><AlertTriangle className="w-3 h-3" /> Activation Blocked</>
                  }
                </span>
              )}
            </div>

            <h1 className="text-base font-bold text-slate-900 leading-snug">{study.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-[#1e3a5f]" />
                PI: <strong className="text-slate-800 ml-0.5">{study.principal_investigator}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {study.sponsor}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {study.start_date || "—"} — {study.expected_end_date || "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {kpis.active_sites}/{kpis.total_sites} sites active
              </span>
            </div>

            {study.intervention_type && (
              <p className="text-[11px] text-slate-600">
                Intervention: <span className="text-slate-800 font-semibold">{study.intervention_type}</span>
              </p>
            )}
          </div>

          {/* Right: risk score */}
          <div className="flex-shrink-0 flex flex-col items-end justify-center gap-1 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-5 pt-3 lg:pt-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Risk Score</div>
            <div className={`text-4xl font-black font-mono leading-none ${riskMeta.scoreColor}`}>
              {risk.score}
            </div>
            <div className="text-[10px] font-semibold text-slate-400 font-mono">/ 100 max</div>
            <span className={`mt-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${riskMeta.badgeBg} ${riskMeta.badgeBorder} ${riskMeta.badgeText}`}>
              {risk.risk_level} RISK
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
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-5 shadow-xs">
          <SectionHeader
            icon={<Shield className="w-4 h-4 text-[#1e3a5f]" />}
            title="Why is this study at risk?"
            sub="Multi-factor composite score: Accrual (30%) · Regulatory (25%) · Data (20%) · Deviations (15%) · Safety (15%)"
          />

          {/* Primary driver callout */}
          <div className={`p-3.5 rounded-md border ${riskMeta.headerBorder} ${riskMeta.headerBg} flex items-start gap-3`}>
            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${riskMeta.scoreColor}`} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Primary Risk Driver</div>
              <p className="text-xs font-bold text-slate-900 leading-snug">{risk.primary_driver}</p>
              <div className="flex items-center gap-4 font-mono text-[11px] text-slate-600 mt-1.5">
                <span>Current pace: <strong className="text-slate-800">{risk.current_recruitment_pace}/wk</strong></span>
                <span>Expected: <strong className="text-slate-800">{risk.expected_recruitment_pace}/wk</strong></span>
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
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Evidence Behind Risk Factors</div>
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
            <p className="text-[10px] text-slate-400 italic mt-2">
              Click evidence metrics to open module workflows. Derived strictly from current synthetic trial database.
            </p>
          </div>
        </div>

        {/* Right 1 col: Recommended Actions */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 flex flex-col shadow-xs">
          <SectionHeader
            icon={<Lightbulb className="w-4 h-4 text-amber-600" />}
            title="Recommended Actions"
            sub="Engine recommendations mapped by clinical role"
          />

          {risk.recommended_actions?.length > 0 ? (
            <div className="space-y-2.5 flex-1">
              {risk.recommended_actions.map((action: string, idx: number) => {
                const roleMatch = action.match(/^\[([^\]]+)\]/);
                const roleLabel = roleMatch ? roleMatch[1] : null;
                const text = roleMatch ? action.slice(roleMatch[0].length + 1) : action;

                const dest =
                  roleLabel?.includes("Pharmacovigilance") ? "/safety" :
                  roleLabel?.includes("Study Coordinator")  ? "/participants" :
                  roleLabel?.includes("Ethics")             ? "/compliance" :
                  roleLabel?.includes("Principal")          ? "/studies" :
                  null;

                return (
                  <div key={idx} className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1.5">
                    {roleLabel && (
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[#1e3a5f] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                        {roleLabel}
                      </div>
                    )}
                    <p className="text-xs text-slate-700 leading-snug">{text}</p>
                    {dest && (
                      <button
                        onClick={() => navTo(dest)}
                        className="text-[11px] font-semibold text-[#1e3a5f] hover:underline flex items-center gap-1 transition-colors mt-1"
                        aria-label={`Navigate to ${dest}`}
                      >
                        Open workspace module <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-xs text-slate-500">No priority interventions needed. Study accrual is on schedule.</p>
            </div>
          )}

          {/* Quick navigation */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Module Workspaces</div>
            {[
              { icon: ShieldAlert, label: "Safety Workspace", path: "/safety" },
              { icon: CheckCircle2, label: "Compliance & Pre-flight", path: "/compliance" },
              { icon: Users, label: "Participant Registry", path: "/participants" },
              { icon: Eye, label: "Audit Verification", path: "/audit" },
            ].map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => navTo(path)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                aria-label={`Navigate to ${label}`}
              >
                <Icon className="w-3.5 h-3.5 text-[#1e3a5f]" />
                <span>{label}</span>
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
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <SectionHeader
            icon={<TrendingDown className="w-4 h-4 text-[#1e3a5f]" />}
            title="Participant Flow"
            sub="Protocol accrual and screening funnel"
            right={
              <button onClick={() => navTo("/participants")} className="text-[11px] text-[#1e3a5f] hover:underline font-semibold flex items-center gap-0.5">
                All Subjects <ArrowRight className="w-3 h-3" />
              </button>
            }
          />

          <div className="space-y-2">
            {funnelSteps.map((step) => (
              <div key={step.label} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">{step.label}</span>
                  <span className="font-mono font-bold text-slate-800">{step.count}</span>
                </div>
                <div className="h-3.5 bg-slate-100 rounded overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded ${step.color} flex items-center justify-end pr-1.5 transition-all duration-700`}
                    style={{ width: `${Math.max((step.count / maxFunnel) * 100, step.count > 0 ? 6 : 0)}%` }}
                  >
                    {step.count > 0 && <span className="text-white text-[9px] font-bold">{step.count}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">Overall Accrual</span>
              <span className="font-mono font-bold text-slate-900">{kpis.current_enrollment} / {kpis.target_enrollment}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  kpis.recruitment_percentage >= 70 ? "bg-green-600" :
                  kpis.recruitment_percentage >= 45 ? "bg-blue-600" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, kpis.recruitment_percentage)}%` }}
              />
            </div>
            <p className="text-right text-[11px] font-mono text-[#1e3a5f] font-bold">{kpis.recruitment_percentage}% target reached</p>
          </div>
        </div>

        {/* Per-site performance (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <SectionHeader
            icon={<Building2 className="w-4 h-4 text-[#1e3a5f]" />}
            title="Site Performance"
            sub={`${sites.length} participating center(s) — sorted worst accrual first`}
          />

          <div className="space-y-3">
            {sortedSites.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">No participating sites assigned.</p>
            ) : sortedSites.map((site: any) => (
              <div key={site.id} className="p-2.5 rounded border border-slate-100 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{site.site_name}</p>
                    <p className="text-[10px] text-slate-500">{site.location} · PI: {site.investigator}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      site.status === "Active"    ? "bg-green-50 text-green-700 border-green-200" :
                      site.status === "Suspended" ? "bg-red-50 text-red-700 border-red-200" :
                      site.status === "Pending"   ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>{site.status}</span>
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {site.current_enrollment}/{site.target_enrollment}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        site.recruitment_percentage >= 70 ? "bg-green-600" :
                        site.recruitment_percentage >= 40 ? "bg-amber-500" : "bg-red-600"
                      }`}
                      style={{ width: `${Math.min(100, site.recruitment_percentage)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-600 w-10 text-right">{site.recruitment_percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          6. MILESTONES / TIMELINE
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <SectionHeader
          icon={<Activity className="w-4 h-4 text-[#1e3a5f]" />}
          title="Regulatory Milestone Timeline"
          sub="Ordered by clinical priority: Overdue → Upcoming → Completed"
          right={
            <div className="flex items-center gap-3 text-[11px] font-mono font-semibold">
              <span className="text-red-700">{overdueMilestones.length} overdue</span>
              <span className="text-amber-700">{upcomingMilestones.length} pending</span>
              <span className="text-green-700">{completedMilestones.length} completed</span>
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
                  className={`px-4 py-3 rounded border-l-4 border flex items-start justify-between gap-4 transition-colors ${statusMeta.border} ${statusMeta.bg} border-slate-200`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">{statusMeta.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-900 text-xs leading-snug">{m.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${statusMeta.badge}`}>
                          {mStatus}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {m.milestone_type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-500">
                        <span>Planned: <strong className="text-slate-700">{m.planned_date}</strong></span>
                        {m.actual_date && <span>Completed: <strong className="text-green-700 font-bold">{m.actual_date}</strong></span>}
                        {isOverdue && <span className="text-red-700 font-bold">{daysOverdue} day(s) overdue</span>}
                      </div>
                      {m.notes && <p className="mt-1 text-[11px] text-slate-500 italic">{m.notes}</p>}
                    </div>
                  </div>

                  {/* Resolve button */}
                  {canMarkComplete && (
                    <div className="shrink-0">
                      {resolveOk.has(m.id) ? (
                        <span className="flex items-center gap-1 text-green-700 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleResolveMilestone(m.id)}
                          disabled={resolving === m.id}
                          className="ctms-btn-primary text-[11px] py-1 px-2.5 disabled:opacity-50 flex items-center gap-1"
                          aria-label={`Mark milestone ${m.name} as complete`}
                        >
                          <Wrench className="w-3 h-3" />
                          {resolving === m.id ? "Resolving…" : "Complete"}
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
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <SectionHeader
            icon={<ShieldAlert className="w-4 h-4 text-red-600" />}
            title="Pharmacovigilance & Safety"
            right={
              <button onClick={() => navTo("/safety")} className="text-[11px] font-semibold text-[#1e3a5f] hover:underline flex items-center gap-1" aria-label="Open Safety Center">
                Open Safety <ArrowRight className="w-3 h-3" />
              </button>
            }
          />

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded border border-slate-200 bg-slate-50">
                <div className={`text-2xl font-bold font-mono ${risk.safety_score > 0 ? "text-red-700" : "text-green-700"}`}>
                  {risk.safety_score > 0 ? Math.ceil(risk.safety_score / 8) : 0}
                </div>
                <div className="text-[10px] font-semibold uppercase text-slate-500 mt-0.5">SAEs Under Review</div>
              </div>
              <div className="p-3 rounded border border-slate-200 bg-slate-50">
                <div className={`text-2xl font-bold font-mono ${alerts.length > 0 ? "text-amber-700" : "text-slate-700"}`}>
                  {alerts.length}
                </div>
                <div className="text-[10px] font-semibold uppercase text-slate-500 mt-0.5">Active Safety Alerts</div>
              </div>
            </div>

            {alerts.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Signals & Alerts</p>
                {alerts.slice(0, 3).map((alert: any) => (
                  <div key={alert.id} className={`p-2.5 rounded border text-xs ${
                    alert.severity === "CRITICAL" ? "bg-red-50/70 border-red-200" :
                    alert.severity === "HIGH"     ? "bg-amber-50/70 border-amber-200" :
                                                    "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-900 truncate">{alert.title}</p>
                      <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                        alert.severity === "CRITICAL" ? "bg-red-100 text-red-800 border-red-200" :
                        alert.severity === "HIGH"     ? "bg-amber-100 text-amber-800 border-amber-200" :
                                                        "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>{alert.severity}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 italic">Pre-adjudicated pharmacovigilance surveillance signals.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-xs text-slate-500">No active pharmacovigilance signals for this protocol.</p>
              </div>
            )}
          </div>
        </div>

        {/* Compliance Snapshot */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <SectionHeader
            icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
            title="Regulatory Compliance Status"
            right={
              <button onClick={() => navTo("/compliance")} className="text-[11px] font-semibold text-[#1e3a5f] hover:underline flex items-center gap-1" aria-label="Open Compliance">
                Open Compliance <ArrowRight className="w-3 h-3" />
              </button>
            }
          />

          {/* Preflight status */}
          {preflight && (
            <div className={`mb-3 p-3 rounded border flex items-center gap-3 ${
              preflight.ready_for_activation
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}>
              {preflight.ready_for_activation
                ? <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              }
              <div>
                <div className={`text-xs font-bold ${preflight.ready_for_activation ? "text-green-800" : "text-red-800"}`}>
                  Pre-flight: {preflight.ready_for_activation ? "PASS — Activation Ready" : "ATTENTION REQUIRED — Activation Blocked"}
                </div>
                {!preflight.ready_for_activation && preflight.checklist && (
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {preflight.checklist.filter((c: any) => !c.passed).length} regulatory requirement(s) pending resolution
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {preflight?.checklist?.map((item: any) => (
              <div key={item.key || item.check} className="flex items-center gap-2.5 text-xs">
                {item.passed
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                }
                <span className={item.passed ? "text-slate-600" : "text-slate-900 font-semibold"}>
                  {item.title || item.label}
                </span>
                {!item.passed && (
                  <span className="ml-auto text-[9px] font-bold text-red-700 uppercase px-1.5 py-0.5 rounded bg-red-50 border border-red-200">
                    Failed
                  </span>
                )}
              </div>
            ))}
            {!preflight && (
              <p className="text-xs text-slate-500 italic text-center py-4">Preflight data unavailable.</p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-center">
              <div className={`text-xl font-bold font-mono ${kpis.overdue_milestones_count > 0 ? "text-red-700" : "text-green-700"}`}>
                {kpis.overdue_milestones_count}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 uppercase font-semibold">Overdue Milestones</div>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-center">
              <div className="text-xl font-bold font-mono text-slate-800">{kpis.upcoming_milestones_count}</div>
              <div className="text-[9px] text-slate-500 mt-0.5 uppercase font-semibold">Upcoming Milestones</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          9. DATA QUALITY / PROTOCOL
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <SectionHeader
          icon={<Database className="w-4 h-4 text-[#1e3a5f]" />}
          title="Data Quality & Protocol Integrity"
          sub="Operational indicators contributing to composite trial quality"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Open Data Queries",
              value: study.open_data_queries_count ?? 0,
              sub: "Unresolved CRF queries",
              color: (study.open_data_queries_count ?? 0) >= 5 ? "text-red-700" : (study.open_data_queries_count ?? 0) >= 2 ? "text-amber-700" : "text-green-700",
              riskNote: `+${risk.data_quality_score} pts risk contribution`,
            },
            {
              label: "Protocol Deviations",
              value: study.protocol_deviations_count ?? 0,
              sub: "Recorded deviations",
              color: (study.protocol_deviations_count ?? 0) >= 3 ? "text-red-700" : (study.protocol_deviations_count ?? 0) >= 1 ? "text-amber-700" : "text-green-700",
              riskNote: `+${risk.deviation_score} pts risk contribution`,
            },
            {
              label: "Active Sites",
              value: kpis.active_sites,
              sub: `of ${kpis.total_sites} total sites`,
              color: kpis.active_sites < kpis.total_sites ? "text-amber-700" : "text-green-700",
              riskNote: "",
            },
            {
              label: "Enrollment Pace",
              value: `${risk.current_recruitment_pace}/wk`,
              sub: `Expected: ${risk.expected_recruitment_pace}/wk`,
              color: risk.recruitment_score >= 20 ? "text-red-700" : risk.recruitment_score >= 10 ? "text-amber-700" : "text-green-700",
              riskNote: `+${risk.recruitment_score} pts risk contribution`,
            },
          ].map((item) => (
            <div key={item.label} className="p-3.5 rounded border border-slate-200 bg-slate-50/50 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</div>
              <div className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</div>
              <div className="text-[10px] text-slate-500">{item.sub}</div>
              {item.riskNote && (
                <div className="text-[9px] font-mono text-slate-400 border-t border-slate-200 pt-1 mt-1">{item.riskNote}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          10. RECENT ACTIVITY (compact audit excerpt)
      ══════════════════════════════════════════════════════════════ */}
      {alerts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <SectionHeader
            icon={<FileText className="w-4 h-4 text-[#1e3a5f]" />}
            title="Recent Protocol Events"
            sub="Latest alerts and notifications for this study"
            right={
              <button onClick={() => navTo("/audit")} className="text-[11px] font-semibold text-[#1e3a5f] hover:underline flex items-center gap-0.5" aria-label="View full audit trail">
                View Audit Trail <ArrowRight className="w-3 h-3" />
              </button>
            }
          />

          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert: any) => (
              <div key={alert.id} className="flex items-start gap-3 px-3 py-2 rounded border border-slate-200 bg-slate-50 text-xs">
                <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                  alert.severity === "CRITICAL" ? "text-red-600" :
                  alert.severity === "HIGH"     ? "text-amber-600" : "text-slate-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{alert.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{alert.message}</p>
                </div>
                <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  alert.severity === "CRITICAL" ? "bg-red-50 text-red-700 border-red-200" :
                  alert.severity === "HIGH"     ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                  "bg-slate-100 text-slate-600 border-slate-200"
                }`}>{alert.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
