# Quick Start

Get PoseVault running locally in under 5 minutes. This assumes you already have the Supabase project and Cloudflare R2 bucket configured — if not, see [SETUP.md](SETUP.md) for the full walkthrough.

## 1. Clone and Install

```bash
git clone https://github.com/dockercapphotogeaphy/posevault.git
cd posevault
npm install
```

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

## 3. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the app is accessible from other devices on your network too.

## 4. Build for Production

```bash
npm run build
```

Static output goes to `dist/`, ready to deploy anywhere (Cloudflare Pages, Vercel, Netlify, etc.).

## What's Included

| Area | Details |
|------|---------|
| **Frontend** | React 18 + Tailwind CSS v4 + Vite 7 |
| **Auth** | Supabase Auth (email/password) |
| **Database** | Supabase (PostgreSQL) with RLS |
| **Image Storage** | Cloudflare R2 via Worker proxy |
| **PWA** | Installable on mobile and desktop, offline-capable |
| **Onboarding** | Sample gallery + interactive tutorial for new users |

## Need More?

- **Full setup from scratch** (database tables, R2, Edge Functions) → [SETUP.md](SETUP.md)
- **Feature overview and project structure** → [README.md](README.md)
