"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Users, Plus, ShieldCheck, ArrowRight, X, AlertCircle } from "lucide-react";

interface ParticipantsViewProps {
  studies: any[];
  onRefresh: () => void;
}

export const ParticipantsView: React.FC<ParticipantsViewProps> = ({ studies, onRefresh }) => {
  const { user } = useAuth();
  const canModify = user?.user_role === "Administrator" || user?.user_role === "Principal Investigator" || user?.user_role === "Study Coordinator";

  const [selectedStudyId, setSelectedStudyId] = useState<number>(studies[0]?.id || 1);
  const [participants, setParticipants] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [transitionNotes, setTransitionNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // New Participant Form
  const [newCode, setNewCode] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<number>(0);
  const [newNotes, setNewNotes] = useState("");

  const loadData = async () => {
    if (!selectedStudyId) return;
    setLoading(true);
    try {
      const [pData, sData] = await Promise.all([
        fetchAPI(`/studies/${selectedStudyId}/participants`),
        fetchAPI(`/studies/${selectedStudyId}/sites`)
      ]);
      setParticipants(pData);
      setSites(sData);
      if (sData.length > 0 && !selectedSiteId) {
        setSelectedSiteId(sData[0].id);
      }
    } catch (err) {
      console.error("Failed to load participants data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStudyId]);

  // Handle Screening new participant
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      await fetchAPI(`/studies/${selectedStudyId}/participants`, {
        method: "POST",
        body: JSON.stringify({
          study_id: selectedStudyId,
          site_id: selectedSiteId,
          participant_code: newCode,
          notes: newNotes
        })
      });
      setShowAddModal(false);
      setNewCode("");
      setNewNotes("");
      loadData();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to screen participant");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle status transition
  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant || !targetStatus) return;
    setErrorMsg("");
    setSubmitting(true);

    try {
      await fetchAPI(`/participants/${selectedParticipant.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: targetStatus,
          notes: transitionNotes
        })
      });
      setSelectedParticipant(null);
      setTargetStatus("");
      setTransitionNotes("");
      loadData();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "State transition failed");
    } finally {
      setSubmitting(false);
    }
  };

  // State Machine allowed transitions map
  const getNextAllowedStates = (status: string) => {
    switch (status) {
      case "Screened": return ["Eligible", "Screen Failure", "Withdrawn"];
      case "Eligible": return ["Enrolled", "Withdrawn"];
      case "Enrolled": return ["Randomized", "Completed", "Withdrawn"];
      case "Randomized": return ["Completed", "Withdrawn"];
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            Pseudonymous Participant Registry
          </h2>
          <p className="text-xs text-slate-400">Strict pseudonymous recruitment tracking, state transitions & enrollment metrics</p>
        </div>

        {canModify && (
          <button
            onClick={() => {
              const siteId = sites[0]?.id || 1;
              setSelectedSiteId(siteId);
              setNewCode(`PAR-${Date.now().toString().slice(-4)}`);
              setShowAddModal(true);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Screen New Participant
          </button>
        )}
      </div>

      {/* Select Study Selector */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-300">Select Protocol:</label>
          <select
            value={selectedStudyId}
            onChange={(e) => setSelectedStudyId(parseInt(e.target.value))}
            className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-teal-500 flex-1 sm:w-80"
          >
            {studies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.protocol_number}: {s.short_title}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Summary Pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            Total Subjects: <strong className="text-teal-400">{participants.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            Enrolled: <strong>{participants.filter(p => p.status === "Enrolled" || p.status === "Randomized" || p.status === "Completed").length}</strong>
          </span>
        </div>
      </div>

      {/* Participant List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-4">Pseudonym Code</th>
                <th className="p-4">Trial Site</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Screening Date</th>
                <th className="p-4">Enrollment Date</th>
                <th className="p-4">Notes / Activity</th>
                <th className="p-4 text-right">Workflow Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 animate-pulse">
                    Loading pseudonymous registry...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    No participants screened yet for this protocol.
                  </td>
                </tr>
              ) : (
                participants.map((p) => {
                  const site = sites.find((s) => s.id === p.site_id);
                  const allowed = getNextAllowedStates(p.status);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-teal-300 font-mono flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                        {p.participant_code}
                      </td>
                      <td className="p-4 text-slate-200 font-medium">{site?.site_code || `Site #${p.site_id}`}</td>
                      <td className="p-4"><StatusBadge status={p.status} /></td>
                      <td className="p-4 text-slate-400">{p.screening_date || "-"}</td>
                      <td className="p-4 text-slate-400">{p.enrollment_date || "-"}</td>
                      <td className="p-4 text-slate-400 max-w-[200px] truncate">{p.notes || "-"}</td>
                      <td className="p-4 text-right">
                        {canModify && allowed.length > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedParticipant(p);
                              setTargetStatus(allowed[0]);
                              setTransitionNotes("");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 text-xs font-semibold border border-teal-500/40 transition-all inline-flex items-center gap-1"
                          >
                            Update Status <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Final State</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen New Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                Screen Pseudonymous Subject
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddParticipant} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Assign Site *</label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Pseudonym Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ASH-DEL-102"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Screening Notes / Clinical Criteria</label>
                <textarea
                  rows={2}
                  placeholder="Inclusion/exclusion verification notes..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white rounded-xl font-semibold">
                  {submitting ? "Saving..." : "Register Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workflow Transition Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-teal-400" />
                State Machine Transition
              </h3>
              <button onClick={() => setSelectedParticipant(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex justify-between items-center">
              <div>
                <p className="text-slate-400">Subject Code:</p>
                <p className="font-bold text-teal-300 font-mono text-sm">{selectedParticipant.participant_code}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Current Status:</p>
                <StatusBadge status={selectedParticipant.status} />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleStatusTransition} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Target Valid Status *</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 font-semibold"
                >
                  {getNextAllowedStates(selectedParticipant.status).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Transition Reason / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Record trial progress justification for audit trail..."
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setSelectedParticipant(null)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white rounded-xl font-semibold">
                  {submitting ? "Processing..." : "Confirm Transition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
