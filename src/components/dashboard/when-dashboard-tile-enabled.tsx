"use client";

import type { ReactNode } from "react";
import { useDashboardTilesSettings } from "@/components/settings/dashboard-tiles-settings";

type DashboardTileKey =
  | "quickAdd"
  | "accounts"
  | "goalsSummary"
  | "creditSummary"
  | "goalAlerts"
  | "today"
  | "splitBalance"
  | "budgetWarning"
  | "aiAnalysis"
  | "transactions"
  | "incomeSection"
  | "populateMonth";

interface WhenDashboardTileEnabledProps {
  tile: DashboardTileKey;
  children: ReactNode;
}

export function WhenDashboardTileEnabled({ tile, children }: WhenDashboardTileEnabledProps) {
  const { state } = useDashboardTilesSettings();
  if (!state[tile]) return null;
  return <>{children}</>;
}

