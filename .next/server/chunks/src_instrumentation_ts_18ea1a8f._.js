module.exports = [
"[project]/src/instrumentation.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Runs when the Next.js server starts (next dev / next start).
 * Initializes the sql.js database so getDb() works on the first request.
 */ __turbopack_context__.s([
    "register",
    ()=>register
]);
async function register() {
    if ("TURBOPACK compile-time truthy", 1) {
        const { initDb, startPersistLoop } = await __turbopack_context__.A("[project]/src/lib/db/index.ts [instrumentation] (ecmascript, async loader)");
        await initDb();
        startPersistLoop(60_000);
    }
}
}),
];

//# sourceMappingURL=src_instrumentation_ts_18ea1a8f._.js.map