import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { IncomeService } from "@/lib/services/income.service";
import { createIncomeSchema } from "@/lib/validators/income.schema";
import { getCurrentMonth } from "@/lib/utils/date";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const month = request.nextUrl.searchParams.get("month") ?? getCurrentMonth();
  const service = new IncomeService();
  const result = await service.getByMonth(month);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = createIncomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const userId = Number(session.user.id);
  const service = new IncomeService();
  const { id } = await service.create(userId, parsed.data);
  return NextResponse.json({ id });
}
