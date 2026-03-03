import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { BudgetService } from "@/lib/services/budget.service";
import { allocateSchema } from "@/lib/validators/budget.schema";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = allocateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const service = new BudgetService();
  await service.setAllocation(parsed.data.categoryId, parsed.data.month, parsed.data.amount);
  const overview = await service.getOverview(parsed.data.month);
  return NextResponse.json(overview);
}
