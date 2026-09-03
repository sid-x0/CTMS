"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import {
  ArrowLeft,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  ShieldAlert,
  Users,
  Building2,
  Activity,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  Calendar,
  TrendingUp,
  XCircle,
  Wrench
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const riskColor = (level: string) =>
  level === "CRITICAL" ? "text-rose-400" :
  level === "HIGH"     ? "text-amber-400" :
  level === "MEDIUM"   ? "text-sky-400" :
                         "text-emerald-400";

const riskBg = (level: string) =>
  level === "CRITICAL" ? "bg-rose-950/30 border-rose-700/50" :
  level === "HIGH"     ? "bg-amber-950/20 border-amber-700/50" :
  level === "MEDIUM"   ? "bg-sky-950/20 border-sky-700/50" :
                         "bg-slate-950 border-slate-800";

const riskBadge = (level: string) =>
  level === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" :
  level === "HIGH"     ? "bg-amber-500/20 text-amber-300 border-amber-500/40" :
  level === "MEDIUM"   ? "bg-sky-500/20 text-sky-300 border-sky-500/40" :
                         "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

const milestoneRowColor = (m: any, today: string) => {
  if (m.status === "Completed") return "border-l-emerald-500";
  if (m.is_overdue || (m.planned_date < today && m.status !== "Completed")) return "border-l-rose-500";
  if (m.planned_date <= new Date(new Date().getTime() + 7 * 86400000).toISOString().split("T")[0]) return "border-l-amber-500";
  return "border-l-slate-700";
};

