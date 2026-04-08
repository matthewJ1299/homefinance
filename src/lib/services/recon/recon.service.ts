import {
  getExpenseRepository,
  getReconGraphConnectionRepository,
  getReconImportItemRepository,
  getVendorCategoryMappingRepository,
} from "@/lib/repositories";
import { ExpenseService } from "@/lib/services/expense.service";
import { SplitService } from "@/lib/services/split.service";
import { encryptString, decryptString } from "./token-crypto";
import {
  exchangeCodeForTokens,
  refreshAccessToken,
} from "./graph-oauth.service";
import { fetchGraphUserEmail, fetchMessagesSince, fetchRecentMessages } from "./graph-mail.client";
import {
  matchesTypeA,
  parseTypeA,
  matchesTypeB,
  parseTypeB,
  normalizeMerchantKey,
} from "./parsers";
import type { ParsedBankEmail } from "./parsers/parsed-bank-email";
import type { ReconImportItemRow } from "@/lib/repositories/interfaces/recon-import-item.repository";

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
    private splitService = new SplitService()
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

  async listPendingItems(userId: number): Promise<ReconImportItemRow[]> {
    return this.importRepo.findPendingByUserId(userId);
  }

  async syncFromGraph(userId: number, since?: string): Promise<{ imported: number }> {
    const accessToken = await this.getValidAccessToken(userId);
    const messages = since
      ? await fetchMessagesSince(accessToken, `${since}T00:00:00.000Z`)
      : await fetchRecentMessages(accessToken, 40);
    let imported = 0;
    for (const msg of messages) {
      const parsed = parseBankMessage(msg.fromAddress, msg.subject, msg.bodyContent);
      if (!parsed) continue;
      const merchantKey = normalizeMerchantKey(parsed.vendor);
      const matches = await this.expenseRepo.findByUserDateAndAmount(
        userId,
        parsed.date,
        parsed.amountMinorUnits
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
    }
    await this.graphConnRepo.setLastSyncedAt(userId, new Date());
    return { imported };
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
    categoryId: number,
    accountId?: number | null,
    split?: boolean
  ): Promise<{ expenseId: number }> {
    const item = await this.importRepo.findByIdForUser(itemId, userId);
    if (!item) throw new Error("Recon item not found");
    if (item.status !== "pending_duplicate" && item.status !== "pending_add") {
      throw new Error("Item is not awaiting action");
    }
    const note = item.vendor ? `Recon: ${item.vendor}` : "Recon";
    const { id } = split
      ? await this.splitService.createSplit(
          userId,
          item.amount,
          categoryId,
          note,
          item.txnDate,
          { type: "equal" },
          undefined,
          accountId ?? undefined
        )
      : await this.expenseService.create(userId, {
          categoryId,
          amount: item.amount,
          note,
          date: item.txnDate,
          accountId: accountId ?? null,
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
