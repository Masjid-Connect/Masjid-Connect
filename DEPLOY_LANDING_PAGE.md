# Cloudflare Pages Deployment Plan — salafimasjid.app

## Overview
Host the `/web` landing page on Cloudflare Pages with `salafimasjid.app` as the custom domain. Separate from the Django backend on Digital Ocean.

---

## Step 1: Cloudflare Account Setup
1. Create a Cloudflare account at dash.cloudflare.com (if you don't have one)
2. Free plan is sufficient — Pages has no paid tier needed

## Step 2: Transfer DNS to Cloudflare
1. In Cloudflare dashboard → **Add a Site** → enter `salafimasjid.app`
2. Select **Free plan**
3. Cloudflare scans existing DNS records — verify they're correct
4. Go to your domain registrar (wherever you bought `salafimasjid.app`)
5. Change nameservers to the two Cloudflare nameservers provided (e.g. `alice.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
6. Wait for propagation (usually 5 min – 24 hours)
7. Cloudflare will email you when the site is active

**Why DNS first:** Cloudflare Pages custom domains only work when Cloudflare manages your DNS. This also gives you free DDoS protection for your Digital Ocean backend.

## Step 3: Point Django Backend Subdomain
1. In Cloudflare DNS, add an `A` record:
   - `api.salafimasjid.app` → your Digital Ocean droplet IP
   - Proxy: **ON** (orange cloud) — gives DDoS protection + HTTPS
2. Your Django backend is now at `api.salafimasjid.app` instead of a raw IP
3. Update your mobile app's API base URL to `https://api.salafimasjid.app/api/v1/`

## Step 4: Create Cloudflare Pages Project
1. Cloudflare dashboard → **Workers & Pages** → **Create**
2. Select **Pages** → **Connect to Git**
3. Authorize Cloudflare to access your GitHub repo (`Masjid-Connect/Masjid-Connect`)
4. Configure build settings:
   - **Project name:** `salafimasjid`
   - **Production branch:** `main`
   - **Build command:** *(leave empty — no build step needed, it's static HTML)*
   - **Build output directory:** `web`
   - **Root directory:** `/` (repo root)
5. Click **Save and Deploy**
6. First deploy runs — your site is live at `salafimasjid.pages.dev`

## Step 5: Connect Custom Domain
1. In your Pages project → **Custom domains** → **Set up a custom domain**
2. Enter `salafimasjid.app`
3. Cloudflare auto-creates the DNS record (since it manages your DNS)
4. HTTPS certificate is auto-provisioned (takes ~2 minutes)
5. Also add `www.salafimasjid.app` → Cloudflare auto-redirects to apex
6. Your landing page is now live at `https://salafimasjid.app`

## Step 6: Verify Everything Works
- `https://salafimasjid.app` → landing page (Cloudflare Pages)
- `https://api.salafimasjid.app` → Django backend (Digital Ocean via Cloudflare proxy)
- HTTPS on both — auto-managed by Cloudflare
- Every push to `main` auto-deploys the landing page

---

## Architecture After Deployment

```
                    Cloudflare (DNS + CDN)
                   ┌──────────────────────┐
                   │                      │
    salafimasjid.app                api.salafimasjid.app
          │                               │
          ▼                               ▼
   Cloudflare Pages              Cloudflare Proxy (DDoS shield)
   (Global CDN Edge)                      │
          │                               ▼
     /web folder                  Digital Ocean Droplet
     (static HTML/CSS/JS)         (Django + Gunicorn + Nginx)
```

---

## What Auto-Deploys Look Like (After Setup)

1. You push code to `main` on GitHub
2. Cloudflare detects the push (webhook)
3. Copies the `/web` folder to their edge network
4. Live worldwide in ~30 seconds
5. No SSH, no server, no commands — fully automatic

---

## DNS Records Summary (What Your Cloudflare DNS Will Look Like)

| Type  | Name              | Content                     | Proxy |
|-------|-------------------|-----------------------------|-------|
| CNAME | `salafimasjid.app`| `salafimasjid.pages.dev`    | ON    |
| CNAME | `www`             | `salafimasjid.pages.dev`    | ON    |
| A     | `api`             | `<your-droplet-IP>`         | ON    |

---

## Total Cost: Free
- Cloudflare Pages: Free (unlimited bandwidth, unlimited requests)
- Cloudflare DNS: Free
- Cloudflare DDoS protection: Free
- HTTPS certificates: Free (auto-managed)
- Only cost: your existing Digital Ocean droplet + domain registration
