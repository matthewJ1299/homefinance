import type { ParsedBankEmail } from "./parsed-bank-email";
import { parseDateToYyyyMmDd, parseMinorFromRandText, inferReconFlow } from "./parse-helpers";
import { amountToStore } from "../recon-flow";

/** Sender address substrings for type A (ABSA NotifyMe). Used by matchers and Recon fetched-mail filters. */
export const RECON_TYPE_A_FROM_SUBSTRINGS = ["notifyme@absa.co.za"] as const;

/** Edit these to match your bank’s notification email (type A). */
const FROM_SUBSTRINGS: readonly string[] = RECON_TYPE_A_FROM_SUBSTRINGS;
const SUBJECT_SUBSTRINGS = ["notifyme"];

export function matchesTypeA(fromAddress: string, subject: string): boolean {
  const f = fromAddress.toLowerCase();
  const s = subject.toLowerCase();
  const fromOk = FROM_SUBSTRINGS.some((x) => f.includes(x));
  const subjOk = SUBJECT_SUBSTRINGS.some((x) => s.includes(x));
  return fromOk && subjOk;
}

/**
 * Type A body pattern: looks for amount (R…), date, and merchant line.
 * Example lines: "Amount: R 450.00" "Date: 15/03/2025" "Merchant: CHECKERS SOMETHING"
 */
export function parseTypeA(body: string, subject: string): ParsedBankEmail | null {
  const combined = `${subject}\n${body}`;
  // ABSA NotifyMe: "Reserved : R...", "Amount : -R..." (debit), "Available : R...". Prefer Reserved, then Amount line.
  const reservedLine = combined.match(/reserved\s*:\s*([^\n\r]+)/i);
  const amountLine = combined.match(/amount\s*:\s*([^\n\r]+)/i);
  const amountChunk = reservedLine?.[1] ?? amountLine?.[1] ?? combined;
  const signed = parseMinorFromRandText(amountChunk);
  if (signed == null) return null;
  const amountLineSigned = amountLine?.[1] != null ? parseMinorFromRandText(amountLine[1]) : null;
  const flow = inferReconFlow(combined, amountLineSigned ?? signed);
  const amount = amountToStore(Math.abs(signed), flow);
  const date = parseDateToYyyyMmDd(combined);
  if (!date) return null;
  let vendor = "";
  const merchantLine =
    combined.match(/merchant\s*:\s*([^\n\r]+)/i) ??
    combined.match(/transaction\s*:\s*([^\n\r]+)/i) ??
    combined.match(/at\s+([A-Za-z0-9\s\-&.]+)(?:\s+on|\s+for|\s*$)/i);
  if (merchantLine?.[1]) {
    vendor = merchantLine[1].trim();
  } else {
    const fallback = combined.match(/for\s+([^\n\r]{3,80})/i);
    vendor = fallback?.[1]?.trim() ?? "Unknown";
  }
  if (!vendor) vendor = "Unknown";
  // A card purchase carries its real merchant in the Merchant line and is already
  // specific. Every other kind of payment -- EasyPay, debit orders, EFTs --
  // shares a generic Transaction descriptor ("SETTLEMENT CENTRE - DIGITAL PMT DT",
  // "DEBIT ORDER", "IMMEDIATE PAYMENT"), so on its own it collapses to one
  // merchant and any rule over-matches every payee. The Reference line names the
  // actual payee/biller and is stable for recurring payments, so when there is no
  // Merchant line we fold the Reference into the merchant identity -- a rule can
  // then target just that payee, and the others stay separate.
  const hasMerchantLine = /merchant\s*:/i.test(combined);
  if (!hasMerchantLine) {
    const referenceLine = combined.match(/reference\s*:\s*([^\n\r]+)/i);
    const reference = referenceLine?.[1]?.trim();
    if (reference && reference.length >= 3) {
      vendor = vendor && vendor !== "Unknown" ? `${vendor} · ${reference}` : reference;
    }
  }
  return {
    amountMinorUnits: amount,
    date,
    vendor: vendor.slice(0, 200),
    parseType: "type_a",
  };
}
