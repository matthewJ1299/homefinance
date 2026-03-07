import { initDb } from "@/lib/db";
import { getUserRepository } from "@/lib/repositories";
import { MortgageService } from "@/lib/services/mortgage.service";
import { fromMinorUnits } from "@/lib/utils/currency";
import { MortgageSetupForm } from "@/components/mortgage/mortgage-setup-form";
import { MortgageSummaryCard } from "@/components/mortgage/mortgage-summary-card";
import { EquitySplitChart } from "@/components/mortgage/equity-split-chart";
import { ExtraPaymentForm } from "@/components/mortgage/extra-payment-form";
import { MortgageDetailsSection } from "@/components/mortgage/mortgage-details-section";
import { MortgagePaymentsList } from "@/components/mortgage/mortgage-payments-list";

export default async function MortgagePage() {
  await initDb();
  const service = new MortgageService();
  const { config, userConfigs } = await service.getConfig();

  const userRepo = getUserRepository();
  const userRows = await userRepo.findAll();
  const usersForForm = userRows.map((u) => ({ id: u.id, name: u.name }));

  if (!config) {
    return (
      <div className="p-4 space-y-6">
        <h1 className="text-xl font-semibold">Mortgage</h1>
        <p className="text-muted-foreground">Set up your mortgage to track equity and payments.</p>
        <MortgageSetupForm users={usersForForm} />
      </div>
    );
  }

  const [schedule, payments] = await Promise.all([
    service.getSchedule(),
    service.getPayments(config.id),
  ]);
  if (!schedule) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Mortgage</h1>
        <p className="text-muted-foreground">Unable to load schedule. Check that two users are configured.</p>
      </div>
    );
  }

  const userNameById = new Map(usersForForm.map((u) => [u.id, u.name]));
  const currentBalance =
    schedule.schedule.length > 0
      ? schedule.schedule[schedule.schedule.length - 1].closingBalance
      : config.loanAmount;

  const uc0 = userConfigs.find((c) => c.userId === usersForForm[0]?.id);
  const uc1 = userConfigs.find((c) => c.userId === usersForForm[1]?.id);
  const targetPct = config.targetEquityUserAPct ?? 0.5;
  const mortgageInitialValues =
    uc0 && uc1
      ? {
          propertyValue: String(Math.round(fromMinorUnits(config.propertyValue))),
          loanAmount: String(Math.round(fromMinorUnits(config.loanAmount))),
          annualRate:
            config.annualInterestRate <= 1
              ? String(Math.round(config.annualInterestRate * 1000) / 10)
              : String(config.annualInterestRate),
          termYears: String(Math.floor(config.loanTermMonths / 12)),
          startDate: config.startDate,
          targetEquityPct: String(Math.round(targetPct * 100)),
          user1Deposit: String(Math.round(fromMinorUnits(uc0.initialDeposit))),
          user1Split: String(Math.round(uc0.baseSplitPct * 100)),
          user1Cap: uc0.monthlyCap != null ? String(Math.round(fromMinorUnits(uc0.monthlyCap))) : "",
          user2Deposit: String(Math.round(fromMinorUnits(uc1.initialDeposit))),
          user2Split: String(Math.round(uc1.baseSplitPct * 100)),
          user2Cap: uc1.monthlyCap != null ? String(Math.round(fromMinorUnits(uc1.monthlyCap))) : "",
        }
      : null;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Mortgage</h1>
      <MortgageSummaryCard
        monthlyBasePayment={schedule.monthlyBasePayment}
        monthlyTopUp={schedule.monthlyTopUp}
        monthlyPaymentUserA={schedule.monthlyPaymentUserA}
        monthlyPaymentUserB={schedule.monthlyPaymentUserB}
        targetEquityUserAPct={schedule.targetEquityUserAPct}
        projectedPayoffDate={schedule.projectedPayoffDate}
        equitySummary={schedule.equitySummary}
        currentBalance={currentBalance}
        projectedMonths={schedule.projectedMonths}
        originalTermMonths={config.loanTermMonths}
      />
      <MortgagePaymentsList payments={payments} userNameById={userNameById} />
      <ExtraPaymentForm />
      <section>
        <h2 className="font-semibold mb-1">How your shares change over time</h2>
        <p className="text-sm text-muted-foreground mb-2">
          This shows how each person&apos;s share of the home grows as you pay.
        </p>
        <EquitySplitChart
          schedule={schedule.schedule}
          userAName={schedule.equitySummary.userA.name}
          userBName={schedule.equitySummary.userB.name}
        />
      </section>
      <MortgageDetailsSection
        schedule={schedule.schedule}
        userAName={schedule.equitySummary.userA.name}
        userBName={schedule.equitySummary.userB.name}
        users={usersForForm}
        initialValues={mortgageInitialValues}
      />
    </div>
  );
}
