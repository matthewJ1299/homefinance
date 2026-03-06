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
| **Committed files** | `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore`, `.gitattributes`, `package-lock.json` must all be committed and pushed. |

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
| **Build Pack** | `Dockerfile` |
| **Base Directory** | `/` |
| **Dockerfile Location** | `/Dockerfile` |

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

## 6. Persistent Storage (SQLite)

The app stores its database at `/app/data/sqlite.db` inside the container. Without persistent storage, data is lost on every redeploy.

1. Go to the **Persistent Storage** (or **Volumes**) section of the resource.
2. Add a volume:
   - **Destination Path**: `/app/data`
   - **Name**: `homefinance_data` (Coolify may append a UUID; that is fine)

The `docker-entrypoint.sh` script automatically fixes ownership of this directory at startup so the non-root app user can write to it.

---

## 7. Environment Variables

Go to the **Environment Variables** tab and add:

| Key | Required | Value |
|---|---|---|
| `AUTH_SECRET` | Yes | Generate with: `openssl rand -base64 32` |
| `DB_PATH` | No | Default: `/app/data/sqlite.db`. Only set if using a different path. |

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
- **Runner stage**: Copies standalone output, static assets, and the `sql.js` package (whose `.wasm` binary is not traced by standalone). Installs `su-exec` for privilege dropping. Uses `docker-entrypoint.sh` as the entrypoint.

### docker-entrypoint.sh

Runs as root at startup to `chown /app/data` (fixing volume permissions when Coolify mounts a volume owned by root), then drops to the `nextjs` user via `su-exec` before starting the app.

### Instrumentation (src/instrumentation.ts)

Next.js calls `register()` when the server starts. This initializes the sql.js in-memory database from the file at `/app/data/sqlite.db` (or creates a new one) and starts a periodic persist loop that writes the in-memory DB back to disk every 60 seconds.

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

The Dockerfile must copy `node_modules/sql.js` into the runner image. This is already handled; if you modify the Dockerfile, ensure the `COPY ... node_modules/sql.js` line is present.

### EACCES: permission denied on /app/data/sqlite.db

The volume mounted at `/app/data` is owned by root. The `docker-entrypoint.sh` fixes this automatically. If the error persists, confirm the entrypoint is set (`ENTRYPOINT ["/docker-entrypoint.sh"]` in the Dockerfile) and that `docker-entrypoint.sh` is committed with LF line endings (enforced by `.gitattributes`).

### Build fails with "standalone not found"

Ensure `next.config.ts` includes `output: "standalone"` and that `npm run build` completes without errors locally.

### NextAuth errors (CSRF, callback URL)

- Verify `AUTH_SECRET` is set in Coolify environment variables.
- `trustHost: true` is already configured in `src/lib/auth.ts` for reverse-proxy deployments.

### Database reset on redeploy

Persistent storage is not configured. Add a volume with destination path `/app/data` in Coolify.

---

## Local Docker Testing

Build and run locally to verify the image before deploying:

```bash
docker build -t home-finance .
docker run -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  -v homefinance_data:/app/data \
  home-finance
```

Open http://localhost:3000. The SQLite database persists in the `homefinance_data` Docker volume.
