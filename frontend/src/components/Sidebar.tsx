"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
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
  CheckSquare,
  ShieldCheck,
  Server,
  Lock
} from "lucide-react";

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  alertCount: propAlertCount,
}) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const { unreadAlertCount, navigateTab } = useApp();
  const isAdmin = user?.user_role === "Administrator";

  const effectiveAlertCount = propAlertCount !== undefined ? propAlertCount : unreadAlertCount;

  // Determine active tab from prop or current pathname
  const currentTab = propActiveTab || (() => {
    if (!pathname || pathname === "/" || pathname === "/dashboard") return "dashboard";
    const segment = pathname.split("/")[1];
    return segment || "dashboard";
  })();

  const navGroups = [
    {
      groupTitle: "Executive & Governance",
      items: [
        { id: "dashboard", label: "Executive Command", icon: LayoutDashboard },
        { id: "studies", label: "Clinical Studies Portfolio", icon: FlaskConical },
        { id: "alerts", label: "Operational Alerts", icon: Bell, badge: effectiveAlertCount, badgeColor: "rose" },
      ]
    },
    {
      groupTitle: "Trial Operations & Sites",
      items: [
        { id: "sites", label: "Study Sites Governance", icon: Building2 },
        { id: "participants", label: "Participants & Recruitment", icon: Users },
        { id: "milestones", label: "Study Milestones & Timeline", icon: Flag },
      ]
    },
    {
      groupTitle: "Safety & Regulatory Standards",
      items: [
        { id: "safety", label: "Pharmacovigilance (NPvCC)", icon: ShieldAlert, badgeText: "PV Core" },
        { id: "compliance", label: "Compliance & Pre-Flight", icon: CheckSquare },
        { id: "audit", label: "21 CFR Part 11 Audit Trail", icon: FileText },
      ]
    },
    ...(isAdmin ? [{
      groupTitle: "System Administration",
      items: [
        { id: "users", label: "User Management & RBAC", icon: UserCog }
      ]
    }] : [])
  ];

  const handleTabClick = (tabId: string) => {
    if (propSetActiveTab) {
      propSetActiveTab(tabId);
    }
    navigateTab(tabId);
  };

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between p-3 min-h-[calc(100vh-4rem)] select-none">
      <div className="space-y-4">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{group.groupTitle}</span>
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? "bg-slate-800 text-teal-300 border-l-4 border-teal-400 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? "text-teal-400" : "text-slate-400 group-hover:text-slate-300"
                    }`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {item.badge}
                    </span>
                  ) : item.badgeText ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {item.badgeText}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Institutional Security & Governance Footer */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              AIIA Institutional CTMS
            </span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
              v2.4
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            National Pharmacovigilance Centre (NPvCC) • Ministry of Ayush
          </p>
          <div className="pt-1 mt-1 border-t border-slate-900 flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-teal-400" />
              21 CFR Part 11
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Server className="w-2.5 h-2.5" />
              SECURE
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
