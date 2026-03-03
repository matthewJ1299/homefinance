import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MortgageService } from "@/lib/services/mortgage.service";
import { extraPaymentSchema } from "@/lib/validators/mortgage.schema";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = extraPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const userId = Number(session.user.id);
  const service = new MortgageService();
  const schedule = await service.recordExtraPayment(
    userId,
    parsed.data.amount,
    parsed.data.paymentDate,
    parsed.data.note
  );
  if (!schedule) {
    return NextResponse.json({ error: "No mortgage configured" }, { status: 404 });
  }
  return NextResponse.json(schedule);
}
