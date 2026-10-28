import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MIGRATION_FILES } from "./migration-manifest";

/**
 * The manifest is the sole ordering authority -- deliberately not numeric, because
 * two branches numbered 0027/0028 independently. That makes a forgotten entry
 * invisible: the migration simply never runs, and the failure surfaces later as a
 * missing column in production. These two assertions close that permanently.
 */
describe("migration manifest", () => {
  const onDisk = readdirSync("drizzle")
    .filter((f) => f.endsWith("_pg.sql"))
    .sort();

  it("lists every _pg.sql migration on disk", () => {
    expect([...MIGRATION_FILES].sort()).toEqual(onDisk);
  });

  it("lists each migration exactly once", () => {
    expect(new Set(MIGRATION_FILES).size).toBe(MIGRATION_FILES.length);
  });
});
