"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Shield, LogOut } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [timeString, setTimeString] = useState<string>("");

  React.useEffect(() => {
    const update = () =>
      setTimeString(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }));
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-end gap-3 flex-shrink-0 z-40">
      {/* Time */}
      <span className="hidden lg:block text-xs text-slate-400 font-mono" suppressHydrationWarning>
        {timeString || "--:--"} IST
      </span>

      {/* Authenticated Role Persona Badge (Server Source of Truth) */}
      {user && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <Shield className="w-3.5 h-3.5 text-[#1e3a5f]" />
          <span className="font-semibold text-slate-800">{user.user_role}</span>
        </div>
      )}

      {/* Authenticated User & Logout */}
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
