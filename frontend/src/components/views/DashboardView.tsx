"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  HelpCircle,
  Sparkles,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  Info,
  Layers,
  Lightbulb
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart
} from "recharts";

interface DashboardViewProps {
  data: any;
  onNavigateTab: (tab: string, studyId?: number) => void;
  loading?: boolean;
  onRetry?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ data, onNavigateTab, loading, onRetry }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [triageFilter, setTriageFilter] = useState<"ALL" | "CRITICAL" | "ACCRUAL" | "MILESTONES">("ALL");
  const [tableSearch, setTableSearch] = useState("");
  const [tableRiskFilter, setTableRiskFilter] = useState<string>("ALL");
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());

  const toggleActions = (studyId: number) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      next.has(studyId) ? next.delete(studyId) : next.add(studyId);
      return next;
    });
  };

  // Smart triage navigation: study-specific items go to /studies/[id], others go to their tab
  const handleTriageAction = (item: any) => {
    if (item.study_id && item.action_target === "safety") {
      router.push(`/safety`);
    } else if (item.study_id && item.action_target === "milestones") {
      router.push(`/milestones`);
    } else if (item.study_id && item.action_target === "sites") {
      router.push(`/sites`);
    } else if (item.study_id) {
      router.push(`/studies/${item.study_id}`);
    } else {
      onNavigateTab(item.action_target);
    }
  };

  if (!data || !data.kpis) {
    if (loading === false) {
      return (
        <div className="p-12 text-center text-slate-300 font-mono text-sm ctms-card flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
          <div>
            <p className="font-semibold text-rose-400 text-base">Failed to load Intelligence Data</p>
            <span className="text-xs text-slate-400">The connection to the CTMS backend could not be established.</span>
          </div>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 mt-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
          )}
        </div>
      );
    }
    
    return (
      <div className="p-12 text-center text-slate-300 font-mono text-sm ctms-card flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
        <p className="font-semibold text-slate-200">Loading AIIA Operational Research Intelligence...</p>
        <span className="text-xs text-slate-400">Synchronizing clinical sites, active protocols & pharmacovigilance registry</span>
      </div>
    );
  }

  const { kpis, risk_distribution, attention_required, recruitment_trajectory, studies, upcoming_deadlines } = data;

  // Filter Attention Required items based on selected tab
  const filteredAttention = attention_required.filter((item: any) => {
    if (triageFilter === "CRITICAL") return item.severity === "CRITICAL";
    if (triageFilter === "ACCRUAL") return item.title.toLowerCase().includes("recruitment") || item.title.toLowerCase().includes("accrual");
    if (triageFilter === "MILESTONES") return item.title.toLowerCase().includes("milestone") || item.title.toLowerCase().includes("clearance");
    return true;
  });

  // Filter studies table
  const filteredStudies = studies.filter((s: any) => {
    const matchesSearch =
      s.protocol_number.toLowerCase().includes(tableSearch.toLowerCase()) ||
      s.short_title.toLowerCase().includes(tableSearch.toLowerCase()) ||
      s.principal_investigator.toLowerCase().includes(tableSearch.toLowerCase());
    
    if (tableRiskFilter === "HIGH_CRITICAL") {
      return matchesSearch && (s.risk.risk_level === "CRITICAL" || s.risk.risk_level === "HIGH");
    }
    if (tableRiskFilter === "LOW_MEDIUM") {
      return matchesSearch && (s.risk.risk_level === "LOW" || s.risk.risk_level === "MEDIUM");
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. TOP INSTITUTIONAL COMMAND BANNER */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-teal-400 uppercase">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>AIIA Clinical Research Governance & Executive Command</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono">NPvCC Safety Node Active</span>
            </div>
            <h1 className="text-2xl font-black text-slate-50 tracking-tight leading-tight">
              Institutional Research Portfolio Overview
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time multi-site trial monitoring, ICH-GCP regulatory compliance, explainable risk scoring, and pharmacovigilance surveillance for All India Institute of Ayurveda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab("safety")}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-all flex items-center gap-2 shadow-sm group"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
              <span>PV Safety Center</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">1 SAE</span>
            </button>

            <button
              onClick={() => onNavigateTab("compliance")}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all flex items-center gap-2 shadow-sm group"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Pre-Flight Activation</span>
              <span className="text-[10px] text-emerald-400 font-mono">100% IEC</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECTION 1: HIGH-IMPACT CLINICAL KPI SCORECARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Active Protocols */}
        <button
          onClick={() => onNavigateTab("studies")}
          className="p-4 rounded-xl ctms-card ctms-card-hover text-left flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Protocols</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-all">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">{kpis.active_studies}</span>
              <span className="text-xs text-slate-400 font-medium">/ {kpis.total_studies} total</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${(kpis.active_studies / kpis.total_studies) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-teal-400 font-semibold pt-1 border-t border-slate-800/80">
            <span>Explore Portfolio</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 2: At-Risk Studies */}
        <button
          onClick={() => {
            setTableRiskFilter("HIGH_CRITICAL");
            const el = document.getElementById("clinical-directory-table");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="p-4 rounded-xl bg-slate-900 border border-rose-500/40 hover:border-rose-400 ctms-card-hover text-left flex flex-col justify-between group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">At-Risk Protocols</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-300 font-mono tracking-tight">{kpis.at_risk_studies_count}</span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                Action Required
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">SAE signals & recruitment lag</p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-rose-400 font-semibold pt-1 border-t border-rose-900/40">
            <span>Filter Risk Trials</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 3: Enrolled Subjects */}
        <button
          onClick={() => onNavigateTab("participants")}
          className="p-4 rounded-xl ctms-card ctms-card-hover text-left flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subject Accrual</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">{kpis.total_enrolled}</span>
              <span className="text-xs text-slate-400 font-medium">/ {kpis.total_target_enrollment}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, kpis.overall_recruitment_percentage)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-cyan-400 font-semibold pt-1 border-t border-slate-800/80">
            <span>{kpis.overall_recruitment_percentage}% Pace to Target</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 4: Open Actions */}
        <button
          onClick={() => onNavigateTab("alerts")}
          className="p-4 rounded-xl ctms-card ctms-card-hover text-left flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Actions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">{kpis.open_actions_count}</span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                Triage Queue
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">Pending monitor review</p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold pt-1 border-t border-slate-800/80">
            <span>Open Alert Center</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 5: Overdue Milestones */}
        <button
          onClick={() => onNavigateTab("milestones")}
          className="p-4 rounded-xl ctms-card ctms-card-hover text-left flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue Milestones</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-orange-300 font-mono tracking-tight">{kpis.overdue_milestones_count}</span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300">
                SLA Breached
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">Site monitoring & regulatory</p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-orange-400 font-semibold pt-1 border-t border-slate-800/80">
            <span>Inspect Timeline</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

      </div>

      {/* 3. SECTION 2: ATTENTION REQUIRED (Operational Clinical Triage) */}
      <div className="p-5 rounded-xl ctms-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                Operational Clinical Triage Queue
              </h2>
              <p className="text-xs text-slate-400">High-priority items requiring immediate investigator or sponsor action</p>
            </div>
          </div>

          {/* Triage Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setTriageFilter("ALL")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                triageFilter === "ALL" ? "bg-teal-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({attention_required.length})
            </button>
            <button
              onClick={() => setTriageFilter("CRITICAL")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                triageFilter === "CRITICAL" ? "bg-rose-500 text-white shadow" : "text-slate-400 hover:text-rose-400"
              }`}
            >
              Critical SAE (1)
            </button>
            <button
              onClick={() => setTriageFilter("ACCRUAL")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                triageFilter === "ACCRUAL" ? "bg-amber-500 text-white shadow" : "text-slate-400 hover:text-amber-400"
              }`}
            >
              Accrual Lag (2)
            </button>
            <button
              onClick={() => setTriageFilter("MILESTONES")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                triageFilter === "MILESTONES" ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-cyan-400"
              }`}
            >
              Milestones (5)
            </button>
          </div>
        </div>

        {/* Triage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredAttention.map((item: any) => {
            const isCritical = item.severity === "CRITICAL";
            const isHigh = item.severity === "HIGH";

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border text-xs flex flex-col justify-between transition-all duration-200 hover:shadow-lg ${
                  isCritical
                    ? "bg-rose-950/20 border-rose-600/50 text-slate-200 hover:border-rose-500"
                    : isHigh
                    ? "bg-amber-950/15 border-amber-600/40 text-slate-200 hover:border-amber-500"
                    : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isCritical ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" :
                        isHigh ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                        "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                      }`}>
                        [{item.severity}]
                      </span>
                      {isCritical && (
                        <span className="text-[10px] font-bold text-rose-400 uppercase bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          24h Mandate
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] font-bold text-teal-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      {item.study_protocol}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 text-xs leading-snug">{item.title}</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{item.issue}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                    <span>Param: <strong className="text-slate-200">{item.metric_detail}</strong></span>
                    {item.time_remaining && (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.time_remaining}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400">
                    Target Role: <strong className="text-slate-200">{item.responsible_role}</strong>
                  </div>
                  <button
                    onClick={() => handleTriageAction(item)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                      isCritical
                        ? "bg-rose-600 hover:bg-rose-500 text-white"
                        : "bg-teal-600 hover:bg-teal-500 text-white"
                    }`}
                  >
                    <span>{item.action_label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SECTION 3: TRIAL RISK INTELLIGENCE (Explainable Risk Assessment) */}
      <div className="p-5 rounded-xl ctms-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Deterministic Trial Risk Engine (0–100 Multi-Factorial)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated composite scoring: Accrual Velocity (30%), Regulatory/IEC (25%), Data Quality (20%), Safety/SAE (15%), Protocol Deviations (10%).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
              CRITICAL: {risk_distribution.CRITICAL}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
              HIGH: {risk_distribution.HIGH}
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold">
              MEDIUM: {risk_distribution.MEDIUM}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
              LOW: {risk_distribution.LOW}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studies.map((st: any) => {
            const risk = st.risk;
            const isHigh = risk.risk_level === "HIGH" || risk.risk_level === "CRITICAL";
            const isMedium = risk.risk_level === "MEDIUM";

            return (
              <div
                key={st.id}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all duration-200 hover:shadow-lg ${
                  risk.risk_level === "CRITICAL" ? "bg-rose-950/20 border-rose-800/50" :
                  risk.risk_level === "HIGH" ? "bg-amber-950/20 border-amber-800/50" :
                  risk.risk_level === "MEDIUM" ? "bg-sky-950/20 border-sky-800/50" :
                  "bg-slate-950/80 border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-teal-400">{st.protocol_number}</span>
                      <h3 className="font-bold text-xs text-slate-100 mt-0.5 leading-snug">{st.short_title}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">PI: <strong className="text-slate-300">{st.principal_investigator}</strong></p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`text-2xl font-black font-mono tracking-tight ${
                        risk.risk_level === "CRITICAL" ? "text-rose-400" :
                        risk.risk_level === "HIGH" ? "text-amber-400" :
                        risk.risk_level === "MEDIUM" ? "text-sky-400" :
                        "text-emerald-400"
                      }`}>
                        {risk.score}
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                        risk.risk_level === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" :
                        risk.risk_level === "HIGH" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                        risk.risk_level === "MEDIUM" ? "bg-sky-500/20 text-sky-300 border border-sky-500/40" :
                        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}>
                        {risk.risk_level}
                      </span>
                    </div>
                  </div>

                  {/* Visual Explainable Risk Factors */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Multi-Factor Breakdown:</span>
                      <span className="font-mono text-slate-300">Composite: {risk.score}/100</span>
                    </div>

                    {/* Horizontal Segmented Bar */}
                    <div className="h-2 w-full bg-slate-800 rounded-full flex overflow-hidden">
                      <div style={{ width: `${Math.min(100, risk.recruitment_score * 2.5)}%` }} className="bg-amber-500" title={`Recruitment: +${risk.recruitment_score}`} />
                      <div style={{ width: `${Math.min(100, risk.compliance_score * 2.5)}%` }} className="bg-cyan-500" title={`Compliance: +${risk.compliance_score}`} />
                      <div style={{ width: `${Math.min(100, risk.data_quality_score * 2.5)}%` }} className="bg-blue-500" title={`Data Quality: +${risk.data_quality_score}`} />
                      <div style={{ width: `${Math.min(100, risk.safety_score * 2.5)}%` }} className="bg-rose-500" title={`Safety: +${risk.safety_score}`} />
                      <div style={{ width: `${Math.min(100, risk.deviation_score * 2.5)}%` }} className="bg-purple-500" title={`Deviations: +${risk.deviation_score}`} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] text-slate-400 font-mono">
                      <span>Accrual: <strong className="text-slate-200">+{risk.recruitment_score}</strong></span>
                      <span>IEC: <strong className="text-slate-200">+{risk.compliance_score}</strong></span>
                      <span>Data: <strong className="text-slate-200">+{risk.data_quality_score}</strong></span>
                      <span>Safety: <strong className="text-rose-300">+{risk.safety_score}</strong></span>
                    </div>
                  </div>

                  {/* Primary Risk Driver */}
                  <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                      <Info className="w-3 h-3 text-teal-400" />
                      <span>Primary Risk Driver:</span>
                    </div>
                    <p className="font-semibold text-slate-200 mt-0.5 leading-tight">{risk.primary_driver}</p>
                    <div className="mt-1 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                      <span>Accrued: {st.current_enrollment}/{st.target_enrollment} ({st.recruitment_percentage}%)</span>
                      <span>Pace: {risk.current_recruitment_pace}/wk</span>
                    </div>
                  </div>

                  {/* Recommended Actions — toggleable */}
                  {risk.recommended_actions && risk.recommended_actions.length > 0 && (
                    <div className="mt-2.5">
                      <button
                        onClick={() => toggleActions(st.id)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-950/20 border border-amber-700/30 text-[10px] font-bold text-amber-400 hover:bg-amber-950/30 transition-all"
                      >
                        <span className="flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
                          {risk.recommended_actions.length} Recommended Action(s)
                        </span>
                        <ChevronRight className={`w-3 h-3 transition-transform ${expandedActions.has(st.id) ? "rotate-90" : ""}`} />
                      </button>
                      {expandedActions.has(st.id) && (
                        <ul className="mt-1.5 space-y-1.5 pl-1">
                          {risk.recommended_actions.map((action: string, idx: number) => {
                            const roleMatch = action.match(/^\[([^\]]+)\]/);
                            const roleLabel = roleMatch ? roleMatch[1] : null;
                            const text = roleMatch ? action.slice(roleMatch[0].length + 1) : action;
                            return (
                              <li key={idx} className="text-[10px] text-slate-400 leading-snug flex gap-1.5">
                                <span className="text-amber-400 font-bold">›</span>
                                <span>
                                  {roleLabel && (
                                    <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded mr-1 border border-amber-500/20">{roleLabel}</span>
                                  )}
                                  {text}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => router.push(`/studies/${st.id}`)}
                  className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-bold border border-slate-700/80 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Investigate Protocol</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SECTION 4: RECRUITMENT TRAJECTORY & UPCOMING REGULATORY DEADLINES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Trajectory Line Chart (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl ctms-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  Portfolio Subject Recruitment Trajectory: Planned vs Actual
                </h2>
                <p className="text-xs text-slate-400">Institutional cumulative accrual against CDSCO protocol milestone commitments</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-0.5 bg-slate-500 border-dashed" /> Expected Baseline
                </span>
                <span className="flex items-center gap-1.5 text-teal-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> Actual Accrued
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recruitment_trajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                      fontSize: "12px",
                      color: "#f8fafc"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expected"
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    name="Expected Target"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#0d9488"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    name="Actual Enrolled"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Current Accrual: <strong className="text-teal-400">{kpis.total_enrolled} Patients</strong></span>
            <span>Accrual Velocity: <strong className="text-slate-200">~24 patients / wk</strong> across 8 sites</span>
          </div>
        </div>

        {/* Regulatory & Ethics Deadlines (1 Col) */}
        <div className="p-5 rounded-xl ctms-card space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Upcoming Regulatory Deadlines
              </h2>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Ethics & CDSCO
              </span>
            </div>

            <div className="space-y-2.5 mt-3 max-h-64 overflow-y-auto pr-1">
              {upcoming_deadlines.map((m: any) => {
                const dateParts = (m.planned_date || "").split("-");
                const day = dateParts[2] || "15";
                const monthName = dateParts[1] === "09" ? "SEP" : dateParts[1] === "10" ? "OCT" : "AUG";

                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-2.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Date Badge */}
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-amber-400 leading-none">{monthName}</span>
                        <span className="text-sm font-black text-slate-100 leading-none mt-0.5 font-mono">{day}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-100 text-xs leading-snug">{m.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Target: {m.planned_date}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateTab("milestones")}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-teal-300 text-[11px] font-bold border border-slate-700 transition-colors flex-shrink-0"
                    >
                      View
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab("milestones")}
            className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center justify-center gap-1"
          >
            <span>View Complete Milestones Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 6. SECTION 5: CLINICAL STUDIES DIRECTORY TABLE */}
      <div id="clinical-directory-table" className="p-5 rounded-xl ctms-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-teal-400" />
              Clinical Studies Directory & Governance Status
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Active interventional and observational research studies under AIIA sponsorship</p>
          </div>

          {/* Table Controls: Search & Risk Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search protocol, PI..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 w-48"
              />
            </div>

            <select
              value={tableRiskFilter}
              onChange={(e) => setTableRiskFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH_CRITICAL">High & Critical Risk</option>
              <option value="LOW_MEDIUM">Low & Medium Risk</option>
            </select>

            <button
              onClick={() => onNavigateTab("studies")}
              className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 ml-2"
            >
              Full Directory <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs ctms-table">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th>Protocol #</th>
                <th>Clinical Title</th>
                <th>Principal Investigator</th>
                <th>Sites</th>
                <th>Accrual Progress</th>
                <th>Risk Profile</th>
                <th>PV Safety / Deviations</th>
                <th>Next Milestone</th>
                <th className="text-right">Workspace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredStudies.map((s: any) => {
                const isCritical = s.risk.risk_level === "CRITICAL";
                const isHigh = s.risk.risk_level === "HIGH";
                const isMedium = s.risk.risk_level === "MEDIUM";

                return (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="font-bold font-mono text-teal-400">
                      {s.protocol_number}
                    </td>

                    <td className="text-slate-100 font-semibold max-w-[220px]">
                      <div className="truncate" title={s.short_title || s.title}>{s.short_title || s.title}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{s.phase}</span>
                    </td>

                    <td className="text-slate-300">
                      {s.principal_investigator}
                    </td>

                    <td className="text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                        {s.sites_count} sites
                      </span>
                    </td>

                    <td>
                      <div className="space-y-1 min-w-[130px]">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-200 font-bold font-mono">{s.current_enrollment}/{s.target_enrollment}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({s.recruitment_percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-400 h-full rounded-full"
                            style={{ width: `${Math.min(100, s.recruitment_percentage)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono inline-flex items-center gap-1 ${
                        isCritical ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" :
                        isHigh ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                        isMedium ? "bg-sky-500/20 text-sky-300 border border-sky-500/40" :
                        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}>
                        {s.risk.score} {s.risk.risk_level}
                      </span>
                    </td>

                    <td className="text-slate-300">
                      <div className="flex items-center gap-1.5">
                        {s.open_safety_events > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                            {s.open_safety_events} SAE
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                            0 SAE
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          {s.open_deviations} dev
                        </span>
                      </div>
                    </td>

                    <td className="text-slate-400 max-w-[150px] truncate text-[11px]">
                      {s.next_deadline || "No deadline"}
                    </td>

                    <td className="text-right">
                      <button
                        onClick={() => router.push(`/studies/${s.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Open Study
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredStudies.length} of {studies.length} Clinical Protocols</span>
          <span className="font-mono text-[11px] text-teal-400">Schedule Y & NDCTR 2019 Regulatory Audit Aligned</span>
        </div>
      </div>

    </div>
  );
};
