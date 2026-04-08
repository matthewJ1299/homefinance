/** Normalize vendor string for vendor_category_mappings key. */
export function normalizeMerchantKey(vendor: string): string {
  return vendor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Parse South-African style currency text to minor units (cents). Uses absolute value (debits may be "-R55.00"). */
export function parseMinorFromRandText(text: string): number | null {
  const m =
    text.match(/-?\s*R\s*([\d\s.,]+)/i) ??
    text.match(/ZAR\s*([\d\s.,]+)/i);
  const raw = (m?.[1] ?? text).replace(/\s/g, "").trim();
  if (!raw) return null;
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw.replace(",", "");
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.abs(n) * 100);
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
