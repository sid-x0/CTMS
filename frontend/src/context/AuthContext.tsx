"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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

interface AuthContextType {
  user: UserSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const verifyExistingSession = async () => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("ctms_jwt_token");
      const savedSessionStr = localStorage.getItem("ctms_user_session");

      if (!token || !savedSessionStr) {
        // No session exists
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Verify token with backend /auth/me
        const me = await fetchAPI("/auth/me");
        if (me && me.id) {
          const verifiedSession: UserSession = {
            user_id: me.id,
            user_name: me.name,
            user_email: me.email,
            user_role: me.role as RoleType,
            organization: me.organization || "All India Institute of Ayurveda",
            access_token: token,
          };
          localStorage.setItem("ctms_user_session", JSON.stringify(verifiedSession));
          setUser(verifiedSession);
        } else {
          throw new Error("Invalid session response");
        }
      } catch (err) {
        console.warn("Session verification failed. Invalidating token.", err);
        localStorage.removeItem("ctms_jwt_token");
        localStorage.removeItem("ctms_user_session");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyExistingSession();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetchAPI("/auth/login/json", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const session: UserSession = {
        user_id: res.user_id,
        user_name: res.user_name,
        user_email: res.user_email,
        user_role: res.user_role as RoleType,
        organization: res.organization || "All India Institute of Ayurveda",
        access_token: res.access_token,
      };

      localStorage.setItem("ctms_jwt_token", res.access_token);
      localStorage.setItem("ctms_user_session", JSON.stringify(session));
      setUser(session);
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("ctms_jwt_token");
    localStorage.removeItem("ctms_user_session");
    setUser(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
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
