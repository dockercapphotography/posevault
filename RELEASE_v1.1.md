# PoseVault v1.1

**Better posing. Better portraits.**

A major feature release that adds gallery sharing, real-time notifications, an admin panel, and storage tier management — plus dozens of fixes and polish improvements across the app.

## What's New

### Gallery Sharing
- **Shareable links** — Generate a unique link for any gallery to share with clients, second shooters, or collaborators
- **Guest interactions** — Visitors can favorite images, upload their own photos, and leave comments on individual poses
- **Access controls** — Password protection, expiration dates, upload approval workflows, per-viewer upload limits, and content locking
- **Name entry gate** — Guests identify themselves before accessing a shared gallery, so you know who's interacting
- **Owner commenting** — Gallery owners can reply to guest comments directly within the shared view
- **Activity logs** — Full access tracking of who viewed, favorited, uploaded, or commented

### Notifications
- **Notification bell** — In-app bell icon with live unread count in the header
- **Activity feed** — Real-time feed of share events: views, favorites, uploads, and comments
- **Per-gallery preferences** — Toggle notifications by event type for each shared gallery
- **Activity summary dashboard** — At-a-glance overview of all share activity
- **Quiet mode** — Mute all notifications with a single toggle

### Admin Panel
- **Dedicated `/admin` route** — Separate admin interface for managing the platform
- **User management** — View all registered users with search, see storage usage and tier assignment
- **Storage tier CRUD** — Create, edit, and delete storage tiers (ships with Free 500 MB, Pro 2 GB, Studio 10 GB)
- **Per-user controls** — Assign tiers, adjust storage limits, and toggle admin roles for any user

### Storage Tiers
- **Tiered storage system** — Configurable storage plans that auto-assign on signup via database trigger
- **Storage meter** — Visual usage bar reflects the user's current tier limit
- **Admin-managed** — Tiers are fully manageable from the admin panel (no code changes needed)

## Improvements

- **Fullscreen pinch-to-zoom viewer** — New dedicated viewer using `react-zoom-pan-pinch` with double-tap zoom and auto-close on pinch-back
- **Cover photo repositioning** — Drag to reposition gallery cover images, synced to the cloud
- **Sample gallery in the cloud** — Sample gallery images now upload to R2 on first registration instead of staying local-only
- **Tutorial updates** — Refreshed onboarding tutorial with updated step definitions
- **UI polish** — Gallery tag overlap fix, UI spacing adjustments, password field improvements

## Fixes

- Fix favorite toggle targeting the wrong image after swiping in the image viewer
- Handle logout gracefully when session is already invalidated server-side
- Fix Supabase query issues and connection edge cases
- Fix 5 npm vulnerabilities (1 critical, 3 high, 1 moderate)
- Remove "Favorites First" sort option (was confusing with tag-based filtering)

## Infrastructure

- **4 new Edge Functions** — `cleanup-expired-shares`, `create-notification`, `get-share-activity-summary`, `validate-share-access`
- **10 SQL migrations** — Incremental schema files in `sql/` for sharing, comments, notifications, uploads, and admin
- **New RPC function** — `get_admin_user_list()` for admin panel user queries with `SECURITY DEFINER`
- **RLS policies** — Complete row-level security for all sharing and notification tables

## Tech Stack

React 18 · Tailwind CSS v4 · Vite 7 · Supabase · Cloudflare R2 · PWA · react-zoom-pan-pinch

## Getting Started

See [**QUICKSTART.md**](QUICKSTART.md) to run locally or [**SETUP.md**](SETUP.md) for the full infrastructure setup (now includes sharing, notification, and admin panel setup).
