import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCalendarCategoryRepository } from "@/lib/repositories";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const repo = getCalendarCategoryRepository();
  const rows = await repo.findAll();
  return NextResponse.json(rows);
}
