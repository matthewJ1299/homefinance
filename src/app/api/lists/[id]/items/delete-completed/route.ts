import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import {
  getSharedListRepository,
  getSharedListItemRepository,
} from "@/lib/repositories";

export async function POST(
  _request: NextRequest,
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
  const itemRepo = getSharedListItemRepository();
  await itemRepo.deleteCompletedByListId(listId);
  return new NextResponse(null, { status: 204 });
}
