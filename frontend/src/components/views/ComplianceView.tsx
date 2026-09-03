"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  CheckSquare, AlertTriangle, CheckCircle2, Clock,
  RefreshCw, Code, XCircle, Wrench, Shield, Search,
} from "lucide-react";

interface ComplianceViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

function milestoneStatus(m: any, today: string) {
  if (m.status === "Completed") return "completed";
  if (m.planned_date < today) return "overdue";
  const soon = new Date(new Date().getTime() + 7 * 86400000).toISOString().split("T")[0];
  if (m.planned_date <= soon) return "soon";
  return "upcoming";
}

/* ── Interop modal (preserved logic) ────────────────────────────────────── */
function InteropModal({ data, title, onClose }: { data: any; title: string; onClose: () => void }) {
  return (
    <div className="ctms-modal-overlay">
      <div className="ctms-modal max-w-3xl max-h-[85vh] flex flex-col">
        <div className="ctms-modal-header">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Code className="w-4 h-4 text-[#1e3a5f]" /> {title}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 italic">Architecture roadmap preview — not a live regulatory export. Synthetic data only.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><XCircle className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          <pre className="text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded p-4 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
        <div className="ctms-modal-footer">
          <button onClick={onClose} className="ctms-btn-secondary">Close Preview</button>
        </div>
      </div>
    </div>
  );
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({ studies, selectedStudyId, onSelectStudy, onRefresh }) => {
  const { user } = useAuth();
  const canResolve =
    user?.user_role === "Administrator" || user?.user_role === "Principal Investigator" ||
    user?.user_role === "Study Coordinator" || user?.user_role === "Ethics Committee Member";

  const today = new Date().toISOString().split("T")[0];

  const [activeStudyId, setActiveStudyId] = useState<number>(selectedStudyId || studies[0]?.id || 1);
  const [preflightData, setPreflightData] = useState<any | null>(null);
  const [milestonesAll, setMilestonesAll] = useState<any[]>([]);
  const [loading, setLoading]             = useState(false);
  const [resolvingKey, setResolvingKey]   = useState<string | null>(null);
  const [resolveOk, setResolveOk]         = useState<Set<string>>(new Set());
  const [ayurvedaTerm, setAyurvedaTerm]   = useState("Aruchi");
  const [termResult, setTermResult]       = useState<any | null>(null);
  const [termLoading, setTermLoading]     = useState(false);
  const [interopData, setInteropData]     = useState<any | null>(null);
  const [interopTitle, setInteropTitle]   = useState("");

  useEffect(() => { if (selectedStudyId) setActiveStudyId(selectedStudyId); }, [selectedStudyId]);

  const loadPreflight = async (studyId?: number) => {
    const id = studyId ?? activeStudyId;
    if (!id) return;
    setLoading(true);
    try {
      const [pf, dashData] = await Promise.all([
        fetchAPI(`/compliance/studies/${id}/preflight`),
        fetchAPI("/dashboard/portfolio").catch(() => null),
      ]);
      setPreflightData(pf);
      if (dashData?.upcoming_deadlines) setMilestonesAll(dashData.upcoming_deadlines);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPreflight(); }, [activeStudyId]);

  const handleSuggestTerminology = async (termToSearch?: string) => {
    const term = termToSearch || ayurvedaTerm;
    if (!term) return;
    setTermLoading(true);
    try {
      setTermResult(await fetchAPI("/compliance/terminology/suggest", { method: "POST", body: JSON.stringify({ ayurveda_term: term }) }));
    } catch { /* silent */ }
    finally { setTermLoading(false); }
  };

  useEffect(() => { handleSuggestTerminology("Aruchi"); }, []);

  const handleExportFHIR = async () => {
    try { const d = await fetchAPI(`/compliance/studies/${activeStudyId}/fhir`); setInteropData(d); setInteropTitle("HL7 FHIR R4 ResearchStudy Resource — Architecture Roadmap Preview"); }
    catch { /* silent */ }
  };
  const handleExportCDISC = async () => {
    try { const d = await fetchAPI(`/compliance/studies/${activeStudyId}/cdisc`); setInteropData(d); setInteropTitle("CDISC SDTM Trial Summary Dataset — Architecture Roadmap Preview"); }
    catch { /* silent */ }
  };

  const handleResolveMilestone = async (item: any) => {
    if (!item.milestone_id) return;
    setResolvingKey(item.key);
    try {
      const updated = await fetchAPI(`/compliance/studies/${activeStudyId}/milestones/${item.milestone_id}/complete`, { method: "POST" });
      setPreflightData(updated);
      setResolveOk(prev => new Set(prev).add(item.key));
      onRefresh();
      setTimeout(() => setResolveOk(prev => { const n = new Set(prev); n.delete(item.key); return n; }), 4000);
    } catch { /* silent */ }
    finally { setResolvingKey(null); }
  };

  const activeStudy    = studies.find(s => s.id === activeStudyId);
  const failedChecks   = preflightData?.checklist?.filter((c: any) => !c.passed) ?? [];
  const passedChecks   = preflightData?.checklist?.filter((c: any) => c.passed) ?? [];
  const overdueMilestones = milestonesAll.filter(m => m.planned_date < today);
  const upcomingMilestones = milestonesAll.filter(m => m.planned_date >= today);

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">Compliance &amp; Trial Readiness</h1>
          <p className="text-xs text-slate-500 mt-0.5">Ethics, CTRI registration and operational readiness across the portfolio</p>
          <p className="text-[10px] text-slate-400 italic mt-0.5">Synthetic data · Prototype pre-flight check · FHIR R4 and CDISC are architecture roadmap representations</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadPreflight()} className="ctms-btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={handleExportFHIR} className="ctms-btn-secondary text-xs" title="Architecture roadmap preview only">
            <Code className="w-3.5 h-3.5" /> FHIR R4
          </button>
          <button onClick={handleExportCDISC} className="ctms-btn-secondary text-xs" title="Architecture roadmap preview only">
            <Code className="w-3.5 h-3.5" /> CDISC
          </button>
        </div>
      </div>

      {/* Study selector + summary */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="ctms-section-title whitespace-nowrap">Protocol</label>
          <select
            value={activeStudyId}
            onChange={e => { const id = parseInt(e.target.value); setActiveStudyId(id); onSelectStudy(id); }}
            className="ctms-select text-xs py-1.5 max-w-xs"
            aria-label="Select study"
          >
            {studies.map(s => <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${preflightData?.ready_for_activation ? "bg-green-50 border-green-200" : preflightData ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
            {preflightData?.ready_for_activation
              ? <CheckCircle2 className="w-4 h-4 text-green-600" />
              : <AlertTriangle className="w-4 h-4 text-amber-600" />
            }
            <div>
              <p className={`text-xs font-semibold ${preflightData?.ready_for_activation ? "text-green-700" : preflightData ? "text-amber-700" : "text-slate-600"}`}>
                {preflightData?.ready_for_activation ? "Pre-flight PASS" : preflightData ? "Pre-flight BLOCKED" : "Pre-flight —"}
              </p>
              {preflightData && (
                <p className="text-[10px] text-slate-500">{passedChecks.length}/{(failedChecks.length + passedChecks.length)} checks passed</p>
              )}
            </div>
          </div>
          {overdueMilestones.length > 0 && (
            <span className="ctms-badge-critical">{overdueMilestones.length} overdue milestone{overdueMilestones.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Pre-flight checklist */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Pre-flight Checklist</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">ICH-GCP compliance gate for trial activation</p>
          </div>
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </div>

        {loading && !preflightData ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm flex justify-center items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading preflight data…
          </div>
        ) : !preflightData ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm italic">No preflight data available for selected study.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Failed first */}
            {failedChecks.map((item: any) => (
              <div key={item.key} className={`px-4 py-3.5 border-l-2 flex items-start justify-between gap-4 border-l-amber-400 bg-amber-50/40`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                    {item.details && <p className="text-[11px] text-slate-500 leading-snug">{item.details}</p>}
                    <span className="ctms-badge-warning">Attention Required</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {resolveOk.has(item.key) ? (
                    <span className="flex items-center gap-1 text-[11px] text-green-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  ) : canResolve && item.milestone_id ? (
                    <button
                      onClick={() => handleResolveMilestone(item)}
                      disabled={resolvingKey === item.key}
                      className="ctms-btn-secondary text-[11px] py-1 px-2.5"
                      aria-label={`Resolve: ${item.title}`}
                    >
                      <Wrench className="w-3 h-3" /> {resolvingKey === item.key ? "Resolving…" : "Resolve"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {/* Passed */}
            {passedChecks.map((item: any) => (
              <div key={item.key} className="px-4 py-3 border-l-2 border-l-green-500 flex items-center gap-3 opacity-75">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700">{item.title}</p>
                  {item.details && <p className="text-[10px] text-slate-400">{item.details}</p>}
                </div>
                <span className="ctms-badge-success text-[10px]">Pass</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestone timeline */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Portfolio Milestone Schedule</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Overdue → Upcoming · Drawn from all portfolio studies</p>
          </div>
          <div className="flex gap-2">
            {overdueMilestones.length > 0 && <span className="ctms-badge-critical">{overdueMilestones.length} overdue</span>}
            {upcomingMilestones.length > 0 && <span className="ctms-badge-warning">{upcomingMilestones.length} upcoming</span>}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {[...overdueMilestones, ...upcomingMilestones].slice(0, 15).map((m: any, i: number) => {
            const status = milestoneStatus(m, today);
            const isOverdue = status === "overdue";
            const isSoon    = status === "soon";
            return (
              <div key={i} className={`px-4 py-3 border-l-2 flex items-center justify-between gap-4 ${
                isOverdue ? "border-l-red-500 bg-red-50/40" : isSoon ? "border-l-amber-400" : "border-l-slate-200"
              }`}>
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  {isOverdue ? <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" /> :
                   isSoon    ? <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" /> :
                               <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{m.planned_date}</p>
                  </div>
                </div>
                <div>
                  {isOverdue ? <span className="ctms-badge-critical">Overdue</span> :
                   isSoon    ? <span className="ctms-badge-warning">Due soon</span> :
                               <span className="ctms-badge-neutral">Upcoming</span>}
                </div>
              </div>
            );
          })}
          {milestonesAll.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> No upcoming milestone deadlines
            </div>
          )}
        </div>
      </div>

      {/* Terminology mapping assistant */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800">Ayurvedic Terminology Mapping</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Maps Ayurvedic clinical concepts to MedDRA / WHO-ART equivalents for regulatory submissions</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={ayurvedaTerm}
              onChange={e => setAyurvedaTerm(e.target.value)}
              placeholder="Enter Ayurvedic term…"
              className="ctms-input max-w-xs"
              aria-label="Ayurvedic term"
              onKeyDown={e => e.key === "Enter" && handleSuggestTerminology()}
            />
            <button onClick={() => handleSuggestTerminology()} disabled={termLoading} className="ctms-btn-primary">
              {termLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Map Term
            </button>
          </div>
          {termResult && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="ctms-section-title mb-1">Ayurvedic Input</p>
                  <p className="font-semibold text-slate-800">{termResult.ayurveda_term}</p>
                  {termResult.classical_definition && <p className="text-[11px] text-slate-500 italic mt-0.5">{termResult.classical_definition}</p>}
                </div>
                <div>
                  <p className="ctms-section-title mb-1">MedDRA Preferred Term</p>
                  <p className="font-semibold text-slate-800">{termResult.meddra_preferred_term || "Not mapped"}</p>
                  {termResult.meddra_soc && <p className="text-[11px] text-slate-500 mt-0.5">SOC: {termResult.meddra_soc}</p>}
                </div>
              </div>
              {termResult.mapping_note && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                  <p className="font-semibold mb-0.5">Mapping Note</p>
                  <p>{termResult.mapping_note}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {interopData && <InteropModal data={interopData} title={interopTitle} onClose={() => setInteropData(null)} />}
    </div>
  );
};
