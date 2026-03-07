# Masjid Connect — Beginner Setup Guide

Hey! This guide will walk you through setting up the app on your computer step by step. No experience needed — just follow along.

---

## What You Need First

Before you start, make sure you have these installed on your computer:

| Tool | What it does | How to get it |
|------|-------------|---------------|
| **Node.js** (v18+) | Runs JavaScript code | [nodejs.org](https://nodejs.org) — download the **LTS** version |
| **Python** (3.10+) | Runs the backend server | [python.org](https://www.python.org/downloads/) |
| **Git** | Tracks code changes | [git-scm.com](https://git-scm.com/downloads) |
| **A code editor** | Where you write code | [VS Code](https://code.visualstudio.com/) is free and great |
| **Expo Go app** | Shows the app on your phone | Download from App Store or Google Play Store |

To check if you already have them, open your terminal (or Command Prompt on Windows) and type:

```bash
node --version
python3 --version
git --version
```

If each one shows a version number, you're good!

---

## Step 1: Get the Code

Open your terminal and go to a folder where you want the project. Then run:

```bash
git clone <the-repo-url>
cd Masjid-Connect
```

(Replace `<the-repo-url>` with the actual GitHub link your team gave you.)

---

## Step 2: Set Up the Phone App (Frontend)

This is the part that shows up on your phone.

**2a.** Install all the packages the app needs:

```bash
npm install
```

This might take a minute — it's downloading a bunch of code libraries. Wait until it finishes.

**2b.** Start the app:

```bash
npx expo start
```

**2c.** You'll see a QR code in your terminal. Open the **Expo Go** app on your phone and scan it. The app should load on your phone!

> **Tip:** Your phone and computer need to be on the **same WiFi network** for this to work.

> **Trouble?** If it's acting weird, try clearing the cache:
> ```bash
> npx expo start --clear
> ```

---

## Step 3: Set Up the Backend Server

The backend is the "brain" that stores mosque data, announcements, events, etc. The phone app talks to it.

**3a.** Open a **new terminal window** (keep the first one running the app). Go into the backend folder:

```bash
cd backend
```

**3b.** Create a virtual environment. This keeps the backend's packages separate from everything else on your computer:

```bash
# On Mac/Linux:
python3 -m venv venv
source venv/bin/activate

# On Windows:
python -m venv venv
venv\Scripts\activate
```

You should see `(venv)` at the start of your terminal line. That means it worked!

**3c.** Install the backend packages:

```bash
pip install -r requirements.txt
```

**3d.** Create your settings file. Copy the example one:

```bash
# On Mac/Linux:
cp .env.example .env

# On Windows:
copy .env.example .env
```

That's it — the defaults work fine for development. You don't need to change anything in the `.env` file right now.

**3e.** Set up the database (this creates the tables where data is stored):

```bash
python manage.py migrate
```

**3f.** Load some sample data so the app isn't empty:

```bash
python manage.py seed_data
```

**3g.** (Optional) Create an admin account so you can manage things in the browser:

```bash
python manage.py createsuperuser
```

It will ask you for a username, email, and password. Pick whatever you want — this is just for your local computer.

**3h.** Start the backend server:

```bash
python manage.py runserver
```

You should see something like `Starting development server at http://127.0.0.1:8000/`

> **Check it's working:** Open your browser and go to [http://localhost:8000/health/](http://localhost:8000/health/). You should see a simple response. If you created a superuser, try [http://localhost:8000/admin/](http://localhost:8000/admin/) to see the admin panel.

---

## Quick Summary — What to Run Every Time

Once everything is set up, here's what you do each time you want to work on the project:

**Terminal 1 — Phone App:**
```bash
cd Masjid-Connect
npx expo start
```

**Terminal 2 — Backend Server:**
```bash
cd Masjid-Connect/backend
source venv/bin/activate    # (Mac/Linux) or: venv\Scripts\activate (Windows)
python manage.py runserver
```

Then scan the QR code with Expo Go on your phone. Done!

---

## Common Problems & Fixes

| Problem | Fix |
|---------|-----|
| `command not found: node` | You need to install Node.js (see "What You Need First" above) |
| `command not found: python3` | Install Python, or try `python` instead of `python3` |
| QR code doesn't work on phone | Make sure phone and computer are on the same WiFi |
| `npm install` gives errors | Try deleting `node_modules` folder and running `npm install` again |
| `pip install` gives errors | Make sure your virtual environment is active (you see `(venv)`) |
| Backend says "port already in use" | Something else is using port 8000. Try `python manage.py runserver 8001` |
| App shows blank/white screen | The backend server might not be running — check Terminal 2 |

---

## What's What — Project Folders Explained

```
Masjid-Connect/
├── app/            # The screens you see in the app (prayer times, events, etc.)
├── components/     # Reusable pieces of the app (buttons, cards, etc.)
├── lib/            # Helper code (talking to the server, prayer time math)
├── hooks/          # Custom React shortcuts
├── constants/      # Fixed values (colors, sizes)
├── assets/         # Fonts, images, sounds
├── backend/        # The server (Python/Django) — stores all the data
│   ├── core/       # Database models (what data looks like)
│   ├── api/        # The endpoints the app talks to
│   └── config/     # Server settings
└── package.json    # Lists all the packages the app needs
```

---

## Need Help?

- **Expo docs:** [docs.expo.dev](https://docs.expo.dev)
- **Django docs:** [docs.djangoproject.com](https://docs.djangoproject.com)
- **React Native docs:** [reactnative.dev](https://reactnative.dev)

You got this!
