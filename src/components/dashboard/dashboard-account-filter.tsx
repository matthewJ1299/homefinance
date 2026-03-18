"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AccountType } from "@/lib/types";

interface AccountOption {
  id: number;
  name: string;
  type: AccountType;
}

interface DashboardAccountFilterProps {
  accounts: AccountOption[];
}

export function DashboardAccountFilter({ accounts }: DashboardAccountFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAccount = searchParams.get("account") ?? "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("account");
    } else {
      params.set("account", value);
    }
    const query = params.toString();
    const url = query ? `/dashboard?${query}` : "/dashboard";
    router.push(url);
    router.refresh();
  };

  if (accounts.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="dashboard-account-filter" className="text-sm text-muted-foreground whitespace-nowrap">
        Account:
      </label>
      <select
        id="dashboard-account-filter"
        value={currentAccount}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="all">All accounts</option>
        {accounts.map((a) => (
          <option key={a.id} value={String(a.id)}>
            {a.name} ({a.type})
          </option>
        ))}
      </select>
    </div>
  );
}
