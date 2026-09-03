"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, RoleType } from "@/context/AuthContext";
import { Activity, Shield, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

interface RolePreset {
  role: RoleType;
  title: string;
  email: string;
  badgeClass: string;
}

const DEMO_PRESETS: RolePreset[] = [
  { role: "Administrator", title: "Admin", email: "admin@aiia.gov.in", badgeClass: "bg-slate-100 text-slate-700 border-slate-300" },
  { role: "Principal Investigator", title: "PI", email: "pi@aiia.gov.in", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { role: "Study Coordinator", title: "Coordinator", email: "coordinator@aiia.gov.in", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { role: "Clinical Trial Monitor", title: "Monitor", email: "monitor@cro.org", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { role: "Ethics Committee Member", title: "Ethics (IEC)", email: "ethics@aiia.gov.in", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  { role: "Pharmacovigilance User", title: "PV / Safety", email: "pv@aiia.gov.in", badgeClass: "bg-orange-50 text-orange-700 border-orange-200" },
  { role: "Regulator / Read-only User", title: "Regulator (Read-Only)", email: "regulator@ayush.gov.in", badgeClass: "bg-amber-50 text-amber-800 border-amber-300" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [email, setEmail] = useState("pi@aiia.gov.in");
  const [password, setPassword] = useState("Password123!");
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password) {
      setAuthError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword("Password123!");
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col justify-center items-center px-4 py-8 select-none">
      {/* Container */}
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#1e3a5f] text-white mb-3 shadow-sm">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">AIIA CTMS Platform</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Clinical Trial Management & Pharmacovigilance System
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-slate-200/70 border border-slate-300 text-[10px] text-slate-700 font-semibold">
            <span>National Pharmacovigilance Centre (NPvCC)</span>
            <span>·</span>
            <span>Ministry of Ayush</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Account Authentication</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Role permissions are verified and signed server-side by JWT.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold">Authentication Error</p>
                <p className="mt-0.5">{authError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address / User ID
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aiia.gov.in"
                  required
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-4 rounded text-xs font-semibold bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Role Presets (Demo Quick Fill) */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Demo Credentials Quick-Fill
              </span>
              <span className="text-[10px] text-slate-400">Password123!</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handleSelectPreset(p.email)}
                  className={`text-left px-2 py-1.5 rounded border text-[11px] font-medium transition-colors hover:border-slate-400 ${
                    email === p.email ? "border-[#1e3a5f] ring-1 ring-[#1e3a5f]" : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="font-semibold text-slate-800 flex items-center justify-between">
                    <span>{p.title}</span>
                    {email === p.email && <CheckCircle2 className="w-3 h-3 text-[#1e3a5f]" />}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{p.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security & Regulatory Disclaimer */}
        <div className="mt-4 text-center text-[10px] text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-slate-400" />
            <span>Role-Based Access Control (RBAC) enforced on server APIs</span>
          </p>
          <p>Synthetic clinical trial prototype dataset · No real patient PHI/PII</p>
        </div>
      </div>
    </div>
  );
}
