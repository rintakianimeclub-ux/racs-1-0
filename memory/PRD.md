# Rintaki Anime Club — Product Requirements Doc

## Original problem statement
> "I want an app that connects my website pages, forums, points system, and more. www.rintaki.org"

## User-chosen scope (2026-04-21)
- Progressive Web App (mobile-first)
- Hybrid: pulls articles live from rintaki.org + native features
- Features: Forums, Points, User Accounts, Notifications, Direct Messaging, Admin Newsletters, Admin Videos, Events
- Auth: Both JWT email/password AND Emergent-managed Google OAuth
- Design: inspired by rintaki.org (anime/Japanese culture, coral reds)

## Architecture
- Backend: FastAPI (`/app/backend/server.py`) + MongoDB (`rintaki_db`)
- Frontend: React 19 + Tailwind + @phosphor-icons/react (`/app/frontend/src`)
- Design system: Neo-Brutalist Sticker Aesthetic (Outfit + DM Sans fonts, 2px black borders, hard shadows, coral/yellow/mint palette)
- Auth: httpOnly cookies — `access_token` (JWT, 1h) + `refresh_token` (7d) for email/password; `session_token` (7d) for Google. Unified `get_current_user` checks all three.

## Implemented (2026-04-21)
### Backend (43/43 pytest cases pass)
- Auth: register, login, logout, /me, Google session exchange, brute-force lockout (5 tries / 15 min), admin seeding on startup
- Profile: PATCH /api/profile (name/bio/picture)
- Rintaki feed proxy: `/api/rintaki/feed` pulls latest posts from rintaki.org WP REST API
- Forums: threads + replies + likes + filters + notifications on reply (awards +5 thread, +2 reply, +1 per like)
- Points: `/points/me`, `/points/daily-claim` (+5, once per day), `/points/leaderboard`
- Events: list + admin create + auto-notify all members
- Newsletters (Otaku World): list + admin publish + auto-notify
- Videos: list + admin create
- Direct Messages: conversations list, per-user thread, send, auto-notify recipient
- Notifications: list + unread count + mark all read
- Members directory, Admin stats, single-user profile fetch

### Frontend (verified via screenshot + auth flow)
- Login page with Google + email, neo-brutalist split hero
- Register page with welcome bonus callout
- AuthCallback for Emergent OAuth (hash fragment → `/api/auth/google/session`)
- Home feed: hero (daily claim), rintaki.org articles, events, leaderboard top-3, hot threads, newsletters
- Forums list + category filters + new-thread modal
- Forum thread detail with replies, like toggle
- Events list + admin create modal
- Points page with animated podium leaderboard, "how to earn" card, badges, activity timeline
- Newsletters: zine-style cards + reader modal + admin publish
- Videos: VHS-style thumbnails + embed modal (YouTube/Vimeo) + admin add
- Messages: two-pane (convo list + thread) with bubble styling
- Members directory with DM shortcut
- Notifications center with mark-all-read
- Profile page (self + others) with inline edit modal
- Admin dashboard with stat tiles
- Mobile bottom-nav + desktop sticky header with sub-nav

## Seeded data
- Admin user `admin@rintaki.org` / `Admin@Rintaki2026`
- 2 demo events (Anime MKE Meetup, Otaku Hangout Night)
- 1 Otaku World newsletter
- 1 pinned welcome thread

## Known test artifacts
- Backend testing agent created `TEST_*` prefixed records (threads, newsletter, event, video, members). Harmless; can be purged via `db.forum_threads.deleteMany({title: /^TEST_/})` etc.

## P0 Backlog / Next tasks
- Install PWA manifest + service worker for real install-to-homescreen
- Profile image upload (currently URL-based)
- Newsletter email fan-out (currently in-app only)
- Admin moderation tools (pin thread, delete reply)

## P1 Backlog
- Rich text in forum posts + image uploads
- Push notifications
- Event RSVP + calendar export
- Shop/fundraiser embed (Stripe already on rintaki.org)
- Refresh-token rotation endpoint wired to the UI

## P2 Backlog
- Badges achievements engine (first thread, 7-day streak, etc.)
- Gamified trading-card collection sync with rintaki.org
- Search across forums + newsletters

## Test credentials
See `/app/memory/test_credentials.md`.
