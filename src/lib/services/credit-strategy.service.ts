export type {
  CreditPayoffEstimate,
  StrategyComparison,
  StrategyRecommendation,
  CreditStrategyScenario,
  HorizonSliderScenario,
} from "@/lib/services/finance/credit";

export {
  estimateCreditPayoff,
  recommendCreditStrategy,
  buildCreditStrategyScenarios,
  buildHorizonSliderScenario,
  inclusiveCalendarMonthsFromStartToTarget,
  minimumMonthlyPaymentForMaxMonths,
} from "@/lib/services/finance/credit";

