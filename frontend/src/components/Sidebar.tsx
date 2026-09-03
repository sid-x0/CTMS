"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import {
  Activity, LayoutDashboard, FlaskConical, Building2, Users,
  Flag, FileText, UserCog, Bell, ShieldAlert, CheckSquare,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const { unreadAlertCount, navigateTab } = useApp();
  const isAdmin = user?.user_role === "Administrator";

  const currentTab = (() => {
    if (!pathname || pathname === "/" || pathname === "/dashboard") return "dashboard";
    return pathname.split("/")[1] || "dashboard";
  })();

  const navGroups = [
    {
      groupTitle: "Overview",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "alerts",    label: "Alerts",    icon: Bell, badge: unreadAlertCount },
      ],
    },
    {
      groupTitle: "Clinical Research",
      items: [
        { id: "studies",      label: "Studies",      icon: FlaskConical },
        { id: "sites",        label: "Sites",        icon: Building2 },
        { id: "participants", label: "Participants",  icon: Users },
        { id: "milestones",   label: "Milestones",   icon: Flag },
      ],
    },
    {
      groupTitle: "Safety & Compliance",
      items: [
        { id: "safety",     label: "Safety",     icon: ShieldAlert },
        { id: "compliance", label: "Compliance", icon: CheckSquare },
      ],
    },
    {
      groupTitle: "Governance",
      items: [
        { id: "audit", label: "Audit Log", icon: FileText },
        ...(isAdmin ? [{ id: "users", label: "Users", icon: UserCog }] : []),
      ],
    },
  ];

  return (
    <aside className="w-52 bg-white border-r border-slate-200 flex flex-col min-h-screen flex-shrink-0">
      {/* Brand */}
      <div className="h-12 flex items-center gap-2.5 px-4 border-b border-slate-200">
        <div className="w-6 h-6 bg-[#1e3a5f] rounded flex items-center justify-center flex-shrink-0">
          <Activity className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-[#0f172a] leading-none">AIIA CTMS</div>
          <div className="text-[9px] text-slate-400 mt-0.5 leading-none">NPvCC · Ministry of Ayush</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.groupTitle} className="mb-4 px-2">
            <div className="px-2 mb-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {group.groupTitle}
            </div>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                      isActive
                        ? "bg-blue-50 text-[#1e3a5f] font-semibold border-l-2 border-[#1e3a5f]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent"
                    }`}
                    aria-label={item.label}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-[#1e3a5f]" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {(item as any).badge > 0 && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 rounded-full">
                        {(item as any).badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-200">
        <p className="text-[10px] text-slate-400 leading-relaxed">AIIA CTMS v2.4 · Prototype</p>
        <p className="text-[9px] text-slate-300">Synthetic data · AIIA NPvCC</p>
      </div>
    </aside>
  );
};
