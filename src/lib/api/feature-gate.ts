import { NextResponse } from "next/server";
import { hasFeature, featureDeniedMessage } from "@/lib/features/access";
import { isFeatureServerConfigured } from "@/lib/features/server-config";
import { getHouseholdAiTier } from "@/lib/services/feature-access.service";
import type { FeatureKey } from "@/lib/features/registry";
import { FEATURES } from "@/lib/features/registry";

/**
 * Returns a JSON error response when the household is not entitled or the server
 * lacks config, otherwise null. Synchronous — no DB read (uses request context).
 */
export function featureDeniedResponse(key: FeatureKey): NextResponse | null {
  if (!hasFeature(key)) {
    return NextResponse.json({ error: featureDeniedMessage(key) }, { status: 403 });
  }
  const aiTier = getHouseholdAiTier();
  if (!isFeatureServerConfigured(key, aiTier)) {
    const hint = FEATURES[key].serverConfigHint;
    return NextResponse.json(
      {
        error: hint
          ? `${FEATURES[key].label} is enabled for your household but not configured on this server. ${hint}`
          : `${FEATURES[key].label} is not configured on this server.`,
      },
      { status: 503 }
    );
  }
  return null;
}
