# KartTimer

A web app for tracking your go kart lap times. Log sessions, record lap times, and analyze your performance across tracks.

## Features

- **Session Logging** — Record sessions with track name, date, kart number, and individual lap times
- **Lap Time Entry** — Enter times in flexible formats (`1:23.456`, `45.200`, etc.)
- **Session History** — Browse, search, and sort all your past sessions
- **Session Details** — View lap breakdowns with best/worst highlighting and delta comparisons
- **Statistics Dashboard** — Track records per track, all-time bests, total laps, and recent progress
- **Edit & Delete** — Full CRUD for all sessions
- **Offline Storage** — All data persists in browser localStorage
- **Responsive Design** — Works on desktop and mobile

## Tech Stack

- React 19 + TypeScript
- React Router for navigation
- Vite for bundling
- Lucide React for icons
- localStorage for persistence

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output is in the `dist/` directory.
