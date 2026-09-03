"use client";

import React from "react";
import { StudiesView } from "@/components/views/StudiesView";
import { useApp } from "@/context/AppContext";

export default function StudiesPage() {
  const { studies, selectedStudyId, setSelectedStudyId, navigateTab, loadData } = useApp();

  return (
    <StudiesView
      studies={studies}
      selectedStudyId={selectedStudyId}
      onSelectStudy={setSelectedStudyId}
      onNavigateTab={navigateTab}
      onRefresh={loadData}
    />
  );
}
