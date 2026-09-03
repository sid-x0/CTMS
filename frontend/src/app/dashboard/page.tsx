"use client";

import React from "react";
import { DashboardView } from "@/components/views/DashboardView";
import { useApp } from "@/context/AppContext";

export default function DashboardPage() {
  const { dashboardData, navigateTab } = useApp();

  return (
    <DashboardView data={dashboardData} onNavigateTab={navigateTab} />
  );
}
