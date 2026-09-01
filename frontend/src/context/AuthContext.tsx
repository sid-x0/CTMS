"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";

export type RoleType =
  | "Administrator"
  | "Principal Investigator"
  | "Study Coordinator"
  | "Clinical Trial Monitor"
  | "Ethics Committee Member"
  | "Pharmacovigilance User"
  | "Regulator / Read-only User";

export interface UserSession {
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: RoleType;
  organization: string;
  access_token: string;
}

const MOCK_ROLE_USERS: Record<RoleType, { email: string; name: string }> = {
  "Administrator": { email: "admin@aiia.gov.in", name: "Dr. Tanuja Nesari" },
  "Principal Investigator": { email: "pi@aiia.gov.in", name: "Dr. Mahesh Vyas" },
  "Study Coordinator": { email: "coordinator@aiia.gov.in", name: "Priya Sharma" },
  "Clinical Trial Monitor": { email: "monitor@cro.org", name: "Rajesh Kumar" },
  "Ethics Committee Member": { email: "ethics@aiia.gov.in", name: "Dr. S. K. Gupta" },
  "Pharmacovigilance User": { email: "pv@aiia.gov.in", name: "Dr. Vikram Singh" },
  "Regulator / Read-only User": { email: "regulator@ayush.gov.in", name: "Inspector R. C. Verma" }
};

interface AuthContextType {
  user: UserSession | null;
  login: (email: string, password: string) => Promise<void>;
  switchRole: (role: RoleType) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ctms_user_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem("ctms_user_session");
      }
    } else {
      // Auto login as PI by default for quick demo access
      switchRole("Principal Investigator").catch(() => {});
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetchAPI("/auth/login/json", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      const session: UserSession = {
        user_id: res.user_id,
        user_name: res.user_name,
        user_email: res.user_email,
        user_role: res.user_role as RoleType,
        organization: res.organization,
        access_token: res.access_token
      };
      localStorage.setItem("ctms_jwt_token", res.access_token);
      localStorage.setItem("ctms_user_session", JSON.stringify(session));
      setUser(session);
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      throw err;
    }
  };

  const switchRole = async (role: RoleType) => {
    setError(null);
    const targetUser = MOCK_ROLE_USERS[role];
    if (!targetUser) return;

    try {
      const res = await fetchAPI("/auth/login/json", {
        method: "POST",
        body: JSON.stringify({ email: targetUser.email, password: "Password123!" })
      });
      const session: UserSession = {
        user_id: res.user_id,
        user_name: res.user_name,
        user_email: res.user_email,
        user_role: res.user_role as RoleType,
        organization: res.organization,
        access_token: res.access_token
      };
      localStorage.setItem("ctms_jwt_token", res.access_token);
      localStorage.setItem("ctms_user_session", JSON.stringify(session));
      setUser(session);
    } catch (err: any) {
      // Fallback mock session if backend is initializing
      const session: UserSession = {
        user_id: 1,
        user_name: targetUser.name,
        user_email: targetUser.email,
        user_role: role,
        organization: "All India Institute of Ayurveda",
        access_token: "mock_jwt_token"
      };
      localStorage.setItem("ctms_user_session", JSON.stringify(session));
      setUser(session);
    }
  };

  const logout = () => {
    localStorage.removeItem("ctms_jwt_token");
    localStorage.removeItem("ctms_user_session");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, switchRole, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
