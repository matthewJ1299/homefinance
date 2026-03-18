"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";

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
  | "recentExpenses"
  | "incomeSection"
  | "populateMonth";

type DashboardTilesSettingsState = Record<DashboardTileKey, boolean>;

const STORAGE_KEY = "homefinance-dashboard-tiles-v1";

const defaultState: DashboardTilesSettingsState = {
  quickAdd: true,
  accounts: true,
  goalsSummary: true,
  creditSummary: true,
  goalAlerts: true,
  today: true,
  splitBalance: true,
  budgetWarning: true,
  aiAnalysis: true,
  recentExpenses: true,
  incomeSection: true,
  populateMonth: true,
};

function loadSettings(): DashboardTilesSettingsState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<DashboardTilesSettingsState>;
    return { ...defaultState, ...parsed };
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
    { key: "accounts", label: "Accounts tile", description: "Show the accounts summary tile (net worth, cash, debt)." },
    { key: "goalsSummary", label: "Savings goals tile", description: "Show savings goal progress and monthly compliance." },
    { key: "creditSummary", label: "Credit goals tile", description: "Show credit payoff status and suggested payment." },
    { key: "goalAlerts", label: "Goal alerts tile", description: "Show alerts when you are behind on monthly goal targets." },
    { key: "today", label: "Today’s events tile", description: "Show today’s calendar events on the dashboard." },
    { key: "splitBalance", label: "Split balance card", description: "Show who owes whom summary for split expenses." },
    { key: "budgetWarning", label: "Budget warning tile", description: "Show warnings when categories are overspent." },
    { key: "aiAnalysis", label: "AI analysis button", description: "Show the Analyze spending button (when AI is configured)." },
    { key: "recentExpenses", label: "Recent expenses", description: "Show the Recent expenses list and pagination." },
    { key: "incomeSection", label: "Income this month", description: "Show the Income this month list and quick add form." },
    { key: "populateMonth", label: "Populate this month", description: "Show the Populate this month button at the bottom." },
  ];

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium mb-1">Dashboard tiles</h2>
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
              {item.description && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

