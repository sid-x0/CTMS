"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Flag, Plus, Clock, CheckCircle2, AlertTriangle, Calendar, X, RefreshCw, Wrench } from "lucide-react";

interface MilestonesViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

type Section = "overdue" | "upcoming" | "completed";

function getMilestoneSection(m: any, today: string): Section {
  if (m.status === "Completed") return "completed";
  if (m.is_overdue || m.planned_date < today) return "overdue";
  return "upcoming";
}

const MILESTONE_TYPES = [
  "Protocol Finalized","IEC Submission","IEC Approval","CTRI Registration",
  "Site Activation","First Participant Enrolled","Recruitment Target Reached",
  "Last Participant Visit","Study Close-out",
];

export const MilestonesView: React.FC<MilestonesViewProps> = ({
  studies, selectedStudyId: propStudyId, onSelectStudy, onRefresh,
}) => {
  const { user } = useAuth();
  const canModify =
    user?.user_role === "Administrator" ||
    user?.user_role === "Principal Investigator" ||
    user?.user_role === "Study Coordinator";

  const today = new Date().toISOString().split("T")[0];

  const [selectedStudyId, setSelectedStudyId] = useState<number>(propStudyId || studies[0]?.id || 1);
  useEffect(() => { if (propStudyId) setSelectedStudyId(propStudyId); }, [propStudyId]);

  const [milestones, setMilestones]           = useState<any[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  const [submitting, setSubmitting]           = useState(false);
  const [errorMsg, setErrorMsg]               = useState("");
  const [resolvedIds, setResolvedIds]         = useState<Set<number>>(new Set());

  const [newMilestone, setNewMilestone] = useState({
    milestone_type: "Protocol Finalized", name: "", planned_date: today, notes: "",
  });
  const [updateStatus, setUpdateStatus] = useState("Completed");

  const loadMilestones = async () => {
    if (!selectedStudyId) return;
    setLoading(true);
    try { setMilestones(await fetchAPI(`/studies/${selectedStudyId}/milestones`)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };
  useEffect(() => { loadMilestones(); }, [selectedStudyId]);

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(""); setSubmitting(true);
    try {
      await fetchAPI(`/studies/${selectedStudyId}/milestones`, { method: "POST", body: JSON.stringify({ study_id: selectedStudyId, ...newMilestone }) });
      setShowAddModal(false);
      setNewMilestone({ milestone_type: "Protocol Finalized", name: "", planned_date: today, notes: "" });
      loadMilestones(); onRefresh();
    } catch (err: any) { setErrorMsg(err.message || "Failed to add milestone"); }
    finally { setSubmitting(false); }
  };

  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;
    setErrorMsg(""); setSubmitting(true);
    try {
      await fetchAPI(`/milestones/${selectedMilestone.id}`, { method: "PATCH", body: JSON.stringify({ status: updateStatus }) });
      if (updateStatus === "Completed") setResolvedIds(prev => new Set(prev).add(selectedMilestone.id));
      setSelectedMilestone(null);
      loadMilestones(); onRefresh();
    } catch (err: any) { setErrorMsg(err.message || "Failed to update milestone"); }
    finally { setSubmitting(false); }
  };

  const overdue   = milestones.filter(m => getMilestoneSection(m, today) === "overdue");
  const upcoming  = milestones.filter(m => getMilestoneSection(m, today) === "upcoming");
  const completed = milestones.filter(m => getMilestoneSection(m, today) === "completed");

  const sorted = [
    ...overdue.sort((a, b) => a.planned_date.localeCompare(b.planned_date)),
    ...upcoming.sort((a, b) => a.planned_date.localeCompare(b.planned_date)),
    ...completed.sort((a, b) => (b.actual_date || b.planned_date).localeCompare(a.actual_date || a.planned_date)),
  ];

  const activeStudy = studies.find(s => s.id === selectedStudyId);

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">Milestones &amp; Timeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">Study lifecycle milestones · Regulatory dates · Compliance gating</p>
        </div>
        <div className="flex items-center gap-2">
          {canModify && (
            <button onClick={() => setShowAddModal(true)} className="ctms-btn-primary" aria-label="Add Milestone">
              <Plus className="w-3.5 h-3.5" /> Add Milestone
            </button>
          )}
          <button onClick={loadMilestones} className="ctms-btn-ghost" aria-label="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Protocol selector + KPIs */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="ctms-section-title whitespace-nowrap">Protocol</label>
          <select
            value={selectedStudyId}
            onChange={e => { const id = parseInt(e.target.value); setSelectedStudyId(id); onSelectStudy(id); }}
            className="ctms-select text-xs py-1.5 max-w-xs"
            aria-label="Select protocol"
          >
            {studies.map(s => <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>)}
          </select>
          {activeStudy && <span className="ctms-badge-neutral text-[10px]">{activeStudy.status}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {overdue.length > 0 && <div className="ctms-kpi py-2 px-3 border-red-200 bg-red-50"><AlertTriangle className="w-3.5 h-3.5 text-red-600 inline mr-1" /><span className="text-sm font-black font-mono text-red-700">{overdue.length}</span><span className="text-[10px] text-red-600 ml-1">overdue</span></div>}
          <div className={`ctms-kpi py-2 px-3 ${upcoming.length > 0 ? "border-amber-200 bg-amber-50" : ""}`}>
            <span className={`text-sm font-black font-mono ${upcoming.length > 0 ? "text-amber-700" : "text-slate-600"}`}>{upcoming.length}</span>
            <span className={`text-[10px] ml-1 ${upcoming.length > 0 ? "text-amber-600" : "text-slate-500"}`}>upcoming</span>
          </div>
          <div className={`ctms-kpi py-2 px-3 ${completed.length > 0 ? "border-green-200 bg-green-50" : ""}`}>
            <span className={`text-sm font-black font-mono ${completed.length > 0 ? "text-green-700" : "text-slate-600"}`}>{completed.length}</span>
            <span className={`text-[10px] ml-1 ${completed.length > 0 ? "text-green-600" : "text-slate-500"}`}>completed</span>
          </div>
          <div className="ctms-kpi py-2 px-3"><span className="text-sm font-black font-mono text-slate-700">{milestones.length}</span><span className="text-[10px] text-slate-500 ml-1">total</span></div>
        </div>
      </div>

      {/* Attention callout */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-r-md px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-800">{overdue.length} Milestone{overdue.length !== 1 ? "s" : ""} Overdue</p>
            <p className="text-[11px] text-red-700 mt-0.5">Overdue milestones contribute to the study risk score. Use "Mark Complete" to update compliance preflight and audit trail.</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Timeline</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Ordered: overdue → upcoming → completed</p>
          </div>
          {milestones.length > 0 && (
            <div className="flex items-center gap-3 text-[11px] font-mono font-semibold">
              <span className="text-red-700">{overdue.length} overdue</span>
              <span className="text-slate-300">·</span>
              <span className="text-amber-700">{upcoming.length} upcoming</span>
              <span className="text-slate-300">·</span>
              <span className="text-green-700">{completed.length} done</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-slate-400 text-sm flex justify-center items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading timeline…
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm italic">No milestones recorded for this protocol.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sorted.map(m => {
              const section = getMilestoneSection(m, today);
              const isOverdue   = section === "overdue";
              const isCompleted = section === "completed";
              const daysOverdue = isOverdue ? Math.floor((Date.now() - new Date(m.planned_date).getTime()) / 86400000) : null;
              const daysUntil   = section === "upcoming" ? Math.ceil((new Date(m.planned_date).getTime() - Date.now()) / 86400000) : null;
              const isResolved  = resolvedIds.has(m.id);

              return (
                <div key={m.id} className={`px-4 py-3.5 border-l-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isOverdue   ? "border-l-red-500 bg-red-50/40" :
                  isCompleted ? "border-l-green-500 bg-slate-50/60 opacity-80" :
                  daysUntil !== null && daysUntil <= 7 ? "border-l-amber-400" :
                  "border-l-slate-300"
                }`}>
                  {/* Left */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      {isOverdue   ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
                       isCompleted ? <CheckCircle2  className="w-4 h-4 text-green-600" /> :
                                     <Clock         className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isOverdue   ? <span className="ctms-badge-critical">Overdue</span> :
                         isCompleted ? <span className="ctms-badge-success">Completed</span> :
                         daysUntil !== null && daysUntil <= 7 ? <span className="ctms-badge-warning">Due soon</span> :
                                       <span className="ctms-badge-neutral">Upcoming</span>}
                        <span className="ctms-badge-neutral text-[10px]">{m.milestone_type}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span><Calendar className="w-3 h-3 inline mr-0.5" />Planned: <strong className="text-slate-600">{m.planned_date}</strong></span>
                        {m.actual_date && <span className="text-green-700 font-semibold">✓ Completed: {m.actual_date}</span>}
                        {daysOverdue !== null && <span className="text-red-700 font-semibold">{daysOverdue}d overdue</span>}
                        {daysUntil !== null && <span className={daysUntil <= 7 ? "text-amber-700 font-semibold" : ""}>{daysUntil}d remaining</span>}
                      </div>
                      {m.notes && <p className="text-[10px] text-slate-400 italic">{m.notes}</p>}
                    </div>
                  </div>
                  {/* Action */}
                  {canModify && !isCompleted && (
                    <div className="flex-shrink-0">
                      {isResolved ? (
                        <span className="flex items-center gap-1 text-[11px] text-green-700 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Marked Complete</span>
                      ) : (
                        <button
                          onClick={() => { setSelectedMilestone(m); setUpdateStatus("Completed"); setErrorMsg(""); }}
                          className="ctms-btn-secondary text-[11px] py-1 px-2.5"
                          aria-label={`Mark milestone complete: ${m.name}`}
                        >
                          <Wrench className="w-3 h-3" /> Mark Complete
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

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="ctms-modal-overlay">
          <div className="ctms-modal max-w-md">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#1e3a5f]" /> Add Protocol Milestone
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body">
              {errorMsg && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{errorMsg}</div>}
              <form onSubmit={handleAddMilestone} className="space-y-3">
                <div><label className="ctms-label">Milestone Type *</label><select value={newMilestone.milestone_type} onChange={e => setNewMilestone({ ...newMilestone, milestone_type: e.target.value })} className="ctms-select">{MILESTONE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="ctms-label">Milestone Name *</label><input type="text" required placeholder="e.g. IEC clearance issued" value={newMilestone.name} onChange={e => setNewMilestone({ ...newMilestone, name: e.target.value })} className="ctms-input" /></div>
                <div><label className="ctms-label">Planned Target Date *</label><input type="date" required value={newMilestone.planned_date} onChange={e => setNewMilestone({ ...newMilestone, planned_date: e.target.value })} className="ctms-input" /></div>
                <div><label className="ctms-label">Notes (optional)</label><textarea rows={2} placeholder="Additional context…" value={newMilestone.notes} onChange={e => setNewMilestone({ ...newMilestone, notes: e.target.value })} className="ctms-textarea" /></div>
                <div className="ctms-modal-footer -mx-5 -mb-4 mt-2 rounded-b-md">
                  <button type="button" onClick={() => setShowAddModal(false)} className="ctms-btn-ghost">Cancel</button>
                  <button type="submit" disabled={submitting} className="ctms-btn-primary">{submitting ? "Saving…" : "Save Milestone"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {selectedMilestone && (
        <div className="ctms-modal-overlay">
          <div className="ctms-modal max-w-md">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#1e3a5f]" /> Update Milestone Status
              </h3>
              <button onClick={() => setSelectedMilestone(null)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <p className="text-xs font-semibold text-slate-800">{selectedMilestone.name}</p>
                <p className="text-[10px] font-mono text-slate-500">Type: {selectedMilestone.milestone_type} · Planned: {selectedMilestone.planned_date}</p>
                {selectedMilestone.is_overdue && (
                  <p className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {Math.floor((Date.now() - new Date(selectedMilestone.planned_date).getTime()) / 86400000)} day(s) overdue
                  </p>
                )}
              </div>
              {errorMsg && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{errorMsg}</div>}
              <form onSubmit={handleUpdateMilestone} className="space-y-3">
                <div><label className="ctms-label">New Status</label><select value={updateStatus} onChange={e => setUpdateStatus(e.target.value)} className="ctms-select"><option value="Completed">Completed</option><option value="In Progress">In Progress</option><option value="Pending">Pending</option></select></div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                  Marking Complete → updates DB → recalculates compliance preflight → creates audit entry
                </div>
                <div className="ctms-modal-footer -mx-5 -mb-4 mt-2 rounded-b-md">
                  <button type="button" onClick={() => setSelectedMilestone(null)} className="ctms-btn-ghost">Cancel</button>
                  <button type="submit" disabled={submitting} className="ctms-btn-primary">{submitting ? "Updating…" : "Confirm Update"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
