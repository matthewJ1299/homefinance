import { subDays, format } from "date-fns";
import { run } from "../index";
import type { SeedContext } from "./types";

export async function seedRecon(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, sydneyId, categoryIds } = ctx;
  const groceriesId = categoryIds["Groceries"]!;
  const transportId = categoryIds["Transport"]!;
  const diningId = categoryIds["Dining Out"]!;

  await run(
    "INSERT INTO vendor_category_mappings (user_id, household_id, merchant_key_normalized, category_id, use_count) VALUES (?, ?, ?, ?, 12)",
    [mattId, householdId, "checkers", groceriesId]
  );
  await run(
    "INSERT INTO vendor_category_mappings (user_id, household_id, merchant_key_normalized, category_id, use_count) VALUES (?, ?, ?, ?, 8)",
    [sydneyId, householdId, "woolworths", groceriesId]
  );
  await run(
    "INSERT INTO vendor_category_mappings (user_id, household_id, merchant_key_normalized, category_id, use_count) VALUES (?, ?, ?, ?, 5)",
    [mattId, householdId, "engen", transportId]
  );

  const queueItems: Array<{
    userId: number;
    graphMessageId: string;
    status: string;
    parseType: string;
    amount: number;
    txnDate: string;
    vendor: string;
    merchantKey: string;
    suggestedCategoryId: number | null;
    subject: string;
  }> = [
    {
      userId: mattId,
      graphMessageId: "seed-msg-checkers-001",
      status: "pending_add",
      parseType: "debit",
      amount: 689_45,
      txnDate: format(subDays(new Date(), 1), "yyyy-MM-dd"),
      vendor: "Checkers Hyper",
      merchantKey: "checkers",
      suggestedCategoryId: groceriesId,
      subject: "Card purchase Checkers Hyper",
    },
    {
      userId: mattId,
      graphMessageId: "seed-msg-engen-002",
      status: "pending_add",
      parseType: "debit",
      amount: 950_00,
      txnDate: format(subDays(new Date(), 2), "yyyy-MM-dd"),
      vendor: "Engen",
      merchantKey: "engen",
      suggestedCategoryId: transportId,
      subject: "Fuel purchase Engen",
    },
    {
      userId: sydneyId,
      graphMessageId: "seed-msg-uber-003",
      status: "pending_duplicate",
      parseType: "debit",
      amount: 124_50,
      txnDate: format(subDays(new Date(), 3), "yyyy-MM-dd"),
      vendor: "Uber",
      merchantKey: "uber",
      suggestedCategoryId: transportId,
      subject: "Uber trip receipt",
    },
    {
      userId: sydneyId,
      graphMessageId: "seed-msg-restaurant-004",
      status: "pending_add",
      parseType: "debit",
      amount: 432_00,
      txnDate: format(subDays(new Date(), 4), "yyyy-MM-dd"),
      vendor: "The Hussar Grill",
      merchantKey: "hussar grill",
      suggestedCategoryId: diningId,
      subject: "Restaurant charge",
    },
    {
      userId: mattId,
      graphMessageId: "seed-msg-ignored-005",
      status: "ignored",
      parseType: "debit",
      amount: 49_00,
      txnDate: format(subDays(new Date(), 5), "yyyy-MM-dd"),
      vendor: "Apple iCloud",
      merchantKey: "apple icloud",
      suggestedCategoryId: null,
      subject: "Subscription receipt",
    },
  ];

  for (const item of queueItems) {
    await run(
      `INSERT INTO recon_import_items (user_id, household_id, graph_message_id, status, parse_type, amount, txn_date,
        vendor, merchant_key_normalized, suggested_category_id, raw_subject, raw_body_preview)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.userId,
        householdId,
        item.graphMessageId,
        item.status,
        item.parseType,
        item.amount,
        item.txnDate,
        item.vendor,
        item.merchantKey,
        item.suggestedCategoryId,
        item.subject,
        "Seed recon queue item (no Graph connection).",
      ]
    );
  }

  console.log(
    `Created ${queueItems.length} recon queue items and vendor mappings (no Graph token).`
  );
}
