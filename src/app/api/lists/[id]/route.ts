import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import {
  getSharedListRepository,
  getSharedListItemRepository,
} from "@/lib/repositories";
import { updateSharedListSchema } from "@/lib/validators/shared-list.schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const listRepo = getSharedListRepository();
  const itemRepo = getSharedListItemRepository();
  const list = await listRepo.findById(id);
  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  const items = await itemRepo.findByListId(id);
  return NextResponse.json({ list, items });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await request.json();
  const parsed = updateSharedListSchema.safeParse(body);
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
  const repo = getSharedListRepository();
  const exists = await repo.findById(id);
  if (!exists) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  await repo.update(id, updates);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  setRequestContextFromSession(session);
  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const repo = getSharedListRepository();
  const exists = await repo.findById(id);
  if (!exists) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  await repo.delete(id);
  return new NextResponse(null, { status: 204 });
}
