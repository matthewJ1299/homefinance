import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
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
  setRequestContextFromSession(session);
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
  try {
    const { NotificationService, isNotificationConfigured } = await import(
      "@/lib/services/notification.service"
    );
    if (exists.visibility === "shared" && isNotificationConfigured()) {
      const notificationService = new NotificationService();
      const userName = session.user.name ?? "Someone";
      const listName = exists.name;
      const label = parsed.data.label ?? "an item";
      await notificationService.sendToAllExcept(Number(session.user.id), {
        title: "HomeFinance",
        body: `${userName} added "${label}" to ${listName}`,
        url: "/lists",
        // In-app only for beta: a list item is a row on Home's needs-you
        // stream, not a lock-screen interruption.
        kind: "in_app_only",
      });
    }
  } catch {
    // Notification failure must not affect the primary operation
  }
  return NextResponse.json({ id });
}
