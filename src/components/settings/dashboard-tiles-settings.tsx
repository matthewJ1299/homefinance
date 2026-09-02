"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

export type DashboardTileKey =
  | "quickAdd"
  | "today"
  | "splitBalance"
  | "budgetWarning"
  | "aiAnalysis"
  | "transactions"
  | "incomeSection";

type DashboardTilesSettingsState = Record<DashboardTileKey, boolean>;

const STORAGE_KEY = "homefinance-dashboard-tiles-v2";

const defaultState: DashboardTilesSettingsState = {
  quickAdd: true,
  today: true,
  splitBalance: true,
  budgetWarning: true,
  aiAnalysis: true,
  transactions: true,
  incomeSection: true,
};

const LEGACY_DEAD_KEYS = ["accounts", "goalsSummary", "creditSummary", "goalAlerts", "populateMonth"] as const;

function loadSettings(): DashboardTilesSettingsState {
  if (typeof window === "undefined") return defaultState;
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<DashboardTilesSettingsState>;
      return { ...defaultState, ...parsed };
    }
    const rawV1 = window.localStorage.getItem("homefinance-dashboard-tiles-v1");
    if (!rawV1) return defaultState;
    const parsed = JSON.parse(rawV1) as Partial<DashboardTilesSettingsState> & { recentExpenses?: boolean };
    const merged: Partial<DashboardTilesSettingsState> = {};
    for (const key of Object.keys(defaultState) as DashboardTileKey[]) {
      if (typeof parsed[key] === "boolean") merged[key] = parsed[key];
    }
    if (merged.transactions === undefined && typeof parsed.recentExpenses === "boolean") {
      merged.transactions = parsed.recentExpenses;
    }
    for (const dead of LEGACY_DEAD_KEYS) {
      void dead;
    }
    return { ...defaultState, ...merged };
  } catch {
    return defaultState;
  }
}

function saveSettings(state: DashboardTilesSettingsState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useDashboardTilesSettings() {
  const [state, setState] = useState<DashboardTilesSettingsState>(defaultState);

  useEffect(() => {
    setState(loadSettings());
  }, []);

  const update = (key: DashboardTileKey, value: boolean) => {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  return { state, update };
}

export function DashboardTilesSettings() {
  const { state, update } = useDashboardTilesSettings();

  const items: Array<{ key: DashboardTileKey; label: string; description?: string }> = [
    { key: "quickAdd", label: "Quick add expense", description: "Show the amount field and Add button at the top of the dashboard." },
    { key: "today", label: "Today's events tile", description: "Show today's calendar events on the dashboard." },
    { key: "splitBalance", label: "Split balance card", description: "Show who owes whom summary for split expenses." },
    { key: "budgetWarning", label: "Budget warning tile", description: "Show warnings when categories are overspent." },
    { key: "aiAnalysis", label: "AI analysis button", description: "Show the Analyze spending button when AI is enabled for your household." },
    { key: "transactions", label: "Recent transactions", description: "Show recent expenses and income for the month (newest first)." },
    { key: "incomeSection", label: "Income this month", description: "Show the Income this month list and quick add form." },
  ];

  return (
    <CollapsibleSection title="Dashboard tiles" defaultOpen={false}>
      <p className="text-xs text-muted-foreground mb-3">
        Choose which tiles appear on the dashboard for this browser. You can change this at any time.
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.key} className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state[item.key]}
              onChange={(e) => update(item.key, e.target.checked)}
              className="mt-1 rounded border-input"
            />
            <span>
              <Label className="text-sm font-medium cursor-pointer">{item.label}</Label>
              {item.description ? (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </CollapsibleSection>
  );
}
