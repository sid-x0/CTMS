"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "teal" | "emerald" | "amber" | "rose" | "blue" | "purple";
  progress?: number;
}

const COLOR_MAP = {
  teal: "from-teal-500/20 to-teal-500/5 text-teal-400 border-teal-500/30",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30",
  rose: "from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/30",
  blue: "from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/30",
  purple: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/30",
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "teal",
  progress
}) => {
  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-1.5">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${COLOR_MAP[color]} border shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-4 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
            <span>Completion Rate</span>
            <span className="text-slate-200 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${
                color === "amber" ? "from-amber-500 to-yellow-400" :
                color === "rose" ? "from-rose-500 to-pink-500" :
                "from-teal-500 to-emerald-400"
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
