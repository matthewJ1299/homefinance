# Deploying HomeFinance with Coolify

End-to-end guide for deploying the HomeFinance Next.js application to a VPS managed by **Coolify** (with its built-in **Traefik** proxy).

Target URL: **[https://finance.dev.triadtech.co.za](https://finance.dev.triadtech.co.za)**

---

## Prerequisites


| Requirement         | Detail                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VPS**             | Coolify installed and running. Traefik proxy enabled on the server.                                                                                            |
| **GitHub repo**     | `matthewJ1299/homefinance` (public or with GitHub App connected in Coolify).                                                                                   |
| **DNS**             | An **A** record for `finance.dev.triadtech.co.za` pointing to the VPS IP. Verify: `nslookup finance.dev.triadtech.co.za` or `dig finance.dev.triadtech.co.za`. |
| **Committed files** | `Dockerfile`, `Dockerfile.dev` (optional; local Compose Watch dev image), `docker-entrypoint.sh`, `docker-compose.yml`, `.dockerignore`, `.gitattributes`, `package-lock.json` must all be committed and pushed.           |


---

## Database

The app requires **Postgres** via `DATABASE_URL`. For Coolify you can either:

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


| Field                   | Value                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Name**                | `HomeFinance`                                                                                  |
| **Build Pack**          | `Dockerfile` (single container) or `Docker Compose` (if using the compose stack with Postgres) |
| **Base Directory**      | `/`                                                                                            |
| **Dockerfile Location** | `/Dockerfile` (or **Docker Compose Location**                                                  |


---

## 4. Domain Configuration (Critical)

This is the most common source of "404 page not found" errors. Coolify expects a **full URL with protocol** in the Domains field.


| Field         | Value                                       |
| ------------- | ------------------------------------------- |
| **Domains**   | `https://finance.dev.triadtech.co.za`       |
| **Direction** | `Allow www & non-www.` (or your preference) |


**Important:** The domain must include the `https://` prefix. If you enter only `finance.dev.triadtech.co.za` without a protocol, Coolify/Traefik may not create a route and all requests will return 404.

After entering the domain, click **Save**.

---

## 5. Network Settings


| Field             | Value                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Ports Exposes** | `3000`                                                                                                                          |
| **Port Mappings** | Leave empty (Traefik handles routing; a direct host mapping like `3000:3000` exposes the port publicly and bypasses the proxy). |


**Ports Exposes** tells Traefik which container port to forward traffic to. The app listens on `0.0.0.0:3000` inside the container.

---

## 6. Persistent Storage

**If using Postgres (Option A – Docker Compose):** The `db` service in `docker-compose.yml` uses a named volume `postgres_data`. Ensure the Postgres service has this volume attached in Coolify so data persists between redeploys.

**If using Postgres (Option B – Coolify Postgres resource):** The Postgres instance is a separate resource with its own Coolify-managed volume. No volume is needed on the app container.

**PWA icons:** The Dockerfile runs `node scripts/generate-pwa-icons.mjs` during build so `public/icons/` (icon-192x192.png, icon-512x512.png, etc.) are created even if not committed. The manifest and install prompt will work after deploy.

---

## 7. Environment Variables

Go to the **Environment Variables** tab and add:


| Key                                                                | Required                | Value                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                                                      | Yes                     | Generate with: `openssl rand -base64 32`                                                                                                                                                                                                                                                                                                                    |
| `DATABASE_URL`                                                     | Yes                     | Connection URL, e.g. `postgresql://user:password@host:5432/dbname`. With Docker Compose, the app service gets this from the compose file (or override in Coolify). With Coolify Postgres resource, use the URL Coolify provides.                                                                         |
| `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, `SEED_USER_PASSWORD`, etc. | No                      | Used when running the user/demo seed scripts to create initial users from env (see **Running seed scripts on the server**).                                                                                                                                                                                                                                  |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`                            | No (for push)           | Required for PWA push notifications. Generate with `npm run generate-vapid-keys` and add both to env. Without them, users cannot enable notifications in Settings. Keep the private key secret. You do **not** need to rotate keys on a schedule; only change them if the private key was exposed or compromised (see **When to change VAPID keys** below). |
| `VAPID_SUBJECT`                                                    | No (for push)           | The `mailto:` or `https:` URI in the VAPID JWT `sub` claim. Default: `mailto:push@homefinance.app`. Apple is strict about this; use a real email domain (not `.local`). Example: `mailto:you@yourdomain.com`. |
| `CRON_SECRET`                                                      | **Yes** | Secret for the 10am daily calendar notification cron. Requests to `/api/cron/daily-calendar-notification` must send `Authorization: Bearer <CRON_SECRET>` or header `x-cron-secret: <CRON_SECRET>`. The route now fails closed: **without this set it returns 503**, not an open endpoint. |


Do **not** commit real values to the repository.

**When to change VAPID keys:** Rotate keys only if the **private key** was (or might have been) exposed (e.g. leaked in logs, committed to a repo, or shared). You do not need to change them periodically. After changing keys, update both env vars, redeploy, and have each user **disable** then **enable** notifications in Settings so their subscription is recreated with the new public key; until they do, they will see "subscription is out of date" when sending a test.

### Daily calendar notification (10am)

To send a push at 10am on days when there is a calendar event, call the cron endpoint once per day at 10am in your desired timezone.

- **Endpoint**: `GET https://<your-app-domain>/api/cron/daily-calendar-notification`
- **Auth**: Set `CRON_SECRET` in the app env, then send it with the request: `Authorization: Bearer <CRON_SECRET>` or header `x-cron-secret: <CRON_SECRET>`. The route fails closed — without `CRON_SECRET` set it returns 503 and sends nothing, rather than running open.
- **Example (system cron, 10am server time)**:
  ```bash
  0 10 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "https://your-domain/api/cron/daily-calendar-notification"
  ```
  Store `CRON_SECRET` in the environment where cron runs (e.g. in a small script that sources env and runs curl). To use a specific timezone (e.g. Africa/Johannesburg), set `TZ` in the crontab or run the job in a container/scheduler that uses that TZ.

---

## 8. Deploy

1. Click **Deploy** (or **Start Deployment**).
2. Coolify will clone the repo, build the Docker image using the Dockerfile, start the container, and register the domain with Traefik.
3. Monitor the build in the **Deployment Logs** tab.
4. Once the container logs show `Ready in ...ms`, open **[https://finance.dev.triadtech.co.za](https://finance.dev.triadtech.co.za)**.

---

## 9. Auto Deploy (Optional)

In the resource's settings, enable **Auto Deploy** so each push to `master` triggers a new build and deploy automatically. This requires the repo to be connected via a **GitHub App** in Coolify.

---

## How the Docker Setup Works

### Dockerfile (multi-stage)

- **Builder stage**: Installs npm dependencies, runs `next build` with `output: "standalone"` (from `next.config.ts`). This produces a minimal, self-contained server under `.next/standalone/`.
- **Runner stage**: Copies standalone output, static assets, full `node_modules` (so `tsx` and db script dependencies are available), `package.json`, `src/lib/db`, and `drizzle/` for migrations. Schema is applied automatically on first start if the DB has no tables. You can run `npm run db:seed:users` or `npx tsx src/lib/db/seed.ts` inside the container depending on whether you need only users or full demo data (see **Running seed scripts on the server**). Installs `su-exec` for privilege dropping. Uses `docker-entrypoint.sh` as the entrypoint.

### docker-entrypoint.sh

Runs as root at startup to `chown /app/data` (fixing volume permissions when Coolify mounts a volume owned by root), then drops to the `nextjs` user via `su-exec` before starting the app.

### Instrumentation (src/instrumentation.ts)

Next.js calls `register()` when the server starts. The app initializes the Postgres connection and in-process scheduler there.

---

## Troubleshooting

### Next.js production error shows only a digest (Server Components)

In production, Next.js intentionally redacts Server Component render errors in the browser and shows a generic message with a **digest**.

- **Primary fix**: Check the **app container logs** in Coolify for the real stack trace around the time of the error.
- **Temporary debug deploy**: Set `NEXT_PUBLIC_DEBUG_ERRORS=true` and redeploy to display full error details inside the in-app error boundary (disable again after debugging to avoid leaking internal details).

### 404 "page not found" (Traefik returning 404, app logs show no requests)

The domain is not routed to the container. Verify:

1. **Domain field** includes the `https://` protocol prefix: `https://finance.dev.triadtech.co.za`.
2. **Ports Exposes** is `3000`.
3. The **Coolify Proxy** (Traefik) is enabled and running on the deployment server.
4. The container is **Running** and **Healthy** (check in Coolify).
5. After changing domain or port, **Save** and **Redeploy**.

### DNS_PROBE_FINISHED_NXDOMAIN

No DNS record exists for `finance.dev.triadtech.co.za`. Add an A record pointing to your VPS IP and wait for propagation.

### ENOENT during runtime

Ensure the runner stage copies the builder `node_modules` after **production** pruning (`npm prune --omit=dev` in the Dockerfile) so runtime dependencies and db scripts are present.

### Build fails: `no space left on device` / `ENOSPC` / `ResourceExhausted`

This always means **insufficient free disk on the machine that runs `docker compose build`** (your Coolify host), not a bug in the app. It can appear:

- During **`npm ci`** (`TAR_ENTRY_ERROR ENOSPC`) while extracting packages into `node_modules`, or
- Later during **`COPY ... node_modules`** between build stages.

A Next.js app with dev and prod dependencies typically needs **several gigabytes** of free space for a single clean build (extracted `node_modules`, build output, Docker layers, BuildKit cache). If the VPS is small or Docker has accumulated images and cache, the build can fail before any Dockerfile tweak would help.

**You must free disk or use a larger disk / remote build.** The Dockerfile only trims what is copied *after* a successful install (e.g. `npm prune --omit=dev` after `npm run build`); it cannot make `npm ci` use dramatically less space.

**On the Coolify server (SSH as root or a user with Docker access):**

1. Check space: `df -h` and `docker system df`.
2. Remove unused Docker data ( **destructive** to stopped containers and unused images—review on shared hosts ):
   - `docker system prune -af`
   - `docker builder prune -af` (BuildKit build cache can be large)
3. If still tight: enlarge the VPS volume, or move Docker’s data directory to a bigger disk (advanced; depends on your OS).
4. Redeploy from Coolify.

**Alternative (recommended on small VPS):** build the image **elsewhere** and deploy only the image:

- Use **GitHub Actions** (or similar) to `docker build` and push to **GHCR**, **Docker Hub**, or another registry.
- In Coolify, configure the app to **pull** that image instead of building on the server (no `npm ci` on the VPS).

That avoids large builds on a disk-constrained host entirely.

### Build fails with "standalone not found"

Ensure `next.config.ts` includes `output: "standalone"` and that `npm run build` completes without errors locally.

### NextAuth errors (CSRF, callback URL)

- Verify `AUTH_SECRET` is set in Coolify environment variables.
- `trustHost: true` is already configured in `src/lib/auth.ts` for reverse-proxy deployments.

### Push notifications: ETIMEDOUT / ENETUNREACH

If the app logs show `[Push] send failed` with `ETIMEDOUT` or `ENETUNREACH` to IPs like `17.188.172.x` or `2620:149:208:...`, the **server cannot reach the push service** (e.g. Apple’s `web.push.apple.com` for iOS). Push is sent from the server to Apple/Google; outbound HTTPS from the app server must be allowed.

- **Check outbound connectivity** from the same environment where the app runs (e.g. inside the Docker container). The app image does not include `curl`; use Node instead:
  ```bash
  node -e "require('https').get('https://web.push.apple.com', { timeout: 5000 }, (r) => { console.log('OK', r.statusCode); }).on('error', e => { console.error('FAIL', e.code || e.message); process.exit(1); });"
  ```
  If you see `OK 200` (or another 2xx), outbound HTTPS works. If you see `FAIL ETIMEDOUT`, `FAIL ENETUNREACH`, or the command hangs, the container cannot reach push services. If the **host** can reach Apple (e.g. `curl -sI --connect-timeout 5 https://web.push.apple.com` from the host returns HTTP 405) but the **container** cannot, try forcing IPv4 from inside the container (IPv6 is often broken or blocked in Docker):
  ```bash
  node -e "require('https').get('https://web.push.apple.com', { timeout: 5000, family: 4 }, (r) => { console.log('OK', r.statusCode); }).on('error', e => { console.error('FAIL', e.code); process.exit(1); });"
  ```
  If that returns `OK 405`, the container can reach Apple over IPv4; see **Push notifications: force IPv4** below to make the app use IPv4 for push.
- **Typical causes**: Host firewall or security group blocking outbound 443; corporate proxy; Docker/VM network with no outbound internet; IPv6 broken (Apple may try IPv6 first). Fix by allowing outbound HTTPS (port 443) to the internet from the app server, or by resolving proxy/DNS/network issues on that host.

### Push notifications: force IPv4

If the **host** can reach Apple but the **container** cannot, and the IPv4-only test from inside the container works (`family: 4` in the Node one-liner above returns `OK 405`), the container’s IPv6 is failing and Node is trying it first. Force the app to use IPv4 by **disabling IPv6 in the app container**.

- **Docker Compose**: Add to the app service:
  ```yaml
  sysctls:
    - net.ipv6.conf.all.disable_ipv6=1
  ```
- **Coolify**: In the app resource, if there is a **Sysctls** / **Docker run options** or similar, add the same sysctl. If not, you may need to use a custom Docker Compose override or run the container with `--sysctl net.ipv6.conf.all.disable_ipv6=1` (depends on how Coolify starts the container).

After redeploying with IPv6 disabled, trigger a test notification again; the app should reach Apple over IPv4.

### Push notifications: 403 BadJwtToken

If the app logs show `statusCode=403` and `body={"reason":"BadJwtToken"}` from Apple, the VAPID JWT is invalid.

- **First fix**: Have the user **disable notifications** in Settings, then **enable** again, then send a test. That creates a new subscription with the current public key.
- **If it still fails after re-enabling**:
  1. **Confirm the new keys are in the running container.** In Coolify, changing env vars usually requires a **Redeploy** so the new container gets them. If you only rebuilt without redeploying, or the env panel wasn’t saved, the container may still have the old keys.
  2. **No newlines in env.** The app trims keys, but avoid pasting keys with extra lines. Use a single line per key in Coolify (or `.env`). Copy the output of `npm run generate-vapid-keys` as two separate single-line values.
  3. **Same key pair.** Ensure `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are from the **same** run of `npm run generate-vapid-keys`. Regenerate once, copy both, set both in env, redeploy, then have the user disable and re-enable notifications and test again.
  4. **Verify what the app sees:** Open `https://<your-app>/api/push/vapid-public` in a browser and check the `publicKey` value. It must **end with** the same 8 characters your server log shows (e.g. `...up2r2xiM`). If it differs, the container is not using the env you expect.
  5. **Public and private must be a pair.** Run `npm run generate-vapid-keys` **once**, then copy **both** lines and set both in env. If you ever set the public key from one run and the private key from another, you will get BadJwtToken. The script now prints a verification line: after deploy, the server log should show the same "public key ends with" and "private key starts with" as the script printed.
  6. **Multiple app instances:** If you run more than one replica or worker, every instance must have the **same** `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. If one instance returns the public key and stores the subscription but another instance (with different keys) sends the notification, you get BadJwtToken. Ensure env is identical for all instances.

### Database reset on redeploy

**Postgres:** Ensure the Postgres service (Compose `db` or Coolify Postgres resource) has a persistent volume. Without it, data is lost on redeploy. After a fresh deploy or intentional reset, run push then the users-only seed so tables and login users are recreated from env (see **Running seed scripts on the server**).

### JWTSessionError: no matching decryption secret

The browser has a session cookie signed with a different `AUTH_SECRET`. Fix: clear the site cookies for the app, or use the same `AUTH_SECRET` across restarts. In Coolify, set `AUTH_SECRET` once and do not change it unless you are okay invalidating all sessions.

### No such table: users

**Postgres:** Run schema push and then seed the two login users: `npm run db:push` then `npm run db:seed:users` inside the container. Use `npm run db:seed:minimal` or `npm run db:seed` only when you intentionally want baseline/demo data as well. Ensure `DATABASE_URL` is set and the app can reach Postgres.

### groupId missing / Splits or Settle errors

The app uses **split groups** (e.g. Default, Home, Wedding) and requires the `split_groups` table and related columns. If you see "groupId" validation errors or missing group when using Splits or Settle, the database is missing the 0001/0002 migrations.

**How to run migrations:**

- **Postgres:** Run the push script. It applies the base schema (0000) when the `users` table is missing, then applies incremental migrations when expected tables/columns are missing (split groups, recurring templates, calendar fields, shared lists, push, accounts, goals, `users.budget_month_start_day`, etc.). No separate migrate step: just run `npx tsx src/lib/db/push.ts` inside the app container (or wherever `DATABASE_URL` is set). Watch the log for lines like "Postgres migration 0011 (budget_month_start_day on users) applied." or "Postgres migration 0012 (users.primary_account_id) applied." when new columns are added.
After migrations, the Default split group exists and the Splits page works without "groupId missing".

### CredentialsSignin (invalid email or password)

Login is rejected when no user exists for the email or the password does not match. Check:

1. **Email** – Use exactly one of the emails you set when seeding: `SEED_USER1_EMAIL` or `SEED_USER2_EMAIL` (from Coolify env vars). No extra spaces; comparison is case-sensitive.
2. **Password** – Use the same value you set as `SEED_USER_PASSWORD` when you ran the seed. If you did not set it, the default is `ChangeMe123!`.
3. **Users present** – If you are unsure, run the users-only seed as the app user so the two env-driven login users are created or updated, then log in with one of those emails and the password:

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npm run db:seed:users"
```

Then sign in with `SEED_USER1_EMAIL` (or `SEED_USER2_EMAIL`) and `SEED_USER_PASSWORD`.

---

## Running seed scripts on the server

The image includes `tsx` and the db scripts so you can seed the database from inside the container when needed (e.g. after a fresh deploy or after a reset). The app uses `DATABASE_URL` from the container environment.

**From your machine** (with Coolify/Docker):

1. Find the running **app** container name or ID: `docker ps` (or use Coolify’s “Terminal” / “Execute command” for the resource).
2. Pick the smallest command that matches what you need:

Users only (safe for an existing database; creates or updates the two login users from env):

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npm run db:seed:users"
```

Full demo data (destructive; clears application data before inserting demo rows):

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npx tsx src/lib/db/seed.ts"
```

Reset + schema only (data can be completely lost; no users or seed data are inserted):

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npm run db:reset"
```

To only apply schema (no seed data):

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npx tsx src/lib/db/push.ts"
```

Minimal setup (empty DB only; categories + default split groups + 2 users):

```bash
docker exec -it -u nextjs <container_name_or_id> sh -c "cd /app && npm run db:seed:minimal"
```

The users-only seed and full seed use the same DB as the app (`DATABASE_URL` is set in the container). Users are created from env vars: `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, `SEED_USER_PASSWORD`, `SEED_USER1_NAME`, `SEED_USER2_NAME` (see `.env.example`). To pass them into `docker exec`, use `-e`:

```bash
docker exec -it -u nextjs -e SEED_USER_PASSWORD=YourSecretPass <container_name_or_id> sh -c "cd /app && npm run db:seed:users"
```

---

## Local Docker Testing

**With Postgres (Docker Compose, recommended):**

```bash
docker compose up --build
```

Then run push and the users-only seed in the app container so tables and login users exist (Compose sets `DATABASE_URL` automatically):

```bash
docker compose exec app sh -c "cd /app && npm run db:push && npm run db:seed:users"
```

Open [http://localhost:3000](http://localhost:3000). The Postgres data persists in the `postgres_data` volume.
