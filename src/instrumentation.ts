/**
 * Runs when the Next.js server starts (next dev / next start).
 * Initializes the database and starts the notification scheduler.
 *
 * Node-only work is loaded through tsx at runtime (`webpackIgnore`) so the
 * instrumentation Edge compiler never sees `pg` / `web-push`. A relative
 * `import("./lib/db/index")` resolves against `.next/server/instrumentation.js`
 * in standalone and is what Coolify logged as
 * Cannot find module '/app/.next/server/lib/db/index'.
 *
 * Specifiers must be file:// URLs. A Windows path `D:\...` is read as protocol `d:`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (!process.env.DATABASE_URL) {
    console.warn(
      "[instrumentation] DATABASE_URL is not set; skipping DB init, persist loop, and notification scheduler. Set DATABASE_URL for Postgres (see README / DEPLOY)."
    );
    return;
  }

  const [{ tsImport }, { pathToFileURL }, { join }] = await Promise.all([
    import(/* webpackIgnore: true */ "tsx/esm/api"),
    import(/* webpackIgnore: true */ "node:url"),
    import(/* webpackIgnore: true */ "node:path"),
  ]);

  const entry = pathToFileURL(join(process.cwd(), "src/instrumentation-node.ts")).href;
  const { registerNode } = await tsImport(entry, entry);
  await registerNode();
}
