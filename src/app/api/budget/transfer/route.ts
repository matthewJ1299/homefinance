import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BudgetService } from "@/lib/services/budget.service";
import { transferSchema } from "@/lib/validators/budget.schema";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const userId = Number(session.user.id);
  const service = new BudgetService();
  const result = await service.transfer({
    ...parsed.data,
    userId,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const overview = await service.getOverview(parsed.data.month);
  return NextResponse.json(overview);
}
