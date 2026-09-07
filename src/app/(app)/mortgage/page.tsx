import { auth } from "@/lib/auth";
import { hasFeature } from "@/lib/features/access";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
import { getUserRepository } from "@/lib/repositories";
import { MortgageService } from "@/lib/services/mortgage.service";
import { fromMinorUnits } from "@/lib/utils/currency";
import { MortgageSetupForm } from "@/components/mortgage/mortgage-setup-form";
import { MortgageSummaryCard } from "@/components/mortgage/mortgage-summary-card";
import { WhatIOwnCard } from "@/components/mortgage/what-i-own-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { calculateOwnership } from "@/lib/services/finance/mortgage-ownership";
import { buildStory } from "@/lib/services/finance/mortgage-story";
import { EquitySplitChart } from "@/components/mortgage/equity-split-chart";
import { ExtraPaymentForm } from "@/components/mortgage/extra-payment-form";
import { MortgageDetailsSection } from "@/components/mortgage/mortgage-details-section";
import { MortgagePaymentsList } from "@/components/mortgage/mortgage-payments-list";
import { MortgageRatePeriodsSection } from "@/components/mortgage/mortgage-rate-periods-section";

export default async function MortgagePage() {
  const session = await auth();
  if (!hasFeature("mortgage")) {
    return <FeatureUnavailable feature="mortgage" />;
  }
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

  const [schedule, payments, ratePeriods] = await Promise.all([
    service.getSchedule(),
    service.getPayments(config.id),
    service.getRatePeriods(config.id),
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
  const currentBalance = schedule.currentBalance ?? config.loanAmount;

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

  const defaultAnnualRatePct =
    config.annualInterestRate <= 1
      ? String(Math.round(config.annualInterestRate * 1000) / 10)
      : String(config.annualInterestRate);
  const ratePeriodRows = ratePeriods.map((period) => ({
    effectiveFromMonth: String(period.effectiveFromMonth),
    annualRate:
      period.annualInterestRate <= 1
        ? String(Math.round(period.annualInterestRate * 1000) / 10)
        : String(period.annualInterestRate),
  }));

  // Share of what's paid for so far, which is the figure that moves. A share
  // of the whole house barely changes month to month and reads as stalled.
  const meUserId = Number(session?.user?.id ?? usersForForm[0]?.id ?? 0);
  const monthRow =
    schedule.schedule.find((r) => r.closingBalance <= currentBalance) ?? schedule.schedule[0];
  const principalRepaid = config.loanAmount - currentBalance;

  // The two people the schedule actually modelled, taken by id rather than by
  // position. `usersForForm` is the whole household, so a positional read gave
  // a third member the second person's payment and equity as if they were
  // their own.
  const userA = schedule.equitySummary.userA;
  const userB = schedule.equitySummary.userB;
  const modelledIds = [userA.userId, userB.userId];
  const notOnBond = usersForForm.filter((u) => !modelledIds.includes(u.id));
  const onBond = usersForForm.filter((u) => modelledIds.includes(u.id));

  const paymentFor = (userId: number): number =>
    userId === userA.userId
      ? schedule.monthlyPaymentUserA
      : userId === userB.userId
        ? schedule.monthlyPaymentUserB
        : 0;
  const equityPctFor = (userId: number): number =>
    userId === userA.userId ? userA.equityPct : userId === userB.userId ? userB.equityPct : 0;

  const ownership = calculateOwnership({
    people: onBond.map((u) => ({
      userId: u.id,
      userName: u.name,
      depositMinor: userConfigs.find((c) => c.userId === u.id)?.initialDeposit ?? 0,
      paymentShare: paymentFor(u.id),
    })),
    principalRepaidMinor: principalRepaid,
    currentBalanceMinor: currentBalance,
  });

  const meIsOnBond = modelledIds.includes(meUserId);
  const myMonthly = paymentFor(meUserId);
  const totalMonthly = schedule.monthlyPaymentUserA + schedule.monthlyPaymentUserB || 1;
  // Someone not on the bond has no share of it; showing them a fraction of
  // someone else's interest and equity is the bug this replaces.
  const myFraction = meIsOnBond ? myMonthly / totalMonthly : 0;
  const story = buildStory({
    people: ownership.slices.map((sl) => ({
      userId: sl.userId,
      name: sl.userName,
      depositMinor: sl.depositMinor,
      monthlyMinor: paymentFor(sl.userId),
      projectedShareBp: Math.round(equityPctFor(sl.userId) * 10_000),
    })),
    levelOutLabel: schedule.projectedPayoffDate,
  });

  return (
    <div className="p-4 space-y-6 pb-24 md:pb-6">
      <h1 className="text-xl font-semibold">Mortgage</h1>

      <WhatIOwnCard
        ownership={ownership}
        meUserId={meUserId}
        monthSplit={{
          yourShareMinor: myMonthly,
          others: onBond
            .filter((u) => u.id !== meUserId)
            .map((u) => ({ name: u.name, monthlyMinor: paymentFor(u.id) })),
          interestMinor: Math.round((monthRow?.interest ?? 0) * myFraction),
          equityMinor: Math.round((monthRow?.principal ?? 0) * myFraction),
        }}
        story={story}
      />
      {notOnBond.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {notOnBond.map((u) => u.name).join(" and ")}{" "}
          {notOnBond.length === 1 ? "is" : "are"} not on the bond.
        </p>
      ) : null}

      <CollapsibleSection title="More details" defaultOpen={false}>
      <MortgageSummaryCard
        monthlyBasePayment={schedule.monthlyBasePayment}
        monthlyTopUp={schedule.monthlyTopUp}
        monthlyPaymentUserA={schedule.monthlyPaymentUserA}
        monthlyPaymentUserB={schedule.monthlyPaymentUserB}
        targetEquityUserAPct={schedule.targetEquityUserAPct}
        projectedPayoffDate={schedule.projectedPayoffDate}
        equitySummary={schedule.equitySummary}
        meUserId={meUserId}
        currentBalance={currentBalance}
        projectedMonths={schedule.projectedMonths}
        originalTermMonths={config.loanTermMonths}
        upcomingAnnualRate={schedule.upcomingAnnualRate}
        upcomingMonthNumber={schedule.upcomingMonthNumber}
      />
      <MortgageRatePeriodsSection
        defaultAnnualRatePct={defaultAnnualRatePct}
        initialPeriods={ratePeriodRows}
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
      </CollapsibleSection>
    </div>
  );
}
