/**
 * How a recon bank line is stored on `recon_import_items.amount`.
 *
 * Magnitude is always the rand amount in cents. Sign is the direction, so
 * existing rows (all written as a positive absolute value) stay "Out" /
 * expense — that is what the parsers used to emit. New inflows are stored
 * negative so the page can tell them apart without a migration.
 */
export type ReconFlow = "out" | "in";

export function flowFromStoredAmount(amount: number): ReconFlow {
  return amount < 0 ? "in" : "out";
}

export function magnitudeFromStoredAmount(amount: number): number {
  return Math.abs(amount);
}

export function amountToStore(magnitude: number, flow: ReconFlow): number {
  const abs = Math.abs(magnitude);
  return flow === "in" ? -abs : abs;
}

export function flowLabel(flow: ReconFlow): "Out" | "In" {
  return flow === "out" ? "Out" : "In";
}
