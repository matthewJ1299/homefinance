# Deploy to cPanel (local build, FTP, Node on server)

Build the app on your machine (Windows or WSL2; the app uses **sql.js**, so no native bindings). Upload the built app **without** `node_modules`. On the server, use cPanel’s **Run NPM Install** button instead of running terminal commands for dependencies. Terminal/SSH is only needed once for database setup.

---

## Prerequisites

- **Node.js 20** (or 18) on your dev machine (Windows or WSL2).
- **cPanel** hosting with **Setup Node.js App** (or Application Manager) and Node 20/18 available.
- **FTP** access to the server.

---

## Quick path (no SSH for routine deploys)

Use this for initial deploy and for every code update. You do **not** need to run `npm ci` or any terminal commands on the server; cPanel’s **Run NPM Install** button runs the equivalent of `npm install` in the app directory. The docs sometimes mention `npm ci` for reproducible installs; on cPanel the button is sufficient.

1. **Build locally** (in your project directory, Windows or WSL):
   ```bash
   npm ci
   npm run build
   ```
   Confirm `.next/` exists. Do **not** upload `node_modules`.

2. **Upload via FTP** into the directory that will be the **Application root** in cPanel (e.g. `homefinance` or `public_html/homefinance`).

   **Include:** `.next/`, `server.js`, **`startup.cjs`** (startup launcher), `run.sh` (optional), `.htaccess`, `public/`, `src/`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `drizzle/`, `postcss.config.mjs` / `tailwind.config.*` if present, and any other root config files.

   **Exclude:** `node_modules/`, `.env` / `.env.local`, `.git/`, `*.db`.

3. **In cPanel (Setup Node.js App):**
   - Set **Node.js version** to **18** or **20** (required; the app will not run on Node 10 or 12).
   - Set **Application root** to the folder where `server.js` and `package.json` live.
   - Set **Application startup file** to **`startup.cjs`** (this launcher runs `npx tsx server.js` from the app directory; use this when the host only has a startup file and no start-command field).
   - Click **Run NPM Install** (once per deploy, or only when dependencies change).
   - Click **Start** or **Restart**.

4. **Environment variables:** In cPanel **Setup Node.js App** > Environment variables (or `.env` on the server if supported), set:
   - `AUTH_SECRET` – long random string (e.g. `openssl rand -base64 32`).
   - `NEXTAUTH_URL` – full public URL (e.g. `https://finance.yourdomain.com`).
   - `DB_PATH` – path to the SQLite file (e.g. `/home/youruser/homefinance/data/app.db`).

5. **Apache proxy:** If the app is served via Apache, edit `.htaccess` on the server and replace `3000` in `http://127.0.0.1:3000/` with the **port** shown in Setup Node.js App for your Node app.

For **later updates**, repeat: upload changed files (and new `.next/` if you rebuilt) → **Run NPM Install** only if `package.json` or lockfile changed → **Restart**. No SSH required.

---

## One-time DB setup

After the first deploy, do this **once per environment** (e.g. per domain). All later code updates reuse the existing database; you do **not** rerun these unless you change the schema.

1. **Create the database directory** (e.g. outside the web root). Using cPanel **Terminal** or SSH, in your home directory:
   ```bash
   mkdir -p ~/homefinance/data
   ```
   Ensure `DB_PATH` in cPanel env vars points to a file in this folder (e.g. `~/homefinance/data/app.db`).

2. **Create the schema and optionally seed:** In the **app directory** (Application root), run:
   ```bash
   npm run db:push
   npm run db:seed
   ```
   (`db:seed` is optional; use it only for a fresh install if you want sample data.)

After this one-time setup, normal deploys do not require terminal access.

---

## cPanel configuration summary

| Setting | Value |
|--------|--------|
| **Application root** | Folder containing `server.js` and `package.json` (e.g. `homefinance`) |
| **Application startup file** | **`startup.cjs`** (launcher that runs `npx tsx server.js` from the app dir) |
| **Node.js version** | **18 or 20** (required; do not use Node 10 or 12) |

Routine steps: **Run NPM Install** (when deps change) then **Restart**. No manual `npm ci` on the server.

---

## Detailed upload checklist

**Include:**

- `.next/` (entire folder – built output)
- `server.js` (custom Next server)
- `startup.cjs` (application startup file for cPanel: launcher that runs `npx tsx server.js`)
- `run.sh` (optional: alternative wrapper if the host cannot run from app root)
- `.htaccess` (proxies Apache to the Node app; edit the port after upload)
- `public/`, `src/`, `package.json`, `package-lock.json`
- `next.config.ts` (or `next.config.js` / `next.config.mjs` if you use one), `tsconfig.json`
- `drizzle/` (migration SQL and meta)
- `postcss.config.mjs` / `tailwind.config.*` (if present)
- Any other config files at the project root

**Exclude:**

- `node_modules/`
- `.env` / `.env.local` (set env vars in cPanel instead)
- `.git/`, `*.db`

---

## Troubleshooting

### "Cannot GET /login" with JSON listing `POST /auth/login`, `GET /auth/tenant`, etc.

That response is **not** from this Next.js app. This app serves:

- **GET /login** – HTML login page
- **/api/auth/[...nextauth]** – NextAuth (credentials) API

If you see JSON with `availableEndpoints` and `"login":"POST /auth/login"`, the request is being handled by a **different** application (e.g. a separate auth REST API). Fix it as follows:

1. **Confirm which app cPanel is running**
   - In **Setup Node.js App**, check **Application startup file**. It must be **`startup.cjs`** (this repo’s launcher, which runs `npx tsx server.js`), not another app’s entry file.

