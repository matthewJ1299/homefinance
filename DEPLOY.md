# Deployment Guide

This document describes how to deploy HomeFinance to a VPS using GitHub, Docker, Coolify, and Traefik.

## Prerequisites

- Git repository pushed to GitHub (public or private).
- A VPS with Docker, Coolify, and Traefik installed (Coolify typically manages Traefik).
- **Domain**: This guide uses the VPS at `dev.triadtech.co.za` and the app at **`finance.dev.triadtech.co.za`**. Ensure a DNS **A** record for `finance.dev.triadtech.co.za` points to the same IP as `dev.triadtech.co.za` (your VPS).

## Project Setup for Deployment

### Build and Run Locally with Docker (optional check)

From the project root:

```bash
docker build -t home-finance .
docker run -p 3000:3000 -e AUTH_SECRET=your-secret-here -v homefinance_data:/app/data home-finance
```

Open http://localhost:3000. The SQLite database is stored in the `homefinance_data` volume. To use a bind mount instead: `-v ./data:/app/data`.

### Required Environment Variables

Set these in Coolify (or your orchestrator); do not commit real values to the repo.

| Variable       | Required | Description |
|----------------|----------|-------------|
| `AUTH_SECRET`  | Yes      | NextAuth v5 secret. Generate with: `openssl rand -base64 32`. |
| `DB_PATH`      | No       | SQLite file path. Default inside container: `/app/data/sqlite.db`. Only set if you use a different path. |

### Optional (seeding)

Used only if you run seed scripts; not needed for normal runtime:

- `SEED_USER_PASSWORD`, `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, `SEED_USER1_NAME`, `SEED_USER2_NAME`

## Pushing to GitHub

1. Ensure `.gitignore` excludes: `.next/`, `node_modules/`, `data/`, `.env`, `.env.local`, and other env files.
2. Commit and push:

   ```bash
   git add .
   git commit -m "Add Docker and deployment config"
   git remote add origin https://github.com/YOUR_USERNAME/home-finance.git   # if not already added
   git push -u origin master
   ```

3. For reproducible Docker builds, commit `package-lock.json` (run `npm install` once in the project root if it does not exist).

## Exact Coolify Setup (finance.dev.triadtech.co.za)

Follow these steps in order. The app will be available at **https://finance.dev.triadtech.co.za** once deployed.

### Step 1: DNS

- In your DNS provider, add an **A** record: **`finance.dev.triadtech.co.za`** -> **same IP as `dev.triadtech.co.za`** (your VPS).
- Wait for propagation (minutes to hours). You can check with `dig finance.dev.triadtech.co.za` or an online DNS lookup.

### Step 2: GitHub access in Coolify (if using a private repo)

- In Coolify: go to **Settings** (or **Source Control** / **Integrations**).
- Add **GitHub** via **GitHub App** (recommended) or **Deploy Key**, so Coolify can clone your repo. Skip this if the repo is public.

### Step 3: Create a new resource

- Open your **Project** in Coolify.
- Click **Create New Resource** (or **Add Resource**).

### Step 4: Choose deployment option

- **Public repository**: choose “Public Repository” and paste your repo URL (e.g. `https://github.com/YOUR_USERNAME/home-finance`).
- **Private repository**: choose **GitHub App** or **Deploy Key** and select the repo when prompted.

### Step 5: Select build pack and paths

- **Build Pack**: open the dropdown (default is Nixpacks) and select **Dockerfile**.
- **Base Directory**: set to **`/`** (project root; no subfolder).
- **Branch**: leave as detected (e.g. `master` or `main`) or select the branch you want to deploy.
- Click **Continue**.

### Step 6: Network and domain

On the next screen (network/configuration):

- **Domain**: set the **FQDN** to **`finance.dev.triadtech.co.za`** (no `https://` prefix).
- **Port**: set **Port Exposes** to **`3000`** (the app listens on 3000; this is often the default).
- **HTTPS**: enable **HTTPS** and use **Let’s Encrypt** so Coolify/Traefik issues a certificate for `finance.dev.triadtech.co.za`. Force HTTPS can stay enabled.

### Step 7: Persistent storage (SQLite)

The app stores the database in **`/app/data`** inside the container. Add a volume so it survives redeploys:

- Open the resource’s **Configuration** (or **Advanced** / **Persistent Storage**).
- Add **Persistent Storage**:
  - **Destination Path** (inside container): **`/app/data`**
  - **Name**: e.g. **`homefinance_data`** (Coolify may append a UUID; that is fine).
- If your Coolify version uses **Bind Mount** instead: **Source Path** = path on the host (e.g. `/opt/coolify/data/homefinance`), **Destination Path** = **`/app/data`**.

### Step 8: Environment variables

