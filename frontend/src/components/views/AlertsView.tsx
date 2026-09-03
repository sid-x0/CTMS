"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Bell, AlertTriangle, CheckCircle, Info, RefreshCw } from "lucide-react";

interface AlertsViewProps {
  onNavigateTab: (tab: string, studyId?: number) => void;
}

function sevMeta(severity: string) {
  switch (severity) {
    case "CRITICAL": return { icon: <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />, bar: "border-l-red-500", bg: "" };
    case "WARNING":  return { icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />, bar: "border-l-amber-400", bg: "" };
    default:         return { icon: <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />, bar: "border-l-blue-400", bg: "" };
  }
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onNavigateTab }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    setLoading(true);
    try { setAlerts(await fetchAPI("/alerts")); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAlerts(); }, []);

  const markRead = async (id: number) => {
    try { await fetchAPI(`/alerts/${id}/read`, { method: "PATCH" }); loadAlerts(); }
    catch { /* silent */ }
  };

  const unread = alerts.filter(a => !a.is_read);
  const read   = alerts.filter(a => a.is_read);

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">Alerts &amp; Action Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">Automated trial lag, overdue milestones &amp; site performance flags</p>
        </div>
        <button onClick={loadAlerts} className="ctms-btn-ghost text-xs" aria-label="Refresh"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white border border-slate-200 rounded-md">
          <RefreshCw className="w-4 h-4 animate-spin text-[#1e3a5f] mr-2" />
          <span className="text-sm text-slate-500">Loading alerts…</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-slate-200 rounded-md text-center">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <p className="text-sm font-medium text-slate-600">No system alerts active</p>
          <p className="text-xs text-slate-400">All studies operating within expected parameters</p>
        </div>
      ) : (
        <>
          {/* Unread */}
          {unread.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Unacknowledged</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{unread.length} item{unread.length !== 1 ? "s" : ""} requiring acknowledgment</p>
                </div>
                <span className="ctms-badge-critical">{unread.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {unread.map(a => {
                  const meta = sevMeta(a.severity);
                  return (
                    <div key={a.id} className={`px-4 py-3.5 border-l-2 ${meta.bar} flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {meta.icon}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{a.alert_type}</span>
                            <h4 className="text-xs font-semibold text-slate-800">{a.title}</h4>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-snug">{a.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">{new Date(a.created_at).toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => markRead(a.id)}
                        className="ctms-btn-secondary text-[10px] py-1 px-2.5 flex-shrink-0"
                        aria-label="Acknowledge alert"
                      >
                        <CheckCircle className="w-3 h-3" /> Acknowledge
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Read */}
          {read.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-md">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-500">Acknowledged ({read.length})</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {read.map(a => {
                  const meta = sevMeta(a.severity);
                  return (
                    <div key={a.id} className="px-4 py-3 flex items-start gap-3 opacity-60 hover:opacity-90 transition-opacity">
                      {meta.icon}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{a.alert_type}</span>
                          <p className="text-xs text-slate-600">{a.title}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{new Date(a.created_at).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
