import Link from "next/link";

export function WhatIOweDisabledPlaceholder() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-3 rounded-lg border bg-card">
      <h1 className="text-xl font-semibold">What I owe is turned off</h1>
      <p className="text-sm text-muted-foreground">
        Enable <strong>What I owe</strong> under Settings to see the printable statement of what you
        owe the other person (or what they owe you). It stays off unless you turn it on for this
        account.
      </p>
      <Link href="/settings" className="text-sm font-medium text-primary underline hover:no-underline">
        Open Settings
      </Link>
    </div>
  );
}
