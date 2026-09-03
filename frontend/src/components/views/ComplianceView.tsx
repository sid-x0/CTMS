"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { CheckSquare, AlertCircle, FileCode, CheckCircle2, XCircle, Search, Code, Wrench } from "lucide-react";

interface ComplianceViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({ studies, selectedStudyId, onSelectStudy, onRefresh }) => {
  const [activeStudyId, setActiveStudyId] = useState<number>(selectedStudyId || studies[0]?.id || 1);
  const [preflightData, setPreflightData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Terminology state
  const [ayurvedaTerm, setAyurvedaTerm] = useState("Aruchi");
  const [termResult, setTermResult] = useState<any | null>(null);
  const [termLoading, setTermLoading] = useState(false);

  // Interop modal
  const [interopData, setInteropData] = useState<any | null>(null);
  const [interopTitle, setInteropTitle] = useState("");

  // Resolve state per milestone key
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [resolveSuccess, setResolveSuccess] = useState<string | null>(null);

  // Sync with parent selectedStudyId
  useEffect(() => {
    if (selectedStudyId) setActiveStudyId(selectedStudyId);
  }, [selectedStudyId]);

  const loadPreflight = async (studyId?: number) => {
    const id = studyId ?? activeStudyId;
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchAPI(`/compliance/studies/${id}/preflight`);
      setPreflightData(data);
    } catch (err) {
      console.error("Failed to fetch pre-flight check", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestTerminology = async (termToSearch?: string) => {
    const term = termToSearch || ayurvedaTerm;
    if (!term) return;
    setTermLoading(true);
    try {
      const res = await fetchAPI("/compliance/terminology/suggest", {
        method: "POST",
        body: JSON.stringify({ ayurveda_term: term })
      });
      setTermResult(res);
    } catch (err) {
      console.error("Failed to suggest terminology", err);
    } finally {
      setTermLoading(false);
    }
  };

  useEffect(() => {
    loadPreflight();
  }, [activeStudyId]);

  useEffect(() => {
    handleSuggestTerminology("Aruchi");
  }, []);

  const handleExportFHIR = async () => {
    try {
      const data = await fetchAPI(`/compliance/studies/${activeStudyId}/fhir`);
      setInteropData(data);
      setInteropTitle("HL7 FHIR R4 ResearchStudy Resource Representation");
    } catch (err) { console.error(err); }
  };

  const handleExportCDISC = async () => {
    try {
      const data = await fetchAPI(`/compliance/studies/${activeStudyId}/cdisc`);
      setInteropData(data);
      setInteropTitle("CDISC SDTM Trial Summary (TS) Dataset Representation");
    } catch (err) { console.error(err); }
  };

  /**
   * Resolve a failed preflight item by marking its milestone as Complete.
   * The backend re-runs the preflight check and returns updated results.
   */
  const handleResolveMilestone = async (item: any) => {
    if (!item.milestone_id) return;
    setResolvingKey(item.key);
    try {
      const updatedPreflight = await fetchAPI(
        `/compliance/studies/${activeStudyId}/milestones/${item.milestone_id}/complete`,
        { method: "POST" }
      );
      setPreflightData(updatedPreflight);
      setResolveSuccess(item.key);
      onRefresh(); // refresh audit trail / alerts
      setTimeout(() => setResolveSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to resolve milestone", err);
    } finally {
      setResolvingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-teal-400" />
            Compliance Pre-Flight Check & Interoperability Center
          </h2>
          <p className="text-xs text-slate-400">Strict trial activation gating, human-in-the-loop terminology prototype & export roadmap</p>
          <p className="text-[10px] text-slate-500 mt-0.5 italic">
            Synthetic clinical-trial data. FHIR R4 and CDISC SDTM are architecture roadmap representations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFHIR}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-teal-300 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
          >
            <Code className="w-3.5 h-3.5 text-teal-400" /> [Roadmap] Preview FHIR R4
          </button>
          <button
            onClick={handleExportCDISC}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sky-300 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" /> [Roadmap] Preview CDISC SDTM
          </button>
        </div>
      </div>

      {/* Select Protocol */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4">
        <label className="text-xs font-semibold text-slate-300 shrink-0">Select Protocol for Pre-Flight Evaluation:</label>
        <select
          value={activeStudyId}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            setActiveStudyId(id);
            onSelectStudy(id);
          }}
          className="px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-teal-500 max-w-md"
        >
          {studies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.protocol_number}: {s.short_title} ({s.status})
            </option>
          ))}
        </select>
      </div>

      {/* COMPLIANCE PRE-FLIGHT CHECK PANEL */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-teal-400" />
              TRIAL ACTIVATION PRE-FLIGHT CHECKLIST
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Prerequisite verification required before moving study status to 'Recruiting'.
            </p>
          </div>

          {preflightData && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
              preflightData.ready_for_activation
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            }`}>
              {preflightData.ready_for_activation ? "✓ READY FOR RECRUITMENT" : "✗ ACTIVATION BLOCKED"}
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-center text-slate-400 font-mono text-xs py-4 animate-pulse">Running pre-flight checks...</p>
        ) : preflightData ? (
          <div className="space-y-4">
            {!preflightData.ready_for_activation && (
              <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-800/40 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-300">TRIAL ACTIVATION BLOCKED</h4>
                  <p className="text-slate-300 mt-0.5">{preflightData.block_reason}</p>
                </div>
              </div>
            )}

            {preflightData.ready_for_activation && (
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-300">ALL CHECKS PASSED — ELIGIBLE FOR ACTIVATION</h4>
                  <p className="text-slate-300 mt-0.5">Study {preflightData.protocol_number} has met all prerequisite conditions for participant recruitment.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {preflightData.checklist.map((item: any) => (
                <div
                  key={item.key}
                  className={`p-3.5 rounded-lg border text-xs ${
                    item.passed ? "bg-slate-950 border-slate-800" : "bg-rose-950/20 border-rose-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {item.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <h4 className={`font-bold ${item.passed ? "text-slate-200" : "text-rose-300"}`}>{item.title}</h4>
                        <p className="text-slate-400 text-[11px] mt-0.5">{item.details}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      item.passed ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {item.passed ? "PASSED" : "MISSING"}
                    </span>
                  </div>

                  {/* Resolve action for failed milestone-based items */}
                  {!item.passed && item.milestone_id && (
                    <div className="mt-3 pt-3 border-t border-rose-800/30">
                      {resolveSuccess === item.key ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Milestone marked complete — pre-flight updated!
                        </div>
                      ) : (
                        <button
                          onClick={() => handleResolveMilestone(item)}
                          disabled={resolvingKey === item.key}
                          className="px-3 py-1.5 rounded bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 text-[11px] font-bold border border-teal-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Wrench className="w-3 h-3" />
                          {resolvingKey === item.key ? "Resolving..." : `Resolve: Mark '${item.title}' Complete`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* HUMAN-IN-THE-LOOP TERMINOLOGY ASSISTANT */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4 text-teal-400" />
            CLINICAL TERMINOLOGY MAPPING ASSISTANT (Prototype Human-in-the-Loop)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrates alignment of indigenous Ayurvedic clinical terms with regulatory dictionary codes (prototype lookup table; not live MedDRA/WHODrug API).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">Enter Ayurvedic Clinical Term:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ayurvedaTerm}
                onChange={(e) => setAyurvedaTerm(e.target.value)}
                placeholder="e.g. Aruchi, Kasa, Jwara"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={() => handleSuggestTerminology()}
                disabled={termLoading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white"
              >
                Map
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase mr-1">Quick Sample:</span>
              {["Aruchi", "Kasa", "Jwara", "Shwasa", "Sandhigata Vata", "Yakrit Roga"].map((t) => (
                <button
                  key={t}
                  onClick={() => { setAyurvedaTerm(t); handleSuggestTerminology(t); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {termResult && (
            <div className="lg:col-span-2 p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Input Concept:</span>
                  <h4 className="font-bold text-sm text-teal-300">{termResult.input_term}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Match Confidence:</span>
                  <p className="font-extrabold text-emerald-400 text-sm">{termResult.confidence_percentage}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Suggested Clinical Interpretation:</p>
                  <p className="font-bold text-slate-100 mt-0.5">{termResult.suggested_interpretation}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Standardized Code (MedDRA / SNOMED):</p>
                  <p className="font-bold text-slate-100 font-mono text-[11px] mt-0.5">{termResult.standardized_code}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 italic">Human-in-the-loop: Investigator approval required before regulatory export.</span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold">
                    [Accept Coding]
                  </button>
                  <button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700">
                    [Review Alternatives]
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interoperability Modal */}
      {interopData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-3xl rounded-xl border border-slate-700 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Code className="w-5 h-5 text-teal-400" />
                {interopTitle}
              </h3>
              <button onClick={() => setInteropData(null)} className="text-slate-400 hover:text-slate-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-teal-300 overflow-x-auto max-h-96">
              {JSON.stringify(interopData, null, 2)}
            </pre>
            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button onClick={() => setInteropData(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
