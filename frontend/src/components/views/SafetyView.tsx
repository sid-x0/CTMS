"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert, Plus, AlertTriangle, CheckCircle2, Clock,
  Search, X, RefreshCw, Eye,
} from "lucide-react";

interface SafetyViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

function sevMeta(severity: string) {
  const s = severity?.toLowerCase();
  if (s === "severe" || s === "life-threatening") return { bar: "border-l-red-500", badge: "bg-red-50 text-red-700 border-red-200" };
  if (s === "moderate") return { bar: "border-l-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" };
  return { bar: "border-l-slate-300", badge: "bg-slate-100 text-slate-600 border-slate-200" };
}

function typeBadge(type: string, serious: boolean) {
  if (serious || type === "SAE") return "bg-red-50 text-red-700 border-red-200";
  if (type === "ADR") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function statusBadge(status: string) {
  if (status === "Reported to IEC/DCGI") return "bg-green-50 text-green-700 border-green-200";
  if (status === "Closed") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function deadlineUrgency(deadline: string | null) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { cls: "text-red-600 font-semibold", label: `${Math.abs(days)}d overdue` };
  if (days <= 3) return { cls: "text-red-600 font-semibold", label: `${days}d left` };
  if (days <= 7) return { cls: "text-amber-700 font-medium", label: `${days}d left` };
  return { cls: "text-slate-500", label: deadline };
}

function LogEventModal({ studies, onClose, onSuccess }: { studies: any[]; onClose: () => void; onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    study_id: studies[0]?.id || 1, site_id: 1,
    participant_code: "GUD-DEL-028", event_term: "Elevated Hepatic Enzymes (ALT/AST)",
    ayurvedic_concept: "Yakrit Roga / Pitta Vriddhi", intervention: "Guduchi Extract",
    event_type: "SAE", severity: "Severe", seriousness: true, causality: "Possible",
    onset_date: new Date().toISOString().split("T")[0],
    description: "Subject experienced ALT/AST elevation during trial follow-up.",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(""); setSubmitting(true);
    try { await fetchAPI("/safety", { method: "POST", body: JSON.stringify(form) }); onSuccess(); }
    catch (err: any) { setErrorMsg(err.message || "Failed to log event"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="ctms-modal-overlay">
      <div className="ctms-modal max-w-lg">
        <div className="ctms-modal-header">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" /> Log Adverse Event
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="ctms-modal-body">
          <p className="text-[10px] text-slate-400 italic">Synthetic data · Prototype state change only · No external CDSCO/DCGI filing occurs</p>
          {errorMsg && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{errorMsg}</div>}
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="ctms-label">Study *</label>
              <select value={form.study_id} onChange={e => setForm({ ...form, study_id: parseInt(e.target.value) })} className="ctms-select">
                {studies.map(s => <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="ctms-label">Event Term *</label><input required type="text" value={form.event_term} onChange={e => setForm({ ...form, event_term: e.target.value })} className="ctms-input" /></div>
              <div><label className="ctms-label">Ayurvedic Concept</label><input type="text" value={form.ayurvedic_concept} onChange={e => setForm({ ...form, ayurvedic_concept: e.target.value })} className="ctms-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="ctms-label">Intervention *</label><input required type="text" value={form.intervention} onChange={e => setForm({ ...form, intervention: e.target.value })} className="ctms-input" /></div>
              <div><label className="ctms-label">Subject Code</label><input type="text" value={form.participant_code} onChange={e => setForm({ ...form, participant_code: e.target.value })} className="ctms-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ctms-label">Type</label>
                <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value, seriousness: e.target.value === "SAE" })} className="ctms-select">
                  <option value="AE">Adverse Event (AE)</option>
                  <option value="SAE">Serious Adverse Event (SAE)</option>
                  <option value="ADR">Adverse Drug Reaction (ADR)</option>
                </select>
              </div>
              <div>
                <label className="ctms-label">Severity</label>
                <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="ctms-select">
                  <option>Mild</option><option>Moderate</option><option>Severe</option><option>Life-Threatening</option>
                </select>
              </div>
            </div>
            <div><label className="ctms-label">Clinical Narrative</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="ctms-textarea" /></div>
            <div className="ctms-modal-footer -mx-5 -mb-4 mt-2 rounded-b-md">
              <button type="button" onClick={onClose} className="ctms-btn-ghost">Cancel</button>
              <button type="submit" disabled={submitting} className="ctms-btn-danger">{submitting ? "Submitting…" : "Log Event"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export const SafetyView: React.FC<SafetyViewProps> = ({ studies, selectedStudyId, onSelectStudy, onRefresh }) => {
  const { user } = useAuth();
  const canReport = user?.user_role === "Administrator" || user?.user_role === "Principal Investigator" || user?.user_role === "Pharmacovigilance User";

  const [filterStudyId, setFilterStudyId] = useState<string>(selectedStudyId ? String(selectedStudyId) : "");
  const [safetyEvents, setSafetyEvents] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());

  useEffect(() => { if (selectedStudyId) setFilterStudyId(String(selectedStudyId)); }, [selectedStudyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const url = filterStudyId ? `/safety?study_id=${filterStudyId}` : "/safety";
      const [evList, sigList] = await Promise.all([fetchAPI(url), fetchAPI("/safety/signals")]);
      setSafetyEvents(evList); setSignals(sigList);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, [filterStudyId]);

  const handleMarkReviewed = async (ev: any) => {
    setReviewingId(ev.id);
    try {
      await fetchAPI(`/safety/${ev.id}/review`, { method: "PATCH", body: JSON.stringify({ status: "Reported to IEC/DCGI" }) });
      setReviewedIds(prev => new Set(prev).add(ev.id));
      loadData(); onRefresh();
    } catch { /* silent */ }
    finally { setReviewingId(null); }
  };

  const studyMap = Object.fromEntries(studies.map(s => [s.id, s]));
  const urgentItems = safetyEvents.filter(e => e.status === "Under Review" && (e.seriousness || e.event_type === "SAE" || deadlineUrgency(e.reporting_deadline)?.cls.includes("red")));
  const filtered = safetyEvents.filter(e =>
    e.event_term.toLowerCase().includes(search.toLowerCase()) ||
    e.intervention.toLowerCase().includes(search.toLowerCase()) ||
    (e.participant_code?.toLowerCase() || "").includes(search.toLowerCase())
  );
  const openSAEs = safetyEvents.filter(e => (e.seriousness || e.event_type === "SAE") && e.status === "Under Review");

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">Safety &amp; Pharmacovigilance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            NPvCC active ·{" "}
            <span className={openSAEs.length > 0 ? "font-semibold text-red-600" : "text-slate-400"}>
              {openSAEs.length} open SAE{openSAEs.length !== 1 ? "s" : ""}
            </span>
            {" · "}{signals.length} signal{signals.length !== 1 ? "s" : ""} under review
          </p>
          <p className="text-[10px] text-slate-400 italic mt-0.5">Synthetic data · Prototype state transitions only · No external CDSCO/DCGI filing</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="ctms-btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /></button>
          {canReport && (
            <button onClick={() => setShowModal(true)} className="ctms-btn-danger">
              <Plus className="w-3.5 h-3.5" /> Log Adverse Event
            </button>
          )}
        </div>
      </div>

      {/* Safety attention */}
      {urgentItems.length > 0 && (
        <div className="bg-white border border-red-200 rounded-md shadow-sm">
          <div className="px-4 py-3 border-b border-red-200 bg-red-50 rounded-t-md flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <div>
              <h2 className="text-sm font-semibold text-red-800">Safety Attention Required</h2>
              <p className="text-[11px] text-red-600">{urgentItems.length} event{urgentItems.length !== 1 ? "s" : ""} requiring pharmacovigilance review</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {urgentItems.map(ev => {
              const sm = sevMeta(ev.severity);
              const dl = deadlineUrgency(ev.reporting_deadline);
              const study = studyMap[ev.study_id];
              return (
                <div key={ev.id} className={`px-4 py-3.5 border-l-2 ${sm.bar} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${typeBadge(ev.event_type, ev.seriousness)}`}>{ev.event_type}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${sm.badge}`}>{ev.severity}</span>
                      <span className="font-mono text-[11px] font-semibold text-[#1e3a5f]">{study?.protocol_number || `Study ${ev.study_id}`}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{ev.event_term}</p>
                    {ev.ayurvedic_concept && <p className="text-[11px] text-slate-500 italic">{ev.ayurvedic_concept}</p>}
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 font-mono">
                      {ev.participant_code && <span>Subject: <strong className="text-slate-700">{ev.participant_code}</strong></span>}
                      <span>Causality: {ev.causality}</span>
                      {dl && <span className={dl.cls}><Clock className="w-3 h-3 inline mr-0.5" />{dl.label}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadge(ev.status)}`}>{ev.status}</span>
                    {ev.status === "Under Review" && canReport && (
                      reviewedIds.has(ev.id) ? (
                        <span className="text-[11px] text-green-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Transitioned</span>
                      ) : (
                        <button onClick={() => handleMarkReviewed(ev)} disabled={reviewingId === ev.id}
                          className="ctms-btn-secondary text-[11px] py-1 px-2.5"
                          title="Prototype state transition — no live regulatory submission">
                          <Eye className="w-3 h-3" /> {reviewingId === ev.id ? "Updating…" : "Review Event"}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-trial signals */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Potential Cross-Trial Safety Signals</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Adverse event concepts recurring across independent trials — analytical findings only, not confirmed causality</p>
          </div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${signals.length > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
            {signals.length} signal{signals.length !== 1 ? "s" : ""}
          </span>
        </div>
        {signals.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> No cross-trial signals detected
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {signals.map((sig, i) => (
              <div key={i} className="px-4 py-3.5 grid grid-cols-12 gap-4 items-start">
                <div className="col-span-8 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ctms-badge-warning">Potential Signal</span>
                    <span className="font-mono text-[11px] font-semibold text-[#1e3a5f]">{sig.intervention}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{sig.event_term}</p>
                  <div className="text-[11px] text-slate-600 bg-slate-50 rounded border border-slate-200 px-3 py-2">
                    <p className="font-semibold text-slate-500 text-[10px] uppercase mb-1">Why surfaced</p>
                    <p>{sig.flag_reason}</p>
                    <p className="font-mono text-slate-400 mt-1 text-[10px]">Protocols: {sig.studies?.join(", ")}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Prototype cross-trial aggregation · Not a live pharmacovigilance database</p>
                </div>
                <div className="col-span-4 text-right">
                  <div className="text-3xl font-black text-amber-700 font-mono">{sig.reports_count}</div>
                  <div className="text-[11px] text-slate-500">reports</div>
                  <div className="text-[11px] text-slate-400 mt-1">{sig.affected_studies_count} studies · {sig.affected_sites_count} sites</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AE/SAE Registry */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">AE / SAE Registry</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterStudyId}
              onChange={e => { setFilterStudyId(e.target.value); onSelectStudy(e.target.value ? parseInt(e.target.value) : undefined); }}
              className="ctms-select text-xs py-1.5 max-w-[200px]" aria-label="Filter by study">
              <option value="">All Studies</option>
              {studies.map(s => <option key={s.id} value={s.id}>{s.protocol_number}</option>)}
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1.5" />
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="ctms-input text-xs py-1.5 pl-7 w-44" aria-label="Search events" />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm flex justify-center items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            {search ? `No events match "${search}"` : "No safety events recorded."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ctms-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Event Term</th>
                  <th>Subject</th>
                  <th>Severity / Causality</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  {canReport && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => {
                  const isSAE = ev.seriousness || ev.event_type === "SAE";
                  const dl = deadlineUrgency(ev.reporting_deadline);
                  return (
                    <tr key={ev.id} className={isSAE ? "bg-red-50/50" : ""}>
                      <td><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${typeBadge(ev.event_type, isSAE)}`}>{ev.event_type}</span></td>
                      <td>
                        <p className="font-medium text-slate-800 text-xs">{ev.event_term}</p>
                        {ev.ayurvedic_concept && <p className="text-[10px] text-slate-400 italic">{ev.ayurvedic_concept}</p>}
                      </td>
                      <td className="font-mono text-[11px] text-[#1e3a5f]">{ev.participant_code || "—"}</td>
                      <td className="text-[12px]">
                        <span className={`font-medium ${ev.severity?.toLowerCase() === "severe" ? "text-red-700" : ev.severity?.toLowerCase() === "moderate" ? "text-amber-700" : "text-slate-600"}`}>{ev.severity}</span>
                        <span className="text-slate-400"> ({ev.causality})</span>
                      </td>
                      <td>{dl ? <span className={`text-[11px] font-mono ${dl.cls}`}>{dl.label}</span> : <span className="text-slate-400">—</span>}</td>
                      <td><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadge(ev.status)}`}>{ev.status}</span></td>
                      {canReport && (
                        <td>
                          {ev.status === "Under Review" ? (
                            reviewedIds.has(ev.id) ? (
                              <span className="text-[11px] text-green-700 font-medium">✓ Transitioned</span>
                            ) : (
                              <button onClick={() => handleMarkReviewed(ev)} disabled={reviewingId === ev.id}
                                className="ctms-btn-secondary text-[10px] py-1 px-2" title="Prototype state transition">
                                {reviewingId === ev.id ? "Updating…" : "Report ▸"}
                              </button>
                            )
                          ) : null}
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
          <span>{filtered.length} of {safetyEvents.length} events</span>
          <span className="italic">Prototype pharmacovigilance registry · CTRI Format Aligned architecture</span>
        </div>
      </div>

      {showModal && (
        <LogEventModal studies={studies} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); loadData(); onRefresh(); }} />
      )}
    </div>
  );
};
