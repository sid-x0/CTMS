"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchAPI } from "@/lib/api";

interface AppContextType {
  dashboardData: any | null;
  studies: any[];
  alerts: any[];
  unreadAlertCount: number;
  selectedStudyId: number | undefined;
  setSelectedStudyId: (id: number | undefined) => void;
  loading: boolean;
  loadData: () => Promise<void>;
  navigateTab: (tab: string, studyId?: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function AppQuerySync({
  onStudyParamChange,
}: {
  onStudyParamChange: (id: number | undefined) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const studyParam = searchParams.get("studyId");
    if (studyParam) {
      const parsed = parseInt(studyParam, 10);
      if (!isNaN(parsed)) {
        onStudyParamChange(parsed);
      }
    }
  }, [searchParams, onStudyParamChange]);

  return null;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();

  const [selectedStudyId, setSelectedStudyId] = useState<number | undefined>(undefined);
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [studies, setStudies] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [dash, stList, alertList] = await Promise.all([
        fetchAPI("/dashboard/portfolio").catch(() => null),
        fetchAPI("/studies").catch(() => []),
        fetchAPI("/alerts?unread_only=true").catch(() => []),
      ]);
      setDashboardData(dash);
      setStudies(stList || []);
      setAlerts(alertList || []);
    } catch (err) {
      console.error("Data load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.access_token) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.user_role, user?.access_token]);

  const navigateTab = (tab: string, studyId?: number) => {
    const targetStudyId = studyId !== undefined ? studyId : selectedStudyId;
    if (studyId !== undefined) {
      setSelectedStudyId(studyId);
    }

    const route = tab === "dashboard" ? "/" : `/${tab}`;
    if (targetStudyId !== undefined && tab !== "dashboard" && tab !== "audit" && tab !== "users" && tab !== "alerts") {
      router.push(`${route}?studyId=${targetStudyId}`);
    } else {
      router.push(route);
    }
  };

  return (
    <AppContext.Provider
      value={{
        dashboardData,
        studies,
        alerts,
        unreadAlertCount: alerts.length,
        selectedStudyId,
        setSelectedStudyId,
        loading,
        loadData,
        navigateTab,
      }}
    >
      <Suspense fallback={null}>
        <AppQuerySync onStudyParamChange={(id) => setSelectedStudyId(id)} />
      </Suspense>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
