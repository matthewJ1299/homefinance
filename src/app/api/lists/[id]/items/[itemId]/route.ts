import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getSharedListItemRepository } from "@/lib/repositories";
import { updateSharedListItemSchema } from "@/lib/validators/shared-list-item.schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const itemId = Number((await params).itemId);
  if (Number.isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }
  const itemRepo = getSharedListItemRepository();
  const existing = await itemRepo.findById(itemId);
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = updateSharedListItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const updates = parsed.data;
  if (!updates || Object.keys(updates).length === 0) {
    return new NextResponse(null, { status: 204 });
  }
  await itemRepo.update(itemId, updates);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const itemId = Number((await params).itemId);
  if (Number.isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }
  const itemRepo = getSharedListItemRepository();
  const existing = await itemRepo.findById(itemId);
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  await itemRepo.delete(itemId);
  return new NextResponse(null, { status: 204 });
}
