# 🚀 Capstone — Ubuntu Hosting Guide

## Stack Overview

| Layer | Technology | Notes |
|---|---|---|
| Backend | Node.js / Express | Port `3000`, also serves admin dashboard |
| Admin Dashboard | React + Vite | Built to `admin/dist/`, served by Express in production |
| Database | Supabase (cloud) | No self-hosting needed |
| Cache | Redis | Self-hosted on the same VM |
| Process manager | PM2 | Keeps backend alive, auto-restarts on crash |
| Web server | Nginx | Reverse proxy + SSL termination |
| CI/CD | GitHub Actions | Auto-deploys on every push to `main` |

---

## 1. Provision an Ubuntu Server

Minimum recommended specs for a capstone demo:

| Resource | Minimum |
|---|---|
| OS | Ubuntu 22.04 LTS |
| vCPU | 1 |
| RAM | 1 GB |
| Disk | 20 GB SSD |

**Recommended providers:** DigitalOcean ($6/mo droplet), Hetzner CX11 (~€4/mo), AWS t3.micro (free tier), Oracle Cloud (always-free tier).

> **Tip:** During server creation, upload your local SSH public key (`~/.ssh/id_rsa.pub`) so you can log in without a password.

---

## 2. Initial Server Setup

### Connect to your server

```bash
ssh root@YOUR_SERVER_IP
```

### Create a deploy user

```bash
adduser deploy
usermod -aG sudo deploy

# Copy your SSH key to the new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Switch to the deploy user for all remaining steps:

```bash
su - deploy
```

### Update the system & install essentials

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw
```

### Configure the firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 3. Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # should print v20.x.x
npm -v
```

---

## 4. Install Redis

```bash
sudo apt install -y redis-server

# Lock Redis to localhost only (security best practice)
sudo sed -i 's/^# bind 127.0.0.1/bind 127.0.0.1/' /etc/redis/redis.conf
sudo sed -i 's/^bind 127.0.0.1 -::1/bind 127.0.0.1/' /etc/redis/redis.conf

sudo systemctl enable redis-server
sudo systemctl restart redis-server

# Verify
redis-cli ping   # should return: PONG
```

---

## 5. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Hook PM2 into systemd so it starts on reboot
pm2 startup systemd
# ⚠️  Copy and run the command that pm2 prints above, for example:
#   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
```

---

## 6. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 7. Clone the Repository

```bash
sudo mkdir -p /var/www/capstone
sudo chown deploy:deploy /var/www/capstone

git clone https://github.com/Ra7ush/capstone.git /var/www/capstone
```

---

## 8. Configure Environment Variables

> **.env files are gitignored — you must create them manually on the server.**

### Backend — `/var/www/capstone/backend/.env`

```bash
nano /var/www/capstone/backend/.env
```

```env
NODE_ENV=production
PORT=3000

SUPABASE_URL=https://qzwnfcbgedtqadbixxhj.supabase.co
SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>

ADMIN_EMAIL=meerrahimblue@gmail.com

# Replace with your actual domain(s)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0
REDIS_TLS=false

OPENAI_API_KEY=<your_openai_key>
```

> **Important:** `NODE_ENV=production` is required. It enables Express to serve the built admin dashboard from `admin/dist/` and activates strict rate limiting.

### Admin — `/var/www/capstone/admin/.env`

```bash
nano /var/www/capstone/admin/.env
```

```env
VITE_API_URL=https://yourdomain.com/api
VITE_SUPABASE_URL=https://qzwnfcbgedtqadbixxhj.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_ADMIN_EMAIL=meerrahimblue@gmail.com
```

> **Warning:** Vite bakes these values into the static bundle at **build time**. You must re-run `npm run build` any time you change this file.

---

## 9. Install Dependencies & Build

```bash
# Backend
cd /var/www/capstone/backend
npm ci --omit=dev

# Admin dashboard (build static files)
cd /var/www/capstone/admin
npm ci
npm run build
```

After the build, `admin/dist/` is created. Express automatically serves it for all non-API routes when `NODE_ENV=production`.

---

## 10. Start the Backend with PM2

