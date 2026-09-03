"use client";

import React, { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { UserCog, Plus, Shield, X, RefreshCw } from "lucide-react";

const ROLES = [
  "Administrator","Principal Investigator","Study Coordinator",
  "Clinical Trial Monitor","Ethics Committee Member",
  "Pharmacovigilance User","Regulator / Read-only User",
];

const ROLE_DESC: Record<string, string> = {
  "Administrator": "Full access — system configuration and user management",
  "Principal Investigator": "Protocol oversight, participant data, milestone management",
  "Study Coordinator": "Operational trial tasks, participants, milestones",
  "Clinical Trial Monitor": "Read access for monitoring; protocol data",
  "Ethics Committee Member": "Ethics review access; read-only for most operational data",
  "Pharmacovigilance User": "Safety event logging, signal review, pharmacovigilance",
  "Regulator / Read-only User": "Read-only across all modules — no mutations permitted",
};

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "", email: "", password: "Password123!",
    role: "Study Coordinator", organization: "All India Institute of Ayurveda",
  });

  const loadUsers = async () => {
    setLoading(true);
    try { setUsers(await fetchAPI("/users")); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(""); setSubmitting(true);
    try {
      await fetchAPI("/users", { method: "POST", body: JSON.stringify(formData) });
      setShowAddModal(false);
      setFormData({ name: "", email: "", password: "Password123!", role: "Study Coordinator", organization: "All India Institute of Ayurveda" });
      loadUsers();
    } catch (err: any) { setErrorMsg(err.message || "Failed to create user"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ctms-page-title">User Administration</h1>
          <p className="text-xs text-slate-500 mt-0.5">Role-based access control · 7 institutional roles · JWT-authenticated</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadUsers} className="ctms-btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowAddModal(true)} className="ctms-btn-primary">
            <Plus className="w-3.5 h-3.5" /> Provision User
          </button>
        </div>
      </div>

      {/* Role reference */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800">Role Access Matrix</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Backend RBAC is authoritative — frontend role switching issues real JWT sessions</p>
        </div>
        <div className="divide-y divide-slate-100">
          {ROLES.map(r => (
            <div key={r} className="px-4 py-2.5 flex items-center gap-4">
              <div className="w-6 h-6 rounded bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-3.5 h-3.5 text-[#1e3a5f]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">{r}</p>
                <p className="text-[10px] text-slate-500">{ROLE_DESC[r]}</p>
              </div>
              {r === "Regulator / Read-only User" && (
                <span className="ctms-badge-warning flex-shrink-0">Read-only</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Registered Users</h2>
          <span className="ctms-badge-neutral">{users.length} users</span>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm flex justify-center items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ctms-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Organization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="font-medium text-slate-800">{u.name}</td>
                    <td className="font-mono text-[12px] text-[#1e3a5f]">{u.email}</td>
                    <td>
                      <span className="ctms-badge-info">{u.role}</span>
                    </td>
                    <td className="text-slate-600">{u.organization}</td>
                    <td><span className="ctms-badge-success">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add user modal */}
      {showAddModal && (
        <div className="ctms-modal-overlay">
          <div className="ctms-modal max-w-md">
            <div className="ctms-modal-header">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <UserCog className="w-4 h-4 text-[#1e3a5f]" /> Provision System User
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="ctms-modal-body">
              {errorMsg && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{errorMsg}</div>}
              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className="ctms-label">Full Name *</label>
                  <input type="text" required placeholder="Dr. Mahendra Sharma" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} className="ctms-input" />
                </div>
                <div>
                  <label className="ctms-label">Email Address *</label>
                  <input type="email" required placeholder="user@aiia.gov.in" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })} className="ctms-input" />
                </div>
                <div>
                  <label className="ctms-label">Role *</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="ctms-select">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ctms-label">Organization</label>
                  <input type="text" required value={formData.organization}
                    onChange={e => setFormData({ ...formData, organization: e.target.value })} className="ctms-input" />
                </div>
                <div className="ctms-modal-footer -mx-5 -mb-4 mt-2 rounded-b-md">
                  <button type="button" onClick={() => setShowAddModal(false)} className="ctms-btn-ghost">Cancel</button>
                  <button type="submit" disabled={submitting} className="ctms-btn-primary">
                    {submitting ? "Creating…" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
