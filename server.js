/**
 * Custom Node server for cPanel and other hosts that require an application startup file.
 * Run with: node server.js
 * Set PORT in the environment (cPanel often provides it).
 * Uses sql.js (no native bindings); DB is initialized asynchronously before listening.
 */
const next = require("next");
const http = require("http");
const { parse } = require("url");

const dev = process.env.NODE_ENV === "development";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function start() {
  await app.prepare();

  const { initDb, startPersistLoop } = await import("./src/lib/db/index.ts");
  await initDb();
  startPersistLoop(60_000);

  const server = http.createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
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
