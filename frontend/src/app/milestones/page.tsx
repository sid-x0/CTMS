"use client";

import React from "react";
import { MilestonesView } from "@/components/views/MilestonesView";
import { useApp } from "@/context/AppContext";

export default function MilestonesPage() {
  const { studies, selectedStudyId, setSelectedStudyId, loadData } = useApp();

  return (
    <MilestonesView
      studies={studies}
      selectedStudyId={selectedStudyId}
      onSelectStudy={setSelectedStudyId}
      onRefresh={loadData}
    />
  );
}
