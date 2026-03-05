/**
 * Custom Node server for cPanel and other hosts that require an application startup file.
 * Run with: node server.js or tsx server.js
 * Set PORT in the environment (cPanel often provides it).
 * Uses sql.js (no native bindings); DB is initialized asynchronously before listening.
 */
import next from "next";
import http from "http";

const dev = process.env.NODE_ENV === "development";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/**
 * Parse request URL using the WHATWG URL API (replaces deprecated url.parse).
 */
function parseRequestUrl(req, port) {
  const base = `http://${req.headers.host || hostname}:${port}`;
  const url = new URL(req.url || "/", base);
  return {
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams),
    path: url.pathname + url.search,
  };
}

async function start() {
  await app.prepare();

  const { initDb, startPersistLoop } = await import("./src/lib/db/index.ts");
  await initDb();
  startPersistLoop(60_000);

  const server = http.createServer(async (req, res) => {
    const parsedUrl = parseRequestUrl(req, port);
    await handle(req, res, parsedUrl);
  });

  server.listen(port, hostname, () => {
    console.log(`Ready on http://${hostname}:${port}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
