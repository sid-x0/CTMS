"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { FileText, Search, Lock, X, CheckCircle, AlertTriangle, RefreshCw, Shield, Eye } from "lucide-react";

function actionBadge(action: string) {
  const a = action?.toUpperCase();
  if (a === "CREATE") return "bg-green-50 text-green-700 border-green-200";
  if (a === "UPDATE" || a === "PATCH") return "bg-blue-50 text-blue-700 border-blue-200";
  if (a === "DELETE") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs]                   = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [selectedLog, setSelectedLog]     = useState<any | null>(null);
  const [integrityResult, setIntegrityResult] = useState<any | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);

  const loadAuditLogs = async () => {
    setLoading(true);
    try { setLogs(await fetchAPI("/audit-logs")); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  const checkIntegrity = async () => {
    setCheckingIntegrity(true);
    try { setIntegrityResult(await fetchAPI("/audit-logs/integrity")); }
    catch { setIntegrityResult({ valid: false, total_records: 0, message: "Failed to reach integrity endpoint." }); }
    finally { setCheckingIntegrity(false); }
  };

  useEffect(() => { loadAuditLogs(); }, []);

  const filteredLogs = logs.filter(l =>
    (l.user_email?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (l.description?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (l.entity_type?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (l.action?.toLowerCase() || "").includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">Audit Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">SHA-256 hash-chained tamper-evident audit trail · Append-only · {logs.length} records</p>
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
              : <><Shield className="w-3.5 h-3.5" /> Verify Integrity</>
            }
          </button>
        </div>
      </div>

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
                {integrityResult.valid ? "Audit Chain Verified — Tamper-Evident Integrity Confirmed" : "Audit Chain Integrity Check Failed"}
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5">{integrityResult.message}</p>
            </div>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-4 text-center text-sm">
            <div><p className="text-lg font-black text-slate-800 font-mono">{integrityResult.total_records}</p><p className="ctms-section-title">Total Records</p></div>
            <div><p className="text-lg font-black text-slate-800 font-mono">{integrityResult.verified_records ?? integrityResult.total_records}</p><p className="ctms-section-title">Verified</p></div>
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
            <div><p className="font-semibold text-slate-800">SHA-256 Chaining</p><p>Each log entry's hash includes the previous entry's hash, creating a cryptographic chain that detects any tampering or deletion.</p></div>
          </div>
          <div className="flex items-start gap-2.5">
            <Shield className="w-3.5 h-3.5 text-[#1e3a5f] mt-0.5 flex-shrink-0" />
            <div><p className="font-semibold text-slate-800">Append-Only</p><p>Audit records are never modified or deleted. Any mutation attempt breaks the hash chain and is detectable via Verify Integrity.</p></div>
          </div>
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div><p className="font-semibold text-slate-800">Scope</p><p>This is a prototype demonstrating hash-chained audit architecture. This does NOT constitute a formal 21 CFR Part 11 digital signature system.</p></div>
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
                      <span className="font-mono text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title={log.entry_hash}>
                        {log.entry_hash ? `${log.entry_hash.slice(0, 8)}…` : "—"}
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
                    {search ? `No records match "${search}"` : "No audit records found."}
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
          <div className="ctms-modal max-w-xl">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800">Audit Record Detail</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body space-y-3">
              {[
                ["Timestamp",   new Date(selectedLog.timestamp).toLocaleString("en-IN")],
                ["User",        `${selectedLog.user_name || ""} <${selectedLog.user_email}>`],
                ["Role",        selectedLog.user_role],
                ["Action",      selectedLog.action],
                ["Entity Type", selectedLog.entity_type],
                ["Entity ID",   selectedLog.entity_id],
                ["Description", selectedLog.description],
                ["IP Address",  selectedLog.ip_address || "—"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-slate-500 font-medium">{k}</span>
                  <span className="col-span-2 text-slate-800">{String(v ?? "—")}</span>
                </div>
              ))}
              <div className="ctms-divider" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">SHA-256 Entry Hash</p>
                <p className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded p-2 break-all text-slate-700">{selectedLog.entry_hash || "—"}</p>
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
