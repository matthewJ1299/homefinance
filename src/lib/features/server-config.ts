import type { FeatureKey } from "./registry";
import { FEATURES } from "./registry";
import { hasFeature } from "./access";
import { isAIConfiguredForTier } from "@/lib/services/ai.service";

function isGraphOAuthConfigured(): boolean {
  const clientId = process.env.GRAPH_OAUTH_CLIENT_ID ?? process.env.MICROSOFT_GRAPH_CLIENT_ID;
  const clientSecret =
    process.env.GRAPH_OAUTH_CLIENT_SECRET ?? process.env.MICROSOFT_GRAPH_CLIENT_SECRET;
  return Boolean(clientId?.trim() && clientSecret?.trim());
}

/** Whether this deployment has the server-side prerequisites for a feature. */
export function isFeatureServerConfigured(key: FeatureKey, aiTier: "free" | "paid" = "free"): boolean {
  const tag = FEATURES[key].serverConfig;
  switch (tag) {
    case "none":
      return true;
    case "ai_keys":
      return isAIConfiguredForTier(aiTier);
    case "graph_oauth":
      return isGraphOAuthConfigured();
    default: {
      const _exhaustive: never = tag;
      return Boolean(_exhaustive);
    }
  }
}

/** Entitled for this household AND server prerequisites are satisfied. */
export function isFeatureUsable(key: FeatureKey, aiTier: "free" | "paid" = "free"): boolean {
  if (!hasFeature(key)) return false;
  return isFeatureServerConfigured(key, aiTier);
}
