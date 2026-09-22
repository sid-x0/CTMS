"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Search, Lock, X, CheckCircle, AlertTriangle, RefreshCw, Shield, Eye } from "lucide-react";

function actionBadge(action: string) {
  const a = action?.toUpperCase();
  if (a === "CREATE") return "bg-green-50 text-green-700 border-green-200";
  if (a === "UPDATE" || a === "PATCH") return "bg-blue-50 text-blue-700 border-blue-200";
  if (a === "DELETE") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function formatAuditValue(value: unknown, emptyLabel: string) {
  if (value === null || value === undefined || value === "") return emptyLabel;
  const text = String(value);
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export const AuditLogsView: React.FC<{ initialEntityType?: string }> = ({ initialEntityType = "" }) => {
  const [logs, setLogs]                   = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [selectedLog, setSelectedLog]     = useState<any | null>(null);
  const [integrityResult, setIntegrityResult] = useState<any | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [entityType, setEntityType] = useState(initialEntityType);
  const [errorMsg, setErrorMsg] = useState("");

  const loadAuditLogs = async () => {
    setLoading(true);
    setErrorMsg("");
    try { setLogs(await fetchAPI("/audit-logs")); }
    catch (err: any) { setErrorMsg(err.message || "Could not load audit records."); }
    finally { setLoading(false); }
  };

  const checkIntegrity = async () => {
    setCheckingIntegrity(true);
    setErrorMsg("");
    try { setIntegrityResult(await fetchAPI("/audit-logs/integrity")); }
    catch (err: any) { setIntegrityResult(null); setErrorMsg(err.message || "Could not verify the audit hash chain."); }
    finally { setCheckingIntegrity(false); }
  };

  useEffect(() => { loadAuditLogs(); }, []);

  const filteredLogs = logs.filter(l =>
    (!entityType || l.entity_type === entityType) &&
    (
      (l.user_email?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (l.description?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (l.entity_type?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (l.action?.toLowerCase() || "").includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-4 max-w-none">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">Recent operational actions · {logs.length} records available for review</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAuditLogs} className="ctms-btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button
            onClick={checkIntegrity}
            disabled={checkingIntegrity}
            className="ctms-btn-primary"
            aria-label="Verify audit chain integrity"
          >
            {checkingIntegrity
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying…</>
              : <><Shield className="w-3.5 h-3.5" /> Verify SHA-256 Chain</>
            }
          </button>
        </div>
      </div>

      <div className={`border rounded-md shadow-sm ${integrityResult ? (integrityResult.valid ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50") : "border-slate-200 bg-white"}`}>
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Shield className={`w-5 h-5 mt-0.5 ${integrityResult?.valid ? "text-green-600" : "text-[#1e3a5f]"}`} />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Chain verification</h2>
              <p className="text-[11px] text-slate-600">Checks stored record payloads and previous-hash links using the application’s SHA-256 hash chain.</p>
            </div>
          </div>
          {!integrityResult && <button onClick={checkIntegrity} disabled={checkingIntegrity} className="ctms-btn-secondary text-xs whitespace-nowrap">{checkingIntegrity ? "Verifying…" : "Run verification"}</button>}
        </div>
      </div>

      {errorMsg && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{errorMsg}</div>}

      {/* Integrity result */}
      {integrityResult && (
        <div className={`bg-white border rounded-md shadow-sm ${integrityResult.valid ? "border-green-200" : "border-red-200"}`}>
          <div className={`px-4 py-3 border-b rounded-t-md flex items-center gap-3 ${integrityResult.valid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            {integrityResult.valid
              ? <CheckCircle className="w-5 h-5 text-green-600" />
              : <AlertTriangle className="w-5 h-5 text-red-600" />
            }
            <div>
              <h2 className={`text-sm font-semibold ${integrityResult.valid ? "text-green-800" : "text-red-800"}`}>
                {integrityResult.valid ? "SHA-256 Hash-Chain Verified" : "Audit Chain Integrity Check Failed"}
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5">{integrityResult.message}</p>
            </div>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-4 text-center text-sm">
            <div><p className="text-lg font-black text-slate-800 font-mono">{integrityResult.total_records}</p><p className="ctms-section-title">Total Records</p></div>
            <div><p className="text-lg font-black text-slate-800 font-mono">{integrityResult.total_records}</p><p className="ctms-section-title">Records Checked</p></div>
            <div><p className={`text-lg font-black font-mono ${integrityResult.valid ? "text-green-700" : "text-red-700"}`}>{integrityResult.valid ? "PASS" : "FAIL"}</p><p className="ctms-section-title">Status</p></div>
          </div>
        </div>
      )}

      {/* Hash-chain info */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#1e3a5f]" />
          <h2 className="text-sm font-semibold text-slate-800">SHA-256 Hash-Chained Audit Trail</h2>
        </div>
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12px] text-slate-600">
          <div className="flex items-start gap-2.5">
            <Lock className="w-3.5 h-3.5 text-[#1e3a5f] mt-0.5 flex-shrink-0" />
            <div><p className="font-semibold text-slate-800">SHA-256 Chaining</p><p>Each hashed record incorporates the preceding record hash, linking its stored audit payload to the sequence.</p></div>
          </div>
          <div className="flex items-start gap-2.5">
            <Shield className="w-3.5 h-3.5 text-[#1e3a5f] mt-0.5 flex-shrink-0" />
            <div><p className="font-semibold text-slate-800">Verification scope</p><p>Verification recalculates stored payload hashes and checks previous-hash links. It is not a digital-signature, WORM-storage, or certification system.</p></div>
          </div>
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div><p className="font-semibold text-slate-800">Review support</p><p>Open a record to inspect who acted, what changed, when it occurred, and the hash-chain values retained by the application.</p></div>
          </div>
        </div>
      </div>

      {/* Log table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Audit Records</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{filteredLogs.length} of {logs.length} records shown</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={entityType} onChange={e => setEntityType(e.target.value)} className="ctms-select text-xs py-1.5" aria-label="Filter audit entity type">
              <option value="">All activity</option>
              <option value="SafetyEvent">Safety events</option>
              <option value="Participant">Participants</option>
              <option value="Milestone">Milestones</option>
              <option value="Study">Studies</option>
            </select>
            <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1.5" />
            <input
              type="text" placeholder="Search user, action, entity…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="ctms-input text-xs py-1.5 pl-8 w-56"
              aria-label="Search audit logs"
            />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm flex justify-center items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading audit records…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ctms-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Description</th>
                  <th>Hash</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td className="font-mono text-[10px] whitespace-nowrap text-slate-500">
                      {new Date(log.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="text-[12px]">
                      <p className="font-medium text-slate-700">{log.user_name || log.user_email}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{log.user_role}</p>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${actionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-[11px] font-mono text-slate-600">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}</td>
                    <td className="max-w-[280px] text-[12px] text-slate-600 truncate">{log.description}</td>
                    <td>
                      <span className="font-mono text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title={log.record_hash}>
                        {log.record_hash ? `${log.record_hash.slice(0, 8)}…` : "—"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="ctms-btn-ghost py-1 px-2 text-[10px]"
                        aria-label="View full record"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic text-sm">
                    {search || entityType ? "No records match the current filters." : "No audit records found."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log detail modal */}
      {selectedLog && (
        <div className="ctms-modal-overlay">
          <div className="ctms-modal max-w-2xl">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800">Audit Record Detail</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="border border-slate-200 rounded p-2.5"><p className="ctms-section-title">Who</p><p className="font-medium text-slate-800 mt-1">{selectedLog.user_email || "System"}</p><p className="text-[10px] text-slate-500 mt-0.5">{selectedLog.user_role || "—"}</p></div>
                <div className="border border-slate-200 rounded p-2.5"><p className="ctms-section-title">What</p><p className="font-medium text-slate-800 mt-1">{selectedLog.action}</p><p className="text-[10px] text-slate-500 mt-0.5 font-mono">{selectedLog.entity_type}{selectedLog.entity_id ? ` #${selectedLog.entity_id}` : ""}</p></div>
                <div className="border border-slate-200 rounded p-2.5"><p className="ctms-section-title">When</p><p className="font-medium text-slate-800 mt-1">{new Date(selectedLog.timestamp).toLocaleString("en-IN")}</p><p className="text-[10px] text-slate-500 mt-0.5">IP: {selectedLog.ip_address || "—"}</p></div>
              </div>
              <div><p className="ctms-section-title mb-1">Operational detail</p><p className="text-xs text-slate-700">{selectedLog.description || "—"}</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><p className="ctms-section-title mb-1">Before</p><pre className="font-mono whitespace-pre-wrap text-[11px] bg-red-50/60 border border-red-100 rounded p-2.5 break-all text-slate-700 min-h-16">{formatAuditValue(selectedLog.previous_value, "No prior value recorded")}</pre></div>
                <div><p className="ctms-section-title mb-1">After</p><pre className="font-mono whitespace-pre-wrap text-[11px] bg-green-50/60 border border-green-100 rounded p-2.5 break-all text-slate-700 min-h-16">{formatAuditValue(selectedLog.new_value, "No new value recorded")}</pre></div>
              </div>
              <div className="ctms-divider" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Hash Chain · Current Record Hash</p>
                <p className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded p-2 break-all text-slate-700">{selectedLog.record_hash || "Legacy record — no hash retained"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Previous Hash</p>
                <p className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded p-2 break-all text-slate-600">{selectedLog.previous_hash || "—"}</p>
              </div>
            </div>
            <div className="ctms-modal-footer">
              <button onClick={() => setSelectedLog(null)} className="ctms-btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
