"use client";

import React, { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  Plus,
  Filter,
  FlaskConical,
  Building2,
  Users,
  Flag,
  Calendar,
  X,
  ChevronRight,
  CheckCircle2
} from "lucide-react";

interface StudiesViewProps {
  studies: any[];
  selectedStudyId?: number;
  onSelectStudy: (id: number | undefined) => void;
  onRefresh: () => void;
}

export const StudiesView: React.FC<StudiesViewProps> = ({
  studies,
  selectedStudyId,
  onSelectStudy,
  onRefresh
}) => {
  const { user } = useAuth();
  const canModify = user?.user_role === "Administrator" || user?.user_role === "Principal Investigator" || user?.user_role === "Study Coordinator";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // New Study Form State
  const [formData, setFormData] = useState({
    protocol_number: "",
    title: "",
    short_title: "",
    study_type: "Interventional",
    intervention_type: "Ayurvedic Formulation",
    phase: "Phase 2",
    sponsor: "All India Institute of Ayurveda",
    principal_investigator: user?.user_name || "Dr. Mahesh Vyas",
    target_enrollment: 100,
    status: "Draft",
    description: ""
  });

  const filtered = studies.filter((s) => {
    const matchSearch =
      s.protocol_number.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.short_title.toLowerCase().includes(search.toLowerCase()) ||
      s.principal_investigator.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? s.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      await fetchAPI("/studies", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "Failed to create study");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStudy = studies.find((s) => s.id === selectedStudyId);

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-400" />
            Clinical Trials Directory
          </h2>
          <p className="text-xs text-slate-400">Search, monitor and govern active clinical protocols</p>
        </div>

        {canModify && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Clinical Trial
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by protocol #, title, PI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending IEC Approval">Pending IEC Approval</option>
            <option value="IEC Approved">IEC Approved</option>
            <option value="CTRI Registered">CTRI Registered</option>
            <option value="Recruiting">Recruiting</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Studies Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-4">Protocol #</th>
                <th className="p-4">Short Title</th>
                <th className="p-4">Phase & Type</th>
                <th className="p-4">Principal Investigator</th>
                <th className="p-4">Target / Enrolled</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    No clinical studies found matching search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-4 font-bold text-teal-300 font-mono">{s.protocol_number}</td>
                    <td className="p-4 text-slate-100 font-medium max-w-[220px] truncate">{s.short_title}</td>
                    <td className="p-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-medium mr-1.5">{s.phase}</span>
                      <span className="text-slate-400">{s.study_type}</span>
                    </td>
                    <td className="p-4 text-slate-300">{s.principal_investigator}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-300">
                          <span>{s.current_enrollment} / {s.target_enrollment}</span>
                          <span className="font-bold text-teal-400">{s.recruitment_percentage}%</span>
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${Math.min(s.recruitment_percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><StatusBadge status={s.status} /></td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onSelectStudy(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30 transition-all flex items-center gap-1 ml-auto"
                      >
                        View Details <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Study Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-teal-400" />
                Register New Clinical Study Protocol
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Protocol Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AIIA-CT-2025-007"
                    value={formData.protocol_number}
                    onChange={(e) => setFormData({ ...formData, protocol_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Short Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ashwagandha Fatigue Study"
                    value={formData.short_title}
                    onChange={(e) => setFormData({ ...formData, short_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Protocol Title *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Enter full descriptive study title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Phase</label>
                  <select
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Phase 1">Phase 1</option>
                    <option value="Phase 2">Phase 2</option>
                    <option value="Phase 3">Phase 3</option>
                    <option value="Phase 4">Phase 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Intervention Type</label>
                  <select
                    value={formData.intervention_type}
                    onChange={(e) => setFormData({ ...formData, intervention_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Ayurvedic Formulation">Ayurvedic Formulation</option>
                    <option value="Herbomineral">Herbomineral</option>
                    <option value="Herbal Extract">Herbal Extract</option>
                    <option value="Yoga / Panchakarma">Yoga / Panchakarma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Enrollment</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.target_enrollment}
                    onChange={(e) => setFormData({ ...formData, target_enrollment: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Principal Investigator</label>
                  <input
                    type="text"
                    required
                    value={formData.principal_investigator}
                    onChange={(e) => setFormData({ ...formData, principal_investigator: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Sponsor</label>
                  <input
                    type="text"
                    required
                    value={formData.sponsor}
                    onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2"
                >
                  {submitting ? "Creating..." : "Save Protocol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
