"use client";

import React from "react";
import { SitesView } from "@/components/views/SitesView";
import { useApp } from "@/context/AppContext";

export default function SitesPage() {
  const { studies, selectedStudyId, setSelectedStudyId, loadData } = useApp();

  return (
    <SitesView
      studies={studies}
      selectedStudyId={selectedStudyId}
      onSelectStudy={setSelectedStudyId}
      onRefresh={loadData}
    />
  );
}
