"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  FlaskConical,
  Building2,
  Users,
  Flag,
  FileText,
  UserCog,
  Bell,
  ShieldAlert,
  CheckSquare
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, alertCount = 0 }) => {
  const { user } = useAuth();
  const isAdmin = user?.user_role === "Administrator";

  const navItems = [
    { id: "dashboard", label: "Executive Command", icon: LayoutDashboard },
    { id: "studies", label: "Clinical Studies", icon: FlaskConical },
    { id: "sites", label: "Study Sites Governance", icon: Building2 },
    { id: "participants", label: "Participants & Recruitment", icon: Users },
    { id: "safety", label: "Pharmacovigilance (PV)", icon: ShieldAlert },
    { id: "compliance", label: "Compliance & Pre-Flight", icon: CheckSquare },
    { id: "milestones", label: "Study Milestones", icon: Flag },
    { id: "alerts", label: "Operational Alerts", icon: Bell, badge: alertCount },
    { id: "audit", label: "Audit Trail", icon: FileText },
    ...(isAdmin ? [{ id: "users", label: "User Management", icon: UserCog }] : []),
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-3 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Operational Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-slate-800 text-teal-300 border-l-2 border-teal-500 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Footer Org Info */}
      <div className="pt-3 border-t border-slate-800">
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
          <p className="font-semibold text-slate-200">All India Institute of Ayurveda</p>
          <p className="text-[10px] text-slate-500 mt-0.5">NPvCC & Clinical Research Governance</p>
        </div>
      </div>
    </aside>
  );
};
