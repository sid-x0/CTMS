"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth, RoleType } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import {
  Shield,
  LogOut,
  ChevronDown,
  Activity,
  RefreshCw,
  Clock,
  Bell,
  CheckCircle2,
  Lock,
  Building,
  UserCheck
} from "lucide-react";

const ROLES: RoleType[] = [
  "Administrator",
  "Principal Investigator",
  "Study Coordinator",
  "Clinical Trial Monitor",
  "Ethics Committee Member",
  "Pharmacovigilance User",
  "Regulator / Read-only User",
];

export const Navbar: React.FC = () => {
  const { user, switchRole, logout } = useAuth();
  const { unreadAlertCount, navigateTab } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleRoleSelect = async (role: RoleType) => {
    setSwitching(true);
    await switchRole(role);
    setDropdownOpen(false);
    setSwitching(false);
  };

  const [timeString, setTimeString] = useState<string>("");

  React.useEffect(() => {
    setTimeString(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, []);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800/90 px-5 flex items-center justify-between sticky top-0 z-50 shadow-md">
      {/* Brand & Institutional Identity */}
      <div className="flex items-center gap-3.5">
        {/* AIIA Institutional Emblem Icon */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center text-white shadow-md border border-emerald-400/30 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm md:text-base text-slate-100 tracking-tight leading-none">
                AIIA CTMS
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                NPvCC Governance
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-normal mt-0.5">
              All India Institute of Ayurveda <span className="text-slate-600">•</span> Ministry of Ayush, Govt. of India
            </p>
          </div>
        </Link>
      </div>

      {/* Center Compliance Status Pill */}
      <div className="hidden xl:flex items-center gap-3 px-3 py-1 bg-slate-950/80 rounded-full border border-slate-800 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Intranet
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1 text-slate-300">
          <Lock className="w-3 h-3 text-teal-400" />
          Hash-Chained Audit Trail
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1 text-slate-300">
          <CheckCircle2 className="w-3 h-3 text-cyan-400" />
          CTRI Format Aligned
        </span>
      </div>

      {/* Right Controls: Alert Bell, Role Switcher, Profile */}
      <div className="flex items-center gap-3">
        {/* Timestamp */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 px-2.5 py-1 bg-slate-950/90 rounded-lg border border-slate-800 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span suppressHydrationWarning>Sync: {timeString || "--:--"} IST</span>
        </div>

        {/* Quick Alert Bell Button */}
        <button
          onClick={() => navigateTab("alerts")}
          className="relative p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-slate-100 border border-slate-700/70 transition-colors"
          title="View Operational Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full bg-rose-500 text-white px-1 shadow">
              {unreadAlertCount}
            </span>
          )}
        </button>

        {/* Quick Role Switcher Bar */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-slate-200 transition-all shadow-sm"
          >
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <div className="text-left leading-tight hidden sm:block">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Role Persona</span>
              <span className="font-semibold text-slate-100 text-xs">{user?.user_role || "Select Role"}</span>
            </div>
            {switching ? (
              <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1.5 z-50">
              <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Switch Institutional Persona</span>
                <span className="text-teal-400 font-normal">JWT-Authenticated</span>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleSelect(r)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      user?.user_role === r ? "bg-teal-500/15 text-teal-300 font-semibold" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className={`w-3.5 h-3.5 ${user?.user_role === r ? "text-teal-400" : "text-slate-500"}`} />
                      <span>{r}</span>
                    </div>
                    {user?.user_role === r && <span className="w-2 h-2 rounded-full bg-teal-400 shadow-sm" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-900/60 border border-teal-500/40 flex items-center justify-center text-teal-200 font-bold text-xs shadow-inner">
              {user.user_name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight">{user.user_name}</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{user.organization || "AIIA"}</p>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-0.5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
