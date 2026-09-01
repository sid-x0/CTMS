"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { DashboardView } from "@/components/views/DashboardView";
import { StudiesView } from "@/components/views/StudiesView";
import { SitesView } from "@/components/views/SitesView";
import { ParticipantsView } from "@/components/views/ParticipantsView";
import { MilestonesView } from "@/components/views/MilestonesView";
import { SafetyView } from "@/components/views/SafetyView";
import { ComplianceView } from "@/components/views/ComplianceView";
import { AuditLogsView } from "@/components/views/AuditLogsView";
import { UsersView } from "@/components/views/UsersView";
import { AlertsView } from "@/components/views/AlertsView";
import { useAuth } from "@/context/AuthContext";
import { fetchAPI } from "@/lib/api";

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedStudyId, setSelectedStudyId] = useState<number | undefined>(undefined);

  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [studies, setStudies] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    try {
      const [dash, stList, alertList] = await Promise.all([
        fetchAPI("/dashboard/portfolio").catch(() => null),
        fetchAPI("/studies").catch(() => []),
        fetchAPI("/alerts?unread_only=true").catch(() => [])
      ]);
      setDashboardData(dash);
      setStudies(stList);
      setAlerts(alertList);
    } catch (err) {
      console.error("Data load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleNavigateTab = (tab: string, studyId?: number) => {
    setActiveTab(tab);
    if (studyId) {
      setSelectedStudyId(studyId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alerts.length} />

        <main className="flex-1 p-5 max-w-7xl mx-auto w-full overflow-x-hidden space-y-6">
          {activeTab === "dashboard" && (
            <DashboardView data={dashboardData} onNavigateTab={handleNavigateTab} />
          )}

          {activeTab === "studies" && (
            <StudiesView
              studies={studies}
              selectedStudyId={selectedStudyId}
              onSelectStudy={setSelectedStudyId}
              onRefresh={loadData}
            />
          )}

          {activeTab === "sites" && (
            <SitesView studies={studies} onRefresh={loadData} />
          )}

          {activeTab === "participants" && (
            <ParticipantsView studies={studies} onRefresh={loadData} />
          )}

          {activeTab === "safety" && (
            <SafetyView onRefresh={loadData} />
          )}

          {activeTab === "compliance" && (
            <ComplianceView studies={studies} onRefresh={loadData} />
          )}

          {activeTab === "milestones" && (
            <MilestonesView studies={studies} onRefresh={loadData} />
          )}

          {activeTab === "audit" && <AuditLogsView />}

          {activeTab === "users" && <UsersView />}

          {activeTab === "alerts" && <AlertsView />}
        </main>
      </div>
    </div>
  );
}
