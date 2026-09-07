import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { hasFeature } from "@/lib/features/access";
import { ReconPageClient } from "@/components/recon/recon-page-client";
import { ReconRulesPanel, type MatchedRowSummary } from "@/components/recon/recon-rules-panel";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
import {
  getReconImportItemRepository,
  getReconRuleRepository,
  getUserRepository,
} from "@/lib/repositories";
import { matchRules } from "@/lib/services/recon/match-rules";
import { ReconDecisionList, type DecisionRow } from "@/components/recon/recon-decision-list";
import { getCategoryRepository, getReconGraphConnectionRepository } from "@/lib/repositories";
import { ReconConnectionBar } from "@/components/recon/recon-connection-bar";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import {
  budgetMonthStartDayForUser,
  getDefaultBudgetMonthForUser,
} from "@/lib/utils/budget-month-for-user";

export default async function ReconPage() {
  // `auth()` is what binds this request's entitlements, and a page renders in
  // parallel with its layout -- so reading the gate first raced the layout's
  // own auth() call and failed closed, showing "not part of your plan" on a
  // household that has recon. Every other gated page already orders it this way.
  const session = await auth();
  if (!hasFeature("recon")) {
    return (
      <div className="p-4 max-w-5xl mx-auto min-w-0">
        <FeatureUnavailable feature="recon" />
      </div>
    );
  }

  const userId = Number(session?.user?.id ?? 0);

  const month = await getDefaultBudgetMonthForUser(userId);
  const [rules, pending, members, arrivedThisMonth] = await Promise.all([
    getReconRuleRepository().findByOwner(userId),
    getReconImportItemRepository().findPendingByUserId(userId),
    getUserRepository().findAll(),
    // What arrived, not what is left: counting pending rows made "N came in
    // this month" shrink as the user worked through them.
    budgetMonthStartDayForUser(userId).then((startDay) =>
      getReconImportItemRepository().countForMonth(userId, month, startDay)
    ),
  ]);
  const connection = await getReconGraphConnectionRepository().findByUserId(userId);
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const { matched, unmatched } = matchRules(pending, rules);

  // `unmatched` was computed and thrown away: these are the rows that actually
  // need a person, and they are now the page's decision list.
  const categoryNameById = new Map(
    (await getCategoryRepository().findAll()).map((c) => [c.id, c.name])
  );
  const decisionRows: DecisionRow[] = unmatched.map((item) => ({
    itemId: item.id,
    vendor: item.vendor,
    merchantKey: item.merchantKeyNormalized,
    amountMinor: item.amount,
    txnDate: item.txnDate,
    suggestedCategoryId: item.suggestedCategoryId,
    suggestedCategoryName:
      item.suggestedCategoryId != null
        ? (categoryNameById.get(item.suggestedCategoryId) ?? null)
        : null,
  }));

  const matchedRows: MatchedRowSummary[] = matched.map(({ item, rule }) => ({
    itemId: item.id,
    vendor: item.vendor,
    amountMinor: item.amount,
    txnDate: item.txnDate,
    categoryName: rule.categoryName ?? "Uncategorised",
    participantNames: rule.participantUserIds
      .filter((id) => id !== userId)
      .map((id) => nameById.get(id) ?? "Someone"),
  }));

  return (
    <div className="p-4 max-w-5xl mx-auto min-w-0 space-y-5">
      {/* "Recon" is what the developer called it. */}
      <h1 className="text-xl font-semibold tracking-tight">From your bank</h1>
      <ReconConnectionBar
        connected={connection != null}
        msAccountEmail={connection?.msAccountEmail ?? null}
        lastSyncedAt={connection?.lastSyncedAt ?? null}
      />
      <ReconRulesPanel
        matched={matchedRows}
        rules={rules}
        totalThisMonth={arrivedThisMonth}
        unmatchedCount={unmatched.length}
      />
      {unmatched.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Need a decision</h2>
          <ReconDecisionList rows={decisionRows} />
        </section>
      ) : null}
      {/* Graph ids, batch $skip, parse-failure reasons, Copy debug bundle.
          Useful to whoever maintains the parsers, and not what someone with one
          unrecognised merchant needs. */}
      {session?.user?.isSuperAdmin === true ? (
        <CollapsibleSection title="Mailbox and parser tools" defaultOpen={false}>
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
            <ReconPageClient />
          </Suspense>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
