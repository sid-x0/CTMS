"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Flag, Plus, Clock, CheckCircle2, AlertTriangle, Calendar, X } from "lucide-react";

interface MilestonesViewProps {
  studies: any[];
  onRefresh: () => void;
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({ studies, onRefresh }) => {
  const { user } = useAuth();
  const canModify = user?.user_role === "Administrator" || user?.user_role === "Principal Investigator" || user?.user_role === "Study Coordinator";

  const [selectedStudyId, setSelectedStudyId] = useState<number>(studies[0]?.id || 1);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // New Milestone Form
  const [newMilestone, setNewMilestone] = useState({
    milestone_type: "Protocol Finalized",
    name: "",
    planned_date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  // Update Milestone Form
  const [updateStatus, setUpdateStatus] = useState("Completed");

  const loadMilestones = async () => {
    if (!selectedStudyId) return;
    setLoading(true);
    try {
      const data = await fetchAPI(`/studies/${selectedStudyId}/milestones`);
      setMilestones(data);
    } catch (err) {
      console.error("Failed to load milestones", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilestones();
  }, [selectedStudyId]);

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      await fetchAPI(`/studies/${selectedStudyId}/milestones`, {
        method: "POST",
        body: JSON.stringify({
          study_id: selectedStudyId,
          ...newMilestone
        })
      });
      setShowAddModal(false);
      setNewMilestone({ milestone_type: "Protocol Finalized", name: "", planned_date: new Date().toISOString().split("T")[0], notes: "" });
      loadMilestones();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add milestone");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;
    setErrorMsg("");
    setSubmitting(true);

    try {
      await fetchAPI(`/milestones/${selectedMilestone.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: updateStatus })
      });
      setSelectedMilestone(null);
      loadMilestones();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update milestone");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Flag className="w-5 h-5 text-teal-400" />
            Study Milestone Governance
          </h2>
          <p className="text-xs text-slate-400">Track study lifecycle milestones, planned targets and overdue item alerts</p>
        </div>

        {canModify && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>
        )}
      </div>

      {/* Select Protocol Filter */}
      <div className="glass-panel p-4 rounded-2xl flex items-center gap-4">
        <label className="text-xs font-semibold text-slate-300">Select Protocol:</label>
        <select
          value={selectedStudyId}
          onChange={(e) => setSelectedStudyId(parseInt(e.target.value))}
          className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-teal-500 max-w-md"
        >
          {studies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.protocol_number}: {s.short_title}
            </option>
          ))}
        </select>
      </div>

      {/* Milestone Timeline List */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
        {loading ? (
          <p className="text-center text-slate-400 italic text-xs animate-pulse">Loading milestone timeline...</p>
        ) : milestones.length === 0 ? (
          <p className="text-center text-slate-400 italic text-xs">No milestones created for this protocol.</p>
        ) : (
          <div className="relative border-l-2 border-slate-800 ml-4 space-y-6">
            {milestones.map((m) => {
              const isOverdue = m.is_overdue;
              const isDone = m.status === "Completed";
              return (
                <div key={m.id} className="relative pl-6">
                  {/* Bullet */}
                  <div
                    className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 bg-slate-900 ${
                      isDone
                        ? "border-emerald-500 bg-emerald-500/20"
                        : isOverdue
                        ? "border-rose-500 bg-rose-500/20"
                        : "border-amber-500 bg-amber-500/20"
                    }`}
                  />

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-[10px] font-bold">
                          {m.milestone_type}
                        </span>
                        <h4 className="text-sm font-bold text-slate-100">{m.name}</h4>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> Planned: <strong className="text-slate-200">{m.planned_date}</strong>
                        </span>
                        {m.actual_date && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Achieved: <strong>{m.actual_date}</strong>
                          </span>
                        )}
                      </div>
                      {m.notes && <p className="text-xs text-slate-400 mt-1 italic">{m.notes}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                      {isDone ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-xs border border-emerald-500/30">
                          Completed
                        </span>
                      ) : isOverdue ? (
                        <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 font-semibold text-xs border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold text-xs border border-amber-500/30">
                          {m.status}
                        </span>
                      )}

                      {canModify && !isDone && (
                        <button
                          onClick={() => {
                            setSelectedMilestone(m);
                            setUpdateStatus("Completed");
                          }}
                          className="px-3 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 text-xs font-semibold border border-teal-500/40"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Flag className="w-5 h-5 text-teal-400" /> Add Protocol Milestone
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-300 text-xs">{errorMsg}</div>}

            <form onSubmit={handleAddMilestone} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Milestone Type *</label>
                <select
                  value={newMilestone.milestone_type}
                  onChange={(e) => setNewMilestone({ ...newMilestone, milestone_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                >
                  <option value="Protocol Finalized">Protocol Finalized</option>
                  <option value="IEC Submission">IEC Submission</option>
                  <option value="IEC Approval">IEC Approval</option>
                  <option value="CTRI Registration">CTRI Registration</option>
                  <option value="Site Activation">Site Activation</option>
                  <option value="First Participant Enrolled">First Participant Enrolled</option>
                  <option value="Recruitment Target Reached">Recruitment Target Reached</option>
                  <option value="Last Participant Visit">Last Participant Visit</option>
                  <option value="Study Close-out">Study Close-out</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Milestone Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IEC clearance certificate issued"
                  value={newMilestone.name}
                  onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Planned Target Date *</label>
                <input
                  type="date"
                  required
                  value={newMilestone.planned_date}
                  onChange={(e) => setNewMilestone({ ...newMilestone, planned_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white rounded-xl font-semibold">
                  {submitting ? "Saving..." : "Save Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Milestone Status Modal */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Update Milestone Status</h3>
              <button onClick={() => setSelectedMilestone(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <p className="font-bold text-slate-200">{selectedMilestone.name}</p>
              <p className="text-slate-400 mt-1">Planned Date: {selectedMilestone.planned_date}</p>
            </div>

            <form onSubmit={handleUpdateMilestone} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setSelectedMilestone(null)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white rounded-xl font-semibold">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
