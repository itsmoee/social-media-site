# Wasla — Social Media Site

A simple social media frontend with a Node/Express backend providing session-based authentication (register, login, logout, and session check) backed by MongoDB.

## Setup

### 1. Prerequisites
- Node.js installed
- MongoDB Atlas account with a cluster created
- Connection string from MongoDB Atlas

### 2. Environment Variables

Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Edit `.env` and add your credentials:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=YourApp
SESSION_SECRET=your-strong-secret-here
```

### 3. Install and Run

```powershell
cd C:\Users\moe\Desktop\social-media-site
npm install
npm run start
```

Open http://localhost:3000

- Sign up via the Sign up modal.
- Messages/Profile/Settings require login.
- Sessions are stored in MongoDB; users in the database.

For development with auto-restart:
```powershell
npm run dev
```

## Tech Stack
- Express.js, express-session
- Mongoose (MongoDB ODM)
- connect-mongo (session store)
- bcryptjs (password hashing)
- SQLite removed → MongoDB Atlas for storage

## Push to GitHub (new repo)

If the GitHub repository does not exist yet, you have two options:

### Option A: GitHub CLI (recommended)

Install GitHub CLI: https://cli.github.com/

```powershell
cd C:\Users\moe\Desktop\social-media-site
gh auth login
gh repo create <YOUR_REPO_NAME> --source . --public --push
```

### Option B: Manual via Git

1) Create an empty repo on GitHub, copy its HTTPS URL.

2) Run:

```powershell
cd C:\Users\moe\Desktop\social-media-site
git branch -M main
git add .
git commit -m "Migrate to MongoDB with Mongoose"
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

## Notes
- `.env` is git-ignored; never commit secrets.
- `.env.example` shows the required env vars.
- To change MongoDB database name, modify the connection string or Mongoose config.

If the GitHub repository does not exist yet, you have two options:

### Option A: GitHub CLI (recommended)

Install GitHub CLI: https://cli.github.com/

```powershell
cd C:\Users\moe\Desktop\social-media-site
# Authenticate (one-time)
gh auth login

# Create repo in your account, push current folder
gh repo create <YOUR_REPO_NAME> --source . --public --push
# or use --private to create a private repo
```

### Option B: Manual via Git

1) Create an empty repo on GitHub in the browser (no README), copy its HTTPS URL.

2) Run:

```powershell
cd C:\Users\moe\Desktop\social-media-site
# Ensure main branch
git branch -M main

# First commit (if needed)
git add .
git commit -m "Initial commit: backend auth + UI"

# Add remote and push
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

If you accidentally added generated files (like node_modules or *.sqlite) before adding .gitignore, untrack them:

```powershell
git rm -r --cached node_modules
git rm --cached data.sqlite sessions.sqlite
git commit -m "Stop tracking generated files"
git push
```

## Notes
- Don’t commit secrets. Keep `.env` files local (ignored).
- To change DB location, edit `db.js` and `server.js` accordingly.
