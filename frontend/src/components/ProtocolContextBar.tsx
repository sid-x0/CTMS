"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  FlaskConical,
  Building2,
  Users,
  ShieldAlert,
  CheckSquare,
  Flag,
  ChevronRight,
  ShieldCheck,
  FolderGit2,
  Activity,
  Layers,
  Sparkles,
  ExternalLink
} from "lucide-react";

export const ProtocolContextBar: React.FC = () => {
  const pathname = usePathname();
  const { studies, selectedStudyId, setSelectedStudyId, navigateTab } = useApp();

  const selectedStudy = studies.find((s) => s.id === selectedStudyId);
  const currentSegment = pathname ? pathname.split("/")[1] || "dashboard" : "dashboard";

  const handleStudyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "all") {
      setSelectedStudyId(undefined);
    } else {
      setSelectedStudyId(Number(val));
    }
  };

  const isScopeAll = !selectedStudy;

  const quickNavTabs = [
    { id: "studies", label: "Protocol", icon: FlaskConical },
    { id: "sites", label: "Sites", icon: Building2 },
    { id: "participants", label: "Participants", icon: Users },
    { id: "safety", label: "Safety (PV)", icon: ShieldAlert },
    { id: "compliance", label: "Pre-Flight", icon: CheckSquare },
    { id: "milestones", label: "Milestones", icon: Flag },
  ];

  return (
    <div className="bg-slate-900/95 border-b border-slate-800/80 px-4 py-2.5 shadow-sm sticky top-16 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Left: Study Selector & Protocol Meta */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-semibold uppercase tracking-wider text-[10px]">
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Trial Scope</span>
          </div>

          {/* Selector Dropdown */}
          <div className="relative min-w-[280px]">
            <select
              value={selectedStudyId !== undefined ? selectedStudyId : "all"}
              onChange={handleStudyChange}
              className="w-full bg-slate-950 border border-slate-700 hover:border-teal-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-inner appearance-none pr-8 transition-colors"
            >
              <option value="all">🌐 All Protocols (Institutional Portfolio Scope)</option>
              {studies.map((st) => (
                <option key={st.id} value={st.id}>
                  [{st.protocol_number}] {st.short_title || st.title} ({st.phase})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
            </div>
          </div>

          {/* Quick Context Details when a study is selected */}
          {selectedStudy ? (
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {selectedStudy.status}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {selectedStudy.phase}
              </span>
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span className="font-semibold text-slate-200">
                  {selectedStudy.current_enrollment ?? 0} / {selectedStudy.target_enrollment}
                </span>
                <span className="text-slate-400">
                  ({selectedStudy.recruitment_percentage ? selectedStudy.recruitment_percentage.toFixed(0) : 0}%)
                </span>
              </span>
              <span className="text-slate-400 text-[11px] truncate max-w-[160px]" title={selectedStudy.principal_investigator}>
                PI: <span className="text-slate-200 font-medium">{selectedStudy.principal_investigator}</span>
              </span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>{studies.length} Protocols Loaded</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>ICH-GCP / CDSCO Compliance Active</span>
              </span>
            </div>
          )}
        </div>

        {/* Right: Cross-Module Fast-Jump Tabs (when focused on a study or for quick workflow) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 md:pb-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Modules:
          </span>
          {quickNavTabs.map((t) => {
            const Icon = t.icon;
            const isCurrent = currentSegment === t.id;
            return (
              <button
                key={t.id}
                onClick={() => navigateTab(t.id, selectedStudyId)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isCurrent
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent"
                }`}
                title={`Jump to ${t.label} module`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-teal-400" : "text-slate-400"}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
