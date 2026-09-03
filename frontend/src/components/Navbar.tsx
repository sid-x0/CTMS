"use client";

import React, { useState } from "react";
import { useAuth, RoleType } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Shield, LogOut, ChevronDown, RefreshCw, Clock } from "lucide-react";

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
  const [timeString, setTimeString] = useState<string>("");

  React.useEffect(() => {
    const update = () =>
      setTimeString(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }));
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  const handleRoleSelect = async (role: RoleType) => {
    setSwitching(true);
    await switchRole(role);
    setDropdownOpen(false);
    setSwitching(false);
  };

  return (
    <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-end gap-3 flex-shrink-0 z-40">
      {/* Time */}
      <span className="hidden lg:block text-xs text-slate-400 font-mono" suppressHydrationWarning>
        {timeString || "--:--"} IST
      </span>

      {/* Role switcher */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-50 transition-colors"
          aria-label="Switch role"
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          <Shield className="w-3.5 h-3.5 text-[#1e3a5f]" />
          <span className="font-medium max-w-[160px] truncate">{user?.user_role || "Select Role"}</span>
          {switching ? (
            <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          )}
        </button>

        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 mt-1 w-68 bg-white border border-slate-200 rounded-md shadow-md py-1 z-50 min-w-[260px]">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Switch Role Persona</p>
                <p className="text-[9px] text-slate-400 mt-0.5">JWT-Authenticated · Real backend session</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {ROLES.map(r => (
                  <button
                    key={r}
                    onClick={() => handleRoleSelect(r)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      user?.user_role === r ? "bg-blue-50 text-[#1e3a5f] font-semibold" : "text-slate-700"
                    }`}
                    role="option"
                    aria-selected={user?.user_role === r}
                  >
                    {r}
                    {user?.user_role === r && <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f] flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* User */}
      {user && (
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded bg-[#1e3a5f] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {user.user_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user.user_name}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{user.organization || "AIIA"}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
