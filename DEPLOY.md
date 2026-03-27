# How to Put Masjid Connect on the Internet (and Keep It Running for 10+ Years)

This guide is written so that **anyone** can follow it — even if you've never set up a server before. Every single step is explained. No skipping. No assumed knowledge.

---

## Table of Contents

- [What You Need Before Starting](#what-you-need-before-starting)
- [Part A — Buy Your Server](#part-a--buy-your-server-15-minutes)
- [Part B — Point Your Domain](#part-b--point-your-domain-name-10-minutes)
- [Part C — Set Up Your Server](#part-c--set-up-your-server-30-minutes)
- [Part D — Deploy the App](#part-d--deploy-the-app-15-minutes)
- [Part E — Set Up HTTPS (the Lock Icon)](#part-e--set-up-https-the-lock-icon-10-minutes)
- [Part F — Automatic Backups](#part-f--automatic-backups-5-minutes)
- [Part G — Set Up GitHub Auto-Deploy](#part-g--set-up-github-auto-deploy-10-minutes)
- [Part H — Deploy App Updates](#part-h--deploy-app-updates-2-minutes-each-time)
- [Part I — Publish the Mobile App](#part-i--publish-the-mobile-app)
- [Part J — Long-Term Maintenance Schedule](#part-j--long-term-maintenance-schedule)
- [Part K — Troubleshooting (When Things Go Wrong)](#part-k--troubleshooting-when-things-go-wrong)
- [Part L — Emergency Recovery](#part-l--emergency-recovery)

---

## What You Need Before Starting

Think of this like a recipe — gather your ingredients first:

| Item | What It Is | Cost |
|------|-----------|------|
| **DigitalOcean account** | A company that rents computers on the internet | $6/month |
| **Domain name** | Your app's address (like `salafimasjid.app`) | ~$12/year |
| **GitHub account** | Where your code lives | Free |
| **Apple Developer account** | Needed to put app on iPhones | $99/year |
| **Google Play Developer account** | Needed to put app on Android phones | $25 one time |
| **A computer** | To type commands | You already have this |

**Total cost: about $10/month + $100/year for app stores.**

---

## Part A — Buy Your Server (15 minutes)

A "server" is just a computer that's always on, connected to the internet, in a big building called a data center. You're renting one.

### Step 1: Create a DigitalOcean Account

1. Open your web browser
2. Go to `digitalocean.com`
3. Click **Sign Up**
4. Enter your email and create a password
5. Add a payment method (credit card or PayPal)
6. Verify your email

### Step 2: Create an SSH Key (Your Server Password)

SSH is how you log into your server. Instead of a password, you use a special file on your computer called a "key". It's like a house key — only your computer has it.

**On Mac or Linux**, open Terminal and type:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

**On Windows**, open PowerShell and type the same thing.

When it asks:
- **Where to save**: Just press Enter (it picks a good spot)
- **Passphrase**: Type a password you'll remember, then press Enter
- **Confirm passphrase**: Type it again

Now copy your public key (the part you share with DigitalOcean):

```bash
cat ~/.ssh/id_ed25519.pub
```

This shows a long string starting with `ssh-ed25519`. **Copy the entire line.**

### Step 3: Add Your Key to DigitalOcean

1. In DigitalOcean, go to **Settings** → **Security** → **SSH Keys**
2. Click **Add SSH Key**
3. Paste the key you just copied
4. Name it something like "My Laptop"
5. Click **Add SSH Key**

### Step 4: Create a Droplet (Your Server)

A "Droplet" is DigitalOcean's name for a server.

1. Click **Create** → **Droplets**
2. Choose these settings:

| Setting | What to pick |
|---------|-------------|
| **Region** | The closest one to your users (e.g., London for UK mosques) |
| **Image** | Ubuntu 24.04 (LTS) — "LTS" means it gets security updates for 10 years |
| **Size** | Basic → Regular → **$6/month** (1 vCPU, 1 GB RAM, 25 GB disk) |
| **Authentication** | SSH Key (select the key you added) |
| **Hostname** | `masjid-connect` |

3. Click **Create Droplet**
4. Wait about 60 seconds

### Step 5: Write Down Your Server's IP Address

After the droplet is created, you'll see a number like `164.90.123.45`. This is your server's address on the internet. **Write it down!** You'll need it many times.

```
My server IP: ___.___.___.___
```

---

## Part B — Point Your Domain Name (10 minutes)

A domain name is like a nickname for your server's IP address. Instead of telling people to visit `164.90.123.45`, they visit `api.salafimasjid.app`.

### Step 1: Buy a Domain

Go to one of these websites and buy a domain:
- **Namecheap** (`namecheap.com`) — good prices, easy to use
- **Cloudflare** (`cloudflare.com/products/registrar`) — cheapest, slightly more technical

Search for and buy: `salafimasjid.app` (or whatever you want)

### Step 2: Add DNS Records

DNS is like a phone book — it tells the internet "this domain name = this server IP".

Go to your domain registrar's DNS settings and add these records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `YOUR_SERVER_IP` | 3600 |
| **A** | `api` | `YOUR_SERVER_IP` | 3600 |

Replace `YOUR_SERVER_IP` with the number from Step A5.

- The `@` record means: `salafimasjid.app` → your server
- The `api` record means: `api.salafimasjid.app` → your server

### Step 3: Wait for DNS

DNS changes can take 5 minutes to 48 hours to spread across the internet. Usually it takes about 15 minutes.

To check if it's working, open Terminal and type:

```bash
ping api.salafimasjid.app
```

If you see responses with your server's IP, it's working! Press Ctrl+C to stop.

---

## Part C — Set Up Your Server (30 minutes)

Now you'll connect to your server and install the software it needs.

### Step 1: Connect to Your Server

Open Terminal and type:

```bash
ssh root@YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with your server's IP address.

If it asks "Are you sure you want to continue connecting?", type `yes` and press Enter.

You're now **inside your server**. Every command you type runs on that remote computer.

### Step 2: Update the Server

Just like your phone needs updates, your server does too:

```bash
apt update && apt upgrade -y
```

This downloads and installs all the latest security patches. It might take a few minutes.

### Step 3: Create a Non-Root User

The `root` user has unlimited power — like an admin account. For safety, you should create a regular user:

```bash
adduser mosque
```

It will ask:
- **Password**: Type a strong password (you won't see it as you type — that's normal!)
- **Full Name**: Mosque Connect
- Everything else: Just press Enter to skip

Now give this user permission to run admin commands:

```bash
usermod -aG sudo mosque
```

Copy your SSH key to the new user so you can log in as them:

```bash
mkdir -p /home/mosque/.ssh
cp /root/.ssh/authorized_keys /home/mosque/.ssh/
chown -R mosque:mosque /home/mosque/.ssh
chmod 700 /home/mosque/.ssh
chmod 600 /home/mosque/.ssh/authorized_keys
```

### Step 4: Set Up the Firewall

A firewall blocks hackers from connecting to your server. You only want to allow:
- SSH (port 22) — so YOU can connect
- HTTP (port 80) — web traffic
- HTTPS (port 443) — secure web traffic

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

It will ask "Command may disrupt existing SSH connections. Proceed?" → Type `y`

Check it's working:

```bash
ufw status
```

You should see your three allowed ports.

### Step 5: Install Docker

Docker is like a shipping container for software. It packages your app and everything it needs so it runs the same everywhere.

```bash
# Download Docker's official install script and run it
curl -fsSL https://get.docker.com | sh

# Let the mosque user run Docker without sudo
usermod -aG docker mosque
```

Verify it's installed:

```bash
docker --version
```

You should see something like `Docker version 27.x.x`.

### Step 6: Switch to the Mosque User

From now on, we'll work as the `mosque` user:

```bash
su - mosque
```

Your prompt should change from `root@masjid-connect` to `mosque@masjid-connect`.

### Step 7: Clone the Code

```bash
git clone https://github.com/YOUR_USERNAME/Masjid-Connect.git
cd Masjid-Connect/backend
```

Replace `YOUR_USERNAME` with your GitHub username.

### Step 8: Create the Production Environment File

This file contains your app's secrets (passwords, keys). **Never share it or commit it to git.**

```bash
cp .env.prod.example .env.prod
```

Now edit it:

```bash
nano .env.prod
```

Fill in these values:

```bash
# Generate a secret key (copy the output and paste it below)
# Run this in another terminal: python3 -c "import secrets; print(secrets.token_urlsafe(50))"
SECRET_KEY=paste-your-generated-key-here

ALLOWED_HOSTS=api.salafimasjid.app
DEBUG=False

POSTGRES_DB=masjid_connect
POSTGRES_USER=mosque
POSTGRES_PASSWORD=pick-a-very-strong-password-here

CORS_ALLOWED_ORIGINS=https://salafimasjid.app
```

To save in nano: Press **Ctrl+O**, then **Enter**, then **Ctrl+X**.

---

## Part D — Deploy the App (15 minutes)

### Step 1: Build and Start Everything

```bash
cd /home/mosque/Masjid-Connect/backend
docker compose -f docker-compose.prod.yml up -d --build
```

What this does:
- `-f docker-compose.prod.yml` — use the production settings
- `up` — start the services
- `-d` — run in the background (so you can close the terminal)
- `--build` — build the Docker image first

This will take 3–5 minutes the first time as it downloads and builds everything.

### Step 2: Run Database Setup

```bash
# Create the database tables
docker compose -f docker-compose.prod.yml exec web python manage.py migrate

# Create your admin account
docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

It will ask for:
- **Username**: Pick one (e.g., `admin`)
- **Email**: Your email
- **Password**: A strong password

### Step 3: Load Sample Data (Optional)

```bash
docker compose -f docker-compose.prod.yml exec web python manage.py seed_data
```

This adds 5 example mosques and some announcements so you can see how things look.

### Step 4: Test It Works

```bash
curl http://localhost:8000/health/
```

You should see: `{"status": "ok"}`

If you see that, your Django app is running!

---

## Part E — Set Up HTTPS (the Lock Icon) (10 minutes)

### Step 1: Configure Nginx

Switch back to root (you need admin powers for this):

```bash
sudo cp /home/mosque/Masjid-Connect/backend/nginx.conf /etc/nginx/sites-available/salafimasjid
sudo ln -sf /etc/nginx/sites-available/salafimasjid /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### Step 2: Get Your SSL Certificate

```bash
sudo certbot --nginx -d api.salafimasjid.app
```

It will ask:
- **Email**: Your email (for renewal reminders)
- **Terms of Service**: Type `Y` to agree
- **Share email with EFF**: Your choice (`Y` or `N`)

Certbot will automatically:
1. Verify you own the domain
2. Get a free certificate
3. Configure Nginx to use it
4. Set up auto-renewal

### Step 3: Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

If you see "Congratulations", auto-renewal is working. Your certificate will renew itself every 90 days, automatically, forever.

### Step 4: Restart Nginx

```bash
sudo nginx -t          # Check config is valid
sudo systemctl reload nginx
```

### Step 5: Test from the Internet

Open your web browser and go to:

```
https://api.salafimasjid.app/health/
```

You should see `{"status": "ok"}` and a lock icon in the address bar.

Try the admin panel:

```
https://api.salafimasjid.app/admin/
```

You should see a beautiful Sacred Blue login page.

---

## Part F — Automatic Backups (5 minutes)

### Step 1: Create the Backup Directory

```bash
sudo mkdir -p /home/mosque/backups/{daily,weekly,monthly}
sudo chown -R mosque:mosque /home/mosque/backups
```

### Step 2: Test the Backup Script

```bash
cd /home/mosque/Masjid-Connect/backend
./scripts/backup.sh
```

You should see "Backup created successfully!" and a file size.

### Step 3: Set Up Automatic Daily Backups

```bash
crontab -e
```

If it asks which editor, choose `nano` (it's the easiest).

Add this line at the bottom:

```
0 3 * * * /home/mosque/Masjid-Connect/backend/scripts/backup.sh >> /home/mosque/backups/backup.log 2>&1
```

This means: "Every day at 3:00 AM, run the backup script and save the log."

Save and close (`Ctrl+O`, `Enter`, `Ctrl+X`).

### Step 4: Verify Cron Is Set

```bash
crontab -l
```

You should see the line you just added.

---

## Part G — Set Up GitHub Auto-Deploy (10 minutes)

This makes it so that every time you push code to GitHub and tests pass, it automatically deploys to your server.

### Step 1: Create a Deploy SSH Key

On your **local computer** (not the server):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/masjid_deploy -C "github-deploy"
```

Press Enter for no passphrase (GitHub Actions needs to use it without typing a password).

### Step 2: Add the Public Key to Your Server

Copy the public key:

```bash
cat ~/.ssh/masjid_deploy.pub
```

SSH into your server and add it:

```bash
ssh mosque@YOUR_SERVER_IP
echo "PASTE_THE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
exit
```

### Step 3: Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets (click **New repository secret** for each):

| Secret Name | Value |
|-------------|-------|
| `SERVER_HOST` | Your server IP address (e.g., `164.90.123.45`) |
| `SERVER_USER` | `mosque` |
| `SERVER_SSH_KEY` | The **private** key — run `cat ~/.ssh/masjid_deploy` and paste the entire output |

### Step 4: Test It

Push any change to the `main` branch. Go to your repository's **Actions** tab. You should see:

1. Frontend tests running
2. Backend tests running
3. After both pass: Deploy to Production running

---

## Part H — Deploy App Updates (2 minutes each time)

### Option 1: Automatic (Recommended)

Just push to `main` on GitHub. The CI/CD pipeline handles everything:
1. Runs all tests
2. If tests pass, SSHs into your server
3. Pulls latest code
4. Rebuilds Docker image
5. Runs migrations
6. Restarts the app

### Option 2: Manual

If you need to deploy right now without waiting for CI:

```bash
ssh mosque@YOUR_SERVER_IP
cd /home/mosque/Masjid-Connect/backend
./scripts/deploy.sh
```

---

## Part I — Publish the Mobile App

### iOS (App Store)

1. Install EAS CLI on your local computer:

```bash
npm install -g eas-cli
eas login
```

2. Update `eas.json` with your Apple credentials (Apple ID, Team ID, App Store Connect App ID)

3. Build:

```bash
eas build --platform ios --profile production
```

4. Submit to App Store:

```bash
eas submit --platform ios --profile production
```

5. Go to App Store Connect (`appstoreconnect.apple.com`) to complete the listing (screenshots, description, etc.)

### Android (Google Play)

1. Create a Google Play service account and download the JSON key

2. Build:

```bash
eas build --platform android --profile production
```

3. Submit to Google Play:

```bash
eas submit --platform android --profile production
```

4. Go to Google Play Console to complete the listing

### Testing Before Going Public

Before releasing to the public, you should test your app with real people using **Google Play Internal Testing** (Android) and **TestFlight** (iOS). This lets a small group install the app from the real store without it being visible to the public.

#### Android — Internal Testing (recommended first step)

Google Play has 4 tracks. Start with Internal, then promote up:

| Track | Who can see it | Google review? | Max testers |
|-------|---------------|----------------|-------------|
| **Internal testing** | Only people you invite by email | No — instant | 100 |
| **Closed testing** | Only people you invite | Brief review | Unlimited |
| **Open testing** | Anyone with the link | Full review | Unlimited |
| **Production** | Everyone on Play Store | Full review | Everyone |

**Step-by-step for Internal Testing:**

1. **Build the app bundle:**

```bash
eas build --platform android --profile production
```

This takes 5–15 minutes. EAS builds a `.aab` file (Android App Bundle) in the cloud.

2. **Submit to the internal testing track:**

```bash
eas submit --platform android --profile internal
```

This uses the `internal` profile in `eas.json`, which targets the internal testing track.

> **If automated submit fails** (common on the very first upload — Google requires the first one to be manual):
> 1. EAS prints a download link when the build finishes — download the `.aab` file
> 2. In Google Play Console, go to **Testing > Internal testing**
> 3. Click **Create new release**
> 4. Drag the `.aab` file into the upload area
> 5. Add release notes (e.g., "First internal test build")
> 6. Click **Next** → **Start rollout to Internal testing**

3. **Add testers:**

   - In Play Console, go to **Testing > Internal testing > Testers**
   - Create a new email list (e.g., "Core Team")
   - Add email addresses of people who should test (must be Gmail or Google Workspace accounts)
   - Click **Save changes**

4. **Share the install link:**

   - On the same Testers page, copy the **opt-in link**
   - Send it to your testers
   - They click the link → accept the invite → install from Play Store
   - The app appears as a normal Play Store listing, but only for them

5. **Testers provide feedback:**

   - Testers can leave feedback directly in the Play Store internal test
   - Or you can set up your own feedback channel (WhatsApp group, email, etc.)

6. **When ready, promote to production:**

   - Go to **Testing > Internal testing > Releases**
   - Click **Promote release** → **Production**
   - Add public release notes
   - Submit for Google review (1–3 days for first review)

#### iOS — TestFlight

1. **Build:**

```bash
eas build --platform ios --profile production
```

2. **Submit to TestFlight:**

```bash
eas submit --platform ios --profile production
```

3. Go to **App Store Connect** (`appstoreconnect.apple.com`)
4. The build appears under **TestFlight** tab after Apple processes it (5–30 minutes)
5. Add **internal testers** (up to 100 — Apple Developer account members) or **external testers** (up to 10,000 — needs brief Apple review)
6. Testers install via the TestFlight app on their iPhone

#### Updating a Test Build

Each time you want testers to try a new version:

```bash
# 1. Bump version (if needed — not required for every test build)
./scripts/bump-version.sh patch

# 2. Commit
git add package.json app.json
git commit -m "chore: bump version to X.Y.Z"

# 3. Build + submit
eas build --platform android --profile production
eas submit --platform android --profile internal
```

The build number auto-increments (`eas.json` → `autoIncrement: true`), so you can submit multiple test builds without manually changing anything. Only bump the semver when you want a meaningful version change.

### Updating the App

When you want to release a new version:

1. Bump the version (this updates both `package.json` and `app.json` together):
   ```bash
   ./scripts/bump-version.sh patch    # for bug fixes (1.0.0 → 1.0.1)
   ./scripts/bump-version.sh minor    # for new features (1.0.0 → 1.1.0)
   ./scripts/bump-version.sh major    # for breaking changes (1.0.0 → 2.0.0)
   ```
2. Commit: `git add package.json app.json && git commit -m "chore: bump version to X.Y.Z"`
3. Build: `eas build --platform all --profile production`
4. Submit: `eas submit --platform all --profile production`

For small JavaScript-only updates (no native code changes):

```bash
eas update --branch production --message "Description of what changed"
```

This sends updates directly to users' phones without going through the app stores!

---

## Part J — Long-Term Maintenance Schedule

Print this out and put it on your wall. This is how you keep the app alive for 10+ years.

### Every Week (takes 1 minute)

Open your browser and visit:

```
https://api.salafimasjid.app/health/
```

If you see `{"status": "ok"}`, everything is fine. Move on with your life.

### Every Month (takes 10 minutes)

```bash
# 1. Connect to your server
ssh mosque@YOUR_SERVER_IP

# 2. Update the server's operating system
sudo apt update && sudo apt upgrade -y

# 3. Check how much disk space you have
df -h

# 4. Check backup files exist
ls -la /home/mosque/backups/daily/ | tail -5

# 5. Check Docker is healthy
docker compose -f /home/mosque/Masjid-Connect/backend/docker-compose.prod.yml ps
```

**What to look for:**
- Disk usage should be under 80%. If it's higher, clean old backups or upgrade the droplet.
- You should see recent backup files (from the last few days)
- Docker services should show "Up" and "healthy"

### Every 3 Months (takes 30 minutes)

Everything from monthly, PLUS:

```bash
# 1. Update Python packages
cd /home/mosque/Masjid-Connect/backend
./scripts/update-deps.sh

# 2. If tests pass, commit and deploy
git add requirements.txt
git commit -m "Update Python dependencies (quarterly maintenance)"
git push
```

Also:
- Check your **DigitalOcean billing** — make sure there are no surprises
- Check your **domain registration** — make sure it won't expire soon
- Run `docker system prune -f` to clean up old Docker images

### Every 6 Months (takes 1 hour)

Everything from quarterly, PLUS:

- Check for **Django security releases**: Go to `djangoproject.com/weblog/` and look for security announcements. If there's a patch for your version, update `requirements.txt` and deploy.
- Check your **SSL certificate**: Run `sudo certbot certificates` — it should show a future expiry date.
- Review **server logs** for anything unusual:

```bash
docker compose -f /home/mosque/Masjid-Connect/backend/docker-compose.prod.yml logs web --since 168h | grep ERROR
```

### Every Year (takes 2 hours)

Everything from semi-annual, PLUS:

- **Review your droplet size**: If the app is growing (more users, more mosques), you might need a bigger server. Go to DigitalOcean → Droplet → Resize.
- **Renew Apple Developer account** ($99/year) — your app disappears from the App Store if you don't!
- **Update Node.js version** in `.github/workflows/ci.yml` if a new LTS is out
- **Test your backup restore**: Actually run `restore.sh` on a test server to make sure your backups work. Don't just trust they're fine — prove it.

### Every 2 Years (takes 1 day)

This is the big one — **major version upgrades**:

- **Django major version**: Django releases a new major version every ~2 years (5.0 → 6.0 → 7.0). Read the release notes, update `requirements.txt`, run tests, fix any broken things.
- **Python version**: Python releases a new version yearly. Update the `Dockerfile` base image and CI workflow.
- **Ubuntu LTS**: New LTS every 2 years. Consider creating a new droplet with the latest Ubuntu and migrating.
- **Expo SDK**: Expo releases a new SDK 2-3 times a year. Update when convenient.

**How to do a Django upgrade:**

```bash
# 1. Read the release notes
#    Go to: docs.djangoproject.com/en/X.Y/releases/

# 2. Update requirements.txt (e.g., Django>=6.0,<6.1)

# 3. Run tests locally
pip install -r requirements.txt
python manage.py test

# 4. Fix any deprecation warnings or errors

# 5. Deploy
git add requirements.txt
git commit -m "Upgrade Django to 6.0"
git push
```

---

## Part K — Troubleshooting (When Things Go Wrong)

### "I can't reach the website"

Check these things in order:

```bash
# 1. Is the droplet running?
# Go to DigitalOcean dashboard — is the droplet showing "Active"?

# 2. Is Docker running?
ssh mosque@YOUR_SERVER_IP
sudo systemctl status docker

# 3. Are the containers running?
docker compose -f /home/mosque/Masjid-Connect/backend/docker-compose.prod.yml ps

# 4. Is Nginx running?
sudo systemctl status nginx

# 5. Check the app logs
docker compose -f /home/mosque/Masjid-Connect/backend/docker-compose.prod.yml logs web --tail 100
```

### "The app shows an error"

```bash
# See the last 100 lines of Django logs
docker compose -f /home/mosque/Masjid-Connect/backend/docker-compose.prod.yml logs web --tail 100

# If you see "OperationalError" = database problem
# If you see "ImportError" = code/package problem
# If you see "PermissionError" = file permissions problem
```

### "Database is full"

```bash
# Check disk space
df -h

# Clean old Docker images (can free up GBs)
docker system prune -f

# Clean old backups (keep the recent ones!)
ls -la /home/mosque/backups/daily/ | head -20
# Delete the oldest ones if needed
```

### "I forgot the admin password"

```bash
docker compose -f /home/mosque/Masjid-Connect/backend/docker-compose.prod.yml \
  exec web python manage.py changepassword admin
```

Replace `admin` with whatever username you chose.

### "SSL certificate expired"

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### "I need to restart everything"

```bash
cd /home/mosque/Masjid-Connect/backend
docker compose -f docker-compose.prod.yml restart
```

### "I need to see what's happening in real time"

```bash
# Watch logs as they happen (press Ctrl+C to stop)
docker compose -f /home/mosque/Masjid-Connect/backend/docker-compose.prod.yml logs -f web
```

### "I messed up the database"

Don't panic! You have backups.

```bash
# See available backups
ls -la /home/mosque/backups/daily/

# Restore from the most recent one
./scripts/restore.sh /home/mosque/backups/daily/THE_FILE_NAME.sql.gz
```

---

## Part L — Emergency Recovery

If your server is completely destroyed (fire, hack, billing issue), here's how to get everything back from scratch:

### Step 1: Create a New Droplet

Follow Part A again. Takes 15 minutes.

### Step 2: Set Up the Server

Follow Part C again. Takes 30 minutes.

### Step 3: Deploy the App

Follow Part D again. Takes 15 minutes.

### Step 4: Restore the Database

If you have backup files (stored off-server or in DigitalOcean Spaces):

```bash
./scripts/restore.sh /path/to/your/backup.sql.gz
```

### Total Recovery Time: About 1–2 hours

This is why backups are so important. The code is safe on GitHub. The only thing you can lose is the database — and backups protect that.

---

## Quick Reference Card

Tape this to your monitor:

```
SERVER: ssh mosque@YOUR_SERVER_IP
PROJECT: /home/mosque/Masjid-Connect/backend

DEPLOY:    ./scripts/deploy.sh
BACKUP:    ./scripts/backup.sh
RESTORE:   ./scripts/restore.sh FILENAME
UPDATE:    ./scripts/update-deps.sh

LOGS:      docker compose -f docker-compose.prod.yml logs web --tail 100
RESTART:   docker compose -f docker-compose.prod.yml restart
STATUS:    docker compose -f docker-compose.prod.yml ps
HEALTH:    curl http://localhost:8000/health/

ADMIN:     https://api.salafimasjid.app/admin/
API DOCS:  https://api.salafimasjid.app/api/docs/
HEALTH:    https://api.salafimasjid.app/health/
```

---

## Congratulations!

If you followed every step, you now have:

- A Django REST API running on a secure server
- Automatic daily database backups
- Free, auto-renewing HTTPS certificates
- Automatic deployments when you push code
- A clear maintenance schedule for the next decade
- Emergency recovery procedures

The app will run reliably for as long as you:
1. Pay the DigitalOcean bill ($6/month)
2. Pay the domain registration (~$12/year)
3. Follow the maintenance schedule above
4. Renew your Apple Developer account yearly

That's it. May Allah bless your masjid community.
