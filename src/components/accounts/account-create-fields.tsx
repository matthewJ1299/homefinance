"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountType } from "@/lib/types";

export function AccountCreateFields(props: {
  name: string;
  onNameChange: (name: string) => void;
  type: AccountType;
  onTypeChange: (type: AccountType) => void;
  creditLimitInput: string;
  onCreditLimitInputChange: (creditLimitInput: string) => void;
}) {
  const { name, onNameChange, type, onTypeChange, creditLimitInput, onCreditLimitInputChange } = props;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="account-create-name">Account name</Label>
        <Input
          id="account-create-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Household Bank"
        />
      </div>

      <div>
        <Label htmlFor="account-create-type">Type</Label>
        <select
          id="account-create-type"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
          value={type}
          onChange={(e) => onTypeChange(e.target.value as AccountType)}
        >
          <option value="bank">Bank</option>
          <option value="savings">Savings</option>
          <option value="credit">Credit</option>
        </select>
      </div>

      {type === "credit" && (
        <div>
          <Label>Credit limit (R)</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={creditLimitInput}
            onChange={(e) => onCreditLimitInputChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

