import type { ParsedBankEmail } from "./parsed-bank-email";
import { parseDateToYyyyMmDd, parseMinorFromRandText } from "./parse-helpers";

/** Sender address substrings for type B (FNB inContact). Used by matchers and Recon fetched-mail filters. */
export const RECON_TYPE_B_FROM_SUBSTRINGS = ["incontact@fnb.co.za"] as const;

/** Edit these to match your second bank email template (type B). */
const FROM_SUBSTRINGS: readonly string[] = RECON_TYPE_B_FROM_SUBSTRINGS;
const SUBJECT_SUBSTRINGS = ["fnb", ":-)", "paid", "payment", "deposit"];

export function matchesTypeB(fromAddress: string, subject: string): boolean {
  const f = fromAddress.toLowerCase();
  const s = subject.toLowerCase();
  const fromOk = FROM_SUBSTRINGS.some((x) => f.includes(x));
  const subjOk =
    SUBJECT_SUBSTRINGS.length === 0 ? true : SUBJECT_SUBSTRINGS.some((x) => s.includes(x));
  return fromOk && subjOk;
}

/**
 * Type B: alternate layout — amount near "debited" / "spent", vendor in quotes or after "from".
 */
export function parseTypeB(body: string, subject: string): ParsedBankEmail | null {
  const combined = `${subject}\n${body}`;
  const amount = parseMinorFromRandText(combined);
  if (amount == null) return null;
  const date = parseDateToYyyyMmDd(combined);
  if (!date) return null;
  let vendor = "";
  const atVendor = combined.match(/@\s*([A-Za-z0-9][^\n\r.]{1,80}?)(?:\s+from|\s+using|\s+on|\s*$|[.\n\r])/i);
  if (atVendor?.[1]) {
    vendor = atVendor[1].trim();
  }
  const quoted = combined.match(/["']([^"']{2,80})["']/);
  if (!vendor && quoted?.[1]) {
    vendor = quoted[1].trim();
  } else {
    const fromLine = combined.match(/from\s+([A-Za-z0-9\s\-&.]+?)(?:\s+on|\s+for|\s*$|\n)/i);
    if (!vendor) vendor = fromLine?.[1]?.trim() ?? "";
  }
  if (!vendor) vendor = "Unknown";
  return {
    amountMinorUnits: amount,
    date,
    vendor: vendor.slice(0, 200),
    parseType: "type_b",
  };
}
