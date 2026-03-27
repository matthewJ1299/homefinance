import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildCreditStrategyScenarios, buildHorizonSliderScenario } from "@/lib/services/credit-strategy.service";
import { GoalProjectionService } from "@/lib/services/goal-projection.service";
import { GoalService } from "@/lib/services/goal.service";
import { projectSavingsGoalCompletionMonth } from "@/lib/services/finance/projections";
import { getCurrentMonth } from "@/lib/utils/date";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await context.params;
  const goalId = Number(id);
  if (!Number.isFinite(goalId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const month = typeof body?.month === "string" ? body.month : getCurrentMonth();
  const avalancheMonthlyPayment = body?.avalancheMonthlyPayment;
  const snowballMonthlyPayment = body?.snowballMonthlyPayment;
  const targetPayoffMonth = typeof body?.targetPayoffMonth === "string" ? body.targetPayoffMonth : null;
  const savingsMonthlyOverride = body?.savingsMonthlyContribution;
  const horizonMonthsRaw = body?.horizonMonths;

  const goalService = new GoalService();
  const goal = await goalService.getGoal(userId, goalId);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const projectionService = new GoalProjectionService();

  try {
    if (goal.type === "savings") {
      const progress = await projectionService.getSavingsProgress(userId, goalId, month);
      const remaining = Math.max(0, progress.target - progress.current);
      const override =
        typeof savingsMonthlyOverride === "number" && savingsMonthlyOverride > 0
          ? Math.round(savingsMonthlyOverride)
          : null;

      return NextResponse.json({
        kind: "savings",
        month,
        actual: {
          current: progress.current,
          target: progress.target,
          monthlyActual: progress.monthlyActual,
          monthlyTarget: progress.monthlyTarget,
        },
        projected: {
          ifContinueAtMonthlyActual: projectSavingsGoalCompletionMonth({
            month,
            remaining,
            monthlyTarget: progress.monthlyActual > 0 ? progress.monthlyActual : progress.monthlyTarget,
          }),
          ifHitMonthlyTarget: projectSavingsGoalCompletionMonth({
            month,
            remaining,
            monthlyTarget: progress.monthlyTarget,
          }),
          ifCustomMonthly:
            override != null
              ? projectSavingsGoalCompletionMonth({
                  month,
                  remaining,
                  monthlyTarget: override,
                })
              : null,
        },
      });
    }

    const credit = await projectionService.getCreditProgress(userId, goalId);
    const av =
      typeof avalancheMonthlyPayment === "number" && avalancheMonthlyPayment > 0
        ? Math.round(avalancheMonthlyPayment)
        : credit.monthlyTarget;
    const sb =
      typeof snowballMonthlyPayment === "number" && snowballMonthlyPayment > 0
        ? Math.round(snowballMonthlyPayment)
        : credit.monthlyTarget;

    const strategies = buildCreditStrategyScenarios({
      debt: credit.debt,
      apr: credit.goal.apr,
      baselineMonthlyPayment: credit.monthlyTarget,
      avalancheMonthlyPayment: av,
      snowballMonthlyPayment: sb,
      targetPayoffMonth,
      projectionStartMonth: month,
    });

    const defaultHorizon = Math.min(
      120,
      Math.max(1, credit.payoffMonths ?? 24)
    );
    const horizonMonths =
      typeof horizonMonthsRaw === "number" && Number.isFinite(horizonMonthsRaw)
        ? Math.min(120, Math.max(1, Math.floor(horizonMonthsRaw)))
        : defaultHorizon;

    const horizon =
      credit.debt <= 0
        ? null
        : buildHorizonSliderScenario({
            debt: credit.debt,
            apr: credit.goal.apr,
            horizonMonths,
            planMonthlyPayment: credit.monthlyTarget,
          });

    return NextResponse.json({
      kind: "credit",
      month,
      actual: {
        debt: credit.debt,
        apr: credit.goal.apr,
        monthlyTarget: credit.monthlyTarget,
      },
      projected: {
        strategies,
        horizon,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
