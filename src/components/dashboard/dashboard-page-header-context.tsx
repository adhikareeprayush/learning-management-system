"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardPageHeaderState = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  status?: ReactNode;
};

const defaultState: DashboardPageHeaderState = {
  title: "",
};

type DashboardPageHeaderContextValue = {
  state: DashboardPageHeaderState;
  setState: (state: DashboardPageHeaderState) => void;
};

const DashboardPageHeaderContext =
  createContext<DashboardPageHeaderContextValue | null>(null);

export function DashboardPageHeaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<DashboardPageHeaderState>(defaultState);
  const value = useMemo(() => ({ state, setState }), [state]);

  return (
    <DashboardPageHeaderContext.Provider value={value}>
      {children}
    </DashboardPageHeaderContext.Provider>
  );
}

export function useDashboardPageHeader() {
  const context = useContext(DashboardPageHeaderContext);
  if (!context) {
    throw new Error(
      "useDashboardPageHeader must be used within DashboardPageHeaderProvider",
    );
  }
  return context;
}

/** Pages call this to set the shared chrome title without remounting the toolbar. */
export function useRegisterDashboardPageHeader(
  page: DashboardPageHeaderState,
) {
  const { setState } = useDashboardPageHeader();

  useEffect(() => {
    setState(page);
  }, [
    page.title,
    page.subtitle,
    page.backHref,
    page.backLabel,
    page.status,
    setState,
  ]);

  useEffect(() => {
    return () => setState(defaultState);
  }, [setState]);
}
