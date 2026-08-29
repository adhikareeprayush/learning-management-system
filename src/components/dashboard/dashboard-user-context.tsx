"use client";

import { createContext, useContext, useEffect } from "react";

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
};

const DashboardUserContext = createContext<DashboardUser | null>(null);

export function DashboardUserProvider({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const src = user.image?.trim();
    if (!src || typeof window === "undefined") return;
    const img = new window.Image();
    img.src = src;
  }, [user.image]);

  return (
    <DashboardUserContext.Provider value={user}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useDashboardUser() {
  return useContext(DashboardUserContext);
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
