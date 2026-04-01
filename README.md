# K1 Dashboard — Go Kart Lap Time Tracker

A fast, offline-capable web app for tracking go-kart lap times during a session.

## Features

- **Live stopwatch** with millisecond precision (start/pause/reset)
- **Lap recording** — hit Lap or press `L` to capture each lap instantly
- **Live stats** — best lap, average, last lap, lap count shown in real-time
- **Session management** — save driver name, track/venue, and kart number per session
- **Session history** — browse all past sessions with a detail modal
- **All-time stats** — total laps, best lap ever, per-track leaderboard
- **Keyboard shortcuts** — `Space` to start/pause, `L` to record a lap, `Esc` to close modals
- **Persistent storage** — all data stored in `localStorage`, no server needed
- **Responsive** — works on mobile and desktop

## Usage

Open `index.html` in any modern browser — no build step required.

### Live Session

1. Enter your driver name, track name, and kart number
2. Click **Start Session**
3. Hit **Start** (or press `Space`) when you cross the start line
4. Hit **Lap** (or press `L`) at the end of each lap
5. Click **End Session** to save

### Sessions Tab

Browse saved sessions. Click any session card to see the full lap breakdown.

### Stats Tab

View all-time stats, overall averages, and best laps broken down by track.

## Tech Stack

Plain HTML + CSS + JavaScript — no frameworks, no dependencies, no build tooling.
