import { NextResponse } from "next/server";
import { get } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Readiness probe for the container orchestrator and for uptime checks.
 *
 * Deliberately unauthenticated and deliberately uninformative: it reports
 * whether the process can reach Postgres, and nothing about the schema, the
 * data, or the deployment. A probe that needs a session cannot be used by the
 * thing that decides whether to route traffic here.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await get<{ ok: number }>("SELECT 1 AS ok");
    return NextResponse.json(
      { status: "ok", database: "up", latencyMs: Date.now() - startedAt },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "down" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
