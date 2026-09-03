"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Users, Plus, ShieldCheck, ArrowRight, X, AlertCircle,
  FileCheck, Search, RefreshCw, Lock,
} from "lucide-react";

interface ParticipantsViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

function ConsentBadge({ status }: { status: string }) {
  if (status === "OBTAINED")
    return <span className="ctms-badge-success">ICF Obtained</span>;
  if (status === "WITHDRAWN")
    return <span className="ctms-badge-warning">Withdrawn</span>;
  return <span className="ctms-badge-critical">Not Obtained</span>;
}

export const ParticipantsView: React.FC<ParticipantsViewProps> = ({
  studies, selectedStudyId: propStudyId, onSelectStudy, onRefresh,
}) => {
  const { user } = useAuth();
  const canModify =
    user?.user_role === "Administrator" ||
    user?.user_role === "Principal Investigator" ||
    user?.user_role === "Study Coordinator";

  const [selectedStudyId, setSelectedStudyId] = useState<number>(propStudyId || studies[0]?.id || 1);
  useEffect(() => { if (propStudyId) setSelectedStudyId(propStudyId); }, [propStudyId]);

  const [participants, setParticipants] = useState<any[]>([]);
  const [sites, setSites]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState("");

  const [showAddModal, setShowAddModal]               = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);
  const [targetStatus, setTargetStatus]               = useState<string>("");
  const [transitionNotes, setTransitionNotes]         = useState<string>("");
  const [submitting, setSubmitting]                   = useState(false);
  const [errorMsg, setErrorMsg]                       = useState("");

  const [consentParticipant, setConsentParticipant] = useState<any | null>(null);
  const [consentStatus, setConsentStatus]           = useState("OBTAINED");
  const [consentVersion, setConsentVersion]         = useState("ICF-v1.0");
  const [consentNotes, setConsentNotes]             = useState("");

  const [newCode, setNewCode]         = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<number>(0);
  const [newNotes, setNewNotes]       = useState("");

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
    } catch { /* silent */ }
    finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, [selectedStudyId]);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(""); setSubmitting(true);
    try {
      await fetchAPI(`/studies/${selectedStudyId}/participants`, {
        method: "POST",
        body: JSON.stringify({ study_id: selectedStudyId, site_id: selectedSiteId, participant_code: newCode, notes: newNotes }),
      });
      setShowAddModal(false); setNewCode(""); setNewNotes("");
      loadData(); onRefresh();
    } catch (err: any) { setErrorMsg(err.message || "Failed to screen participant"); }
    finally { setSubmitting(false); }
  };

  const handleConsentUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentParticipant) return;
    setErrorMsg(""); setSubmitting(true);
    try {
      await fetchAPI(`/participants/${consentParticipant.id}/consent`, {
        method: "PATCH",
        body: JSON.stringify({ consent_status: consentStatus, consent_version: consentVersion, consent_date: new Date().toISOString().split("T")[0], notes: consentNotes }),
      });
      setConsentParticipant(null); setConsentNotes("");
      loadData();
    } catch (err: any) { setErrorMsg(err.message || "Failed to update consent"); }
    finally { setSubmitting(false); }
  };

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant || !targetStatus) return;
    setErrorMsg(""); setSubmitting(true);
    try {
      await fetchAPI(`/participants/${selectedParticipant.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus, notes: transitionNotes }),
      });
      setSelectedParticipant(null); setTargetStatus(""); setTransitionNotes("");
      loadData(); onRefresh();
    } catch (err: any) { setErrorMsg(err.message || "State transition failed"); }
    finally { setSubmitting(false); }
  };

  const getNextAllowedStates = (status: string) => {
    switch (status) {
      case "Screened":   return ["Eligible", "Screen Failure", "Withdrawn"];
      case "Eligible":   return ["Enrolled", "Withdrawn"];
      case "Enrolled":   return ["Randomized", "Completed", "Withdrawn"];
      case "Randomized": return ["Completed", "Withdrawn"];
      default:           return [];
    }
  };

  const enrolled      = participants.filter(p => ["Enrolled","Randomized","Completed"].includes(p.status)).length;
  const pendingConsent = participants.filter(p => p.consent_status !== "OBTAINED").length;
  const withdrawn     = participants.filter(p => p.status === "Withdrawn").length;
  const consentGated  = participants.filter(p => p.consent_status !== "OBTAINED" && getNextAllowedStates(p.status).includes("Enrolled")).length;

  const filtered = participants.filter(p =>
    p.participant_code?.toLowerCase().includes(search.toLowerCase()) ||
    sites.find(s => s.id === p.site_id)?.site_code?.toLowerCase().includes(search.toLowerCase()) ||
    p.status?.toLowerCase().includes(search.toLowerCase())
  );

  const activeStudy = studies.find(s => s.id === selectedStudyId);

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">Participant Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">Pseudonymous identifiers · Informed consent control · State machine enrollment workflow</p>
          <p className="text-[10px] text-slate-400 italic mt-0.5">DPDP-aligned privacy-by-design prototype · No real subject data</p>
        </div>
        <div className="flex items-center gap-2">
          {canModify && (
            <button
              onClick={() => { setSelectedSiteId(sites[0]?.id || 1); setNewCode(`PT-${Date.now().toString().slice(-4)}`); setShowAddModal(true); }}
              className="ctms-btn-primary"
              aria-label="Screen New Participant"
            >
              <Plus className="w-3.5 h-3.5" /> Screen Participant
            </button>
          )}
          <button onClick={loadData} className="ctms-btn-ghost" aria-label="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
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
          <div className="ctms-kpi py-2 px-3">
            <span className="text-sm font-black font-mono text-slate-800">{participants.length}</span>
            <span className="text-[10px] text-slate-500 ml-1">total</span>
          </div>
          {enrolled > 0 && <div className="ctms-kpi py-2 px-3 border-green-200 bg-green-50">
            <span className="text-sm font-black font-mono text-green-700">{enrolled}</span>
            <span className="text-[10px] text-green-600 ml-1">enrolled</span>
          </div>}
          {pendingConsent > 0 && <div className="ctms-kpi py-2 px-3 border-red-200 bg-red-50">
            <span className="text-sm font-black font-mono text-red-700">{pendingConsent}</span>
            <span className="text-[10px] text-red-600 ml-1">consent pending</span>
          </div>}
          {withdrawn > 0 && <div className="ctms-kpi py-2 px-3 border-amber-200 bg-amber-50">
            <span className="text-sm font-black font-mono text-amber-700">{withdrawn}</span>
            <span className="text-[10px] text-amber-600 ml-1">withdrawn</span>
          </div>}
        </div>
      </div>

      {/* Enrollment blocked callout */}
      {consentGated > 0 && (
        <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-r-md px-4 py-3 flex items-start gap-3">
          <Lock className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-800">Enrollment Blocked — Informed Consent Required</p>
            <p className="text-[11px] text-red-700 mt-0.5">
              {consentGated} participant{consentGated !== 1 ? "s are" : " is"} eligible but consent is not yet obtained.
              The backend enforces informed consent before enrollment proceeds. Use "Consent" to unblock.
            </p>
          </div>
        </div>
      )}

      {/* Registry table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Participant List</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Pseudonymous identifiers only · {filtered.length} shown</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1.5" />
            <input
              type="text" placeholder="Search code, site, status…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="ctms-input text-xs py-1.5 pl-8 w-52"
              aria-label="Search participants"
            />
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-slate-400 text-sm flex justify-center items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading participant data…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm italic">
            {search ? `No participants match "${search}"` : "No participants screened for this protocol."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ctms-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Consent</th>
                  <th>Screened</th>
                  <th>Enrolled</th>
                  {canModify && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const site    = sites.find(s => s.id === p.site_id);
                  const allowed = getNextAllowedStates(p.status);
                  const enrollBlocked = allowed.includes("Enrolled") && p.consent_status !== "OBTAINED";

                  return (
                    <tr key={p.id} className={enrollBlocked ? "bg-red-50/40" : ""}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3 text-[#1e3a5f] flex-shrink-0" />
                          <span className="font-mono text-xs font-semibold text-[#1e3a5f]">{p.participant_code}</span>
                        </div>
                      </td>
                      <td className="font-mono text-[11px] text-slate-600">{site?.site_code || `S-${p.site_id}`}</td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                          ["Enrolled","Randomized","Completed"].includes(p.status) ? "bg-green-50 text-green-700 border-green-200" :
                          ["Withdrawn","Screen Failure"].includes(p.status) ? "bg-red-50 text-red-700 border-red-200" :
                          p.status === "Eligible" ? "bg-slate-100 text-slate-700 border-slate-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>{p.status}</span>
                      </td>
                      <td>
                        <div className="space-y-0.5">
                          <ConsentBadge status={p.consent_status || "NOT_OBTAINED"} />
                          {p.consent_version && <p className="text-[9px] text-slate-400 font-mono">{p.consent_version}</p>}
                        </div>
                      </td>
                      <td className="font-mono text-[11px] text-slate-500">{p.screening_date || "—"}</td>
                      <td className="font-mono text-[11px] text-slate-500">{p.enrollment_date || "—"}</td>
                      {canModify && (
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            {enrollBlocked && (
                              <span className="ctms-badge-critical text-[9px]"><Lock className="w-2.5 h-2.5 mr-0.5" />Blocked</span>
                            )}
                            {p.consent_status !== "OBTAINED" && allowed.length > 0 && (
                              <button
                                onClick={() => { setConsentParticipant(p); setConsentStatus("OBTAINED"); setConsentVersion("ICF-v1.0"); setConsentNotes(""); setErrorMsg(""); }}
                                className="ctms-btn-warning text-[10px] py-1 px-2"
                                aria-label={`Record consent for ${p.participant_code}`}
                              >
                                <FileCheck className="w-3 h-3" /> Consent
                              </button>
                            )}
                            {allowed.length > 0 ? (
                              <button
                                onClick={() => { setSelectedParticipant(p); setTargetStatus(allowed[0]); setTransitionNotes(""); setErrorMsg(""); }}
                                className="ctms-btn-secondary text-[10px] py-1 px-2"
                                aria-label={`Update status for ${p.participant_code}`}
                              >
                                Status <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic px-1">Terminal</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 bg-slate-50 rounded-b-md">
          <span>{filtered.length} of {participants.length} subjects shown</span>
          <span className="italic">Pseudonymous identifiers only · DPDP-aligned prototype</span>
        </div>
      </div>

      {/* Screen New Participant Modal */}
      {showAddModal && (
        <div className="ctms-modal-overlay">
          <div className="ctms-modal max-w-md">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1e3a5f]" /> Screen Pseudonymous Subject
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body">
              {errorMsg && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{errorMsg}</div>}
              <form onSubmit={handleAddParticipant} className="space-y-3">
                <div>
                  <label className="ctms-label">Assign Site *</label>
                  <select value={selectedSiteId} onChange={e => setSelectedSiteId(parseInt(e.target.value))} className="ctms-select">
                    {sites.map(s => <option key={s.id} value={s.id}>{s.site_code} — {s.site_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ctms-label">Pseudonym Subject Code *</label>
                  <input type="text" required placeholder="e.g. PT-0001" value={newCode} onChange={e => setNewCode(e.target.value)} className="ctms-input font-mono" />
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Subject registers as <strong>Screened</strong> with consent <strong>NOT OBTAINED</strong>. Record informed consent before enrollment can proceed.</span>
                </div>
                <div>
                  <label className="ctms-label">Screening Notes</label>
                  <textarea rows={2} placeholder="Inclusion/exclusion criteria…" value={newNotes} onChange={e => setNewNotes(e.target.value)} className="ctms-textarea" />
                </div>
                <div className="ctms-modal-footer -mx-5 -mb-4 mt-2 rounded-b-md">
                  <button type="button" onClick={() => setShowAddModal(false)} className="ctms-btn-ghost">Cancel</button>
                  <button type="submit" disabled={submitting} className="ctms-btn-primary">{submitting ? "Saving…" : "Register Subject"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {consentParticipant && (
        <div className="ctms-modal-overlay">
          <div className="ctms-modal max-w-md">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-600" /> Record Informed Consent
              </h3>
              <button onClick={() => setConsentParticipant(null)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                <div><p className="ctms-section-title">Subject</p><p className="font-mono font-semibold text-[#1e3a5f] mt-0.5">{consentParticipant.participant_code}</p></div>
                <div className="text-right"><p className="ctms-section-title">Current</p><div className="mt-0.5"><ConsentBadge status={consentParticipant.consent_status || "NOT_OBTAINED"} /></div></div>
              </div>
              {errorMsg && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{errorMsg}</div>}
              <form onSubmit={handleConsentUpdate} className="space-y-3">
                <div>
                  <label className="ctms-label">Consent Status *</label>
                  <select value={consentStatus} onChange={e => setConsentStatus(e.target.value)} className="ctms-select">
                    <option value="OBTAINED">OBTAINED — ICF signed and witnessed</option>
                    <option value="WITHDRAWN">WITHDRAWN — Subject revoked consent</option>
                    <option value="NOT_OBTAINED">NOT_OBTAINED — Consent pending</option>
                  </select>
                </div>
                <div>
                  <label className="ctms-label">ICF Document Version</label>
                  <input type="text" placeholder="e.g. ICF-v1.2" value={consentVersion} onChange={e => setConsentVersion(e.target.value)} className="ctms-input font-mono" />
                </div>
                <div>
                  <label className="ctms-label">Notes for Audit Trail</label>
                  <textarea rows={2} placeholder="Witness, date, reason for withdrawal…" value={consentNotes} onChange={e => setConsentNotes(e.target.value)} className="ctms-textarea" />
                </div>
                <div className="ctms-modal-footer -mx-5 -mb-4 mt-2 rounded-b-md">
                  <button type="button" onClick={() => setConsentParticipant(null)} className="ctms-btn-ghost">Cancel</button>
                  <button type="submit" disabled={submitting} className="ctms-btn-warning">{submitting ? "Saving…" : "Record Consent"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {selectedParticipant && (
        <div className="ctms-modal-overlay">
          <div className="ctms-modal max-w-md">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#1e3a5f]" /> Status Transition
              </h3>
              <button onClick={() => setSelectedParticipant(null)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                <div><p className="ctms-section-title">Subject Code</p><p className="font-mono font-semibold text-[#1e3a5f] mt-0.5">{selectedParticipant.participant_code}</p></div>
                <span className="ctms-badge-neutral">{selectedParticipant.status}</span>
              </div>
              {targetStatus === "Enrolled" && selectedParticipant.consent_status !== "OBTAINED" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-800">Enrollment Will Be Rejected</p>
                    <p className="text-[11px] text-red-700 mt-0.5">Consent is <strong>{selectedParticipant.consent_status || "NOT_OBTAINED"}</strong>. The backend enforces consent before enrollment. Record consent first.</p>
                  </div>
                </div>
              )}
              {errorMsg && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{errorMsg}</div>}
              <form onSubmit={handleStatusTransition} className="space-y-3">
                <div>
                  <label className="ctms-label">Target Status *</label>
                  <select value={targetStatus} onChange={e => setTargetStatus(e.target.value)} className="ctms-select font-medium">
                    {getNextAllowedStates(selectedParticipant.status).map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ctms-label">Clinical Justification / Notes</label>
                  <textarea rows={2} placeholder="Record justification for audit trail…" value={transitionNotes} onChange={e => setTransitionNotes(e.target.value)} className="ctms-textarea" />
                </div>
                <div className="ctms-modal-footer -mx-5 -mb-4 mt-2 rounded-b-md">
                  <button type="button" onClick={() => setSelectedParticipant(null)} className="ctms-btn-ghost">Cancel</button>
                  <button type="submit" disabled={submitting} className="ctms-btn-primary">{submitting ? "Processing…" : "Confirm Transition"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
