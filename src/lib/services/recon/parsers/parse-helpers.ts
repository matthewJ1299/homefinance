/** Normalize vendor string for vendor_category_mappings key. */
export function normalizeMerchantKey(vendor: string): string {
  return vendor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Parse South-African style currency text to minor units (cents). */
export function parseMinorFromRandText(text: string): number | null {
  const m = text.match(/R\s*([\d\s.,]+)/i) ?? text.match(/ZAR\s*([\d\s.,]+)/i);
  const raw = (m?.[1] ?? text).replace(/\s/g, "").trim();
  if (!raw) return null;
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw.replace(",", "");
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
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
  return null;
}
