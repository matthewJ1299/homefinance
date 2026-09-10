/**
 * Household comes first. Most of this app is better with someone else in it,
 * and the invite is easiest to send before anyone has typed a budget -- not
 * after, buried in Settings.
 */
export const ONBOARDING_STEPS = [
  "household",
  "accounts",
  "payday",
  "income",
  "categories",
  "budget",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_HEADINGS: Record<OnboardingStep, string> = {
  household: "Who's in the house?",
  accounts: "Where does your money sit?",
  payday: "When do you get paid?",
  income: "What comes in each month?",
  categories: "What do you spend on?",
  budget: "Give every rand a job",
};

export const ONBOARDING_STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  household:
    "Most of this app is better with someone else in it — shared costs, the calendar, lists. You can add people later, but now is easier.",
  accounts:
    "Add the accounts you use day to day. If you only add one, it becomes your default for income and expenses.",
  payday:
    "Pick the day you usually get paid. Your budget month runs from that day until the day before next month’s payday.",
  income: "Add your main monthly income so we can help you plan what is left to spend.",
  categories:
    "Tick the spending areas that apply to you. You can turn categories off or add amounts later in Settings.",
  budget:
    "We spread your income across the categories you chose. Adjust any amount before you finish.",
};

/**
 * Plumbing categories — hidden from the onboarding checklist.
 *
 * Matched on semantic key rather than name, so a household that renamed
 * "Splits" does not suddenly find it offered as a spending area to tick.
 */
export const ONBOARDING_HIDDEN_SEMANTIC_KEYS: ReadonlySet<string> = new Set([
  "splits",
  "mortgage",
]);

/** Name fallback for rows the 0047 backfill has not reached. */
export const ONBOARDING_HIDDEN_CATEGORY_NAMES = new Set(["Splits", "Mortgage"]);

export function isHiddenOnboardingCategory(category: {
  name: string;
  semanticKey?: string | null;
}): boolean {
  if (category.semanticKey != null) {
    return ONBOARDING_HIDDEN_SEMANTIC_KEYS.has(category.semanticKey);
  }
  return ONBOARDING_HIDDEN_CATEGORY_NAMES.has(category.name);
}

/** Common categories pre-selected for new households. */
export const ONBOARDING_DEFAULT_ACTIVE_NAMES = new Set([
  "Groceries",
  "Transport",
  "Dining Out",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Insurance",
  "Savings",
  "Home",
]);

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === "string" && (ONBOARDING_STEPS as readonly string[]).includes(value);
}

export function onboardingStepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

export function resolveOnboardingStep(stored: string | null | undefined): OnboardingStep {
  if (isOnboardingStep(stored)) return stored;
  return "household";
}

/**
 * Someone joining an existing house skips household setup: it is already named
 * and they are already in it. Their first run starts at their own accounts.
 */
export const JOINER_FIRST_STEP: OnboardingStep = "accounts";

export function stepsRemainingFrom(step: OnboardingStep): number {
  return ONBOARDING_STEPS.length - onboardingStepIndex(step);
}
