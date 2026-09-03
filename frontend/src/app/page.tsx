"use client";

import React from "react";
import { DashboardView } from "@/components/views/DashboardView";
import { useApp } from "@/context/AppContext";

export default function Home() {
  const { dashboardData, navigateTab, loading, loadData } = useApp();

  return (
    <DashboardView 
      data={dashboardData} 
      onNavigateTab={navigateTab} 
      loading={loading}
      onRetry={loadData}
    />
  );
}
