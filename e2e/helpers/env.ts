/** Credentials and knobs for the E2E suite. Prefer env overrides over hardcodes. */

export const E2E = {
  mattEmail: process.env.SEED_USER1_EMAIL ?? "matt@homefinance.local",
  mattName: process.env.SEED_USER1_NAME ?? "Matt",
  sydneyEmail: process.env.SEED_USER2_EMAIL ?? "sydney@homefinance.local",
  sydneyName: process.env.SEED_USER2_NAME ?? "Sydney",
  password: process.env.SEED_USER_PASSWORD ?? "ChangeMe123!",
  householdName: process.env.SEED_HOUSEHOLD_NAME ?? "Jordaan household",
  /** Unique suffix so registration/admin creates do not collide across runs. */
  runId: process.env.E2E_RUN_ID ?? `${Date.now()}`,
} as const;

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${E2E.runId}@e2e.homefinance.local`;
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${E2E.runId.slice(-6)}`;
}
