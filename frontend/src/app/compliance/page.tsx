"use client";

import React from "react";
import { ComplianceView } from "@/components/views/ComplianceView";
import { useApp } from "@/context/AppContext";

export default function CompliancePage() {
  const { studies, selectedStudyId, setSelectedStudyId, loadData } = useApp();

  return (
    <ComplianceView
      studies={studies}
      selectedStudyId={selectedStudyId}
      onSelectStudy={setSelectedStudyId}
      onRefresh={loadData}
    />
  );
}
