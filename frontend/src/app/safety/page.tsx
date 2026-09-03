"use client";

import React from "react";
import { SafetyView } from "@/components/views/SafetyView";
import { useApp } from "@/context/AppContext";

export default function SafetyPage() {
  const { studies, selectedStudyId, setSelectedStudyId, loadData } = useApp();

  return (
    <SafetyView
      studies={studies}
      selectedStudyId={selectedStudyId}
      onSelectStudy={setSelectedStudyId}
      onRefresh={loadData}
    />
  );
}
