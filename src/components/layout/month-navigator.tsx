"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonthNavigation } from "@/hooks/use-month-navigation";

interface MonthNavigatorProps {
  className?: string;
}

export function MonthNavigator({ className }: MonthNavigatorProps) {
  const { label, goPrev, goNext } = useMonthNavigation();
  return (
    <div className={`flex items-center justify-between gap-2 ${className ?? ""}`}>
      <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="font-medium min-w-[140px] text-center">{label}</span>
      <Button variant="outline" size="icon" onClick={goNext} aria-label="Next month">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
