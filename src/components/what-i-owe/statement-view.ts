export type OwedStatementView = "owed" | "owing";

export function parseOwedStatementView(raw: string | undefined): OwedStatementView {
  return raw === "owed" ? "owed" : "owing";
}
