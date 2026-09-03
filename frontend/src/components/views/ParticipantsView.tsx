"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Users, Plus, ShieldCheck, ArrowRight, X, AlertCircle, FileCheck } from "lucide-react";

interface ParticipantsViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

const ConsentBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === "OBTAINED") {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        ICF Obtained
      </span>
    );
  }
  if (status === "WITHDRAWN") {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        Consent Withdrawn
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
      Consent Pending
    </span>
  );
};

export const ParticipantsView: React.FC<ParticipantsViewProps> = ({
  studies,
  selectedStudyId: propStudyId,
  onSelectStudy,
  onRefresh,
}) => {
  const { user } = useAuth();
  const canModify =
    user?.user_role === "Administrator" ||
    user?.user_role === "Principal Investigator" ||
    user?.user_role === "Study Coordinator";

  const [selectedStudyId, setSelectedStudyId] = useState<number>(
    propStudyId || studies[0]?.id || 1
  );
  useEffect(() => {
    if (propStudyId) setSelectedStudyId(propStudyId);
  }, [propStudyId]);

  const [participants, setParticipants] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [transitionNotes, setTransitionNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Consent modal state
  const [consentParticipant, setConsentParticipant] = useState<any | null>(null);
  const [consentStatus, setConsentStatus] = useState("OBTAINED");
  const [consentVersion, setConsentVersion] = useState("ICF-v1.0");
  const [consentNotes, setConsentNotes] = useState("");

  const [newCode, setNewCode] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<number>(0);
  const [newNotes, setNewNotes] = useState("");

  const loadData = async () => {
    if (!selectedStudyId) return;
    setLoading(true);
    try {
      const [pData, sData] = await Promise.all([
        fetchAPI(`/studies/${selectedStudyId}/participants`),
        fetchAPI(`/studies/${selectedStudyId}/sites`),
      ]);
      setParticipants(pData);
      setSites(sData);
      if (sData.length > 0 && !selectedSiteId) setSelectedSiteId(sData[0].id);
    } catch (err) {
      console.error("Failed to load participants data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedStudyId]);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      await fetchAPI(`/studies/${selectedStudyId}/participants`, {
        method: "POST",
        body: JSON.stringify({ study_id: selectedStudyId, site_id: selectedSiteId, participant_code: newCode, notes: newNotes }),
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

  const handleConsentUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentParticipant) return;
    setErrorMsg("");
    setSubmitting(true);
    try {
      await fetchAPI(`/participants/${consentParticipant.id}/consent`, {
        method: "PATCH",
        body: JSON.stringify({
          consent_status: consentStatus,
          consent_version: consentVersion,
          consent_date: new Date().toISOString().split("T")[0],
          notes: consentNotes,
        }),
      });
      setConsentParticipant(null);
      setConsentNotes("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update consent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant || !targetStatus) return;
    setErrorMsg("");
    setSubmitting(true);
    try {
      await fetchAPI(`/participants/${selectedParticipant.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus, notes: transitionNotes }),
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
          <p className="text-xs text-slate-400">
            Strict pseudonymous recruitment tracking, informed consent control & workflow state machine
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 italic">
            DPDP-aligned privacy-by-design controls demonstrated in prototype.
          </p>
        </div>
        {canModify && (
          <button
            onClick={() => {
              setSelectedSiteId(sites[0]?.id || 1);
              setNewCode(`PT-${Date.now().toString().slice(-4)}`);
              setShowAddModal(true);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Screen New Participant
          </button>
        )}
      </div>

      {/* Study Selector + Summary Pills */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-300">Select Protocol:</label>
          <select
            value={selectedStudyId}
            onChange={(e) => setSelectedStudyId(parseInt(e.target.value))}
            className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-teal-500 flex-1 sm:w-80"
          >
            {studies.map((s) => (
              <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            Total: <strong className="text-teal-400">{participants.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            Enrolled: <strong>{participants.filter(p => ["Enrolled","Randomized","Completed"].includes(p.status)).length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            Pending Consent: <strong>{participants.filter(p => p.consent_status === "NOT_OBTAINED").length}</strong>
          </span>
        </div>
      </div>

      {/* Participant List Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-3">Pseudonym Code</th>
                <th className="p-3">Site</th>
                <th className="p-3">Status</th>
                <th className="p-3">Informed Consent</th>
                <th className="p-3">Screening Date</th>
                <th className="p-3">Enrolment Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 animate-pulse">Loading pseudonymous registry...</td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">No participants screened yet for this protocol.</td>
                </tr>
              ) : participants.map((p) => {
                const site = sites.find((s) => s.id === p.site_id);
                const allowed = getNextAllowedStates(p.status);
                return (
                  <tr key={p.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3 font-bold text-teal-300 font-mono">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                        {p.participant_code}
                      </div>
                    </td>
                    <td className="p-3 text-slate-300">{site?.site_code || `Site #${p.site_id}`}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <ConsentBadge status={p.consent_status || "NOT_OBTAINED"} />
                        {p.consent_version && <span className="text-[10px] text-slate-500 font-mono">{p.consent_version}</span>}
                      </div>
                    </td>
                    <td className="p-3 text-slate-400">{p.screening_date || "-"}</td>
                    <td className="p-3 text-slate-400">{p.enrollment_date || "-"}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canModify && p.consent_status !== "OBTAINED" && allowed.length > 0 && (
                          <button
                            onClick={() => { setConsentParticipant(p); setConsentStatus("OBTAINED"); setConsentVersion("ICF-v1.0"); setConsentNotes(""); setErrorMsg(""); }}
                            className="px-2.5 py-1.5 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-all flex items-center gap-1"
                          >
                            <FileCheck className="w-3 h-3" /> Record Consent
                          </button>
                        )}
                        {canModify && allowed.length > 0 ? (
                          <button
                            onClick={() => { setSelectedParticipant(p); setTargetStatus(allowed[0]); setTransitionNotes(""); setErrorMsg(""); }}
                            className="px-2.5 py-1.5 rounded bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 text-xs font-semibold border border-teal-500/40 transition-all flex items-center gap-1"
                          >
                            Update Status <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Terminal</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen New Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />Screen Pseudonymous Subject
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            {errorMsg && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">{errorMsg}</div>}
            <form onSubmit={handleAddParticipant} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Assign Site *</label>
                <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100">
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Pseudonym Subject Code *</label>
                <input type="text" required placeholder="e.g. PT-0001" value={newCode} onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono" />
              </div>
              <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Subject will be registered as <strong>Screened</strong> with consent <strong>NOT OBTAINED</strong>. Record consent separately before enrollment.</span>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Screening Notes</label>
                <textarea rows={2} placeholder="Inclusion/exclusion criteria met..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white rounded-lg font-semibold">
                  {submitting ? "Saving..." : "Register Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consent Recording Modal */}
      {consentParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />Record Informed Consent
              </h3>
              <button onClick={() => setConsentParticipant(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex justify-between">
              <div>
                <p className="text-slate-400">Subject:</p>
                <p className="font-bold text-teal-300 font-mono">{consentParticipant.participant_code}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Current:</p>
                <ConsentBadge status={consentParticipant.consent_status || "NOT_OBTAINED"} />
              </div>
            </div>
            {errorMsg && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">{errorMsg}</div>}
            <form onSubmit={handleConsentUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Consent Status *</label>
                <select value={consentStatus} onChange={(e) => setConsentStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100">
                  <option value="OBTAINED">OBTAINED — ICF signed and witnessed</option>
                  <option value="WITHDRAWN">WITHDRAWN — Subject revoked consent</option>
                  <option value="NOT_OBTAINED">NOT_OBTAINED — Consent pending</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">ICF Document Version</label>
                <input type="text" placeholder="e.g. ICF-v1.2" value={consentVersion} onChange={(e) => setConsentVersion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono" />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Notes for Audit Trail</label>
                <textarea rows={2} placeholder="Witness name, date, reason for withdrawal..." value={consentNotes}
                  onChange={(e) => setConsentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setConsentParticipant(null)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold">
                  {submitting ? "Saving..." : "Record Consent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-teal-400" />State Machine Transition
              </h3>
              <button onClick={() => setSelectedParticipant(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex justify-between items-center">
              <div>
                <p className="text-slate-400">Subject Code:</p>
                <p className="font-bold text-teal-300 font-mono text-sm">{selectedParticipant.participant_code}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Status:</p>
                <StatusBadge status={selectedParticipant.status} />
              </div>
            </div>
            {/* Consent warning before enrollment */}
            {targetStatus === "Enrolled" && selectedParticipant.consent_status !== "OBTAINED" && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Enrollment Will Be Rejected</p>
                  <p>Informed consent is <strong>{selectedParticipant.consent_status || "NOT_OBTAINED"}</strong>. The backend enforces consent before enrollment. Record consent first.</p>
                </div>
              </div>
            )}
            {errorMsg && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">{errorMsg}</div>}
            <form onSubmit={handleStatusTransition} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Target Status *</label>
                <select value={targetStatus} onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-semibold">
                  {getNextAllowedStates(selectedParticipant.status).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Clinical Justification / Notes</label>
                <textarea rows={2} placeholder="Record justification for audit trail..." value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setSelectedParticipant(null)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white rounded-lg font-semibold">
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
