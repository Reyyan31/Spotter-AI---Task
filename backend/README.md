# 🛰️ Spotter AI — Backend (Django REST API)

**Production URL:** [https://spotter-ai-task.onrender.com](https://spotter-ai-task.onrender.com)

The Django backend powers all trip planning, geocoding, routing, and HOS (Hours of Service) compliance logic for the Spotter AI Mission Control system.

---

## 📋 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Django 5.1 + Django REST Framework 3.17 |
| Routing Engine | OpenRouteService (HGV + Car) + OSRM (fallback) |
| Geocoding | OpenRouteService Geocode API (US-restricted) |
| WSGI Server | Gunicorn |
| Static Files | WhiteNoise |
| Deployment | Render |

---

## 🏗️ Project Structure

```
backend/
├── core/                  # Django project settings
│   ├── settings.py        # Configuration (CORS, WhiteNoise, static files)
│   ├── urls.py            # Root URL routing
│   ├── wsgi.py            # WSGI entry point
│   └── asgi.py            # ASGI entry point
├── trips/                 # Main application
│   ├── views.py           # API endpoints & triple-layer routing engine
│   ├── hos_engine.py      # HOS compliance engine (FMCSA Part 395)
│   ├── urls.py            # Trip API routes
│   ├── models.py          # Data models
│   └── admin.py           # Admin configuration
├── static/                # Collected static files (frontend build output)
├── manage.py              # Django management CLI
├── requirements.txt       # Python dependencies
├── Procfile               # Render/Gunicorn process definition
└── .env                   # Environment variables (ORS API key)
```

---

## 🚀 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/trip/plan/` | Plan a full trip with route, stops, and ELD logs |
| `GET` | `/api/message/` | Health check / API status |
| `GET` | `/health/` | Simple health check |

### `POST /api/trip/plan/`

**Request Body:**
```json
{
  "current_location": "Miami, FL",
  "pickup_location": "Houston, TX",
  "dropoff_location": "Columbus, OH",
  "current_cycle_used": 5
}
```

**Response:** Full trip plan including route geometry, stops (fuel, rest, breaks), daily ELD log sheets, and compliance summary.

---

## 🔧 Triple-Layer Routing Engine

The routing system uses a cascading fallback strategy to guarantee 100% reliability:

```
Layer 1: ORS driving-hgv  →  Realistic truck routing (best accuracy)
Layer 2: ORS driving-car  →  Reliable ORS fallback (wider coverage)
Layer 3: OSRM driving     →  Bulletproof fallback (free, no API key)
```

Each layer retries with multiple snap radii (`1km → 15km → 50km`) to handle rural/suburban stop locations. If all three layers fail, the API returns a clear error message instead of silently returning incorrect data.

---

## ⚖️ HOS Compliance Engine (`hos_engine.py`)

Implements FMCSA Part 395 Hours of Service regulations:

- **11-Hour Driving Rule** — Max 11 hours of driving after 10 consecutive hours off duty
- **14-Hour On-Duty Window** — No driving beyond 14 hours after coming on duty
- **30-Minute Break Rule** — Required after 8 cumulative hours of driving
- **70-Hour / 8-Day Cycle** — Tracks cumulative cycle hours
- **34-Hour Restart** — Full cycle reset when required
- **10-Hour Rest Periods** — Mandatory rest stops injected into route
- **Fuel Stops** — Automatically placed every ~1,000 miles

---

## 🛠️ Local Development

### Prerequisites
- Python 3.11+
- pip

### Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

### Environment Variables
Create a `.env` file:
```env
ORS_API_KEY=your_openrouteservice_api_key
DEBUG=True
SECRET_KEY=your_django_secret_key
```

Get a free ORS API key at [openrouteservice.org](https://openrouteservice.org/dev/#/signup)

### Run
```bash
python manage.py migrate
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/api/`

---

## 🌐 Deployment (Render)

The backend is deployed on Render as a Web Service:

- **Build Command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
- **Start Command:** `gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`
- **Root Directory:** `backend`

Static files (including the React frontend build) are served via WhiteNoise middleware.

---

## 📄 License

Built for the Spotter AI Full Stack Developer Assessment.
