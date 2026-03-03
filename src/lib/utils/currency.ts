export function toMinorUnits(rands: number): number {
  return Math.round(rands * 100);
}

export function fromMinorUnits(cents: number): number {
  return cents / 100;
}

export function formatRand(cents: number): string {
  const rands = cents / 100;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rands);
}
