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

export default async function ReconPage() {
  if (!hasFeature("recon")) {
    return (
      <div className="p-4 max-w-5xl mx-auto min-w-0">
        <FeatureUnavailable feature="recon" />
      </div>
    );
  }

  const session = await auth();
  const userId = Number(session?.user?.id ?? 0);

  const [rules, pending, members] = await Promise.all([
    getReconRuleRepository().findByOwner(userId),
    getReconImportItemRepository().findPendingByUserId(userId),
    getUserRepository().findAll(),
  ]);
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const { matched, unmatched } = matchRules(pending, rules);

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
      <ReconRulesPanel
        matched={matchedRows}
        rules={rules}
        totalThisMonth={pending.length}
        unmatchedCount={unmatched.length}
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ReconPageClient />
      </Suspense>
    </div>
  );
}
