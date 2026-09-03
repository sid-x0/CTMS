"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Building2, Plus, MapPin, User, X, AlertTriangle, RefreshCw } from "lucide-react";

interface SitesViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

function perfLabel(pct: number, status: string): { bar: string; badge: string; label: string; warn: boolean } {
  if (status === "Suspended") return { bar: "bg-slate-400", badge: "bg-slate-100 text-slate-500 border-slate-200", label: "Suspended", warn: false };
  if (pct >= 70) return { bar: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",   label: "On Track",    warn: false };
  if (pct >= 45) return { bar: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200",      label: "Progressing", warn: false };
  if (pct >= 20) return { bar: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200",   label: "Lagging",     warn: true };
  return           { bar: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",       label: "Critical Lag",warn: true };
}

export const SitesView: React.FC<SitesViewProps> = ({ studies, selectedStudyId, onSelectStudy, onRefresh }) => {
  const { user } = useAuth();
  const canModify =
    user?.user_role === "Administrator" ||
    user?.user_role === "Principal Investigator" ||
    user?.user_role === "Study Coordinator";

  const [filterStudyId, setFilterStudyId] = useState<string>(selectedStudyId ? String(selectedStudyId) : "");
  const [sites, setSites]                 = useState<any[]>([]);
  const [loading, setLoading]             = useState(false);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [errorMsg, setErrorMsg]           = useState("");

  const [formData, setFormData] = useState({
    study_id: studies[0]?.id || 1,
    site_name: "", site_code: "",
    institution: "All India Institute of Ayurveda",
    location: "New Delhi",
    investigator: user?.user_name || "Dr. Mahesh Vyas",
    target_enrollment: 50,
  });

  useEffect(() => { if (selectedStudyId) setFilterStudyId(String(selectedStudyId)); }, [selectedStudyId]);
  useEffect(() => { loadSites(); }, [filterStudyId]);

  const loadSites = async () => {
    setLoading(true);
    try {
      if (filterStudyId) {
        setSites(await fetchAPI(`/studies/${filterStudyId}/sites`));
      } else {
        const all: any[] = [];
        for (const s of studies) {
          try {
            const data = await fetchAPI(`/studies/${s.id}/sites`);
            all.push(...data.map((site: any) => ({ ...site, study_protocol: s.protocol_number, study_short_title: s.short_title })));
          } catch { /* skip */ }
        }
        setSites(all);
      }
    } catch { setSites([]); }
    finally { setLoading(false); }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(""); setSubmitting(true);
    try {
      await fetchAPI(`/studies/${formData.study_id}/sites`, { method: "POST", body: JSON.stringify(formData) });
      setShowAddModal(false); loadSites(); onRefresh();
    } catch (err: any) { setErrorMsg(err.message || "Failed to add site"); }
    finally { setSubmitting(false); }
  };

  const totalEnrolled = sites.reduce((a, s) => a + (s.current_enrollment || 0), 0);
  const totalTarget   = sites.reduce((a, s) => a + (s.target_enrollment || 0), 0);
  const activeSites   = sites.filter(s => s.status === "Active").length;
  const laggingSites  = sites.filter(s => {
    const pct = s.recruitment_percentage ?? (s.target_enrollment > 0 ? Math.round((s.current_enrollment / s.target_enrollment) * 100) : 0);
    return pct < 45 && s.status === "Active";
  }).length;
  const overallPct = totalTarget > 0 ? Math.round((totalEnrolled / totalTarget) * 100) : 0;

  const sorted = [...sites].sort((a, b) => {
    const pA = a.recruitment_percentage ?? 0;
    const pB = b.recruitment_percentage ?? 0;
    return pA - pB;
  });

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">Site Performance</h1>
          <p className="text-xs text-slate-500 mt-0.5">Multi-center site monitoring · Investigator alignment · Recruitment performance</p>
        </div>
        <div className="flex items-center gap-2">
          {canModify && (
            <button onClick={() => setShowAddModal(true)} className="ctms-btn-primary" aria-label="Add Trial Site">
              <Plus className="w-3.5 h-3.5" /> Add Site
            </button>
          )}
          <button onClick={loadSites} className="ctms-btn-ghost" aria-label="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Filter + KPIs */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="ctms-section-title whitespace-nowrap">Study</label>
          <select
            value={filterStudyId}
            onChange={e => { setFilterStudyId(e.target.value); onSelectStudy(e.target.value ? parseInt(e.target.value) : undefined); }}
            className="ctms-select text-xs py-1.5 max-w-xs"
            aria-label="Filter sites by study"
          >
            <option value="">All Studies</option>
            {studies.map(s => <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="ctms-kpi py-2 px-3"><span className="text-sm font-black font-mono text-slate-800">{sites.length}</span><span className="text-[10px] text-slate-500 ml-1">sites</span></div>
          {activeSites > 0 && <div className="ctms-kpi py-2 px-3 border-green-200 bg-green-50"><span className="text-sm font-black font-mono text-green-700">{activeSites}</span><span className="text-[10px] text-green-600 ml-1">active</span></div>}
          {laggingSites > 0 && <div className="ctms-kpi py-2 px-3 border-amber-200 bg-amber-50"><AlertTriangle className="w-3.5 h-3.5 text-amber-600 inline mr-0.5" /><span className="text-sm font-black font-mono text-amber-700">{laggingSites}</span><span className="text-[10px] text-amber-600 ml-1">lagging</span></div>}
          <div className="ctms-kpi py-2 px-3"><span className="text-sm font-black font-mono text-slate-800">{totalEnrolled}/{totalTarget}</span><span className="text-[10px] text-slate-500 ml-1">({overallPct}%)</span></div>
        </div>
      </div>

      {/* Site table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800">Site Registry</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Sorted by recruitment performance — underperforming sites listed first</p>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-slate-400 text-sm flex justify-center items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading sites…
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm italic">No trial sites found for the selected scope.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ctms-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Location</th>
                  <th>Investigator</th>
                  {!filterStudyId && <th>Protocol</th>}
                  <th>Status</th>
                  <th>Enrollment</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(site => {
                  const pct = site.recruitment_percentage ??
                    (site.target_enrollment > 0 ? Math.round((site.current_enrollment / site.target_enrollment) * 100) : 0);
                  const perf = perfLabel(pct, site.status);
                  return (
                    <tr key={site.id} className={perf.warn && site.status === "Active" ? "bg-amber-50/30" : ""}>
                      <td>
                        <div className="flex items-center gap-2">
                          {perf.warn && site.status === "Active" && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                          <div>
                            <span className="font-mono text-[11px] font-semibold text-[#1e3a5f] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{site.site_code}</span>
                            <p className="font-medium text-slate-800 mt-0.5">{site.site_name}</p>
                            <p className="text-[10px] text-slate-400">{site.institution}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-slate-600 text-xs">
                          <MapPin className="w-3 h-3 text-slate-400" />{site.location}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-slate-700 text-xs">
                          <User className="w-3 h-3 text-slate-400" />{site.investigator}
                        </div>
                      </td>
                      {!filterStudyId && (
                        <td><span className="font-mono text-[11px] font-semibold text-[#1e3a5f]">{site.study_protocol || "—"}</span></td>
                      )}
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                          site.status === "Active" ? "bg-green-50 text-green-700 border-green-200" :
                          site.status === "Suspended" ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>{site.status || "Active"}</span>
                      </td>
                      <td>
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-slate-700">{site.current_enrollment}/{site.target_enrollment}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${perf.bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-base font-black font-mono ${perf.label === "On Track" ? "text-green-700" : perf.label === "Progressing" ? "text-blue-700" : perf.label === "Lagging" ? "text-amber-700" : perf.label === "Suspended" ? "text-slate-500" : "text-red-700"}`}>{pct}%</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${perf.badge}`}>{perf.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {sites.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 bg-slate-50 rounded-b-md">
            <span>{sites.length} site{sites.length !== 1 ? "s" : ""}</span>
            <span className="font-mono">Portfolio: {totalEnrolled}/{totalTarget} enrolled ({overallPct}%)</span>
          </div>
        )}
      </div>

      {/* Add Site Modal */}
      {showAddModal && (
        <div className="ctms-modal-overlay">
          <div className="ctms-modal max-w-lg">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1e3a5f]" /> Add Trial Site
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body">
              {errorMsg && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{errorMsg}</div>}
              <form onSubmit={handleAddSite} className="space-y-3">
                <div>
                  <label className="ctms-label">Study Protocol *</label>
                  <select value={formData.study_id} onChange={e => setFormData({ ...formData, study_id: parseInt(e.target.value) })} className="ctms-select">
                    {studies.map(s => <option key={s.id} value={s.id}>{s.protocol_number}: {s.short_title}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="ctms-label">Site Code *</label><input type="text" required placeholder="SITE-AIIA-01" value={formData.site_code} onChange={e => setFormData({ ...formData, site_code: e.target.value })} className="ctms-input" /></div>
                  <div><label className="ctms-label">Site Name *</label><input type="text" required placeholder="AIIA Main OPD" value={formData.site_name} onChange={e => setFormData({ ...formData, site_name: e.target.value })} className="ctms-input" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="ctms-label">Institution</label><input type="text" required value={formData.institution} onChange={e => setFormData({ ...formData, institution: e.target.value })} className="ctms-input" /></div>
                  <div><label className="ctms-label">Location / City</label><input type="text" required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="ctms-input" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="ctms-label">Investigator Name</label><input type="text" required value={formData.investigator} onChange={e => setFormData({ ...formData, investigator: e.target.value })} className="ctms-input" /></div>
                  <div><label className="ctms-label">Target Enrollment</label><input type="number" min={1} value={formData.target_enrollment} onChange={e => setFormData({ ...formData, target_enrollment: parseInt(e.target.value) || 0 })} className="ctms-input" /></div>
                </div>
                <div className="ctms-modal-footer -mx-5 -mb-4 mt-2 rounded-b-md">
                  <button type="button" onClick={() => setShowAddModal(false)} className="ctms-btn-ghost">Cancel</button>
                  <button type="submit" disabled={submitting} className="ctms-btn-primary">{submitting ? "Saving…" : "Add Site"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
