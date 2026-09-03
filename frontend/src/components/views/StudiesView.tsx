"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  Plus,
  Filter,
  FlaskConical,
  Building2,
  Users,
  Flag,
  Calendar,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

interface StudiesViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onNavigateTab: (tab: string, studyId?: number) => void;
  onRefresh: () => void;
}

export const StudiesView: React.FC<StudiesViewProps> = ({
  studies,
  selectedStudyId,
  onSelectStudy,
  onNavigateTab,
  onRefresh
}) => {
  const { user } = useAuth();
  const canModify = user?.user_role === "Administrator" || user?.user_role === "Principal Investigator" || user?.user_role === "Study Coordinator";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Study detail from /dashboard/studies/{id}
  const [studyDetail, setStudyDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formData, setFormData] = useState({
    protocol_number: "",
    title: "",
    short_title: "",
    study_type: "Interventional",
    intervention_type: "Ayurvedic Formulation",
    phase: "Phase 2",
    sponsor: "All India Institute of Ayurveda",
    principal_investigator: user?.user_name || "Dr. Mahesh Vyas",
    target_enrollment: 100,
    status: "Draft",
    description: ""
  });

  useEffect(() => {
    if (selectedStudyId) {
      loadStudyDetail(selectedStudyId);
    } else {
      setStudyDetail(null);
    }
  }, [selectedStudyId]);

  const loadStudyDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const data = await fetchAPI(`/dashboard/studies/${id}`);
      setStudyDetail(data);
    } catch (err) {
      console.error("Failed to load study detail", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = studies.filter((s) => {
    const matchSearch =
      s.protocol_number.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.short_title.toLowerCase().includes(search.toLowerCase()) ||
      s.principal_investigator.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? s.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await fetchAPI("/studies", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "Failed to create study");
    } finally {
      setSubmitting(false);
    }
  };

  const riskColor = (level: string) => {
    if (level === "CRITICAL") return "text-rose-400";
    if (level === "HIGH") return "text-amber-400";
    if (level === "MEDIUM") return "text-sky-400";
    return "text-emerald-400";
  };
  const riskBg = (level: string) => {
    if (level === "CRITICAL") return "bg-rose-500/20 border-rose-500/30 text-rose-300";
    if (level === "HIGH") return "bg-amber-500/20 border-amber-500/30 text-amber-300";
    if (level === "MEDIUM") return "bg-sky-500/20 border-sky-500/30 text-sky-300";
    return "bg-emerald-500/20 border-emerald-500/30 text-emerald-300";
  };

  // ─── STUDY DETAIL PANEL ───────────────────────────────────────────────────
  if (selectedStudyId && (studyDetail || detailLoading)) {
    const today = new Date().toISOString().split("T")[0];

    return (
      <div className="space-y-5">
        {/* Back nav */}
        <button
          onClick={() => onSelectStudy(undefined)}
          className="flex items-center gap-2 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Clinical Trials Directory
        </button>

        {detailLoading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse">
            Loading study workspace...
          </div>
        ) : studyDetail ? (
          <>
            {/* Study Identity Card */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div>
                  <span className="font-mono text-xs font-bold text-teal-400">{studyDetail.study.protocol_number}</span>
                  <h2 className="text-lg font-bold text-slate-100 mt-1 leading-tight">{studyDetail.study.short_title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">{studyDetail.study.title}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={studyDetail.study.status} />
                  <span className={`px-3 py-1.5 rounded-lg border text-sm font-extrabold font-mono ${riskBg(studyDetail.risk.risk_level)}`}>
                    {studyDetail.risk.score} {studyDetail.risk.risk_level} RISK
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-800 pt-3">
                <div><p className="text-slate-400 mb-0.5">PI</p><p className="font-semibold text-slate-200">{studyDetail.study.principal_investigator}</p></div>
                <div><p className="text-slate-400 mb-0.5">Phase</p><p className="font-semibold text-slate-200">{studyDetail.study.phase}</p></div>
                <div><p className="text-slate-400 mb-0.5">Type</p><p className="font-semibold text-slate-200">{studyDetail.study.study_type}</p></div>
                <div><p className="text-slate-400 mb-0.5">Sponsor</p><p className="font-semibold text-slate-200 truncate">{studyDetail.study.sponsor}</p></div>
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Enrollment</p>
                <p className="text-2xl font-extrabold text-slate-100 mt-1">
                  {studyDetail.kpis.current_enrollment}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ {studyDetail.kpis.target_enrollment}</span>
                </p>
                <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(studyDetail.kpis.recruitment_percentage, 100)}%` }} />
                </div>
                <p className="text-[11px] text-teal-400 mt-1 font-semibold">{studyDetail.kpis.recruitment_percentage}% enrolled</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Sites</p>
                <p className="text-2xl font-extrabold text-slate-100 mt-1">{studyDetail.kpis.active_sites} <span className="text-xs font-normal text-slate-400">/ {studyDetail.kpis.total_sites} active</span></p>
                <p className="text-[11px] text-slate-400 mt-1">Across {studyDetail.sites.length} sites</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Overdue Milestones</p>
                <p className={`text-2xl font-extrabold mt-1 ${studyDetail.kpis.overdue_milestones_count > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {studyDetail.kpis.overdue_milestones_count}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{studyDetail.kpis.upcoming_milestones_count} upcoming</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Participants</p>
                <p className="text-2xl font-extrabold text-slate-100 mt-1">{studyDetail.kpis.enrolled_count + studyDetail.kpis.randomized_count}</p>
                <p className="text-[11px] text-slate-400 mt-1">{studyDetail.kpis.screened_count} screened | {studyDetail.kpis.withdrawn_count} withdrawn</p>
              </div>
            </div>

            {/* Risk Breakdown */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-teal-400" />
                Deterministic Risk Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                {[
                  { label: "Recruitment", val: studyDetail.risk.recruitment_score },
                  { label: "Compliance", val: studyDetail.risk.compliance_score },
                  { label: "Data Quality", val: studyDetail.risk.data_quality_score },
                  { label: "Deviations", val: studyDetail.risk.deviation_score },
                  { label: "Safety", val: studyDetail.risk.safety_score },
                ].map(({ label, val }) => (
                  <div key={label} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
                    <p className={`text-xl font-extrabold font-mono mt-1 ${val >= 15 ? "text-rose-400" : val >= 8 ? "text-amber-400" : "text-emerald-400"}`}>+{val}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Primary Risk Driver</p>
                  <p className="font-semibold text-slate-200">{studyDetail.risk.primary_driver}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Pace: {studyDetail.risk.current_recruitment_pace}/wk vs required {studyDetail.risk.expected_recruitment_pace}/wk
                  </p>
                </div>
              </div>
            </div>

            {/* Sites Table */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-400" /> Trial Sites
                </h3>
                <button
                  onClick={() => onNavigateTab("sites", selectedStudyId)}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                >
                  Manage Sites <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="pb-2">Site</th>
                      <th className="pb-2">Location</th>
                      <th className="pb-2">Investigator</th>
                      <th className="pb-2">Enrollment</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {studyDetail.sites.map((site: any) => {
                      const isLow = site.recruitment_percentage < 50;
                      return (
                        <tr key={site.id} className={`hover:bg-slate-800/40 transition-colors ${isLow ? "bg-amber-950/10" : ""}`}>
                          <td className="py-2.5">
                            <p className="font-bold text-slate-100">{site.site_name}</p>
                            <p className="font-mono text-[10px] text-teal-400">{site.site_code}</p>
                          </td>
                          <td className="py-2.5 text-slate-300">{site.location}</td>
                          <td className="py-2.5 text-slate-300">{site.investigator}</td>
                          <td className="py-2.5">
                            <span className="font-semibold text-slate-200">{site.current_enrollment}/{site.target_enrollment}</span>
                            <span className={`ml-1.5 text-[10px] font-bold ${isLow ? "text-amber-400" : "text-teal-400"}`}>
                              ({site.recruitment_percentage}%)
                            </span>
                          </td>
                          <td className="py-2.5"><StatusBadge status={site.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Milestones */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-400" /> Milestones
                </h3>
                <button
                  onClick={() => onNavigateTab("milestones", selectedStudyId)}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {studyDetail.milestones.map((m: any) => (
                  <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                    m.is_overdue ? "bg-rose-950/20 border-rose-800/40" :
                    m.status === "Completed" ? "bg-slate-950 border-slate-800" :
                    "bg-slate-950 border-slate-800"
                  }`}>
                    <div className="flex items-center gap-2">
                      {m.status === "Completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : m.is_overdue ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <p className={`font-semibold ${m.is_overdue ? "text-rose-300" : "text-slate-200"}`}>{m.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{m.milestone_type}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-[10px] text-slate-400">{m.planned_date}</p>
                      <span className={`text-[10px] font-bold uppercase ${
                        m.status === "Completed" ? "text-emerald-400" :
                        m.is_overdue ? "text-rose-400" : "text-slate-400"
                      }`}>{m.is_overdue ? "OVERDUE" : m.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Alerts */}
            {studyDetail.alerts.length > 0 && (
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Active Alerts ({studyDetail.alerts.length})
                </h3>
                <div className="space-y-2">
                  {studyDetail.alerts.map((alert: any) => (
                    <div key={alert.id} className={`p-3 rounded-lg border text-xs ${
                      alert.severity === "CRITICAL" ? "bg-rose-950/20 border-rose-800/40" :
                      alert.severity === "HIGH" ? "bg-amber-950/20 border-amber-800/40" :
                      "bg-slate-950 border-slate-800"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          alert.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                          alert.severity === "HIGH" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                          "bg-slate-800 text-slate-300"
                        }`}>[{alert.severity}]</span>
                        <span className="text-[10px] text-slate-500 font-mono">{alert.alert_type}</span>
                      </div>
                      <p className="font-bold text-slate-100 mt-1.5">{alert.title}</p>
                      <p className="text-slate-300 mt-0.5 leading-relaxed">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation shortcuts */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onNavigateTab("safety", selectedStudyId)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition-colors flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Safety Events
              </button>
              <button onClick={() => onNavigateTab("compliance", selectedStudyId)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-600/20 text-teal-300 border border-teal-500/30 hover:bg-teal-600/30 transition-colors flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Pre-Flight Check
              </button>
              <button onClick={() => onNavigateTab("milestones", selectedStudyId)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Milestones
              </button>
              <button onClick={() => onNavigateTab("participants", selectedStudyId)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Participants
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  // ─── STUDY LIST ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-400" />
            Clinical Trials Directory
          </h2>
          <p className="text-xs text-slate-400">Search, monitor and govern active clinical protocols</p>
        </div>

        {canModify && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Clinical Trial
          </button>
        )}
      </div>

      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by protocol #, title, PI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending IEC Approval">Pending IEC Approval</option>
            <option value="IEC Approved">IEC Approved</option>
            <option value="CTRI Registered">CTRI Registered</option>
            <option value="Recruiting">Recruiting</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-4">Protocol #</th>
                <th className="p-4">Short Title</th>
                <th className="p-4">Phase & Type</th>
                <th className="p-4">Principal Investigator</th>
                <th className="p-4">Target / Enrolled</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    No clinical studies found matching search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-teal-300 font-mono">{s.protocol_number}</td>
                    <td className="p-4 text-slate-100 font-medium max-w-[220px] truncate">{s.short_title}</td>
                    <td className="p-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-medium mr-1.5">{s.phase}</span>
                      <span className="text-slate-400">{s.study_type}</span>
                    </td>
                    <td className="p-4 text-slate-300">{s.principal_investigator}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-300">
                          <span>{s.current_enrollment} / {s.target_enrollment}</span>
                          <span className="font-bold text-teal-400">{s.recruitment_percentage}%</span>
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(s.recruitment_percentage, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><StatusBadge status={s.status} /></td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onSelectStudy(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30 transition-all flex items-center gap-1 ml-auto"
                      >
                        Open Workspace <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Study Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-teal-400" />
                Register New Clinical Study Protocol
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">{formError}</div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Protocol Number *</label>
                  <input type="text" required placeholder="e.g. AIIA-CT-2025-007"
                    value={formData.protocol_number}
                    onChange={(e) => setFormData({ ...formData, protocol_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Short Title *</label>
                  <input type="text" required placeholder="e.g. Ashwagandha Fatigue Study"
                    value={formData.short_title}
                    onChange={(e) => setFormData({ ...formData, short_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Protocol Title *</label>
                <textarea required rows={2} placeholder="Enter full descriptive study title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Phase</label>
                  <select value={formData.phase} onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none">
                    <option>Phase 1</option><option>Phase 2</option><option>Phase 3</option><option>Phase 4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Intervention Type</label>
                  <select value={formData.intervention_type} onChange={(e) => setFormData({ ...formData, intervention_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none">
                    <option>Ayurvedic Formulation</option><option>Herbomineral</option><option>Herbal Extract</option><option>Yoga / Panchakarma</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Enrollment</label>
                  <input type="number" min={1} value={formData.target_enrollment}
                    onChange={(e) => setFormData({ ...formData, target_enrollment: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Principal Investigator</label>
                  <input type="text" required value={formData.principal_investigator}
                    onChange={(e) => setFormData({ ...formData, principal_investigator: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Sponsor</label>
                  <input type="text" required value={formData.sponsor}
                    onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2">
                  {submitting ? "Creating..." : "Save Protocol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
