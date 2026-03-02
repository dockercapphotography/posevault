# PoseVault

**Better posing. Better portraits.**

PoseVault is a web-based photography pose reference library built for photographers who need quick access to organized pose inspiration during shoots. Upload, tag, and organize pose reference images into galleries, then pull them up on any device when you need them.

Built as a Progressive Web App (PWA) — install it on your phone or tablet for a native app experience with offline support.

## Features

### Gallery Management
- Create unlimited galleries to organize poses by category (couples, family, maternity, etc.)
- Custom cover photos for each gallery with repositioning support
- Gallery-level tags and notes
- Favorite galleries for quick access
- Private galleries with optional password protection
- Gallery search, filtering, and sorting

### Image Management
- Upload images with automatic WebP conversion and optimization
- Per-image pose names, tags, and notes
- Favorite individual poses
- Full-screen image viewer with swipe navigation
- Fullscreen pinch-to-zoom viewer with double-tap zoom
- Bulk select, edit, tag, and delete operations

### Gallery Sharing
- Generate shareable links for any gallery
- Optional password protection and expiration dates
- Guest name entry gate for visitor identification
- Guests can favorite images within shared galleries
- Guest uploads with configurable approval workflow
- Image comments from both guests and gallery owners
- Per-share controls: favorites visibility, upload limits, content locking
- Activity tracking and access logs

### Notifications
- In-app notification bell with unread count
- Real-time notification feed for share activity (views, favorites, uploads, comments)
- Per-gallery notification preferences (toggle by event type)
- Activity summary dashboard
- Quiet mode to mute all notifications

### Tagging and Filtering
- Tag-based organization at both gallery and image levels
- Tag autocomplete across your entire library
- Multi-tag filtering with include/exclude modes
- Search by pose name across galleries and images
- Sort by date added, name, or favorites

### Export
- Download any gallery as a ZIP file
- Generate PDF reference sheets with multiple layout options (grid, list, contact sheet)
- Configurable PDF settings: orientation, images per page, inclusion of notes/tags

### Cross-Device Sync
- All data syncs automatically via Supabase (PostgreSQL) and Cloudflare R2
- Images stored in the cloud, accessible from any device
- Background sync with visual status indicator
- Offline-capable via service worker caching

### User Experience
- Interactive guided tutorial for new users
- Sample gallery pre-loaded on first registration
- Configurable grid layouts (2-5 columns for both galleries and images)
- Grid preferences saved per device (mobile vs desktop)
- User storage meter with configurable limits
- Mobile-responsive design with touch gesture support
- Install as PWA on iOS, Android, and desktop

### Admin Panel
- Dedicated `/admin` route for admin users
- User management with search (view all registered users)
- Storage tier management — create, edit, and delete tiers (Free, Pro, Studio)
- Per-user storage allocation and tier assignment
- Admin role toggle for other users

### Account Management
- Email/password authentication via Supabase Auth
- Update name, email, and password in-app
- Full account deletion with R2 image cleanup via Edge Function
- Storage tier system (Free 500 MB, Pro 2 GB, Studio 10 GB)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS v4 |
| Build | Vite 7, vite-plugin-pwa |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Image Storage | Cloudflare R2 (S3-compatible) |
| R2 Proxy | Cloudflare Worker |
| PDF Generation | jsPDF |
| ZIP Downloads | JSZip |
| Image Viewer | Swiper |
| Fullscreen Zoom | react-zoom-pan-pinch |
| Tutorials | react-joyride |
| Icons | Lucide React |

## Project Structure

