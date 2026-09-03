"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Bell, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface AlertsViewProps {
  onNavigateTab: (tab: string, studyId?: number) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onNavigateTab }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI("/alerts");
      setAlerts(data);
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const markRead = async (id: number) => {
    try {
      await fetchAPI(`/alerts/${id}/read`, { method: "PATCH" });
      loadAlerts();
    } catch (err) {
      console.error("Failed to mark alert as read", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Internal Alert Notification Center
          </h2>
          <p className="text-xs text-slate-400">Automated trial lag, overdue milestone & site performance flags</p>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-slate-400 italic text-xs animate-pulse">Loading system notifications...</p>
        ) : alerts.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-400 italic rounded-2xl">
            No system notifications or warnings active.
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`glass-panel p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                a.severity === "CRITICAL"
                  ? "border-rose-500/30 bg-rose-500/5"
                  : a.severity === "WARNING"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-teal-500/30 bg-teal-500/5"
              }`}
            >
              <div className="flex items-start gap-3">
                {a.severity === "CRITICAL" ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5" />
                ) : a.severity === "WARNING" ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-teal-400 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 text-slate-300">
                      {a.alert_type}
                    </span>
                    <h4 className="text-sm font-bold text-slate-100">{a.title}</h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{a.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>

              {!a.is_read && (
                <button
                  onClick={() => markRead(a.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-teal-400" /> Acknowledge
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
