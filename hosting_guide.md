# hubnexus Hosting Guide

This guide covers deploying two components:
- **Admin Dashboard** (React + Vite) → **Cloudflare Pages** at `hubnexus.app`
- **Backend API** (Node.js + Express) → **Railway** (recommended) or any VPS/cloud provider

---

## Table of Contents

1. [Admin Dashboard — Cloudflare Pages](#1-admin-dashboard--cloudflare-pages)
   - [Prerequisites](#prerequisites)
   - [Build Configuration](#build-configuration)
   - [Deploy via Cloudflare Dashboard](#deploy-via-cloudflare-dashboard)
   - [Connect Custom Domain (hubnexus.app)](#connect-custom-domain-hubnexusapp)
   - [Environment Variables](#environment-variables-admin)
   - [SPA Routing Fix](#spa-routing-fix)
2. [Backend API — Railway (Recommended)](#2-backend-api--railway-recommended)
   - [Prerequisites](#prerequisites-1)
   - [Environment Variables](#environment-variables-backend)
   - [Deploy to Railway](#deploy-to-railway)
   - [Redis on Railway](#redis-on-railway)
3. [Connecting Admin → Backend](#3-connecting-admin--backend)
4. [Alternative: Backend on a VPS (Ubuntu)](#4-alternative-backend-on-a-vps-ubuntu)
5. [Post-Deployment Checklist](#5-post-deployment-checklist)

---

## 1. Admin Dashboard — Cloudflare Pages

### Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Your domain `hubnexus.app` added to Cloudflare (or purchased through Cloudflare Registrar)
- Your code pushed to a GitHub / GitLab repository

---

### Build Configuration

Cloudflare Pages needs the following settings when connecting your repository:

| Setting | Value |
|---|---|
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `admin` *(set this if your repo has both `admin/` and `backend/` at the root)* |
| **Node.js version** | `20` |

---

### Deploy via Cloudflare Dashboard

1. Go to **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**
2. Select your GitHub repository (`capstone` / `capstone-meer`).
3. Click **Begin setup**.
4. Fill in the build configuration table above.
5. Click **Save and Deploy**.

Cloudflare will install dependencies and build the project. The first deploy takes ~2 minutes.

> **Wrangler CLI alternative:**
> ```bash
> npm install -g wrangler
> wrangler login
> cd admin
> npm run build
> wrangler pages deploy dist --project-name=hubnexus-admin
> ```

---

### Connect Custom Domain (hubnexus.app)

1. After the first deploy succeeds, go to your Pages project → **Custom Domains** tab.
2. Click **Set up a custom domain**.
3. Enter `hubnexus.app` and click **Continue**.
4. Cloudflare will automatically create the required DNS records (CNAME pointing to your Pages deployment URL) since your domain is already on Cloudflare.
5. Click **Activate domain**.

SSL is handled automatically by Cloudflare — no extra configuration needed.

**To also serve the admin on a subdomain (e.g. `admin.hubnexus.app`):**
Repeat the same steps and add `admin.hubnexus.app` as a second custom domain.

---

### Environment Variables (Admin)

Go to your Pages project → **Settings → Environment Variables** and add:

| Variable | Description | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJ...` |
| `VITE_API_URL` | Backend API base URL — **must include `/api`** | `https://api.hubnexus.app/api` |

> ⚠️ All Vite environment variables **must** be prefixed with `VITE_` to be exposed to the browser bundle.

Make sure your `admin/src/lib/api.js` or `axios.js` references `import.meta.env.VITE_API_BASE_URL` (not a hardcoded localhost URL).

---

### SPA Routing Fix

Because the admin dashboard uses **React Router** for client-side routing, Cloudflare Pages needs to be told to redirect all routes to `index.html`.

Create the file `admin/public/_redirects` with the following content:

```
/*    /index.html   200
```

This file gets copied into `dist/` automatically during the Vite build and is picked up by Cloudflare Pages.

---

## 2. Backend API — Railway (Recommended)

[Railway](https://railway.app) is the simplest platform for hosting a Node.js + Express + Redis stack. It supports persistent services, secret management, and a free starter plan.

### Prerequisites

- A [Railway account](https://railway.app) (sign in with GitHub)
- Your backend code accessible in the repository

---

### Environment Variables (Backend)

Before deploying, prepare the following variables. You will enter them in the Railway dashboard.

| Variable | Description |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (Railway sets this automatically, but you can override) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key *(keep this secret!)* |
| `ADMIN_EMAIL` | Email address of the admin account |
| `ALLOWED_ORIGINS` | `https://hubnexus.app,https://www.hubnexus.app` |
| `REDIS_HOST` | Railway Redis internal host (auto-filled after adding Redis plugin) |
| `REDIS_PORT` | Railway Redis port (auto-filled) |
| `REDIS_PASSWORD` | Railway Redis password (auto-filled) |
| `REDIS_TLS` | `false` (Railway internal network; set `true` if using external Redis with TLS) |
| `REDIS_DB` | `0` |
| `OPENAI_API_KEY` | Your OpenAI API key (for AI features) |

---

### Deploy to Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
2. Select your repository.
3. Railway will auto-detect Node.js.
4. In the service settings, set the **Root Directory** to `backend`.
5. Set the **Start Command** to:
   ```
   node src/server.js
   ```
   > The default `npm start` runs `nodemon`, which is fine for development but not ideal in production. Use `node src/server.js` directly, or update the `package.json` to have a separate `"start:prod"` script.
6. Go to **Variables** and add all the environment variables listed above.
7. Click **Deploy**.

Railway will assign a public URL like `https://hubnexus-backend.up.railway.app`.

---

### Redis on Railway

1. In your Railway project, click **New → Database → Add Redis**.
2. Railway automatically injects `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` into your backend service's environment.
3. Confirm the `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` variables are present in your backend service's **Variables** tab.

The backend already handles Redis connection failures gracefully (it logs a warning and continues without cache), so this is safe to test before Redis is fully configured.

---

### Custom Domain for the Backend (api.hubnexus.app)

1. In Railway, go to your backend service → **Settings → Networking → Custom Domain**.
2. Enter `api.hubnexus.app`.
3. Railway gives you a CNAME target (e.g. `backend.railway.app`).
4. In your Cloudflare DNS dashboard, add a **CNAME record**:
   - **Name:** `api`
   - **Target:** *(the CNAME Railway gave you)*
   - **Proxy status:** DNS only (grey cloud) — Railway handles its own SSL

---

## 3. Connecting Admin → Backend

Update the admin's API base URL to point at your live backend.

**In Cloudflare Pages Environment Variables:**
```
VITE_API_URL = https://api.hubnexus.app/api
```
> ⚠️ The `/api` suffix is required — all backend routes are mounted under `/api` (e.g. `/api/admin/users`).
> The variable name is `VITE_API_URL`, not `VITE_API_BASE_URL`.

**In the backend's `ALLOWED_ORIGINS` variable:**
```
ALLOWED_ORIGINS = https://hubnexus.app,https://www.hubnexus.app,https://admin.hubnexus.app
```

The CORS middleware in `server.js` already reads from `ENV.ALLOWED_ORIGINS` and splits by comma, so no code changes are needed.

---

## 4. Alternative: Backend on a VPS (Ubuntu)

If you prefer hosting the backend yourself (e.g. on DigitalOcean, Hetzner, Vultr — a $6/mo droplet is sufficient):

### 1. Server Setup

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 2. Deploy the Backend

```bash
# Clone your repository
git clone https://github.com/Ra7ush/capstone.git /home/ubuntu/hubnexus
cd /home/ubuntu/hubnexus/backend

# Install dependencies
npm install --omit=dev

# Create environment file
nano .env
```

Paste your environment variables into `.env`:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_EMAIL=admin@hubnexus.app
ALLOWED_ORIGINS=https://hubnexus.app,https://www.hubnexus.app
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0
REDIS_TLS=false
OPENAI_API_KEY=sk-...
```

### 3. Start with PM2

```bash
cd /home/ubuntu/hubnexus/backend
pm2 start src/server.js --name hubnexus-api
pm2 save
pm2 startup   # follow the printed command to enable auto-restart on reboot
```

### 4. Nginx Reverse Proxy

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/hubnexus-api
```

```nginx
server {
    listen 80;
    server_name api.hubnexus.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hubnexus-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL with Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.hubnexus.app
```

Then in Cloudflare DNS, add an **A record**:
- **Name:** `api`
- **Value:** your VPS IP address
- **Proxy:** DNS only (grey cloud) — let Certbot manage SSL

---

## 5. Post-Deployment Checklist

- [ ] Admin dashboard loads at `https://hubnexus.app`
- [ ] SPA routing works (navigate to a deep link, e.g. `/dashboard`, and it doesn't 404)
- [ ] Backend health check returns `200`: `GET https://api.hubnexus.app/api/health`
- [ ] Admin can log in (Supabase auth working)
- [ ] CORS is not blocking requests from `hubnexus.app` to `api.hubnexus.app`
- [ ] Redis is connected (check backend logs — warning appears if not connected, but server still runs)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in the backend and **never** exposed to the frontend
- [ ] `NODE_ENV=production` is set on the backend (enables stricter rate limiting)
- [ ] All Cloudflare Pages environment variables are set for both **Production** and **Preview** environments as needed

---

## Quick Reference

| Component | Platform | URL |
|---|---|---|
| Admin Dashboard | Cloudflare Pages | `https://hubnexus.app` |
| Backend API | Railway / VPS | `https://api.hubnexus.app` |
| Database | Supabase (managed) | Supabase dashboard |
| Cache | Redis (Railway plugin or self-hosted) | Internal |

