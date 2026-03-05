module.exports = [
"[externals]/sql.js [external] (sql.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("sql.js", () => require("sql.js"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[project]/src/lib/db/index.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "all",
    ()=>all,
    "get",
    ()=>get,
    "getDb",
    ()=>getDb,
    "initDb",
    ()=>initDb,
    "lastInsertId",
    ()=>lastInsertId,
    "run",
    ()=>run,
    "saveDb",
    ()=>saveDb,
    "startPersistLoop",
    ()=>startPersistLoop
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$sql$2e$js__$5b$external$5d$__$28$sql$2e$js$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/sql.js [external] (sql.js, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
;
;
;
const dbPath = process.env.DB_PATH ?? __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), "data", "sqlite.db");
let sqlJsDb = null;
const dir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(dbPath);
if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(dir)) {
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].mkdirSync(dir, {
        recursive: true
    });
}
async function initDb() {
    if (sqlJsDb) return;
    const SQL = await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$sql$2e$js__$5b$external$5d$__$28$sql$2e$js$2c$__cjs$29$__["default"])();
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(dbPath)) {
        const buf = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(dbPath);
        sqlJsDb = new SQL.Database(new Uint8Array(buf));
    } else {
        sqlJsDb = new SQL.Database();
    }
    sqlJsDb.run("PRAGMA foreign_keys = ON;");
    sqlJsDb.run("PRAGMA journal_mode = WAL;");
}
function saveDb() {
    if (!sqlJsDb) return;
    const data = sqlJsDb.export();
    const buf = Buffer.from(data);
    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeFileSync(dbPath, buf);
}
function getDb() {
    if (!sqlJsDb) {
        throw new Error("Database not initialized. Call initDb() before using getDb().");
    }
    return sqlJsDb;
}
function run(sql, params = []) {
    getDb().run(sql, params);
}
function lastInsertId() {
    const db = getDb();
    const stmt = db.prepare("SELECT last_insert_rowid() AS id");
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return row.id;
}
function get(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const hasRow = stmt.step();
    const row = hasRow ? stmt.getAsObject() : null;
    stmt.free();
    return row;
}
function all(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while(stmt.step()){
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}
function startPersistLoop(intervalMs = 60_000) {
    setInterval(()=>{
        try {
            saveDb();
        } catch (e) {
            console.error("Failed to persist DB:", e);
        }
    }, intervalMs);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__14b05b3e._.js.map