import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { getSharedListRepository } from "@/lib/repositories";
import { createSharedListSchema } from "@/lib/validators/shared-list.schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const repo = getSharedListRepository();
  const lists = await repo.findAll();
  return NextResponse.json({ lists });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const body = await request.json();
  const parsed = createSharedListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const repo = getSharedListRepository();
  const { id } = await repo.create(parsed.data);
  return NextResponse.json({ id });
}
