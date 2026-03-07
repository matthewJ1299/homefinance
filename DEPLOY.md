# Deploying HomeFinance with Coolify

End-to-end guide for deploying the HomeFinance Next.js application to a VPS managed by **Coolify** (with its built-in **Traefik** proxy).

Target URL: **https://finance.dev.triadtech.co.za**

---

## Prerequisites

| Requirement | Detail |
|---|---|
| **VPS** | Coolify installed and running. Traefik proxy enabled on the server. |
| **GitHub repo** | `matthewJ1299/homefinance` (public or with GitHub App connected in Coolify). |
| **DNS** | An **A** record for `finance.dev.triadtech.co.za` pointing to the VPS IP. Verify: `nslookup finance.dev.triadtech.co.za` or `dig finance.dev.triadtech.co.za`. |
| **Committed files** | `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`, `.dockerignore`, `.gitattributes`, `package-lock.json` must all be committed and pushed. |

---

## Deployment modes

The app supports two database backends, selected by environment:

| Mode | When | Persistence |
|------|------|-------------|
| **Postgres** | `DATABASE_URL` is set | Use a Postgres service with a persistent volume (Docker Compose volume or Coolify Postgres resource). |
| **SQLite** | `DATABASE_URL` is not set | Use a volume at `/app/data` so `sqlite.db` persists. |

**Recommended for Coolify:** Use **Postgres** so the database persists between redeploys and is not inside the app container. You can either:

- **Option A (Docker Compose):** Deploy the repo as a Compose stack in Coolify. The included `docker-compose.yml` defines an `app` service and a `db` (Postgres) service with a `postgres_data` volume. Data survives redeploys.
- **Option B (Coolify Postgres resource):** Create a Postgres "Database" resource in Coolify (managed Postgres with its own volume). Set `DATABASE_URL` in the app resource to the URL Coolify provides. Deploy the app as a single Dockerfile resource. Persistence is handled by Coolify's Postgres volume.

---

## 1. Verify DNS

Before doing anything in Coolify, confirm the subdomain resolves to your VPS.

```bash
nslookup finance.dev.triadtech.co.za
```

The response must show the same IP as `dev.triadtech.co.za`. If not, add the A record at your DNS provider and wait for propagation.

---

## 2. Create the Application in Coolify

1. Open your Coolify dashboard and navigate to your **Project**.
2. Click **Add New Resource** (or **Create New Resource**).
3. Choose **Public Repository** (or **GitHub App** if the repo is private) and enter the repo URL:
   `https://github.com/matthewJ1299/homefinance`
4. Select the **master** branch.

---

## 3. General Settings

| Field | Value |
|---|---|
| **Name** | `HomeFinance` |
| **Build Pack** | `Dockerfile` (single container) or `Docker Compose` (if using the compose stack with Postgres) |
| **Base Directory** | `/` |
| **Dockerfile Location** | `/Dockerfile` (or **Docker Compose Location** | `docker-compose.yml`) |

---

## 4. Domain Configuration (Critical)

This is the most common source of "404 page not found" errors. Coolify expects a **full URL with protocol** in the Domains field.

| Field | Value |
|---|---|
| **Domains** | `https://finance.dev.triadtech.co.za` |
| **Direction** | `Allow www & non-www.` (or your preference) |

**Important:** The domain must include the `https://` prefix. If you enter only `finance.dev.triadtech.co.za` without a protocol, Coolify/Traefik may not create a route and all requests will return 404.

After entering the domain, click **Save**.

---

## 5. Network Settings

| Field | Value |
|---|---|
| **Ports Exposes** | `3000` |
| **Port Mappings** | Leave empty (Traefik handles routing; a direct host mapping like `3000:3000` exposes the port publicly and bypasses the proxy). |

**Ports Exposes** tells Traefik which container port to forward traffic to. The app listens on `0.0.0.0:3000` inside the container.

---

## 6. Persistent Storage

**If using Postgres (Option A – Docker Compose):** The `db` service in `docker-compose.yml` uses a named volume `postgres_data`. Ensure the Postgres service has this volume attached in Coolify so data persists between redeploys. No `/app/data` volume is required for the app container.

**If using Postgres (Option B – Coolify Postgres resource):** The Postgres instance is a separate resource with its own Coolify-managed volume. No volume is needed on the app container.

**If using SQLite (no DATABASE_URL):** The app stores its database at `/app/data/sqlite.db` inside the container. Without persistent storage, data is lost on every redeploy.

1. Go to the **Persistent Storage** (or **Volumes**) section of the **app** resource.
2. Add a volume:
   - **Destination Path**: `/app/data`
   - **Name**: `homefinance_data` (Coolify may append a UUID; that is fine)

The `docker-entrypoint.sh` script automatically fixes ownership of this directory at startup so the non-root app user can write to it.

