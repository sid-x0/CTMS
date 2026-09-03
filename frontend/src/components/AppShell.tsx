"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { ProtocolContextBar } from "@/components/ProtocolContextBar";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <ProtocolContextBar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-5 max-w-7xl mx-auto w-full overflow-x-hidden space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
