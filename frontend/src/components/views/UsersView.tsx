"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { UserCog, Plus, Shield, CheckCircle2, X } from "lucide-react";

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "Password123!",
    role: "Study Coordinator",
    organization: "All India Institute of Ayurveda"
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI("/users");
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      await fetchAPI("/users", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      setShowAddModal(false);
      setFormData({ name: "", email: "", password: "Password123!", role: "Study Coordinator", organization: "All India Institute of Ayurveda" });
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-teal-400" />
            System User Administration
          </h2>
          <p className="text-xs text-slate-400">Governance and role assignment for researchers, coordinators, monitors and regulators</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Provision New User
        </button>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Organization</th>
                <th className="p-4">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 animate-pulse">
                    Loading registered system users...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-slate-100">{u.name}</td>
                    <td className="p-4 text-teal-300 font-mono">{u.email}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 flex items-center gap-1.5 w-fit">
                        <Shield className="w-3 h-3 text-teal-400" />
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{u.organization}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserCog className="w-5 h-5 text-teal-400" /> Provision System User
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-300 text-xs">{errorMsg}</div>}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Mahendra Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="user@aiia.gov.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Principal Investigator">Principal Investigator</option>
                  <option value="Study Coordinator">Study Coordinator</option>
                  <option value="Clinical Trial Monitor">Clinical Trial Monitor</option>
                  <option value="Ethics Committee Member">Ethics Committee Member</option>
                  <option value="Pharmacovigilance User">Pharmacovigilance User</option>
                  <option value="Regulator / Read-only User">Regulator / Read-only User</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Organization</label>
                <input
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 text-white rounded-xl font-semibold">
                  {submitting ? "Saving..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