**PWA icons:** The Dockerfile runs `node scripts/generate-pwa-icons.mjs` during build so `public/icons/` (icon-192x192.png, icon-512x512.png, etc.) are created even if not committed. The manifest and install prompt will work after deploy.

---

## 7. Environment Variables

Go to the **Environment Variables** tab and add:

| Key | Required | Value |
|---|---|---|
| `AUTH_SECRET` | Yes | Generate with: `openssl rand -base64 32` |
| `DATABASE_URL` | For Postgres | Connection URL, e.g. `postgresql://user:password@host:5432/dbname`. When set, the app uses Postgres instead of SQLite. With Docker Compose, the app service gets this from the compose file (or override in Coolify). With Coolify Postgres resource, use the URL Coolify provides. |
| `DB_PATH` | No (SQLite only) | Default: `/app/data/sqlite.db`. Only set if using SQLite and a different path. |
| `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, `SEED_USER_PASSWORD`, etc. | No | Used when running db:seed to create initial users from env (see **Running db:seed on the server**). |

Do **not** commit real values to the repository.

---

## 8. Deploy

1. Click **Deploy** (or **Start Deployment**).
2. Coolify will clone the repo, build the Docker image using the Dockerfile, start the container, and register the domain with Traefik.
3. Monitor the build in the **Deployment Logs** tab.
4. Once the container logs show `Ready in ...ms`, open **https://finance.dev.triadtech.co.za**.

---

## 9. Auto Deploy (Optional)

In the resource's settings, enable **Auto Deploy** so each push to `master` triggers a new build and deploy automatically. This requires the repo to be connected via a **GitHub App** in Coolify.

---

## How the Docker Setup Works

### Dockerfile (multi-stage)

- **Builder stage**: Installs npm dependencies, runs `next build` with `output: "standalone"` (from `next.config.ts`). This produces a minimal, self-contained server under `.next/standalone/`.
- **Runner stage**: Copies standalone output, static assets, full `node_modules` (so `tsx` and db script dependencies are available), `package.json`, `src/lib/db`, and `drizzle/` for migrations. Schema is applied automatically on first start if the DB has no tables. You can run `npx tsx src/lib/db/seed.ts` inside the container to seed (see **Running db:seed on the server**). Installs `su-exec` for privilege dropping. Uses `docker-entrypoint.sh` as the entrypoint.

### docker-entrypoint.sh

Runs as root at startup to `chown /app/data` (fixing volume permissions when Coolify mounts a volume owned by root), then drops to the `nextjs` user via `su-exec` before starting the app.

### Instrumentation (src/instrumentation.ts)

Next.js calls `register()` when the server starts. If using **SQLite**, this initializes the sql.js in-memory database from the file at `/app/data/sqlite.db` (or creates a new one) and starts a periodic persist loop. If using **Postgres** (`DATABASE_URL` set), the app connects to the pool and does not use file persistence.

### SQLite: why transactions show locally but not on the server

When using SQLite (no `DATABASE_URL`), the app uses an in-memory sql.js instance that is loaded from and saved to a single file. In production, Next.js or the platform may use multiple workers or processes; each has its own in-memory copy. A write in one worker was not visible to reads in another. The DB layer now (1) persists to file immediately after every write (`run()`), and (2) before every read (`getDb()`), reloads from file if the file is newer than the current in-memory load. That way all workers see each other’s writes. Keep exactly one replica when using SQLite. With Postgres, this does not apply.

---

## Troubleshooting

### 404 "page not found" (Traefik returning 404, app logs show no requests)

The domain is not routed to the container. Verify:

1. **Domain field** includes the `https://` protocol prefix: `https://finance.dev.triadtech.co.za`.
2. **Ports Exposes** is `3000`.
3. The **Coolify Proxy** (Traefik) is enabled and running on the deployment server.
4. The container is **Running** and **Healthy** (check in Coolify).
5. After changing domain or port, **Save** and **Redeploy**.

### DNS_PROBE_FINISHED_NXDOMAIN

No DNS record exists for `finance.dev.triadtech.co.za`. Add an A record pointing to your VPS IP and wait for propagation.

### ENOENT: sql-wasm.wasm

The runner stage copies the full builder `node_modules` (which includes `sql.js` and `tsx`). Do not remove that copy or the app and db scripts will fail.

### EACCES: permission denied on /app/data/sqlite.db

The volume mounted at `/app/data` is owned by root. The `docker-entrypoint.sh` fixes this automatically. If the error persists, confirm the entrypoint is set (`ENTRYPOINT ["/docker-entrypoint.sh"]` in the Dockerfile) and that `docker-entrypoint.sh` is committed with LF line endings (enforced by `.gitattributes`).

### Build fails with "standalone not found"

Ensure `next.config.ts` includes `output: "standalone"` and that `npm run build` completes without errors locally.

### NextAuth errors (CSRF, callback URL)

- Verify `AUTH_SECRET` is set in Coolify environment variables.
- `trustHost: true` is already configured in `src/lib/auth.ts` for reverse-proxy deployments.

