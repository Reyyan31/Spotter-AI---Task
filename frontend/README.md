# 🎯 Spotter AI — Frontend (React + Vite)

**Production URL:** [https://spotter-ai-task.onrender.com](https://spotter-ai-task.onrender.com)

The React frontend provides an immersive, executive-grade "Mission Control" interface for trip planning, real-time route visualization, animated truck simulation with live AI audio briefings, and FMCSA-compliant ELD log sheet generation with digital signature capture.

---

## 📋 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Animations | Framer Motion |
| Mapping | Leaflet + React-Leaflet |
| HTTP Client | Axios |
| Notifications | React Hot Toast |
| Icons | React Icons (FontAwesome) |
| Styling | Custom CSS + Utility Classes |
| Audio | Web Speech Synthesis API |

---

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── TripForm.jsx          # Trip input form with location autocomplete
│   │   ├── ResultsDashboard.jsx  # Main results layout (mission manifest)
│   │   ├── RouteMap.jsx          # Interactive map with truck simulation + AI audio
│   │   ├── SummaryStats.jsx      # Executive trip summary metrics
│   │   ├── StopsTimeline.jsx     # Visual timeline of all stops
│   │   ├── ELDLogSheet.jsx       # FMCSA-compliant ELD log with canvas drawing
│   │   └── ELDLogsPanel.jsx      # Day-by-day ELD log navigation
│   ├── App.jsx                   # Root component with state management
│   ├── App.css                   # Component-specific styles
│   ├── index.css                 # Design system (tokens, utilities, theme)
│   └── main.jsx                  # React entry point
├── public/                       # Static assets
├── index.html                    # HTML entry point
├── vite.config.js                # Vite build configuration
├── package.json                  # Dependencies and scripts
└── eslint.config.js              # ESLint configuration
```

---

## ✨ Key Features

### 🗺️ Interactive Tactical Map (`RouteMap.jsx`)
- Dark-themed Leaflet map with CartoDB Dark tiles
- Color-coded markers for all stop types (start, pickup, dropoff, fuel, rest, breaks)
- Clickable markers with high-contrast popups showing arrival/departure times
- Responsive legend with glassmorphism cards

### 🚛 Animated Mission Simulation
- Click **"PLAY MISSION"** to watch a truck icon traverse the entire route
- Balanced simulation speed for smooth visual experience
- Pause/resume/replay controls

### 🎙️ Live AI Tactical Audio Briefing
- Synchronized speech synthesis broadcasts as the truck moves:
  - **Mission start:** Total miles, checkpoints, and route overview
  - **Checkpoint approach:** Announces each stop by name and type
  - **Progress updates (every 20%):** Miles remaining, HOS compliance status, fuel efficiency
  - **Mission complete:** Final confirmation with log certification status
- Uses `window.speechSynthesis` — no external APIs required

### 📋 ELD Log Sheets (`ELDLogSheet.jsx`)
- FMCSA Part 395 compliant daily log format
- Canvas-drawn duty status grid (Off Duty, Sleeper, Driving, On Duty)
- Horizontal line segments with proper time mapping
- **Digital signature capture** — draw and save directly on the log
- Signatures persist via `localStorage`
- Day-by-day navigation with animated transitions

### 💾 Data Persistence
- Full trip data saved to `localStorage` on each result
- Survives browser refresh — no redirect to trip form on reload
- Signature data persists independently per log sheet

### 📱 Responsive Design
- Mobile-optimized header (badge auto-hides on small screens)
- Responsive map legend grid (2-col mobile → 3-col tablet → inline desktop)
- Touch-friendly controls with proper hit targets
- No horizontal scroll on any viewport

---

## 🎨 Design System

The interface uses an **"Executive Dark"** theme:

| Token | Value | Usage |
|-------|-------|-------|
| `--navy` | `#0a0f1e` | Primary background |
| `--accent` | `#f59e0b` | Amber highlights, CTAs |
| `--glass` | `rgba(255,255,255,0.03)` | Glassmorphism panels |
| Fonts | Inter, system-ui | Typography |
| Borders | `rgba(255,255,255,0.05–0.1)` | Subtle separators |

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
cd frontend
npm install
```

### Run (Development)
```bash
npm run dev
```
Opens at `http://localhost:5173` with hot module replacement.

### Build (Production)
```bash
npm run build
```
Output is written to `../backend/static/frontend/` — served by Django in production.

---

## 🔌 API Integration

The frontend communicates with the Django backend via Axios:

```
POST /api/trip/plan/
  → Sends: { current_location, pickup_location, dropoff_location, current_cycle_used }
  → Receives: { route_geometry, stops, day_logs, summary }
```

In development, Vite proxies `/api` requests to `http://127.0.0.1:8000`. In production, both frontend and backend are served from the same origin.

---

## 📦 Build Output

Vite builds to `../backend/static/frontend/` so Django can serve the SPA:

```
../backend/static/frontend/
├── index.html
└── assets/
    ├── index-[hash].css    (~25 KB gzipped: ~9 KB)
    └── index-[hash].js     (~588 KB gzipped: ~186 KB)
```

---

## 📄 License

Built for the Spotter AI Full Stack Developer Assessment.