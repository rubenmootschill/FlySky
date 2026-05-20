# FlySky Virtual Airlines System

A full-stack virtual airline management system built with Next.js 15, Prisma, and PostgreSQL — inspired by vAMSYS.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 18, Tailwind CSS |
| Backend | Next.js API Routes, NextAuth.js |
| Database | PostgreSQL + Prisma ORM |
| Live Tracking | Leaflet, REST polling (ACARS) |
| Charts | Recharts |
| Discord | discord.js v14 |

## Features

- ✈ **Pilot Hub** — Registration, login, callsign assignment
- 📋 **Flight Booking** — Browse and book from 15+ routes
- 🗺 **Live Tracking** — Real-time aircraft positions on a world map
- 📝 **PIREP System** — Submit flight reports with landing rate scoring
- 🏆 **Leaderboard** — Ranked by points, hours, flights
- 🎖 **Ranks & Badges** — 7 pilot ranks with auto-progression
- 🛡 **Admin Panel** — Review PIREPs, manage fleet & routes
- 🤖 **Discord Bot** — Slash commands, flight announcements, rank sync
- 🔌 **SimBrief API** — One-click OFP fetch

## Quick Start

### 1. Prerequisites

- Node.js 20+
- PostgreSQL database

### 2. Install

```bash
cd "flysky - Website"
npm install
```

### 3. Configure

```bash
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL and NEXTAUTH_SECRET
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 4. Database

```bash
npm run db:push        # Push schema to database
npm run db:seed        # Seed ranks, routes, aircraft, admin user
```

Default admin login:  
- Email: `admin@flysky.com`  
- Password: `admin1234!`  
- ⚠️ **Change this immediately after first login**

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
src/
  app/
    (public)         → Landing page, login, join
    dashboard/       → Pilot portal (booking, tracking, PIREPs, stats, leaderboard)
    admin/           → Admin control room
    api/             → REST API endpoints
  components/
    dashboard/       → Sidebar navigation
    tracking/        → Leaflet live map
    stats/           → Recharts components
  lib/
    prisma.ts        → Prisma client singleton
    auth.ts          → NextAuth helpers
    scoring.ts       → PIREP scoring engine
prisma/
  schema.prisma      → Full database schema
  seed.ts            → Seed data (ranks, routes, aircraft)
discord-bot/
  bot.js             → Discord.js bot with slash commands
```

## ACARS Integration (Phase 1)

Configure `ACARS_API_KEY` in your environment and pass it from the plugin via `x-acars-key` header (or Bearer token).

Phase 1 endpoints:

- `POST /api/acars/session/start`
- `POST /api/acars/session/heartbeat`
- `POST /api/acars/session/end`

The API also updates live tracking records while session heartbeats are received.

## Deployment

1. Deploy to Vercel (recommended) or any Node.js host
2. Set up a managed PostgreSQL (e.g. Supabase, Neon, Railway)
3. Set all environment variables in your host's dashboard
4. Run `npm run db:migrate` on first deploy

## Discord Bot

See [discord-bot/README.md](discord-bot/README.md) for bot setup.
