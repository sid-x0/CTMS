"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    // Full viewport height, no overflow on the outer container
    <div className="flex h-screen overflow-hidden bg-[#f4f6f8]">
      {/* Sidebar: fixed height, never scrolls with content */}
      <Sidebar />

      {/* Right column: navbar (fixed height) + scrollable main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        {/* Only this area scrolls */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
