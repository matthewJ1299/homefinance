import {
  getExpenseRepository,
  getReconGraphConnectionRepository,
  getReconImportItemRepository,
  getVendorCategoryMappingRepository,
  getUserRepository,
} from "@/lib/repositories";
import { ExpenseService } from "@/lib/services/expense.service";
import { IncomeService } from "@/lib/services/income.service";
import { SplitService } from "@/lib/services/split.service";
import { divideEqually, validateParticipantShares } from "@/lib/services/finance/participants";
import type { IncomeType } from "@/lib/types";
import { encryptString, decryptString } from "./token-crypto";
import {
  exchangeCodeForTokens,
  refreshAccessToken,
} from "./graph-oauth.service";
import { fetchGraphUserEmail, fetchMessageById, fetchMessagesSince, fetchRecentMessages } from "./graph-mail.client";
import {
  matchesTypeA,
  parseTypeA,
  matchesTypeB,
  parseTypeB,
  normalizeMerchantKey,
} from "./parsers";
import { parseDateToYyyyMmDd, parseMinorFromRandText } from "./parsers/parse-helpers";
import { flowFromStoredAmount } from "./recon-flow";
import type { ParsedBankEmail } from "./parsers/parsed-bank-email";
import type { ReconMatchedExpenseSummary, ReconPendingListItem } from "@/lib/types/recon";

export type { ReconMatchedExpenseSummary, ReconPendingListItem } from "@/lib/types/recon";

export type ReconSyncDebugMessageOutcome =
  | "not_bank"
  | "parse_failed"
  | "imported_pending_add"
  | "imported_pending_duplicate";

export interface ReconSyncDebugMessage {
  graphMessageId: string;
  receivedDateTime: string;
  fromAddress: string;
  subject: string;
  bodyPreview?: string;
  outcome: ReconSyncDebugMessageOutcome;
  parseType?: ParsedBankEmail["parseType"];
  matchedExpenseCount?: number;
  parseFailedReasons?: string[];
  parseAttempt?: {
    amountMinorUnits: number | null;
    date: string | null;
    vendor: string | null;
  };
}

function attemptVendorTypeA(combined: string): string | null {
  const merchantLine =
    combined.match(/merchant\s*:\s*([^\n\r]+)/i) ??
    combined.match(/transaction\s*:\s*([^\n\r]+)/i) ??
    combined.match(/at\s+([A-Za-z0-9\s\-&.]+)(?:\s+on|\s+for|\s*$)/i);
  const v = merchantLine?.[1]?.trim();
  return v ? v.slice(0, 200) : null;
}

function attemptVendorTypeB(combined: string): string | null {
  const atVendor = combined.match(
    /@\s*([A-Za-z0-9][^\n\r.]{1,80}?)(?:\s+from|\s+using|\s+on|\s*$|[.\n\r])/i
  );
  const v1 = atVendor?.[1]?.trim();
  if (v1) return v1.slice(0, 200);
  const quoted = combined.match(/["']([^"']{2,80})["']/);
  const v2 = quoted?.[1]?.trim();
  if (v2) return v2.slice(0, 200);
  const fromLine = combined.match(/from\s+([A-Za-z0-9\s\-&.]+?)(?:\s+on|\s+for|\s*$|\n)/i);
  const v3 = fromLine?.[1]?.trim();
  return v3 ? v3.slice(0, 200) : null;
}

function parseBankMessage(
  fromAddress: string,
  subject: string,
  body: string
): ParsedBankEmail | null {
  if (matchesTypeA(fromAddress, subject)) {
    return parseTypeA(body, subject);
  }
  if (matchesTypeB(fromAddress, subject)) {
    return parseTypeB(body, subject);
  }
  return null;
}

export class ReconService {
  constructor(
    private graphConnRepo = getReconGraphConnectionRepository(),
    private importRepo = getReconImportItemRepository(),
    private vendorMapRepo = getVendorCategoryMappingRepository(),
    private expenseRepo = getExpenseRepository(),
    private expenseService = new ExpenseService(),
    private incomeService = new IncomeService(),
    private splitService = new SplitService(),
    private userRepo = getUserRepository()
  ) {}

