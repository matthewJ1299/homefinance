export const ONBOARDING_STEPS = ["accounts", "payday", "income", "categories", "budget"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_HEADINGS: Record<OnboardingStep, string> = {
  accounts: "Where does your money sit?",
  payday: "When do you get paid?",
  income: "What comes in each month?",
  categories: "What do you spend on?",
  budget: "Give every rand a job",
};

export const ONBOARDING_STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
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

/** Plumbing categories — hidden from the onboarding checklist. */
export const ONBOARDING_HIDDEN_CATEGORY_NAMES = new Set(["Splits", "Mortgage"]);

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
  return "accounts";
}

export function stepsRemainingFrom(step: OnboardingStep): number {
  return ONBOARDING_STEPS.length - onboardingStepIndex(step);
}
