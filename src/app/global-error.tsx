"use client";

/**
 * Last-resort boundary. The route-group boundaries under (app) and /admin cover
 * everything rendered inside a layout; this one catches a failure in the ROOT
 * layout itself, which those cannot -- without it that case falls through to
 * Next's stock error page.
 *
 * It must render its own <html>/<body>: the root layout is what failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            HomeFinance could not load
          </h1>
          <p style={{ margin: "0 0 1.25rem", color: "#52525b", lineHeight: 1.55 }}>
            Something went wrong before the page could start. Your data has not been
            changed.
          </p>
          {error.digest ? (
            <p
              style={{
                margin: "0 0 1.25rem",
                fontSize: "0.8125rem",
                color: "#71717a",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: "0.5rem",
              border: "1px solid #d4d4d8",
              background: "#ffffff",
              font: "inherit",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
