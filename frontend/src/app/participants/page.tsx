"use client";

import React from "react";
import { ParticipantsView } from "@/components/views/ParticipantsView";
import { useApp } from "@/context/AppContext";

export default function ParticipantsPage() {
  const { studies, selectedStudyId, setSelectedStudyId, loadData } = useApp();

  return (
    <ParticipantsView
      studies={studies}
      selectedStudyId={selectedStudyId}
      onSelectStudy={setSelectedStudyId}
      onRefresh={loadData}
    />
  );
}