- Open the **Environment Variables** tab for this resource.
- Add:
  - **Key**: `AUTH_SECRET`  
    **Value**: a long random string. Generate with:  
    `openssl rand -base64 32`
- You do not need to set `DB_PATH` unless you use a different path; the default inside the container is `/app/data/sqlite.db`.

### Step 9: Deploy

- Click **Deploy** (or **Start Deployment**). Coolify will clone the repo, run `docker build` using the Dockerfile, start the container, and register **finance.dev.triadtech.co.za** with Traefik.
- Wait for the build to finish. Check **Logs** if something fails.
- Open **https://finance.dev.triadtech.co.za** in a browser. You should see the app (login page if no users are seeded).

### Step 10 (optional): Deploy on push

- In the resource’s **Advanced** (or similar) settings, enable **Auto Deploy** (or **Deploy on push**) so each push to the selected branch triggers a new build and deploy. This is usually available when the repo is connected via GitHub App.

## Dockerfile Overview

- **Build stage**: Installs dependencies, runs `next build`. Uses `output: "standalone"` from `next.config.ts` so the build produces a minimal runnable tree under `.next/standalone/`.
- **Run stage**: Copies standalone output and `.next/static` into a minimal Node image, installs `su-exec`, and uses `docker-entrypoint.sh` so the container starts as root, chowns `/app/data` to the `nextjs` user (fixing volume ownership when a volume is mounted), then runs `node server.js` as `nextjs`. Port 3000 is exposed. The `/app/data` directory is intended to be overwritten or supplemented by a volume for SQLite persistence.

## Troubleshooting

- **dev.triadtech.co.za shows 404**: The app is only configured for **finance.dev.triadtech.co.za**. Traefik has no route for the bare `dev.triadtech.co.za` hostname, so you get 404. Use **https://finance.dev.triadtech.co.za** to reach the app. To serve something at `dev.triadtech.co.za`, configure a separate Coolify resource or a Traefik redirect for that host.
- **finance.dev.triadtech.co.za shows "DNS_PROBE_FINISHED_NXDOMAIN" or "check for typos"**: The domain has no DNS record. Add an **A** record at your DNS provider: **Name** = `finance` (or `finance.dev` depending on provider; the full name must resolve to **finance.dev.triadtech.co.za**), **Value** = the same IP as **dev.triadtech.co.za** (your VPS). Wait for propagation (minutes to hours), then try again. Check with `nslookup finance.dev.triadtech.co.za` or `dig finance.dev.triadtech.co.za`.
- **Build fails with "standalone not found"**: Ensure `next.config.ts` includes `output: "standalone"` and that the build completes without errors (e.g. run `npm run build` locally).
- **ENOENT sql-wasm.wasm / "Failed to prepare server" / instrumentation hook error**: The app uses `sql.js` (serverExternalPackages). Next.js standalone traces `sql-wasm.js` but not the `.wasm` file. The Dockerfile must copy `node_modules/sql.js` into the runner image (see Dockerfile comment) so the runtime finds `/app/node_modules/sql.js/dist/sql-wasm.wasm`. If you use a custom Dockerfile, add the same `COPY` for `sql.js`.
- **502 / connection refused** or **"No Available Server"** at https://finance.dev.triadtech.co.za: Confirm **Port Exposes** is **3000** in the resource’s network settings. The container must listen on `0.0.0.0:3000` (the Dockerfile already sets `HOSTNAME="0.0.0.0"`). Check the container’s **Logs** in Coolify; if the container is unhealthy, fix the cause or temporarily disable health checks.
- **Database reset on redeploy**: Ensure **Persistent Storage** is set with **Destination Path** `/app/data` in the Coolify resource.
- **EACCES: permission denied, open '/app/data/sqlite.db'**: The app runs as a non-root user; a volume mounted at `/app/data` may be owned by root. The image uses an entrypoint that chowns `/app/data` to the app user at startup. Redeploy so the new image (with `docker-entrypoint.sh`) is used; if the error persists, the host or orchestrator may be remounting the volume with different permissions.
- **NextAuth errors**: Verify `AUTH_SECRET` is set in the resource’s Environment Variables and that `trustHost: true` is used in auth config (already set in this app for reverse-proxy deployments).
- **Traefik not routing**: Confirm the resource’s domain is exactly **finance.dev.triadtech.co.za** and HTTPS (e.g. Let’s Encrypt) is enabled so Coolify registers the route with Traefik.

## Alternative: Docker Compose and Traefik

If you prefer to run the stack yourself (e.g. on the same host as Coolify but outside Coolify’s app UI), you can use Docker Compose and attach Traefik labels so Traefik routes your domain to the container. The Dockerfile remains the same; only the orchestration and Traefik configuration (labels or dynamic config) are defined in your Compose file and Traefik setup.
