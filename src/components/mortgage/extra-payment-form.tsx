"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { recordExtraPayment } from "@/lib/actions/mortgage.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toMinorUnits } from "@/lib/utils/currency";
import { format } from "date-fns";
import { toast } from "sonner";

export function ExtraPaymentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const rands = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(rands) || rands <= 0) return;
    const cents = toMinorUnits(rands);
    startTransition(async () => {
      const result = await recordExtraPayment({
        amount: cents,
        paymentDate,
        note: note.trim() || undefined,
      });
      if (result.success) {
        setAmount("");
        setNote("");
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        toast.success("Extra payment recorded.");
        void router.refresh();
      } else {
        setMessage("error");
        setTimeout(() => setMessage(null), 3000);
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="mortgage-extra-payment">
      <h2 className="font-semibold text-base">Pay a bit extra</h2>
      <div>
        <Label htmlFor="mortgage-extra-amount">Amount (R)</Label>
        <Input
          id="mortgage-extra-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          required
        />
      </div>
      <div>
        <Label htmlFor="mortgage-extra-date">Date</Label>
        <Input
          id="mortgage-extra-date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="mortgage-extra-note">Note (optional)</Label>
        <Input
          id="mortgage-extra-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Record extra payment"}</Button>
      {message === "saved" && <p className="text-sm text-primary">Saved.</p>}
      {message === "error" && <p className="text-sm text-destructive">Failed to save.</p>}
    </form>
  );
}
