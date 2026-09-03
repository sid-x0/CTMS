"use client";

import React from "react";
import { AlertsView } from "@/components/views/AlertsView";
import { useApp } from "@/context/AppContext";

export default function AlertsPage() {
  const { navigateTab } = useApp();

  return <AlertsView onNavigateTab={navigateTab} />;
}
