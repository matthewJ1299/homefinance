/**
 * The single place a sellable feature is declared.
 *
 * To add a feature: append its key to `FEATURE_KEYS` and add one entry to `FEATURES`.
 * No migration, no repository change, no nav change — `household_features` stores
 * whatever key appears here, `/admin/features` renders `FEATURE_LIST`, and
 * `navItemsForFeatures` filters from `NAV_HREF_FEATURE`.
 *
 * Entitlements are per **household** and set only by a super-admin in `/admin`.
 * There is no per-user layer and no end-user toggle: a household is sold a feature
 * or it is not. See docs/feature-access.md.
 *
 * This module is deliberately client-safe — no `process.env`, no db, no service
 * imports. `nav-items.ts` pulls it into `"use client"` components, so importing
 * server code here would drag the AI SDKs into the browser bundle. Server-side
 * prerequisites are declared as the `serverConfig` tag and resolved in
 * `./server-config`.
 */

export const FEATURE_KEYS = [
  "ai_budget_analysis",
  "recon",
  "what_i_owe",
  "mortgage",
  "goals",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Extra server-side prerequisite beyond the entitlement (API keys, OAuth app). */
export type FeatureServerConfig = "none" | "ai_keys" | "graph_oauth";

export interface FeatureDefinition {
  /** Persisted verbatim in `household_features.feature_key`. Never rename an existing key. */
  key: FeatureKey;
  /** Admin-facing name shown in `/admin`. */
  label: string;
  /** Admin-facing one-liner: what the household gets when this is switched on. */
  description: string;
  /** Nav hrefs hidden when the household is not entitled. */
  navHrefs: readonly string[];
  /** Copy shown on the placeholder page and returned from 403s / action guards. */
  deniedMessage: string;
  serverConfig: FeatureServerConfig;
  /** Shown in `/admin` when `serverConfig` is unsatisfied on this deployment. */
  serverConfigHint?: string;
}

export const FEATURES: Readonly<Record<FeatureKey, FeatureDefinition>> = {
  ai_budget_analysis: {
    key: "ai_budget_analysis",
    label: "AI budget analysis",
    description:
      "AI-generated monthly budget reports, follow-up questions, and one-click apply of suggested budget changes.",
    navHrefs: ["/budget-ai-report"],
    deniedMessage:
      "AI budget analysis is not part of your plan. Contact your administrator to add it.",
    serverConfig: "ai_keys",
    serverConfigHint:
      "Set GEMINI_FREE_API_KEY for the free tier, or OPENAI_API_KEY / GEMINI_PAID_API_KEY for the paid tier.",
  },
  recon: {
    key: "recon",
    label: "Bank email reconciliation (Recon)",
    description:
      "Connect Outlook via Microsoft Graph and turn bank notification emails into reviewed transactions.",
    navHrefs: ["/recon"],
    deniedMessage:
      "Bank email reconciliation (Recon) is not part of your plan. Contact your administrator to add it.",
    serverConfig: "graph_oauth",
    serverConfigHint:
      "Set GRAPH_OAUTH_CLIENT_ID and GRAPH_OAUTH_CLIENT_SECRET (optionally GRAPH_OAUTH_TENANT).",
  },
  what_i_owe: {
    key: "what_i_owe",
    label: "What I owe",
    description:
      "Printable per-person statement of split balances and mortgage contributions for the month.",
    navHrefs: ["/what-i-owe"],
    deniedMessage:
      "“What I owe” is not part of your plan. Contact your administrator to add it.",
    serverConfig: "none",
  },
  mortgage: {
    key: "mortgage",
    label: "Mortgage",
    description: "Track bond balance, payments, rate changes, and equity split between partners.",
    navHrefs: ["/mortgage"],
    deniedMessage: "Mortgage tracking is not part of your plan. Contact your administrator to add it.",
    serverConfig: "none",
  },
  goals: {
    key: "goals",
    label: "Goals",
    description:
      "A Goals view of the budget: categories with an amount to reach by a date, and what to assign each month to land it.",
    navHrefs: ["/goals"],
    deniedMessage: "Goals are not part of your plan. Contact your administrator to add it.",
    serverConfig: "none",
  },
};

export const FEATURE_LIST: readonly FeatureDefinition[] = FEATURE_KEYS.map((k) => FEATURES[k]);

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && (FEATURE_KEYS as readonly string[]).includes(value);
}

/**
 * Keep only keys the registry still knows about. Rows for a retired feature stay in
 * the database but stop granting anything.
 */
export function toFeatureKeys(values: readonly unknown[]): FeatureKey[] {
  return values.filter(isFeatureKey);
}

/** nav href -> the feature key gating it. Derived, never hand-maintained. */
export const NAV_HREF_FEATURE: ReadonlyMap<string, FeatureKey> = new Map(
  FEATURE_LIST.flatMap((f) => f.navHrefs.map((href) => [href, f.key] as const))
);
