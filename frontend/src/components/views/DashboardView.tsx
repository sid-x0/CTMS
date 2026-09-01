"use client";

import React from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Building2,
  Users,
  FlaskConical,
  HelpCircle
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

interface DashboardViewProps {
  data: any;
  onNavigateTab: (tab: string, studyId?: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ data, onNavigateTab }) => {
  const { user } = useAuth();

  if (!data || !data.kpis) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse">
        Loading AIIA Operational Research Intelligence...
      </div>
    );
  }

  const { kpis, risk_distribution, attention_required, recruitment_trajectory, studies, upcoming_deadlines } = data;

  // Filter studies according to active role context for role-based dynamic prioritization
  const role = user?.user_role || "Principal Investigator";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1">
            <span>Operational Governance Command Center</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 leading-tight">
            Research Portfolio Executive Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time monitoring of study execution, safety signals, site performance, and regulatory deadlines across AIIA.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab("safety")}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            PV Safety Center
          </button>

          <button
            onClick={() => onNavigateTab("compliance")}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-600/20 text-teal-300 border border-teal-500/30 hover:bg-teal-600/30 transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            Pre-Flight Activation
          </button>
        </div>
      </div>

      {/* SECTION 1: PORTFOLIO EXECUTIVE SUMMARY (Compact & Clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => onNavigateTab("studies")}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-slate-700 transition-colors"
        >
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Studies</p>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{kpis.active_studies} <span className="text-xs text-slate-400 font-normal">/ {kpis.total_studies}</span></h3>
          <p className="text-[11px] text-teal-400 mt-1 flex items-center gap-1">
            <FlaskConical className="w-3 h-3" /> View Portfolio
          </p>
        </button>

        <button
          onClick={() => onNavigateTab("studies")}
          className="p-4 rounded-xl bg-slate-900 border border-rose-900/40 text-left hover:border-rose-700/50 transition-colors"
        >
          <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">At Risk Trials</p>
          <h3 className="text-2xl font-extrabold text-rose-300 mt-1">{kpis.at_risk_studies_count}</h3>
          <p className="text-[11px] text-rose-400 mt-1 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Requires Action
          </p>
        </button>

        <button
          onClick={() => onNavigateTab("participants")}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-slate-700 transition-colors"
        >
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Enrolled Subjects</p>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{kpis.total_enrolled} <span className="text-xs text-slate-400 font-normal">/ {kpis.total_target_enrollment}</span></h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {kpis.overall_recruitment_percentage}% target pace
          </p>
        </button>

        <button
          onClick={() => onNavigateTab("alerts")}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-slate-700 transition-colors"
        >
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Open Actions</p>
          <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{kpis.open_actions_count}</h3>
          <p className="text-[11px] text-amber-400/90 mt-1 font-medium">
            Pending review
          </p>
        </button>

        <button
          onClick={() => onNavigateTab("milestones")}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-slate-700 transition-colors"
        >
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue Items</p>
          <h3 className="text-2xl font-extrabold text-rose-400 mt-1">{kpis.overdue_milestones_count}</h3>
          <p className="text-[11px] text-rose-400 mt-1">
            Past deadline
          </p>
        </button>
      </div>

      {/* SECTION 2: ATTENTION REQUIRED (Visual Focal Point) */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              ATTENTION REQUIRED — Clinical Research Actions
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{attention_required.length} Urgent Items</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attention_required.map((item: any) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border text-xs flex flex-col justify-between space-y-3 ${
                item.severity === "CRITICAL"
                  ? "bg-rose-950/20 border-rose-800/40 text-slate-200"
                  : item.severity === "HIGH"
                  ? "bg-amber-950/20 border-amber-800/40 text-slate-200"
                  : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    item.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                    item.severity === "HIGH" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                    "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  }`}>
                    [{item.severity}]
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {item.study_protocol}
                  </span>
                </div>

                <h4 className="font-bold text-slate-100 text-xs leading-snug">{item.title}</h4>
                <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">{item.issue}</p>
                
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 mt-2 font-mono">
                  <span>Metric: <strong className="text-slate-200">{item.metric_detail}</strong></span>
                  {item.time_remaining && (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.time_remaining}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400">Responsible: <strong className="text-slate-300">{item.responsible_role}</strong></span>
                <button
                  onClick={() => onNavigateTab(item.action_target, item.study_id)}
                  className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-sm"
                >
                  [{item.action_label}] <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: TRIAL RISK INTELLIGENCE (Explainable Risk Engine) */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-teal-400" />
              TRIAL RISK INTELLIGENCE — Deterministic Explainable Risk Assessment
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-factorial 0–100 risk scoring based on recruitment velocity, regulatory compliance, data quality, and safety signals.
            </p>
          </div>
          
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-rose-400 font-bold">CRITICAL: {risk_distribution.CRITICAL}</span>
            <span className="text-amber-400 font-bold">HIGH: {risk_distribution.HIGH}</span>
            <span className="text-sky-400 font-bold">MEDIUM: {risk_distribution.MEDIUM}</span>
            <span className="text-emerald-400 font-bold">LOW: {risk_distribution.LOW}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studies.map((st: any) => {
            const risk = st.risk;
            return (
              <div
                key={st.id}
                className={`p-4 rounded-xl border space-y-3 ${
                  risk.risk_level === "CRITICAL" ? "bg-rose-950/20 border-rose-800/40" :
                  risk.risk_level === "HIGH" ? "bg-amber-950/20 border-amber-800/40" :
                  "bg-slate-950 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-teal-400">{st.protocol_number}</span>
                    <h4 className="font-bold text-xs text-slate-100 mt-0.5">{st.short_title}</h4>
                    <p className="text-[10px] text-slate-400">PI: {st.principal_investigator}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-extrabold font-mono ${
                      risk.risk_level === "CRITICAL" ? "text-rose-400" :
                      risk.risk_level === "HIGH" ? "text-amber-400" :
                      "text-emerald-400"
                    }`}>
                      {risk.score}
                    </span>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${
                      risk.risk_level === "CRITICAL" ? "text-rose-400" :
                      risk.risk_level === "HIGH" ? "text-amber-400" :
                      "text-emerald-400"
                    }`}>
                      {risk.risk_level} RISK
                    </p>
                  </div>
                </div>

                {/* Score Breakdown Bar */}
                <div className="space-y-1 text-[10px] border-t border-slate-800/80 pt-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Recruitment: +{risk.recruitment_score}</span>
                    <span>Compliance: +{risk.compliance_score}</span>
                    <span>Data Quality: +{risk.data_quality_score}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Deviations: +{risk.deviation_score}</span>
                    <span>Safety: +{risk.safety_score}</span>
                  </div>
                </div>

                {/* Primary Driver */}
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 text-[11px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Risk Driver:</p>
                  <p className="font-semibold text-slate-200 mt-0.5">{risk.primary_driver}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Enrolled: {st.current_enrollment}/{st.target_enrollment} ({st.recruitment_percentage}%) | Pace: {risk.current_recruitment_pace}/wk vs req {risk.expected_recruitment_pace}/wk
                  </p>
                </div>

                <button
                  onClick={() => onNavigateTab("studies", st.id)}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1"
                >
                  [Investigate Trial] <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: RECRUITMENT TRAJECTORY & UPCOMING DEADLINES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trajectory Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                Portfolio Enrollment Trajectory: Expected vs Actual
              </h3>
              <p className="text-xs text-slate-400">Tracking cumulative recruitment trajectory against institutional baseline target</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recruitment_trajectory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="expected" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} name="Expected Baseline" />
                <Line type="monotone" dataKey="actual" stroke="#0d9488" strokeWidth={2.5} name="Actual Enrolled" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Regulatory & Safety Deadlines (1 col) */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Upcoming Regulatory Deadlines
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {upcoming_deadlines.map((m: any) => (
              <div key={m.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">{m.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Target: {m.planned_date}</p>
                </div>
                <button
                  onClick={() => onNavigateTab("milestones")}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] font-semibold"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5: OPERATIONAL CLINICAL STUDIES DIRECTORY */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Studies Requiring Operational Intervention
          </h3>
          <button
            onClick={() => onNavigateTab("studies")}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            View Complete Directory <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-2">Protocol #</th>
                <th className="pb-2">Title</th>
                <th className="pb-2">PI</th>
                <th className="pb-2">Sites</th>
                <th className="pb-2">Enrolment</th>
                <th className="pb-2">Risk Score</th>
                <th className="pb-2">Safety / Deviations</th>
                <th className="pb-2">Next Milestone</th>
                <th className="pb-2 text-right">Command Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {studies.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-bold font-mono text-teal-300">{s.protocol_number}</td>
                  <td className="py-3 text-slate-100 font-semibold max-w-[200px] truncate">{s.short_title}</td>
                  <td className="py-3 text-slate-300">{s.principal_investigator}</td>
                  <td className="py-3 text-slate-300">{s.sites_count} sites</td>
                  <td className="py-3">
                    <span className="text-slate-200 font-semibold">{s.current_enrollment}/{s.target_enrollment}</span>
                    <span className="text-[10px] text-slate-400 ml-1 font-mono">({s.recruitment_percentage}%)</span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      s.risk.risk_level === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                      s.risk.risk_level === "HIGH" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                      "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}>
                      {s.risk.score} {s.risk.risk_level}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300">
                    <span className="text-rose-400 font-semibold">{s.open_safety_events} SAE/AE</span> | <span className="text-slate-400">{s.open_deviations} dev</span>
                  </td>
                  <td className="py-3 text-slate-400 max-w-[160px] truncate">{s.next_deadline}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onNavigateTab("studies", s.id)}
                      className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all shadow-sm"
                    >
                      [Open Workspace]
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
