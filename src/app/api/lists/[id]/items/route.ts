import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import {
  getSharedListRepository,
  getSharedListItemRepository,
} from "@/lib/repositories";
import { createSharedListItemSchema } from "@/lib/validators/shared-list-item.schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  const listId = Number((await params).id);
  if (Number.isNaN(listId)) {
    return NextResponse.json({ error: "Invalid list id" }, { status: 400 });
  }
  const listRepo = getSharedListRepository();
  const exists = await listRepo.findById(listId);
  if (!exists) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = createSharedListItemSchema.safeParse({ ...body, listId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const itemRepo = getSharedListItemRepository();
  const { id } = await itemRepo.create(parsed.data);
  return NextResponse.json({ id });
}
