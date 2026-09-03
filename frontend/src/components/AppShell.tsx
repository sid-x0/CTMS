"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { Activity } from "lucide-react";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading) {
      if (!user && !isLoginPage) {
        router.replace("/login");
      } else if (user && isLoginPage) {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, isLoginPage, router]);

  // If on /login page, render clean auth view without sidebar/navbar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If checking session on initial page load, display minimal clinical spinner
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f4f6f8] text-slate-600 gap-3">
        <div className="w-8 h-8 rounded bg-[#1e3a5f] flex items-center justify-center text-white shadow-xs">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div className="text-xs font-semibold text-slate-700">Verifying session…</div>
      </div>
    );
  }

  // If unauthenticated and awaiting redirect to /login
  if (!user) {
    return null;
  }

  // Authenticated application view with fixed static sidebar and scrollable main
  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f8]">
      {/* Sidebar: desktop fixed height, stays visible during scroll */}
      <Sidebar />

      {/* Right container: header + independent scrolling workspace */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
