import type { ParsedBankEmail } from "./parsed-bank-email";
import { parseDateToYyyyMmDd, parseMinorFromRandText } from "./parse-helpers";

/** Edit these to match your bank’s notification email (type A). */
const FROM_SUBSTRINGS = ["notifyme@absa.co.za"];
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
  const amount = parseMinorFromRandText(amountChunk);
  if (amount == null) return null;
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
  return {
    amountMinorUnits: amount,
    date,
    vendor: vendor.slice(0, 200),
    parseType: "type_a",
  };
}
