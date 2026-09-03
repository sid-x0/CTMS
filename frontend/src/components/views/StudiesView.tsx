"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Search, Plus, FlaskConical, Building2, Users, Flag, Calendar,
  X, ChevronLeft, CheckCircle2, AlertTriangle, Clock, ShieldAlert, RefreshCw,
} from "lucide-react";

interface StudiesViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onNavigateTab: (tab: string, studyId?: number) => void;
  onRefresh: () => void;
}

function riskColors(level: string) {
  switch (level) {
    case "CRITICAL": return { score: "text-red-700", badge: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-500" };
    case "HIGH":     return { score: "text-amber-700", badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500" };
    case "MEDIUM":   return { score: "text-blue-700",  badge: "bg-blue-50 text-blue-700 border-blue-200",  bar: "bg-blue-400" };
    default:         return { score: "text-green-700", badge: "bg-green-50 text-green-700 border-green-200", bar: "bg-green-400" };
  }
}

export const StudiesView: React.FC<StudiesViewProps> = ({
  studies, selectedStudyId, onSelectStudy, onNavigateTab, onRefresh,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const canModify =
    user?.user_role === "Administrator" ||
    user?.user_role === "Principal Investigator" ||
    user?.user_role === "Study Coordinator";

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [formError, setFormError]         = useState("");
  const [studyDetail, setStudyDetail]     = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formData, setFormData] = useState({
    protocol_number: "", title: "", short_title: "",
    study_type: "Interventional", intervention_type: "Ayurvedic Formulation",
    phase: "Phase 2", sponsor: "All India Institute of Ayurveda",
    principal_investigator: user?.user_name || "Dr. Mahesh Vyas",
    target_enrollment: 100, status: "Draft", description: "",
  });

  useEffect(() => {
    if (selectedStudyId) loadStudyDetail(selectedStudyId);
    else setStudyDetail(null);
  }, [selectedStudyId]);

  const loadStudyDetail = async (id: number) => {
    setDetailLoading(true);
    try { setStudyDetail(await fetchAPI(`/dashboard/studies/${id}`)); }
    catch { /* silent */ }
    finally { setDetailLoading(false); }
  };

  const filtered = studies.filter(s => {
    const q = search.toLowerCase();
    const matchSearch =
      s.protocol_number.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.short_title.toLowerCase().includes(q) ||
      s.principal_investigator.toLowerCase().includes(q);
    return matchSearch && (statusFilter ? s.status === statusFilter : true);
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(""); setSubmitting(true);
    try {
      await fetchAPI("/studies", { method: "POST", body: JSON.stringify(formData) });
      setShowCreateModal(false); onRefresh();
    } catch (err: any) { setFormError(err.message || "Failed to create study"); }
    finally { setSubmitting(false); }
  };

  /* ── Detail Panel ── */
  if (selectedStudyId && (studyDetail || detailLoading)) {
    const today = new Date().toISOString().split("T")[0];
    const d = studyDetail;
    const rc = d ? riskColors(d.risk?.risk_level) : riskColors("LOW");

    return (
      <div className="space-y-5 max-w-6xl">
        <button onClick={() => onSelectStudy(undefined)} className="ctms-btn-ghost text-xs">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Study Directory
        </button>

        {detailLoading ? (
          <div className="flex items-center justify-center py-16 bg-white border border-slate-200 rounded-md">
            <RefreshCw className="w-4 h-4 animate-spin text-[#1e3a5f] mr-2" />
            <span className="text-sm text-slate-500">Loading study workspace…</span>
          </div>
        ) : d ? (
          <>
            {/* Study header */}
            <div className="bg-white border border-slate-200 rounded-md shadow-sm px-5 py-4 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-[#1e3a5f]">{d.study.protocol_number}</p>
                  <h1 className="text-lg font-bold text-[#0f172a] mt-1 leading-tight">{d.study.short_title}</h1>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{d.study.title}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <StatusBadge status={d.study.status} />
                  <div className="flex items-center gap-1.5">
                    <span className={`text-2xl font-black font-mono ${rc.score}`}>{d.risk.score}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${rc.badge}`}>{d.risk.risk_level} RISK</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-100 pt-3">
                {[
                  ["Principal Investigator", d.study.principal_investigator],
                  ["Phase", d.study.phase],
                  ["Study Type", d.study.study_type],
                  ["Sponsor", d.study.sponsor],
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <p className="ctms-section-title mb-0.5">{lbl}</p>
                    <p className="font-semibold text-slate-800 truncate">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="ctms-kpi">
                <div className="ctms-kpi-value">{d.kpis.current_enrollment}<span className="text-sm font-normal text-slate-400 ml-1">/ {d.kpis.target_enrollment}</span></div>
                <div className="ctms-kpi-label">Enrollment</div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-[#0f7b6c] rounded-full" style={{ width: `${Math.min(d.kpis.recruitment_percentage, 100)}%` }} />
                </div>
                <p className="text-[10px] text-[#0f7b6c] font-semibold mt-0.5">{d.kpis.recruitment_percentage}% recruited</p>
              </div>
              <div className={`ctms-kpi ${d.kpis.overdue_milestones_count > 0 ? "border-red-200 bg-red-50" : ""}`}>
                <div className={`ctms-kpi-value ${d.kpis.overdue_milestones_count > 0 ? "text-red-700" : "text-slate-800"}`}>{d.kpis.overdue_milestones_count}</div>
                <div className="ctms-kpi-label">Overdue Milestones</div>
                <p className="text-[10px] text-slate-400 mt-0.5">{d.kpis.upcoming_milestones_count} upcoming</p>
              </div>
              <div className="ctms-kpi">
                <div className="ctms-kpi-value">{d.kpis.active_sites}</div>
                <div className="ctms-kpi-label">Active Sites</div>
                <p className="text-[10px] text-slate-400 mt-0.5">{d.kpis.total_sites} total</p>
              </div>
              <div className={`ctms-kpi ${(d.kpis.open_safety_events ?? 0) > 0 ? "border-red-200 bg-red-50" : ""}`}>
                <div className={`ctms-kpi-value ${(d.kpis.open_safety_events ?? 0) > 0 ? "text-red-700" : "text-slate-800"}`}>{d.kpis.open_safety_events ?? 0}</div>
                <div className="ctms-kpi-label">Open SAEs</div>
                <p className="text-[10px] text-slate-400 mt-0.5">{d.kpis.enrolled_count + d.kpis.randomized_count} active subjects</p>
              </div>
            </div>

            {/* Risk factors */}
            {d.risk?.factors && (
              <div className="bg-white border border-slate-200 rounded-md shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">Risk Analysis</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Dynamic DB-derived risk engine · Factor breakdown</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-2xl font-black font-mono ${rc.score}`}>{d.risk.score}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${rc.badge}`}>{d.risk.risk_level}</span>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {Object.entries(d.risk.factors).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="w-40 text-[11px] text-slate-600 capitalize flex-shrink-0">{k.replace(/_/g, " ")}</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${rc.bar} rounded-full`} style={{ width: `${Math.min(100, v)}%` }} />
                      </div>
                      <span className="w-6 text-right text-xs font-mono font-bold text-slate-700">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick nav to sub-workspaces */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Users, label: "Participants", tab: "participants" },
                { icon: Building2, label: "Sites", tab: "sites" },
                { icon: Flag, label: "Milestones", tab: "milestones" },
                { icon: ShieldAlert, label: "Safety", tab: "safety" },
              ].map(({ icon: Icon, label, tab }) => (
                <button key={tab} onClick={() => onNavigateTab(tab, d.study.id)}
                  className="bg-white border border-slate-200 rounded-md px-4 py-3 text-left hover:border-[#1e3a5f]/30 hover:bg-blue-50 transition-colors group"
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#1e3a5f] mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-[#1e3a5f]">{label}</p>
                  <p className="text-[10px] text-slate-400">View →</p>
                </button>
              ))}
            </div>

            {/* Milestones summary */}
            {d.milestones?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-md shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">Protocol Milestones</h2>
                  <button onClick={() => onNavigateTab("milestones", d.study.id)} className="text-[10px] text-[#1e3a5f] hover:underline">View all</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {d.milestones.slice(0, 6).map((m: any) => {
                    const overdue = m.status !== "Completed" && m.planned_date < today;
                    return (
                      <div key={m.id} className={`px-4 py-2.5 flex items-center justify-between ${overdue ? "bg-red-50/40" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          {m.status === "Completed" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> :
                           overdue ? <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> :
                           <Clock className="w-3.5 h-3.5 text-amber-600" />}
                          <span className="text-xs text-slate-700">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{m.planned_date}</span>
                          {overdue ? <span className="ctms-badge-critical">Overdue</span> :
                           m.status === "Completed" ? <span className="ctms-badge-success">Done</span> :
                           <span className="ctms-badge-neutral">{m.status}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  }

  /* ── List view ── */
  const statuses = Array.from(new Set(studies.map(s => s.status))).sort();

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">Study Protocol Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">All clinical trial protocols · AIIA NPvCC portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="ctms-btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /></button>
          {canModify && (
            <button onClick={() => setShowCreateModal(true)} className="ctms-btn-primary">
              <Plus className="w-3.5 h-3.5" /> New Protocol
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1.5" />
          <input type="text" placeholder="Search protocol, title, PI…" value={search} onChange={e => setSearch(e.target.value)}
            className="ctms-input text-xs py-1.5 pl-8 w-full" aria-label="Search studies" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ctms-select text-xs py-1.5 max-w-xs" aria-label="Filter by status">
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="ctms-section-title">{filtered.length} protocol{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Study table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="ctms-table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Study</th>
                <th>Phase</th>
                <th>PI</th>
                <th>Status</th>
                <th>Enrollment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm italic">
                  {search || statusFilter ? "No studies match your filter." : "No studies found."}
                </td></tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} className="cursor-pointer" onClick={() => { onSelectStudy(s.id); loadStudyDetail(s.id); }}>
                    <td className="font-mono text-[11px] font-bold text-[#1e3a5f]">{s.protocol_number}</td>
                    <td>
                      <p className="text-xs font-semibold text-slate-800 max-w-[220px] truncate">{s.short_title}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[220px]">{s.title}</p>
                    </td>
                    <td><span className="ctms-badge-neutral">{s.phase}</span></td>
                    <td className="text-slate-600">{s.principal_investigator}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="min-w-[110px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">{s.current_enrollment}/{s.target_enrollment}</span>
                          <span className="text-slate-500">{s.recruitment_percentage ?? 0}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${(s.recruitment_percentage ?? 0) >= 70 ? "bg-green-500" : (s.recruitment_percentage ?? 0) >= 40 ? "bg-blue-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(100, s.recruitment_percentage ?? 0)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/studies/${s.id}`); }}
                        className="ctms-btn-secondary text-[10px] py-1 px-2"
                        aria-label={`Open study workspace: ${s.protocol_number}`}
                      >
                        Workspace
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="ctms-modal-overlay">
          <div className="ctms-modal max-w-2xl">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#1e3a5f]" /> Register New Protocol
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body">
              {formError && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{formError}</div>}
              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="ctms-label">Protocol Number *</label><input type="text" required placeholder="AYU-CT-2025-007" value={formData.protocol_number} onChange={e => setFormData({ ...formData, protocol_number: e.target.value })} className="ctms-input font-mono" /></div>
                  <div><label className="ctms-label">Phase</label><select value={formData.phase} onChange={e => setFormData({ ...formData, phase: e.target.value })} className="ctms-select"><option>Phase 1</option><option>Phase 2</option><option>Phase 3</option><option>Observational</option></select></div>
                </div>
                <div><label className="ctms-label">Full Protocol Title *</label><input type="text" required placeholder="Full title of study…" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="ctms-input" /></div>
                <div><label className="ctms-label">Short Title</label><input type="text" placeholder="Short display title…" value={formData.short_title} onChange={e => setFormData({ ...formData, short_title: e.target.value })} className="ctms-input" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="ctms-label">Intervention Type</label><input type="text" value={formData.intervention_type} onChange={e => setFormData({ ...formData, intervention_type: e.target.value })} className="ctms-input" /></div>
                  <div><label className="ctms-label">Principal Investigator</label><input type="text" required value={formData.principal_investigator} onChange={e => setFormData({ ...formData, principal_investigator: e.target.value })} className="ctms-input" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="ctms-label">Sponsor</label><input type="text" required value={formData.sponsor} onChange={e => setFormData({ ...formData, sponsor: e.target.value })} className="ctms-input" /></div>
                  <div><label className="ctms-label">Target Enrollment</label><input type="number" min={1} value={formData.target_enrollment} onChange={e => setFormData({ ...formData, target_enrollment: parseInt(e.target.value) || 0 })} className="ctms-input" /></div>
                </div>
                <div><label className="ctms-label">Description</label><textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="ctms-textarea" /></div>
                <div className="ctms-modal-footer -mx-5 -mb-4 mt-2 rounded-b-md">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="ctms-btn-ghost">Cancel</button>
                  <button type="submit" disabled={submitting} className="ctms-btn-primary">{submitting ? "Registering…" : "Register Protocol"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