```bash
cd /var/www/capstone/backend

pm2 start npm \
  --name "capstone-backend" \
  -- run start:prod

# Persist the process list across reboots
pm2 save

# Check status
pm2 status

# View live logs
pm2 logs capstone-backend
```

Smoke test:

```bash
curl http://localhost:3000/api/health
# Expected: {"success":true,"message":"Server is running",...}
```

---

## 11. Configure Nginx as a Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/capstone
```

Paste the following — replace `yourdomain.com` with your actual domain:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/capstone /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # remove the default placeholder
sudo nginx -t                                  # test the config
sudo systemctl reload nginx
```

Your app is now reachable at `http://yourdomain.com`.

---

## 12. Enable HTTPS with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot automatically edits your Nginx config to handle HTTPS and redirect HTTP → HTTPS.

Test that auto-renewal works:

```bash
sudo certbot renew --dry-run
```

---

## 13. CI/CD — Auto-Deploy on Git Push

The file `.github/workflows/deploy.yml` is already in the repository. Every push to `main` triggers:

1. GitHub runner SSH-es into your server
2. `git pull origin main`
3. `npm ci` (backend)
4. `npm run build` (admin)
5. `pm2 reload capstone-backend --update-env` (zero-downtime reload)
6. `sudo systemctl reload nginx`

### Step 1 — Generate a dedicated deploy SSH key

Run this on your **local machine**:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/capstone_deploy -N ""
```

This creates two files:
- `~/.ssh/capstone_deploy` — **private key** (goes into GitHub)
- `~/.ssh/capstone_deploy.pub` — **public key** (goes onto the server)

### Step 2 — Authorize the public key on the server

```bash
# On the server, as the deploy user
echo "PASTE_YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 3 — Add GitHub repository secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name | Value |
|---|---|
| `SERVER_HOST` | Your server's public IP or domain |
| `SERVER_USER` | `deploy` |
| `SERVER_SSH_KEY` | Full contents of `~/.ssh/capstone_deploy` (private key) |
| `SERVER_PORT` | `22` |

### Step 4 — Allow passwordless Nginx reload

The deploy script runs `sudo systemctl reload nginx`. Grant permission without a password prompt:

```bash
sudo visudo
```

Add this line at the **very end**:

```
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
```

### Step 5 — Test the pipeline

```bash
git add .
git commit -m "chore: trigger first deploy"
git push origin main
```

Go to **GitHub → Actions tab** and watch the workflow run live. ✅

---

## 14. DNS Configuration

In your domain registrar's DNS settings, add:

| Type | Name | Value | TTL |
|---|---|---|---|
| `A` | `@` | `YOUR_SERVER_IP` | Auto |
| `A` | `www` | `YOUR_SERVER_IP` | Auto |

DNS propagation typically takes 1–30 minutes.

---

## 15. Quick Reference Commands

```bash
# Check all PM2 processes
pm2 status

# Live backend logs
pm2 logs capstone-backend --lines 50

# Restart backend manually
pm2 restart capstone-backend

# Check Nginx config and reload
sudo nginx -t && sudo systemctl reload nginx

# Check Redis
redis-cli ping

# Test the API health endpoint
curl https://yourdomain.com/api/health

# Manual deploy (without GitHub Actions)
cd /var/www/capstone
git pull origin main
cd backend && npm ci --omit=dev
cd ../admin && npm ci && npm run build
cd ..
pm2 reload capstone-backend --update-env
```

---

## Architecture Overview

```
Internet
    │
    ▼
Nginx :443 (HTTPS / Let's Encrypt)
    │ proxy_pass
    ▼
Express / Node.js :3000 (PM2)
    ├── GET /api/*           →  REST API routes
    ├── GET /*               →  admin/dist/index.html (React SPA)
    ├── Supabase SDK         →  cloud.supabase.co (DB + Auth)
    └── Redis :6379          →  127.0.0.1 (local cache)
```

```
Developer pushes to main
          │
          ▼
  GitHub Actions Runner
          │  SSH (appleboy/ssh-action)
          ▼
  Ubuntu Server (deploy user)
    git pull
    npm ci            (backend)
    npm run build     (admin)
    pm2 reload        (zero downtime)
    nginx reload
```
