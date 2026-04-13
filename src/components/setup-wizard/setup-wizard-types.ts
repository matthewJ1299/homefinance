import type { SetupWizardState } from "@/lib/repositories/interfaces/user.repository";

export interface SetupWizardBootstrapData {
  setup: SetupWizardState;
  budgetMonthStartDay: number;
  aiFeatureAllowed: boolean;
  aiEnabled: boolean;
  aiUsePaid: boolean;
  reconFeatureAllowed: boolean;
  reconEnabled: boolean;
}

