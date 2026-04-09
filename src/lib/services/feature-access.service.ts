import { getUserRepository } from "@/lib/repositories";

/**
 * Whether AI buttons, report page interactivity, and analysis API should work for this user.
 * Combines admin-style feature access (`users.ai_feature_allowed`) with the user's Settings toggle
 * and whether the server's keys support their chosen tier.
 */
export async function resolveAiInteractiveEnabled(
  userId: number,
  preferredTierConfigured: boolean
): Promise<boolean> {
  const repo = getUserRepository();
  const [featureAllowed, prefEnabled] = await Promise.all([
    repo.getAiFeatureAllowed(userId),
    repo.getAiEnabled(userId),
  ]);
  return featureAllowed && prefEnabled && preferredTierConfigured;
}

/**
 * Whether Recon nav, page, Graph connect, and mutating APIs should allow this user.
 * Combines admin-style feature access (`users.recon_feature_allowed`) with the user's Settings toggle.
 */
export async function resolveReconInteractiveEnabled(userId: number): Promise<boolean> {
  const repo = getUserRepository();
  const [featureAllowed, prefEnabled] = await Promise.all([
    repo.getReconFeatureAllowed(userId),
    repo.getReconEnabled(userId),
  ]);
  return featureAllowed && prefEnabled;
}
