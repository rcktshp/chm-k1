# KartLap — Go Kart Lap Times Tracker

A sleek, dark-themed web app for tracking your go kart lap times across sessions, tracks, and kart types. All data is stored locally in your browser — no account needed.

## Features

- **Stopwatch** — Built-in lap timer with start/stop/lap controls
- **Manual Entry** — Add lap times manually (MM:SS.mmm format)
- **Session Management** — Create sessions with track name, date, kart number, session type, and notes
- **Search & Filter** — Find sessions by track name, filter by type (practice/qualifying/race), sort by date or best lap
- **Session Detail** — View full lap breakdown with delta-to-best, charts, and statistics
- **Dashboard** — At-a-glance stats: best lap, average, total sessions, total laps, and trend chart
- **Statistics** — Personal records, per-track breakdown, and progress-over-time chart
- **Import/Export** — Export all data as JSON and import it on another device
- **Responsive** — Works on desktop, tablet, and mobile
- **No Dependencies** — Pure HTML, CSS, and vanilla JavaScript; charts drawn on `<canvas>`

## Getting Started

Open `index.html` in any modern browser. No build step or server required.

```
open index.html
```

Or serve it locally:

```
npx serve .
```

## Data Storage

All session data is persisted in `localStorage` under the key `kartlap_sessions`. Use the **Export** button to back up your data, and **Import** to restore it.
