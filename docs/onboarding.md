# Onboarding (`/welcome`)

Related: [Settings](./design-system.md), [feature-access](./feature-access.md), [database](./database.md).

## Model

New users land on a full-page **five-step setup guide** at `/welcome` instead of a modal wizard.

| Step | Heading | Purpose |
|------|---------|---------|
| 1 | Where does your money sit? | Create accounts; primary is set when there is more than one |
| 2 | When do you get paid? | Sets `users.budget_month_start_day` (payday framing) |
| 3 | What comes in each month? | Adds income and optional recurring salary |
| 4 | What do you spend on? | Activates/deactivates seeded categories; optional “same every month” amounts |
| 5 | Give every rand a job | Runs `BudgetService.autoAllocate` for the current budget month |

State is stored on `users`:

- `setup_wizard_status` — `not_started` | `in_progress` | `dismissed` | `completed`
- `setup_wizard_step` — resumable step key (`accounts` … `budget`)

Catalogue of step keys: `src/lib/onboarding/steps.ts`.

## Flow

- Six steps: **household** (name it, who's in it, what they will and won't see), accounts, payday, income, categories, budget.
- First sign-in with `not_started` redirects to `/welcome` from `(app)/layout.tsx`.
- The payday step sets the **household's** budget month, not the user's, so everyone sees the same one.
- Entering the guide sets `in_progress` once; **completed users are never downgraded**.
- **Skip** sets `dismissed` and returns to the dashboard; a dismissible **Setup progress banner** links back to `/welcome`.
- **Settings → Household setup** reopens the guide for completed users without changing status until they interact.

## Bootstrap defaults

`bootstrapHouseholdDefaults` seeds categories with `defaultAmount = null` so step 4 is where real amounts are chosen. Dev seed (`db:seed`) keeps realistic amounts separately.

Plumbing categories **Splits** and **Mortgage** are hidden from the categories checklist.

## Repository / actions

- `UserRepository.getSetupWizardState` / `setSetupWizardStatus` / `setSetupWizardStep`
- `updateSetupWizardStatusAction` / `updateSetupWizardStepAction` in `user-preferences.actions.ts`
- UI: `src/components/onboarding/onboarding-flow.tsx`, `src/app/(app)/welcome/page.tsx`

The legacy modal (`SetupWizardHost` in layout) is removed; `SetupWizardLauncherCard` is replaced by **Open setup guide** in Settings.
