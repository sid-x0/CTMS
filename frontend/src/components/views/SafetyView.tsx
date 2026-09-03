"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, Plus, AlertTriangle, CheckCircle, Clock, Search, X, Activity, ChevronDown, CheckSquare } from "lucide-react";

interface SafetyViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

export const SafetyView: React.FC<SafetyViewProps> = ({ studies, selectedStudyId, onSelectStudy, onRefresh }) => {
  const { user } = useAuth();
  const canReport = user?.user_role === "Administrator" || user?.user_role === "Principal Investigator" || user?.user_role === "Pharmacovigilance User";

  const [filterStudyId, setFilterStudyId] = useState<string>(selectedStudyId ? String(selectedStudyId) : "");
  const [safetyEvents, setSafetyEvents] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedSignal, setSelectedSignal] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Review state
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    study_id: studies[0]?.id || 1,
    site_id: 1,
    participant_code: "GUD-DEL-028",
    event_term: "Elevated Hepatic Enzymes (ALT/AST)",
    ayurvedic_concept: "Yakrit Roga / Pitta Vriddhi",
    intervention: "Guduchi Extract",
    event_type: "SAE",
    severity: "Severe",
    seriousness: true,
    causality: "Possible",
    onset_date: new Date().toISOString().split("T")[0],
    description: "Subject experienced ALT/AST elevation during trial follow-up."
  });

  // Auto-update filter when prop changes
  useEffect(() => {
    if (selectedStudyId) setFilterStudyId(String(selectedStudyId));
  }, [selectedStudyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const url = filterStudyId ? `/safety?study_id=${filterStudyId}` : "/safety";
      const [evList, sigList] = await Promise.all([
        fetchAPI(url),
        fetchAPI("/safety/signals")
      ]);
      setSafetyEvents(evList);
      setSignals(sigList);
    } catch (err) {
      console.error("Failed to load safety data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStudyId]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      await fetchAPI("/safety", { method: "POST", body: JSON.stringify(formData) });
      setShowAddModal(false);
      loadData();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log safety event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReviewed = async (event: any) => {
    setReviewingId(event.id);
    try {
      await fetchAPI(`/safety/${event.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Reported to IEC/DCGI" })
      });
      setReviewSuccess(event.id);
      setTimeout(() => setReviewSuccess(null), 2500);
      loadData();
      onRefresh();
    } catch (err) {
      console.error("Failed to mark reviewed", err);
    } finally {
      setReviewingId(null);
    }
  };

  const filteredEvents = safetyEvents.filter(
    (e) =>
      e.event_term.toLowerCase().includes(search.toLowerCase()) ||
      e.intervention.toLowerCase().includes(search.toLowerCase()) ||
      (e.participant_code && e.participant_code.toLowerCase().includes(search.toLowerCase()))
  );

  const statusBadgeClass = (status: string) => {
    if (status === "Reported to IEC/DCGI") return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30";
    if (status === "Closed") return "bg-slate-700 text-slate-300";
    return "bg-amber-500/10 text-amber-300 border border-amber-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            National Pharmacovigilance Coordination Center (NPvCC Workspace)
          </h2>
          <p className="text-xs text-slate-400">Expedited SAE review workflow, potential cross-trial signal detection & safety governance</p>
          <p className="text-[10px] text-slate-500 mt-0.5 italic">
            Synthetic clinical-trial data. Regulatory reporting actions are prototype state transitions; no external CDSCO/DCGI/IEC filing occurs.
          </p>
        </div>
        {canReport && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Log Safety Event (AE/SAE)
          </button>
        )}
      </div>

      {/* Study filter */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-4">
        <label className="text-xs font-semibold text-slate-300 shrink-0">Filter by Study:</label>
        <select
          value={filterStudyId}
          onChange={(e) => {
            setFilterStudyId(e.target.value);
            onSelectStudy(e.target.value ? parseInt(e.target.value) : undefined);
          }}
          className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-rose-500 max-w-md"
        >
          <option value="">All Studies</option>
          {studies.map((s) => (
            <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{filteredEvents.length} event(s)</span>
      </div>

      {/* CROSS-TRIAL SAFETY SIGNALS PANEL */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              CROSS-TRIAL SAFETY SIGNALS — Automated Multicenter Aggregation
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies adverse events recurring across multiple independent trials and sites.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono">
            {signals.length} Signal(s) Under Review
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signals.length === 0 ? (
            <p className="text-xs text-slate-400 italic col-span-full">No cross-trial signals detected at this time.</p>
          ) : signals.map((sig, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-slate-950 border border-amber-800/40 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    POTENTIAL SAFETY SIGNAL
                  </span>
                  <h4 className="font-bold text-xs text-slate-100 mt-1.5">{sig.event_term}</h4>
                  <p className="text-[11px] text-teal-400 font-semibold mt-0.5">Intervention: {sig.intervention}</p>
                </div>
                <div className="text-right font-mono text-xs">
                  <p className="font-extrabold text-amber-400">{sig.reports_count} Reports</p>
                  <p className="text-[10px] text-slate-400">{sig.affected_studies_count} Studies | {sig.affected_sites_count} Sites</p>
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                <p className="font-bold text-slate-400 text-[10px] uppercase">Signal Justification:</p>
                <p className="mt-0.5 leading-relaxed">{sig.flag_reason}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">Affected Protocols: {sig.studies.join(", ")}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SAE Registry Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Adverse Events (AE) & Serious Adverse Events (SAE) Registry
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search event, term, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="pb-2">Type</th>
                <th className="pb-2">Event Term</th>
                <th className="pb-2">Subject</th>
                <th className="pb-2">Intervention</th>
                <th className="pb-2">Severity / Causality</th>
                <th className="pb-2">Deadline</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr><td colSpan={8} className="py-6 text-center text-slate-400 animate-pulse">Loading safety events...</td></tr>
              ) : filteredEvents.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center text-slate-400 italic">No safety events found.</td></tr>
              ) : (
                filteredEvents.map((e) => (
                  <tr key={e.id} className={`hover:bg-slate-800/40 transition-colors ${e.seriousness || e.event_type === "SAE" ? "bg-rose-950/10" : ""}`}>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.seriousness || e.event_type === "SAE"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-slate-800 text-slate-300"
                      }`}>{e.event_type}</span>
                    </td>
                    <td className="py-3 font-bold text-slate-100 max-w-[180px]">
                      <p>{e.event_term}</p>
                      <p className="text-[10px] text-slate-500 italic font-normal">{e.ayurvedic_concept || ""}</p>
                    </td>
                    <td className="py-3 font-mono text-[10px] text-teal-300">{e.participant_code || "—"}</td>
                    <td className="py-3 text-teal-300 font-semibold">{e.intervention}</td>
                    <td className="py-3 text-slate-300">
                      <span className="font-semibold text-slate-200">{e.severity}</span>
                      <span className="text-slate-400"> ({e.causality})</span>
                    </td>
                    <td className="py-3 font-mono text-[11px]">
                      {e.reporting_deadline ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {e.reporting_deadline}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadgeClass(e.status)}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {e.status === "Under Review" && canReport ? (
                        reviewSuccess === e.id ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                            <CheckCircle className="w-3.5 h-3.5" /> Prototype Transition Complete
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkReviewed(e)}
                            disabled={reviewingId === e.id}
                            title="Prototype state transition: updates internal safety event status and resolves alerts. No live regulatory submission occurs."
                            className="px-2.5 py-1 rounded bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 text-[10px] font-bold border border-teal-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckSquare className="w-3 h-3" />
                            {reviewingId === e.id ? "Updating..." : "Report (Prototype State Transition)"}
                          </button>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Safety Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" /> Log Adverse Event (AE / SAE Report)
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            {errorMsg && <div className="p-3 rounded-lg bg-rose-500/10 text-rose-300 text-xs">{errorMsg}</div>}
            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Study *</label>
                <select value={formData.study_id} onChange={(e) => setFormData({ ...formData, study_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100">
                  {studies.map((s) => <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Event Term *</label>
                  <input type="text" required value={formData.event_term}
                    onChange={(e) => setFormData({ ...formData, event_term: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Ayurvedic Concept</label>
                  <input type="text" value={formData.ayurvedic_concept}
                    onChange={(e) => setFormData({ ...formData, ayurvedic_concept: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Intervention / Drug *</label>
                  <input type="text" required value={formData.intervention}
                    onChange={(e) => setFormData({ ...formData, intervention: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Subject Code</label>
                  <input type="text" value={formData.participant_code}
                    onChange={(e) => setFormData({ ...formData, participant_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Type</label>
                  <select value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value, seriousness: e.target.value === "SAE" })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100">
                    <option value="AE">Adverse Event (AE)</option>
                    <option value="SAE">Serious Adverse Event (SAE)</option>
                    <option value="ADR">Adverse Drug Reaction (ADR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Severity</label>
                  <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100">
                    <option>Mild</option><option>Moderate</option><option>Severe</option><option>Life-Threatening</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Clinical Narrative</label>
                <textarea rows={2} value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-rose-600 text-white rounded-lg font-semibold">
                  {submitting ? "Submitting..." : "Log Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
