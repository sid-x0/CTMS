"use client";

import React, { useState } from "react";
import { useAuth, RoleType } from "@/context/AuthContext";
import { Shield, LogOut, ChevronDown, Activity, RefreshCw, Clock } from "lucide-react";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleRoleSelect = async (role: RoleType) => {
    setSwitching(true);
    await switchRole(role);
    setDropdownOpen(false);
    setSwitching(false);
  };

  const nowString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base text-slate-100 leading-tight flex items-center gap-2">
            AIIA Clinical Research <span className="text-slate-500 font-normal">|</span> <span className="text-teal-400 font-semibold">Research Intelligence Platform</span>
          </h1>
          <p className="text-[11px] text-slate-400">All India Institute of Ayurveda • Ministry of Ayush</p>
        </div>
      </div>

      {/* Role Switcher & User Profile */}
      <div className="flex items-center gap-4">
        {/* Timestamp */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 px-3 py-1 bg-slate-950 rounded-md border border-slate-800 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Last Sync: {nowString} IST</span>
        </div>

        {/* Quick Role Switcher Bar */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-slate-200 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">Active Role:</span>
            <span className="font-semibold text-slate-100">{user?.user_role || "Select Role"}</span>
            {switching ? (
              <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1.5 z-50">
              <div className="px-3 py-1 border-b border-slate-700/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Active Operational Role
              </div>
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSelect(r)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700 transition-colors ${
                    user?.user_role === r ? "bg-teal-500/10 text-teal-300 font-semibold" : "text-slate-300"
                  }`}
                >
                  <span>{r}</span>
                  {user?.user_role === r && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs">
              {user.user_name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight">{user.user_name}</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{user.user_email}</p>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
