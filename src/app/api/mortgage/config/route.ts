import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { featureDeniedResponse } from "@/lib/api/feature-gate";
import { MortgageService } from "@/lib/services/mortgage.service";
import { mortgageConfigSchema } from "@/lib/validators/mortgage.schema";

export async function GET() {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const blocked = featureDeniedResponse("mortgage");
  if (blocked) return blocked;
  const service = new MortgageService();
  const result = await service.getConfig();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const blocked = featureDeniedResponse("mortgage");
  if (blocked) return blocked;
  const body = await request.json();
  const parsed = mortgageConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const service = new MortgageService();
  const config = await service.saveConfig(parsed.data);
  return NextResponse.json(config);
}