  async saveInitialGraphTokens(userId: number, code: string, pkceVerifier: string): Promise<void> {
    const tokens = await exchangeCodeForTokens(code, pkceVerifier);
    if (!tokens.refresh_token) {
      throw new Error("No refresh token returned; ensure offline_access scope and prompt=consent.");
    }
    const access = tokens.access_token;
    const email = await fetchGraphUserEmail(access);
    await this.graphConnRepo.upsert(userId, encryptString(tokens.refresh_token), email);
  }

  async disconnectGraph(userId: number): Promise<void> {
    await this.graphConnRepo.deleteByUserId(userId);
  }

  async isGraphConnected(
    userId: number
  ): Promise<{ connected: boolean; msAccountEmail: string | null; lastSyncedAt: string | null }> {
    const row = await this.graphConnRepo.findByUserId(userId);
    return {
      connected: !!row,
      msAccountEmail: row?.msAccountEmail ?? null,
      lastSyncedAt: row?.lastSyncedAt ?? null,
    };
  }

  async listPendingItems(userId: number): Promise<ReconPendingListItem[]> {
    const items = await this.importRepo.findPendingByUserId(userId);
    const allIds = [...new Set(items.flatMap((i) => i.matchedExpenseIds ?? []))];
    if (allIds.length === 0) {
      return items.map((i) => ({ ...i, matchedExpenses: [] }));
    }
    const expenses = await this.expenseRepo.findByIdsForUser(allIds, userId);
    const byId = new Map(expenses.map((e) => [e.id, e]));
    return items.map((item) => {
      const matchedExpenses: ReconMatchedExpenseSummary[] = [];
      for (const id of item.matchedExpenseIds ?? []) {
        const e = byId.get(id);
        if (!e) continue;
        matchedExpenses.push({
          id: e.id,
          categoryName: e.categoryName,
          amount: e.amount,
          note: e.note,
          date: e.date,
        });
      }
      return { ...item, matchedExpenses };
    });
  }