### Database reset on redeploy

**Postgres:** Ensure the Postgres service (Compose `db` or Coolify Postgres resource) has a persistent volume. Without it, data is lost on redeploy. After a fresh deploy or intentional reset, run push then seed (or reset + push + seed) so tables and users are recreated from env (see **Running db:seed on the server**).

**SQLite:** Add a volume with destination path `/app/data` for the app container.

### JWTSessionError: no matching decryption secret

The browser has a session cookie signed with a different `AUTH_SECRET`. Fix: clear the site cookies for the app, or use the same `AUTH_SECRET` across restarts. In Coolify, set `AUTH_SECRET` once and do not change it unless you are okay invalidating all sessions.

### No such table: users

**Postgres:** Run schema push and seed: `npx tsx src/lib/db/push.ts` then `npx tsx src/lib/db/seed-categories.ts` (or seed.ts) inside the container. Ensure `DATABASE_URL` is set and the app can reach Postgres.

**SQLite:** The app applies the schema automatically on first start when the database has no tables. If you still see this, ensure the container has write access to `/app/data` and that the volume is mounted correctly.

### EACCES: permission denied, open '/app/data/sqlite.db'

The app runs as user `nextjs` (uid 1001). If the DB file was created by root (e.g. you ran the seed via `docker exec` without `-u nextjs`), the app cannot write to it. Fix ownership once:

```bash
docker exec -it <container_name_or_id> chown -R nextjs:nodejs /app/data
```

Then try logging in again. To avoid this, run db scripts as the app user (see **Running db:seed on the server**).

### CredentialsSignin (invalid email or password)

Login is rejected when no user exists for the email or the password does not match. Check:

1. **Email** – Use exactly one of the emails you set when seeding: `SEED_USER1_EMAIL` or `SEED_USER2_EMAIL` (from Coolify env vars). No extra spaces; comparison is case-sensitive.
2. **Password** – Use the same value you set as `SEED_USER_PASSWORD` when you ran the seed. If you did not set it, the default is `ChangeMe123!`.
3. **Users present** – If you are unsure, re-run the seed as the app user so two users are created with your current env vars, then log in with one of those emails and the password:

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npx tsx src/lib/db/seed.ts"
```

Then sign in with `SEED_USER1_EMAIL` (or `SEED_USER2_EMAIL`) and `SEED_USER_PASSWORD`.

---

## Running db:seed on the server

The image includes `tsx` and the db scripts so you can seed the database from inside the container when needed (e.g. after a fresh deploy or after a reset). With **Postgres**, the app uses `DATABASE_URL` from the container environment, so no volume ownership issue. With **SQLite**, run commands with `-u nextjs` so created files are owned by the app user (avoids EACCES).

**From your machine** (with Coolify/Docker):

1. Find the running **app** container name or ID: `docker ps` (or use Coolify’s “Terminal” / “Execute command” for the resource).
2. Run the seed (as app user for SQLite; for Postgres either user is fine):

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npx tsx src/lib/db/seed.ts"
```

Reset + schema + categories + 2 users (data can be completely lost; then recreated from schema and env):

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npx tsx src/lib/db/reset.ts && npx tsx src/lib/db/push.ts && npx tsx src/lib/db/seed-categories.ts"
```

To only apply schema (no seed data):

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npx tsx src/lib/db/push.ts"
```

The seed uses the same DB as the app: with **Postgres**, `DATABASE_URL` is set in the container; with **SQLite**, `/app/data/sqlite.db` by default. Users are created from env vars: `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, `SEED_USER_PASSWORD`, `SEED_USER1_NAME`, `SEED_USER2_NAME` (see `.env.example`). To pass them into `docker exec`, use `-e`:

```bash
docker exec -it -u nextjs -e SEED_USER_PASSWORD=YourSecretPass <container_name_or_id> sh -c "cd /app && npx tsx src/lib/db/seed.ts"
```

---

## Local Docker Testing

**With Postgres (Docker Compose, recommended):**

```bash
docker compose up --build
```

Then run push and seed in the app container so tables and users exist (Compose sets `DATABASE_URL` automatically):

```bash
docker compose exec app sh -c "cd /app && npx tsx src/lib/db/push.ts && npx tsx src/lib/db/seed-categories.ts"
```

Open http://localhost:3000. The Postgres data persists in the `postgres_data` volume.

**Single container with SQLite (Linux / macOS):**

```bash
docker build -t home-finance .
docker run -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  -v homefinance_data:/app/data \
  home-finance
```

**Single container with SQLite (Windows PowerShell):**

```powershell
docker build -t home-finance .
$secret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
docker run -p 3000:3000 -e AUTH_SECRET=$secret -v homefinance_data:/app/data home-finance
```

Open http://localhost:3000. The SQLite database persists in the `homefinance_data` Docker volume.
