"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showDebugDetails = process.env.NEXT_PUBLIC_DEBUG_ERRORS === "true";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        An error occurred loading this page. You can try again.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground text-center">
          Digest: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
      {showDebugDetails ? (
        <div className="w-full max-w-3xl rounded-md border bg-background p-3 text-left">
          <div className="text-xs font-semibold">Debug details</div>
          <pre className="mt-2 overflow-auto text-xs whitespace-pre-wrap font-mono">
            {error.stack ?? error.message}
          </pre>
        </div>
      ) : null}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