  async syncFromGraph(
    userId: number,
    since?: string,
    debug?: boolean,
    top?: number,
    skip?: number
  ): Promise<{ imported: number; scanned: number; skip: number; debug?: { truncated: boolean; messages: ReconSyncDebugMessage[] } }> {
    const accessToken = await this.getValidAccessToken(userId);
    const maxMessages = top != null && top > 0 ? top : since ? 1000 : 40;
    const safeSkip = skip != null && skip > 0 ? skip : 0;
    const messages = since
      ? await fetchMessagesSince(accessToken, `${since}T00:00:00.000Z`, maxMessages, safeSkip)
      : await fetchRecentMessages(accessToken, maxMessages, safeSkip);
    const scanned = messages.length;
    let imported = 0;
    const debugMessages: ReconSyncDebugMessage[] = [];
    const debugLimit = 300;
    let truncated = false;
    for (const msg of messages) {
      const typeA = matchesTypeA(msg.fromAddress, msg.subject);
      const typeB = !typeA && matchesTypeB(msg.fromAddress, msg.subject);
      if (!typeA && !typeB) {
        if (debug) {
          if (debugMessages.length < debugLimit) {
            debugMessages.push({
              graphMessageId: msg.id,
              receivedDateTime: msg.receivedDateTime,
              fromAddress: msg.fromAddress,
              subject: msg.subject,
              bodyPreview: msg.bodyPreview,
              outcome: "not_bank",
            });
          } else {
            truncated = true;
          }
        }
        continue;
      }

      const parsed = parseBankMessage(msg.fromAddress, msg.subject, msg.bodyContent);
      if (!parsed) {
        if (debug) {
          if (debugMessages.length < debugLimit) {
            const combined = `${msg.subject}\n${msg.bodyContent}`;
            const amount = parseMinorFromRandText(combined);
            const date = parseDateToYyyyMmDd(combined);
            const vendor = typeA ? attemptVendorTypeA(combined) : attemptVendorTypeB(combined);
            const reasons: string[] = [];
            if (amount == null) reasons.push("amount_not_found");
            if (!date) reasons.push("date_not_found");
            if (!vendor) reasons.push("vendor_not_found");

            debugMessages.push({
              graphMessageId: msg.id,
              receivedDateTime: msg.receivedDateTime,
              fromAddress: msg.fromAddress,
              subject: msg.subject,
              bodyPreview: msg.bodyPreview,
              outcome: "parse_failed",
              parseType: typeA ? "type_a" : "type_b",
              parseFailedReasons: reasons,
              parseAttempt: {
                amountMinorUnits: amount,
                date,
                vendor,
              },
            });
          } else {
            truncated = true;
          }
        }
        continue;
      }
      const merchantKey = normalizeMerchantKey(parsed.vendor);
      // Inflows share a date+magnitude with spends all the time. Matching them
      // against expenses would mark a salary as a duplicate of a purchase.
      const matches =
        flowFromStoredAmount(parsed.amountMinorUnits) === "in"
          ? []
          : await this.expenseRepo.findByUserDateAndAmount(
              userId,
              parsed.date,
              Math.abs(parsed.amountMinorUnits)
            );
      const matchedIds = matches.map((e) => e.id);
      const status =
        matchedIds.length > 0 ? ("pending_duplicate" as const) : ("pending_add" as const);
      const suggestion = await this.vendorMapRepo.findByUserAndMerchantKey(userId, merchantKey);
      await this.importRepo.upsertByMessageId({
        userId,
        graphMessageId: msg.id,
        status,
        parseType: parsed.parseType,
        amount: parsed.amountMinorUnits,
        txnDate: parsed.date,
        vendor: parsed.vendor,
        merchantKeyNormalized: merchantKey,
        matchedExpenseIds: matchedIds.length > 0 ? matchedIds : null,
        suggestedCategoryId: suggestion?.categoryId ?? null,
        rawSubject: msg.subject,
        rawBodyPreview: msg.bodyPreview.slice(0, 2000),
      });
      imported += 1;

      if (debug) {
        if (debugMessages.length < debugLimit) {
          debugMessages.push({
            graphMessageId: msg.id,
            receivedDateTime: msg.receivedDateTime,
            fromAddress: msg.fromAddress,
            subject: msg.subject,
            bodyPreview: msg.bodyPreview,
            outcome: matchedIds.length > 0 ? "imported_pending_duplicate" : "imported_pending_add",
            parseType: parsed.parseType,
            matchedExpenseCount: matchedIds.length,
          });
        } else {
          truncated = true;
        }
      }
    }
    await this.graphConnRepo.setLastSyncedAt(userId, new Date());
    return debug
      ? { imported, scanned, skip: safeSkip, debug: { truncated, messages: debugMessages } }
      : { imported, scanned, skip: safeSkip };
  }

  async getGraphMessageBody(
    userId: number,
    graphMessageId: string
  ): Promise<{ id: string; subject: string; fromAddress: string; receivedDateTime: string; bodyContent: string }> {
    const accessToken = await this.getValidAccessToken(userId);
    const msg = await fetchMessageById(accessToken, graphMessageId);
    return {
      id: msg.id,
      subject: msg.subject,
      fromAddress: msg.fromAddress,
      receivedDateTime: msg.receivedDateTime,
      bodyContent: msg.bodyContent,
    };
  }

  async acceptDuplicate(userId: number, itemId: number): Promise<void> {
    const item = await this.importRepo.findByIdForUser(itemId, userId);
    if (!item) throw new Error("Recon item not found");
    if (item.status !== "pending_duplicate") {
      throw new Error("Only items flagged as potential duplicates can be accepted as duplicate");
    }
    await this.importRepo.updateStatusById(itemId, userId, "accepted_duplicate");
  }

  async ignore(userId: number, itemId: number): Promise<void> {
    const item = await this.importRepo.findByIdForUser(itemId, userId);
    if (!item) throw new Error("Recon item not found");
    if (item.status !== "pending_duplicate" && item.status !== "pending_add") {
      throw new Error("Item is not awaiting action");
    }
    await this.importRepo.updateStatusById(itemId, userId, "ignored");
  }