```
posevault/
├── public/
│   ├── sample-gallery/          # Sample gallery images for new users
│   ├── icon-192.png             # PWA icons
│   ├── icon-512.png
│   ├── icon-512-maskable.png
│   ├── posevault-logo-white.svg
│   └── docker-cap-logo.svg
├── r2-worker/
│   └── src/index.js             # Cloudflare Worker for R2 upload/fetch/delete
├── sql/                         # Incremental database migrations
│   ├── 001_shared_galleries.sql
│   ├── 002_share_favorites.sql
│   ├── 003_share_uploads.sql
│   ├── 004_share_upload_metadata.sql
│   ├── 005_share_comments.sql
│   ├── 006_owner_comments.sql
│   ├── 007_notifications.sql
│   ├── 010_storage_tiers.sql
│   ├── 012_admin_panel_enhancements.sql
│   └── ...                      # Security and performance fixes
├── supabase/
│   └── functions/               # Supabase Edge Functions
│       ├── cleanup-expired-shares/
│       ├── create-notification/
│       ├── get-share-activity-summary/
│       └── validate-share-access/
├── src/
│   ├── App.jsx                  # Main application orchestrator
│   ├── main.jsx                 # React entry point (routes: /, /share/:token, /admin)
│   ├── supabaseClient.js        # Supabase client initialization
│   ├── components/
│   │   ├── LoginScreen.jsx      # Auth UI (login, register, password reset)
│   │   ├── Header.jsx           # Top bar with navigation and sync status
│   │   ├── CategoryCard.jsx     # Individual gallery card
│   │   ├── CategoryGrid.jsx     # Gallery list view with search/filter/bulk ops
│   │   ├── ImageCard.jsx        # Individual image thumbnail
│   │   ├── ImageGrid.jsx        # Image grid with filter/sort/bulk ops
│   │   ├── SingleImageView.jsx  # Full-screen image viewer with swipe
│   │   ├── FullscreenViewer.jsx # Pinch-to-zoom fullscreen image viewer
│   │   ├── TruncatedName.jsx    # Truncated text with tooltip
│   │   ├── UserMenu.jsx         # User dropdown menu
│   │   ├── UserSettingsModal.jsx # Account settings, grid prefs, delete account
│   │   ├── StorageMeter.jsx     # Visual storage usage bar
│   │   ├── StorageLimitModal.jsx # Storage limit warning
│   │   ├── OfflineIndicator.jsx # Offline status banner
│   │   ├── Modals/
│   │   │   ├── NewCategoryModal.jsx
│   │   │   ├── CategorySettingsModal.jsx
│   │   │   ├── CategorySettingsDropdown.jsx
│   │   │   ├── DeleteConfirmModal.jsx
│   │   │   ├── ImageEditModal.jsx
│   │   │   ├── FilterModal.jsx
│   │   │   ├── BulkEditModal.jsx
│   │   │   ├── GalleryFilterModal.jsx
│   │   │   ├── GalleryBulkEditModal.jsx
│   │   │   ├── UploadProgressModal.jsx
│   │   │   ├── PrivateGalleryWarning.jsx
│   │   │   ├── PDFOptionsModal.jsx
│   │   │   ├── MobileUploadModal.jsx
│   │   │   └── TagFilterModal.jsx
│   │   ├── Share/
│   │   │   ├── ShareConfigModal.jsx    # Share link creation and settings
│   │   │   ├── SharedGalleryViewer.jsx # Shared gallery view for guests
│   │   │   ├── SharedImageView.jsx     # Full-screen viewer for shared images
│   │   │   ├── SharePasswordGate.jsx   # Password entry for protected shares
│   │   │   ├── NameEntryGate.jsx       # Guest name entry screen
│   │   │   ├── CommentSection.jsx      # Image comments (guest + owner)
│   │   │   └── UploadApprovalQueue.jsx # Approve/reject guest uploads
│   │   └── Notifications/
│   │       ├── NotificationBell.jsx          # Header bell icon with unread count
│   │       ├── NotificationFeed.jsx          # Notification list dropdown
│   │       ├── NotificationPreferences.jsx   # Per-gallery notification settings
│   │       └── ActivitySummaryDashboard.jsx  # Share activity overview
│   ├── hooks/
│   │   ├── useAuth.js           # Authentication state management
│   │   ├── useAdmin.js          # Admin role detection
│   │   ├── useCategories.js     # Category/image CRUD with IndexedDB persistence
│   │   ├── useTutorial.js       # Main tutorial state
│   │   ├── useImageTutorial.js  # Image gallery tutorial state
│   │   └── useOnlineStatus.js   # Network connectivity detection
│   ├── pages/
│   │   ├── AdminPage.jsx        # Admin panel (user management, tier management)
│   │   └── SharedGalleryPage.jsx # Public shared gallery view
│   └── utils/
│       ├── storage.js           # IndexedDB storage adapter
│       ├── helpers.js           # Pure functions (filtering, sorting, tag utils)
│       ├── supabaseSync.js      # Supabase CRUD, cloud sync, cleanup
│       ├── r2Upload.js          # R2 upload/fetch/delete via Cloudflare Worker
│       ├── imageOptimizer.js    # WebP conversion and compression
│       ├── userSettingsSync.js  # User settings + account management
│       ├── userStorage.js       # Storage usage tracking and limits
│       ├── sampleGallery.js     # Sample gallery data for new users
│       ├── pdfGenerator.js      # PDF reference sheet generation
│       ├── zipDownloader.js     # ZIP gallery export
│       ├── crypto.js            # Password hashing for private galleries
│       ├── storageEstimate.js   # Browser storage estimation
│       ├── shareApi.js          # Gallery sharing CRUD, guest actions, comments
│       ├── notificationApi.js   # Notification creation, fetching, preferences
│       ├── tutorialSteps.jsx    # Main tutorial step definitions
│       └── imageTutorialSteps.jsx # Image tutorial step definitions
├── .env.example                 # Environment variable template
├── package.json
├── vite.config.js               # Vite + PWA + Tailwind config
├── eslint.config.js
└── index.html
```

## Screenshots

The app ships with PWA screenshots in `/public/` for app store-style install prompts on mobile devices.

## License

Copyright © 2025-2026 Docker Cap Photography. All rights reserved.

This software and its source code are proprietary and confidential. No part of this project may be reproduced, distributed, modified, or used in any form without the express written permission of Docker Cap Photography.

Unauthorized use, copying, or distribution of this software is strictly prohibited.
