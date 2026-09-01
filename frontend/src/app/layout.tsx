import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIIA CTMS - Clinical Trial Management System",
  description: "Real-time Clinical Trial Management System for All India Institute of Ayurveda (AIIA)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-teal-500 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