  async acceptAdd(
    userId: number,
    itemId: number,
    categoryId: number | undefined,
    accountId?: number | null,
    /** Explicit shares, summing to the amount. `true` still means "everyone, evenly". */
    split?: boolean | { userId: number; shareMinor: number }[],
    noteOverride?: string,
    amountMinorOverride?: number,
    entryKind: "expense" | "income" = "expense",
    incomeType: IncomeType = "ad_hoc"
  ): Promise<{ expenseId?: number; incomeId?: number }> {
    const item = await this.importRepo.findByIdForUser(itemId, userId);
    if (!item) throw new Error("Recon item not found");
    if (item.status !== "pending_duplicate" && item.status !== "pending_add") {
      throw new Error("Item is not awaiting action");
    }
    const note =
      noteOverride !== undefined
        ? noteOverride.trim() === ""
          ? null
          : noteOverride.trim().slice(0, 500)
        : item.vendor
          ? `Recon: ${item.vendor}`
          : "Recon";
    const amountMinor =
      amountMinorOverride !== undefined &&
      Number.isInteger(amountMinorOverride) &&
      amountMinorOverride > 0
        ? amountMinorOverride
        : Math.abs(item.amount);
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      throw new Error("Amount must be positive.");
    }

    if (entryKind === "income") {
      if (item.status === "pending_duplicate") {
        throw new Error("Income is only supported for new items (needs add), not duplicate rows.");
      }
      if (split) {
        throw new Error("Split is not supported for income");
      }
      const { id } = await this.incomeService.create(userId, {
        amount: amountMinor,
        type: incomeType,
        description: note,
        date: item.txnDate,
        accountId: accountId ?? undefined,
      });
      await this.importRepo.updateStatusById(itemId, userId, "accepted_add");
      return { incomeId: id };
    }

    if (categoryId == null || !Number.isFinite(categoryId) || categoryId <= 0) {
      throw new Error("Category is required for expenses");
    }

    // Accepted rows go through the same expense path as manual entry, so
    // participants and rollover behave identically either way.
    let participants: { userId: number; shareMinor: number }[] | undefined;
    if (Array.isArray(split)) {
      // The sheet solved these. Validate rather than trust: the same rule the
      // Add sheet enforces, in the one other place a split can be written.
      const check = validateParticipantShares(amountMinor, split);
      if (!check.ok) throw new Error(check.error);
      participants = split;
    } else if (split === true) {
      // "Everyone in the house, evenly" -- the pre-Phase-3 behaviour, kept so
      // the existing table and rule-driven accepts do not change meaning.
      const picked = [userId, ...(await this.userRepo.findAllExcept(userId)).map((u) => u.id)];
      if (picked.length < 2) {
        throw new Error("No one else in this household to share with.");
      }
      const even = divideEqually(amountMinor, picked);
      participants = picked.map((id) => ({ userId: id, shareMinor: even[id] ?? 0 }));
    }
    const { id } = await this.expenseService.create(userId, {
      categoryId,
      amount: amountMinor,
      note,
      date: item.txnDate,
      accountId: accountId ?? null,
      participants,
    });
    await this.vendorMapRepo.upsertIncrement(userId, item.merchantKeyNormalized, categoryId);
    await this.importRepo.updateStatusById(itemId, userId, "accepted_add");
    return { expenseId: id };
  }

  private async getValidAccessToken(userId: number): Promise<string> {
    const row = await this.graphConnRepo.findByUserId(userId);
    if (!row) {
      throw new Error("Outlook not connected");
    }
    const refreshPlain = decryptString(row.refreshTokenEncrypted);
    const tokens = await refreshAccessToken(refreshPlain);
    if (tokens.refresh_token) {
      const email = await fetchGraphUserEmail(tokens.access_token);
      await this.graphConnRepo.upsert(
        userId,
        encryptString(tokens.refresh_token),
        email ?? row.msAccountEmail
      );
    }
    return tokens.access_token;
  }
}
