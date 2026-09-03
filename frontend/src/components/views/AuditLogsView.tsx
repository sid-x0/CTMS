"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { FileText, Search, Shield, Eye, Lock, X, CheckCircle, AlertTriangle } from "lucide-react";

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [integrityResult, setIntegrityResult] = useState<any | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI("/audit-logs");
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  const checkIntegrity = async () => {
    setCheckingIntegrity(true);
    try {
      const result = await fetchAPI("/audit-logs/integrity");
      setIntegrityResult(result);
    } catch (err) {
      console.error("Failed to check integrity", err);
      setIntegrityResult({ valid: false, total_records: 0, message: "Failed to reach integrity endpoint." });
    } finally {
      setCheckingIntegrity(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      (l.user_email && l.user_email.toLowerCase().includes(search.toLowerCase())) ||
      (l.description && l.description.toLowerCase().includes(search.toLowerCase())) ||
      (l.entity_type && l.entity_type.toLowerCase().includes(search.toLowerCase())) ||
      (l.action && l.action.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            Append-Only Audit Trail
          </h2>
          <p className="text-xs text-slate-400">Regulatory system traceability, user action records and SHA-256 hash-chain tamper evidence</p>
          <p className="text-[10px] text-slate-500 italic mt-0.5">Hash chain is tamper-evident, not cryptographically signed. Row deletion is not detected.</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={checkIntegrity}
            disabled={checkingIntegrity}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-teal-600 text-xs text-slate-300 hover:text-teal-300 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            {checkingIntegrity ? "Verifying..." : "Verify Chain Integrity"}
          </button>
          {integrityResult && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              integrityResult.valid
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}>
              {integrityResult.valid
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <AlertTriangle className="w-3.5 h-3.5" />}
              {integrityResult.valid
                ? `Chain valid (${integrityResult.total_records} records)`
                : `Integrity issue at record #${integrityResult.first_invalid_id}`}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search audit trail by user, action, entity or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">User & Role</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Inspect Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 animate-pulse">
                    Loading audit trail entries...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    No audit records match the filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        log.action === "CREATE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                        log.action === "STATUS_CHANGE" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" :
                        log.action === "LOGIN" ? "bg-sky-500/10 text-sky-400 border border-sky-500/30" :
                        "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-200">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""}
                    </td>
                    <td className="p-4 text-slate-300">
                      <p className="font-semibold text-slate-100">{log.user_email || "System"}</p>
                      <p className="text-[10px] text-slate-400">{log.user_role}</p>
                    </td>
                    <td className="p-4 text-slate-300 max-w-[280px] truncate">{log.description}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-slate-700 transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-400" />
                  Audit Trail Entry #{selectedLog.id}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(selectedLog.timestamp).toUTCString()}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-slate-400 font-medium">Description:</p>
                <p className="text-slate-100 font-medium mt-1">{selectedLog.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-slate-400 font-semibold mb-1">Previous Value (Before):</h4>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 overflow-x-auto max-h-48">
                    {selectedLog.previous_value ? selectedLog.previous_value : "None (New Entity)"}
                  </pre>
                </div>

                <div>
                  <h4 className="text-slate-400 font-semibold mb-1">New Value (After):</h4>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
                    {selectedLog.new_value ? selectedLog.new_value : "None"}
                  </pre>
                </div>
              </div>

              {/* Tamper-evident hash chain block */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Tamper-Evident Hash Chain Link (SHA-256):</p>
                <div className="truncate">
                  <span className="text-slate-500">Record Hash: </span>
                  <span className="text-teal-400 font-bold">{selectedLog.record_hash || "Legacy unhashed entry"}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-500">Previous Hash: </span>
                  <span className="text-slate-400">{selectedLog.previous_hash || "Genesis (Initial entry)"}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
