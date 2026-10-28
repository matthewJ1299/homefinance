"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-lg font-semibold">Admin error</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Something went wrong loading this admin page. You can try again or return to the app.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground text-center">
          Digest: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <a
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
        >
          Back to app
        </a>
      </div>
    </div>
  );
}
