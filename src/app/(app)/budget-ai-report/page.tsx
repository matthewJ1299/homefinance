import { BudgetAiReportPageClient } from "@/components/budget-ai/budget-ai-report-page-client";

type BudgetAiReportPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function BudgetAiReportPage({ searchParams }: BudgetAiReportPageProps) {
  const { month: monthParam } = await searchParams;
  return <BudgetAiReportPageClient monthParam={monthParam ?? null} />;
}