/* ─── component ───────────────────────────────────────────────────────────── */
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

  const [data, setData]         = useState<any | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [resolving, setResolving] = useState<number | null>(null);
  const [resolveOk, setResolveOk] = useState<Set<number>>(new Set());
  const [preflightData, setPreflightData] = useState<any | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [detail, pf] = await Promise.all([
        fetchAPI(`/dashboard/studies/${studyId}`),
        fetchAPI(`/compliance/studies/${studyId}/preflight`).catch(() => null)
      ]);
      setData(detail);
      setPreflightData(pf);
    } catch (e: any) {
      setError(e.message || "Failed to load study detail");
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
      setPreflightData(updatedPf);
      setResolveOk(prev => new Set(prev).add(milestoneId));
      await load();
      refreshPortfolio();
    } catch (e) {
      console.error("Failed to resolve milestone", e);
    } finally {
      setResolving(null);
    }
  };

  /* ── loading / error states ── */
  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
      <p className="text-slate-300 text-sm font-semibold">Loading Study Intelligence…</p>
      <p className="text-slate-500 text-xs font-mono">Fetching risk, milestones, sites & pharmacovigilance data</p>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <XCircle className="w-8 h-8 text-rose-400" />
      <p className="text-slate-300 text-sm font-semibold">{error || "Study not found"}</p>
      <button onClick={() => router.push("/studies")} className="text-teal-400 text-xs flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Studies
      </button>
    </div>
  );

  const { study, kpis, risk, sites, milestones, alerts } = data;

  /* ── enrollment funnel ── */
  const funnelSteps = [
    { label: "Screened",    count: kpis.screened_count,    color: "bg-slate-500" },
    { label: "Eligible",    count: kpis.eligible_count,    color: "bg-sky-500" },
    { label: "Enrolled",    count: kpis.enrolled_count,    color: "bg-teal-500" },
    { label: "Randomized",  count: kpis.randomized_count,  color: "bg-cyan-500" },
    { label: "Completed",   count: kpis.completed_count,   color: "bg-emerald-500" },
    { label: "Withdrawn",   count: kpis.withdrawn_count,   color: "bg-rose-500" },
  ];
  const maxFunnel = Math.max(...funnelSteps.map(s => s.count), 1);

  /* ── risk dimension bars ── */
  const dimensions = [
    { label: "Accrual Velocity",    score: risk.recruitment_score, max: 30, color: "bg-amber-500" },
    { label: "IEC / Compliance",    score: risk.compliance_score,  max: 25, color: "bg-cyan-500" },
    { label: "Data Quality",        score: risk.data_quality_score, max: 20, color: "bg-blue-500" },
    { label: "Protocol Deviations", score: risk.deviation_score,    max: 15, color: "bg-purple-500" },
    { label: "Safety / SAE",        score: risk.safety_score,       max: 15, color: "bg-rose-500" },
  ];

  /* ── preflight milestone map ── */
  const preflightMilestoneMap: Record<number, any> = {};
  if (preflightData?.checklist) {
    preflightData.checklist.forEach((item: any) => {
      if (item.milestone_id) preflightMilestoneMap[item.milestone_id] = item;
    });
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── BREADCRUMB + BACK ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/studies")}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="hover:text-teal-400 cursor-pointer" onClick={() => router.push("/studies")}>Studies Portfolio</span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-mono text-teal-400 font-bold">{study.protocol_number}</span>
        </div>
      </div>

      {/* ── STUDY HEADER ── */}
      <div className={`p-6 rounded-2xl border ${riskBg(risk.risk_level)} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-teal-500/3 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row gap-5 justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-black text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/30">
                {study.protocol_number}
              </span>
              <StatusBadge status={study.status} />
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                {study.phase} · {study.study_type}
              </span>
              <span className={`px-2.5 py-1 text-xs font-black rounded-lg border uppercase tracking-wider ${riskBadge(risk.risk_level)}`}>
                Risk: {risk.risk_level} ({risk.score}/100)
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-100 leading-tight max-w-3xl">{study.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-teal-400" /><strong className="text-slate-300">{study.principal_investigator}</strong></span>
              <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-500" />{study.sponsor}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-500" />Started: {study.start_date || "—"}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-500" />Expected End: {study.expected_end_date || "—"}</span>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-3 lg:items-end">
            <button onClick={load} className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/40 transition-all flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            {preflightData && (
              <div className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                preflightData.ready_for_activation
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30"
              }`}>
                {preflightData.ready_for_activation
                  ? <><CheckCircle2 className="w-3.5 h-3.5" /> Activation Ready</>
                  : <><AlertTriangle className="w-3.5 h-3.5" /> Activation Blocked</>
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 1: RISK INTELLIGENCE + FUNNEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Risk Intelligence Panel (3 cols) */}
        <div className="lg:col-span-3 p-5 rounded-2xl ctms-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Risk Intelligence Engine</h2>
            </div>
            <div className={`text-3xl font-black font-mono ${riskColor(risk.risk_level)}`}>{risk.score}<span className="text-base text-slate-500 font-semibold">/100</span></div>
          </div>

          {/* Dimension Bars */}
          <div className="space-y-2.5">
            {dimensions.map(d => (
              <div key={d.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-semibold">{d.label}</span>
                  <span className="font-mono font-bold text-slate-200">{d.score}<span className="text-slate-500">/{d.max}</span></span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${d.score > 0 ? d.color : "bg-emerald-500/30"}`}
                    style={{ width: `${d.score > 0 ? (d.score / d.max) * 100 : 5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Primary Driver */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
              <Info className="w-3 h-3 text-teal-400" /> Primary Risk Driver
            </div>
            <p className="text-slate-200 font-semibold leading-snug">{risk.primary_driver}</p>
            <div className="flex items-center gap-4 font-mono text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              <span>Actual Pace: <strong className="text-slate-300">{risk.current_recruitment_pace}/wk</strong></span>
              <span>Expected: <strong className="text-slate-300">{risk.expected_recruitment_pace}/wk</strong></span>
            </div>
          </div>

          {/* Recommended Actions */}
          {risk.recommended_actions && risk.recommended_actions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-700/40 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase">
                <Lightbulb className="w-3 h-3" /> Recommended Actions ({risk.recommended_actions.length})
              </div>
              <ul className="space-y-2">
                {risk.recommended_actions.map((action: string, idx: number) => {
                  const roleMatch = action.match(/^\[([^\]]+)\]/);
                  const roleLabel = roleMatch ? roleMatch[1] : null;
                  const text = roleMatch ? action.slice(roleMatch[0].length + 1) : action;
                  return (
                    <li key={idx} className="text-[11px] text-slate-300 leading-snug flex gap-2">
                      <span className="text-amber-400 font-bold mt-0.5">›</span>
                      <span>
                        {roleLabel && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded mr-1.5 border border-amber-500/20">
                            {roleLabel}
                          </span>
                        )}
                        {text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Enrollment Funnel (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl ctms-card space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Enrollment Funnel</h2>
          </div>

          <div className="space-y-2.5">
            {funnelSteps.map((step) => (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">{step.label}</span>
                  <span className="font-mono font-bold text-slate-200">{step.count}</span>
                </div>
                <div className="h-5 bg-slate-800 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full rounded-lg ${step.color} opacity-80 transition-all duration-700 flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max((step.count / maxFunnel) * 100, step.count > 0 ? 8 : 0)}%` }}
                  >
                    {step.count > 0 && (
                      <span className="text-white text-[10px] font-black">{step.count}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Enrollment Progress */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Overall Enrollment Progress</span>
              <span className="font-mono font-bold text-slate-200">{kpis.current_enrollment}/{kpis.target_enrollment}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${Math.min(100, kpis.recruitment_percentage)}%` }}
              />
            </div>
            <p className="text-right text-[10px] font-mono text-teal-400 font-bold">{kpis.recruitment_percentage}% of target</p>
          </div>

          {/* KPI mini-grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <p className="text-slate-500 text-[10px] font-semibold uppercase">Active Sites</p>
              <p className="text-lg font-black text-teal-400 font-mono">{kpis.active_sites}<span className="text-slate-500 text-xs">/{kpis.total_sites}</span></p>
            </div>
            <div className={`p-2.5 rounded-xl border text-center ${kpis.overdue_milestones_count > 0 ? "bg-rose-950/20 border-rose-800/40" : "bg-slate-900 border-slate-800"}`}>
              <p className="text-slate-500 text-[10px] font-semibold uppercase">Overdue</p>
              <p className={`text-lg font-black font-mono ${kpis.overdue_milestones_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>{kpis.overdue_milestones_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: SITES TABLE ── */}
      <div className="p-5 rounded-2xl ctms-card space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Building2 className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Trial Sites — Per-Site Accrual</h2>
          <span className="ml-auto text-xs text-slate-500 font-mono">{sites.length} site(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                <th className="pb-2 pr-4">Site / Institution</th>
                <th className="pb-2 pr-4">Location</th>
                <th className="pb-2 pr-4">Investigator</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Accrual</th>
                <th className="pb-2">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sites.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-slate-500 italic">No sites assigned to this study.</td></tr>
              ) : sites.map((site: any) => (
                <tr key={site.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="font-bold text-slate-100">{site.site_name}</p>
                    <p className="text-[10px] text-slate-500">{site.institution}</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-400">{site.location}</td>
                  <td className="py-3 pr-4 text-slate-300 font-medium">{site.investigator}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      site.status === "Active"    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" :
                      site.status === "Suspended" ? "bg-rose-500/10 text-rose-300 border-rose-500/30" :
                      site.status === "Pending"   ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
                                                    "bg-slate-800 text-slate-400 border-slate-700"
                    }`}>
                      {site.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-200 font-bold">
                    {site.current_enrollment}<span className="text-slate-500">/{site.target_enrollment}</span>
                  </td>
                  <td className="py-3 min-w-[120px]">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          site.recruitment_percentage >= 70 ? "bg-emerald-500" :
                          site.recruitment_percentage >= 40 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, site.recruitment_percentage)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">{site.recruitment_percentage}%</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ROW 3: MILESTONES TIMELINE ── */}
      <div className="p-5 rounded-2xl ctms-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Regulatory Milestone Timeline</h2>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
            <span className="text-emerald-400">✓ {milestones.filter((m: any) => m.status === "Completed").length} Complete</span>
            <span className="text-rose-400">✗ {kpis.overdue_milestones_count} Overdue</span>
            <span className="text-amber-400">◷ {kpis.upcoming_milestones_count} Upcoming</span>
          </div>
        </div>

        <div className="space-y-2">
          {milestones.length === 0 ? (
            <p className="text-center text-slate-500 italic text-xs py-6">No milestones recorded for this study.</p>
          ) : milestones.map((m: any) => {
            const isOverdue = m.is_overdue || (m.planned_date < today && m.status !== "Completed");
            const isCompleted = m.status === "Completed";
            const preflightItem = preflightMilestoneMap[m.id];
            const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(m.planned_date).getTime()) / 86400000) : 0;

            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl border-l-4 text-xs flex items-start justify-between gap-4 transition-all ${milestoneRowColor(m, today)} ${
                  isCompleted ? "bg-slate-950 border border-slate-800/60" :
                  isOverdue   ? "bg-rose-950/15 border border-rose-800/40" :
                                "bg-slate-900/80 border border-slate-800"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isOverdue ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-100 leading-snug">{m.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                        {m.milestone_type}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        isCompleted ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                        isOverdue   ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                                      "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 font-mono text-[10px] text-slate-500">
                      <span>Planned: <strong className="text-slate-400">{m.planned_date}</strong></span>
                      {m.actual_date && <span>Completed: <strong className="text-emerald-400">{m.actual_date}</strong></span>}
                      {isOverdue && <span className="text-rose-400 font-bold">{daysOverdue} day(s) overdue</span>}
                    </div>
                    {m.notes && <p className="mt-1 text-slate-500 text-[10px] italic">{m.notes}</p>}
                  </div>
                </div>

                {/* Resolve button — shown for failed preflight items with milestone_id */}
                {!isCompleted && preflightItem && !preflightItem.passed && canResolve && (
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
      </div>

      {/* ── ROW 4: ACTIVE ALERTS ── */}
      {alerts && alerts.length > 0 && (
        <div className="p-5 rounded-2xl ctms-card space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Active Alerts</h2>
            <span className="ml-auto px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">{alerts.length}</span>
          </div>
          <div className="space-y-2">
            {alerts.map((alert: any) => (
              <div key={alert.id} className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                alert.severity === "CRITICAL" ? "bg-rose-950/20 border-rose-700/40" :
                alert.severity === "HIGH"     ? "bg-amber-950/15 border-amber-700/40" :
                                                "bg-slate-900 border-slate-800"
              }`}>
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                  alert.severity === "CRITICAL" ? "text-rose-400" :
                  alert.severity === "HIGH"     ? "text-amber-400" : "text-slate-500"
                }`} />
                <div>
                  <p className="font-bold text-slate-100">{alert.title}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{alert.message}</p>
                </div>
                <span className={`ml-auto shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                  alert.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border-rose-500/30" :
                  alert.severity === "HIGH"     ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                                                  "bg-slate-800 text-slate-400 border-slate-700"
                }`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
