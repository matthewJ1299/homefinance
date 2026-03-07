import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { initDb } from "@/lib/db";
import { getCategoryRepository } from "@/lib/repositories";

export async function GET() {
  await initDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const repo = getCategoryRepository();
  const categories = await repo.findAll();
  return NextResponse.json({ categories });
}
