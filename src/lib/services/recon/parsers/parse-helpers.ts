/** Normalize vendor string for vendor_category_mappings key. */
export function normalizeMerchantKey(vendor: string): string {
  return vendor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Parse South-African style currency text to signed minor units.
 *
 * A leading minus (`-R55.00`, `R -55.00`) is a debit. Magnitude-only text is
 * positive; callers that care about deposits vs purchases still run
 * `inferReconFlow` on the surrounding subject/body.
 */
export function parseMinorFromRandText(text: string): number | null {
  const rand = text.match(/(-?)\s*R\s*(-?)\s*([\d\s.,]+)/i);
  if (rand) {
    const n = parseRandNumber(rand[3] ?? "");
    if (n == null) return null;
    const negative = rand[1] === "-" || rand[2] === "-";
    return Math.round((negative ? -n : n) * 100);
  }
  const zar = text.match(/ZAR\s*(-?)\s*([\d\s.,]+)/i);
  if (!zar) return null;
  const n = parseRandNumber(zar[2] ?? "");
  if (n == null) return null;
  const negative = zar[1] === "-";
  return Math.round((negative ? -n : n) * 100);
}

function parseRandNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") && !cleaned.includes(".")
    ? cleaned.replace(",", ".")
    : cleaned.replace(/,/g, "");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

const INFLOW_RE =
  /\b(deposit(?:ed)?|credited|refund(?:ed)?|salary|paid\s+into|payment\s+received|received\s+from)\b/i;

/**
 * Debit vs credit when the figure itself is unsigned. A minus on the amount
 * always wins. Otherwise inflow words (deposit, credited, salary) beat the
 * default, which is Out — that is what almost every bank notification is.
 */
export function inferReconFlow(text: string, signedMinor: number | null): "out" | "in" {
  if (signedMinor != null && signedMinor < 0) return "out";
  if (INFLOW_RE.test(text)) return "in";
  return "out";
}

/** Try ISO date, then DD/MM/YYYY, then DD-MM-YYYY. */
export function parseDateToYyyyMmDd(text: string): string | null {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1] ?? null;
  const dmy = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dmy) {
    let d = Number(dmy[1]);
    let mo = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    if (d > 31 || mo > 12) return null;
    const mm = String(mo).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  // Bank templates sometimes omit the year, e.g. "31Mar 11:11" / "8Apr 15:52" / "31 Mar".
  // Scan every DDMon (+ optional time): the first regex match can be a false positive like
  // ".00 paid" / ".00 reserved" (day 00 + word "paid") which must be skipped.
  return tryParseDMonToYyyyMmDd(text);
}

const MONTH_BY_ABBREV3: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function tryParseDMonToYyyyMmDd(text: string): string | null {
  const re = /\b(\d{1,2})\s*([A-Za-z]{3,9})(?:\s+\d{1,2}:\d{2})?\b/g;
  for (const m of text.matchAll(re)) {
    const d = Number(m[1]);
    const mon3 = (m[2] ?? "").toLowerCase().slice(0, 3);
    const mo = MONTH_BY_ABBREV3[mon3];
    if (!mo || d < 1 || d > 31) continue;
    const now = new Date();
    let y = now.getUTCFullYear();
    const candidate = new Date(Date.UTC(y, mo - 1, d));
    const maxFutureDays = 7;
    if (candidate.getTime() - now.getTime() > maxFutureDays * 24 * 60 * 60 * 1000) {
      y -= 1;
    }
    const mm = String(mo).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  return null;
}
