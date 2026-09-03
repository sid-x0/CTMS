"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Building2, Plus, Search, MapPin, User, X, AlertTriangle } from "lucide-react";

interface SitesViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

export const SitesView: React.FC<SitesViewProps> = ({ studies, selectedStudyId, onSelectStudy, onRefresh }) => {
  const { user } = useAuth();
  const canModify = user?.user_role === "Administrator" || user?.user_role === "Principal Investigator" || user?.user_role === "Study Coordinator";

  const [filterStudyId, setFilterStudyId] = useState<string>(selectedStudyId ? String(selectedStudyId) : "");
  const [sites, setSites] = useState<any[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    study_id: studies[0]?.id || 1,
    site_name: "",
    site_code: "",
    institution: "All India Institute of Ayurveda",
    location: "New Delhi",
    investigator: user?.user_name || "Dr. Mahesh Vyas",
    target_enrollment: 50
  });

  // When selectedStudyId prop changes, update the filter
  useEffect(() => {
    if (selectedStudyId) {
      setFilterStudyId(String(selectedStudyId));
    }
  }, [selectedStudyId]);

  // Fetch sites whenever the filter changes
  useEffect(() => {
    loadSites();
  }, [filterStudyId]);

  const loadSites = async () => {
    setLoadingSites(true);
    try {
      if (filterStudyId) {
        const data = await fetchAPI(`/studies/${filterStudyId}/sites`);
        setSites(data);
      } else {
        // Load all sites across all studies
        const allSites: any[] = [];
        for (const s of studies) {
          try {
            const data = await fetchAPI(`/studies/${s.id}/sites`);
            const withProtocol = data.map((site: any) => ({ ...site, study_protocol: s.protocol_number, study_short_title: s.short_title }));
            allSites.push(...withProtocol);
          } catch { /* skip */ }
        }
        setSites(allSites);
      }
    } catch (err) {
      console.error("Failed to load sites", err);
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      await fetchAPI(`/studies/${formData.study_id}/sites`, {
        method: "POST",
        body: JSON.stringify(formData)
      });
      setShowAddModal(false);
      loadSites();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add site");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStudyInfo = studies.find(s => String(s.id) === filterStudyId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            Clinical Trial Sites Governance
          </h2>
          <p className="text-xs text-slate-400">Multi-center site monitoring, investigator alignment & recruitment progress</p>
        </div>
        {canModify && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Trial Site
          </button>
        )}
      </div>

      {/* Study filter */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <label className="text-xs font-semibold text-slate-300 shrink-0">Filter by Study Protocol:</label>
        <select
          value={filterStudyId}
          onChange={(e) => {
            setFilterStudyId(e.target.value);
            onSelectStudy(e.target.value ? parseInt(e.target.value) : undefined);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-teal-500 max-w-md"
        >
          <option value="">All Studies Across Network</option>
          {studies.map((s) => (
            <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>
          ))}
        </select>
        {selectedStudyInfo && (
          <span className="text-xs text-teal-400 font-semibold">{sites.length} site(s) for this study</span>
        )}
      </div>

      {/* Sites Grid */}
      {loadingSites ? (
        <div className="p-8 text-center text-slate-400 font-mono text-xs animate-pulse">Loading site data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sites.length === 0 ? (
            <div className="col-span-full glass-panel p-8 text-center text-slate-400 italic rounded-2xl">
              No trial sites found. Select a study or add a new site.
            </div>
          ) : (
            sites.map((site) => {
              const pct = site.recruitment_percentage ?? (site.target_enrollment > 0 ? Math.round((site.current_enrollment / site.target_enrollment) * 100 * 10) / 10 : 0);
              const isUnderperforming = pct < 50 && site.status === "Active";
              return (
                <div key={site.id} className={`glass-panel rounded-2xl p-5 border space-y-4 ${
                  isUnderperforming ? "border-amber-800/40 bg-amber-950/10" : "border-slate-800"
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-[11px] font-bold border border-slate-700">
                          {site.site_code}
                        </span>
                        {isUnderperforming && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                            <AlertTriangle className="w-3 h-3" /> Lag
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 mt-2">{site.site_name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {site.location}
                      </p>
                    </div>
                    <StatusBadge status={site.status || "Active"} />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Institution:</span>
                      <span className="font-medium text-slate-200 truncate max-w-[170px]">{site.institution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Investigator:</span>
                      <span className="font-semibold text-teal-300">{site.investigator}</span>
                    </div>
                    {site.study_protocol && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Protocol:</span>
                        <span className="font-mono text-[10px] text-teal-400">{site.study_protocol}</span>
                      </div>
                    )}
                  </div>

                  {/* Enrollment progress */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-400">Recruitment</span>
                      <span className={`${isUnderperforming ? "text-amber-300" : "text-slate-100"}`}>
                        {site.current_enrollment} / {site.target_enrollment}
                        <span className={`ml-1.5 font-bold ${isUnderperforming ? "text-amber-400" : "text-teal-400"}`}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isUnderperforming ? "bg-amber-500" : "bg-gradient-to-r from-teal-500 to-emerald-400"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Site Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-400" /> Add Trial Site
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">{errorMsg}</div>
            )}
            <form onSubmit={handleAddSite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Study Protocol *</label>
                <select value={formData.study_id} onChange={(e) => setFormData({ ...formData, study_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500">
                  {studies.map((s) => <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Site Code *</label>
                  <input type="text" required placeholder="SITE-AIIA-01" value={formData.site_code}
                    onChange={(e) => setFormData({ ...formData, site_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Site Name *</label>
                  <input type="text" required placeholder="AIIA Main OPD Center" value={formData.site_name}
                    onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Institution</label>
                  <input type="text" required value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Location / City</label>
                  <input type="text" required value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Investigator Name</label>
                  <input type="text" required value={formData.investigator}
                    onChange={(e) => setFormData({ ...formData, investigator: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Enrollment</label>
                  <input type="number" min={1} value={formData.target_enrollment}
                    onChange={(e) => setFormData({ ...formData, target_enrollment: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white rounded-xl font-semibold">
                  {submitting ? "Saving..." : "Add Site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