2. **Confirm Apache proxies to the correct port**
   - In **Setup Node.js App**, note the **port** (e.g. 3000, 3001).
   - In **.htaccess** on the server, the `RewriteRule` must proxy to that port, e.g. `http://127.0.0.1:3000/$1` (replace 3000 if cPanel uses a different port).
   - If another app (e.g. an auth API) is bound to that port, stop it or move it to another port so only this Node.js app uses the port cPanel expects.

3. **Only one process per port**
   - Ensure no other Node/Python/etc. app is listening on the same port. Restart the Node.js app from cPanel after stopping any other service that might have taken the port.

4. **Quick check**
   - Visiting **https://yourdomain.com/** or **https://yourdomain.com/login** should return **HTML** (the Next.js page), not JSON. If you get JSON with `availableEndpoints`, the wrong backend is still in front.

### "SyntaxError: Unexpected identifier" on `import next from "next"` (LiteSpeed / lsnode)

The host is running **plain `node server.js`** and Node is loading the file as CommonJS, so `import` is invalid.

- **Fix:** Set **Application startup file** to **`startup.cjs`** (not `server.js`). The launcher runs `npx tsx server.js` from the app directory so the real server runs under tsx. Ensure **Application root** is the folder that contains `package.json` and `node_modules`.

### "Cannot find module 'node:fs'" or npm install fails with Node 10

The **Node.js version** for this application is set to **Node 10** (or 12). This app requires **Node 18 or 20**. The `node:fs` built-in exists only in Node 14.18+; Next.js 15 and the rest of the stack require Node 18+.

- **Fix:** In cPanel **Setup Node.js App**, change the **Node.js version** for this application to **18** or **20**. The version is chosen when you create or edit the application (e.g. a dropdown or selector). After changing it, run **Run NPM Install** again from the app root so dependencies are installed with the correct Node, then **Restart**.
- **Git deploy note:** `.cpanel.yml` uses Node 24 in the **repository** for `npm install` and `npm run build`. The **running application** (Setup Node.js App) has its own Node version; that must be 18 or 20, not 10. If the app is currently tied to Node 10, edit the application and select Node 18 or 20, then re-run NPM Install in the **deploy path** (e.g. `finance`).

### "Cannot find module 'next'" (LiteSpeed / lsnode / generic Node hosts)

Node resolves `require('next')` from the **current working directory** of the process. If the app is started from another directory (e.g. LiteSpeed’s `fcgi-bin`), `node_modules` in your app folder is never used.

1. **Install dependencies in the app directory**
   - In cPanel, use **Run NPM Install** for this app. If you must use terminal: `cd` to the app root and run `npm install` (or `npm ci`). Confirm `node_modules/next` exists.

2. **Run the app with working directory = app root**
   The process that runs `server.js` must have its **current working directory** set to the application root (where `package.json` and `node_modules` live).

   - **LiteSpeed (lsnode):** Set the **application root** or **working directory** to your app path. Or use a wrapper script that `cd`s into the app root and then runs `npx tsx server.js`.
   - **Generic:** From SSH, verify: `cd /path/to/app && npx tsx server.js`. If that works, the host’s Node runner must use the same working directory.

3. **Optional wrapper script**
   If the host cannot set the working directory, use `run.sh` in the app root:
   ```bash
   #!/bin/sh
   cd "$(dirname "$0")"
   exec npx tsx server.js
   ```
   Make it executable: `chmod +x run.sh`. Configure the host to run `./run.sh` (with app root as the execution directory).

---

## Summary

| Step | Where | Action |
|------|--------|--------|
| 1 | Your PC | `npm ci && npm run build` |
| 2 | Your PC | FTP project (no `node_modules`, no `.env`) |
| 3 | cPanel | Set **Node version 18 or 20**, Application root, startup file **`startup.cjs`**; set `AUTH_SECRET`, `NEXTAUTH_URL`, `DB_PATH`; edit `.htaccess` port if needed |
| 4 | cPanel | **Run NPM Install**, then **Start** or **Restart** |
| 5 | Server (one-time) | Terminal/SSH: create DB directory, then in app dir run `npm run db:push` and optionally `npm run db:seed` |

You do **not** need to run `npm ci` manually on the server; cPanel’s **Run NPM Install** installs dependencies. Build locally and upload `.next/` so the server only runs the app.

---

## Git push deployment

To use cPanel **Git Version Control** with push deployment:

1. **Valid `.cpanel.yml`**  
   A `.cpanel.yml` file must exist in the **root** of the repository and be **committed**. It must be valid YAML. The repo includes one configured for:
   - **Repository path:** `/home/triadtec/repositories/homefinance` (branch `master`)
   - **Deploy path (Application root):** `/home/triadtec/finance/`  
   Tasks run in the repo directory: `npm install`, `npm run build`, then copy `.next/`, `public/`, `src/`, `drizzle/`, `server.js`, `startup.cjs`, and config files into the deploy path. Edit `REPOPATH`, `DEPLOYPATH`, and the nodevenv path in `.cpanel.yml` if your account or app names differ.

2. **Clean working tree on the server**  
   cPanel will not deploy if the **server's** copy of the repo has uncommitted changes. Ensure you have not edited files inside the repo directory (`repositories/homefinance`). If the server's branch was changed or is behind, use **Update from Remote** in cPanel **Git Version Control** (Pull or Deploy tab) so the checked-out branch matches the remote; then use **Deploy HEAD Commit** or push to trigger deployment.

3. **Setup Node.js App**  
   In cPanel **Setup Node.js App**, set **Node.js version** to **18** or **20** (not 10 or 12). Set **Application root** to the **deploy path** (e.g. `finance`), not the repository path. Set **Application startup file** to **`startup.cjs`**. The deployment script copies built files into the deploy directory; the Node app runs from there.
