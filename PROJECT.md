# LearnBeacon — Project Description & Tracker

_Last updated: 2026-09-23_

## 1. What is LearnBeacon?

LearnBeacon is an education and admissions research assistant for students in Maharashtra, focused on Pune engineering admissions (MHT-CET / JEE). It pulls live data from Google, Google Maps, Google News, YouTube and Google Trends through [SerpApi](https://serpapi.com) and shows it in one place:

- ask research questions about colleges and cutoffs
- find colleges on a map
- follow the latest education news, videos and exam search trends
- search scholarships (MahaDBT, EBC, merit, minority, girls)

When no SerpApi key is set, every feature returns built-in **mock data**, so the UI can be developed and demoed without using search credits. Each section shows a **Mock Data** / **SerpApi Live** badge.

## 2. Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, uvicorn, httpx, python-dotenv |
| Frontend | Static HTML pages, Tailwind CSS (CDN), vanilla JS ES modules |
| Map | Leaflet 1.9.4 + OpenStreetMap tiles |
| Charts | Chart.js 4 (Learn Hub trends) |
| Data | SerpApi (no database, no auth) |

FastAPI serves both the API (`/api/*`) and the `frontend/` folder, so everything runs on one origin.

## 3. Project structure

```
LearnBeacon/
  backend/
    main.py          # all API routes, SerpApi helper + cache, mock data
    requirements.txt
    .env.example     # copy to .env and set SERPAPI_KEY
  frontend/
    index.html       # Dashboard: AI research console + latest news widget
    colleges.html    # Explore Colleges: search + map + list
    learn.html       # Learn Hub: news, YouTube videos, trends
    scholarships.html# Scholarships search
    cutoffs.html     # placeholder ("Coming soon"), not linked in the menu
    js/api.js        # fetch wrappers for /api/*
    js/render.js     # HTML/Chart renderers
    js/main.js       # page wiring (detects the page by element id)
```

## 4. Running locally

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
copy .env.example .env          # then put your key in SERPAPI_KEY=
uvicorn main:app --reload
```

Open http://127.0.0.1:8000. The API docs are at http://127.0.0.1:8000/docs.
Leave `SERPAPI_KEY` empty to run in mock mode.

## 5. API endpoints

| Endpoint | SerpApi engine | Used on | Returns |
|---|---|---|---|
| `GET /api/search?q=` | `google` (Pune location) | Dashboard | Top 5 results + colleges mentioned |
| `GET /api/colleges/map?q=` | `google_maps` | Explore Colleges | Colleges with lat/lng, rating, reviews |
| `GET /api/news?q=&limit=5` | `google_news` | Dashboard, Learn Hub | Headline, source, date, thumbnail, link |
| `GET /api/videos?q=` | `youtube` | Learn Hub | Top 8 videos with id, thumbnail, channel, views |
| `GET /api/trends?q=a,b,c` | `google_trends` | Learn Hub | 12-month interest in India, up to 5 terms |
| `GET /api/scholarships?q=` | `google` (India) | Scholarships | Top 8 results: title, snippet, source, link |
| `GET /api/events?q=` | `google_events` | _(hidden)_ | Not supported on our SerpApi plan (see §7) |

All responses have the shape `{ query, source: "mock" | "serpapi", results }`. The map endpoint returns `colleges` instead of `results`.

**Search credits:** `serpapi_get()` in `main.py` caches responses in memory: 30 minutes by default and 6 hours for trends. A repeat search within that window uses no credits. The cache is cleared when the server restarts. SerpApi failures return **HTTP 502** with the error message.

## 6. Feature tracker

Status: ✅ Done · 🙈 Hidden · 🔜 Planned · 💡 Idea

### Pages & menu

| Feature | Status | Notes |
|---|---|---|
| Dashboard: AI research console (`/api/search`) | ✅ | "Try asking" pills are not wired yet |
| Dashboard: Latest Education News widget (top 5) | ✅ | Links to Learn Hub |
| Explore Colleges: map + list | ✅ | `?college=<name>` zooms to a college |
| Explore Colleges: search bar + quick filters | ✅ | Computer, Mechanical, MBA, Medical, Pharmacy |
| Learn Hub: Top 5 education news + topic chips | ✅ | Education, MHT-CET, JEE, Admissions, Scholarships |
| Learn Hub: YouTube search + in-page player | ✅ | Uses youtube-nocookie embed |
| Learn Hub: Google Trends comparison chart | ✅ | Editable comma-separated terms |
| Learn Hub: Upcoming education events | 🙈 | Commented out in `learn.html`; SerpApi plan lacks `google_events` |
| Scholarships: search + category chips | ✅ | MahaDBT, EBC, Merit, Girls, Minority |
| Cutoffs & Exams page | 🙈 | Removed from menu; `cutoffs.html` is still a placeholder |
| Live Research Agent / Evidence Board tabs | 🙈 | Removed from menu (no pages behind them) |
| "42 Live Sources Active" header badge | 🙈 | Removed (was static text) |

### Backend

| Item | Status | Notes |
|---|---|---|
| Shared SerpApi helper with TTL cache + 502 errors | ✅ | `serpapi_get()` |
| Mock data for every endpoint | ✅ | Used when `SERPAPI_KEY` is empty |
| `.env.example` | ✅ | |
| Split `main.py` into routers/services | 💡 | Everything is in one file today |
| Persistent cache (file/Redis) | 💡 | Cache resets on restart |

### Known issues / backlog

| Item | Status | Notes |
|---|---|---|
| Header overflows on phone width | 🔜 | The profile pill and buttons push the page wider than the screen |
| ⌘K search, notification bell and profile pill do nothing | 🔜 | Wire up or hide |
| Profile ("Aarav Sharma, 97%ile") is hard-coded | 💡 | Needs login / user profile |
| Header/nav is copied in every HTML page | 💡 | Any menu change must be made in all pages |
| Cutoffs & Exams page (real cutoff data) | 💡 | Would need a data source (CET Cell PDFs / DB) |
| Re-enable Events | 🔜 | After the SerpApi plan supports `google_events` |

## 7. Re-enabling Events

1. Confirm the SerpApi account supports the `google_events` engine. It currently returns `400 Unsupported google_events search engine`.
2. In `frontend/learn.html`, remove the comment markers around the `<!-- Events: ... -->` block.
3. In the same file, change the Trends card from `lg:col-span-12` back to `lg:col-span-7`.

No JS or backend changes are needed. `main.js` loads events automatically when `#events-list` exists.

## 8. Change log

| Date | Change |
|---|---|
| 2026-09-23 | Added Learn Hub (news, videos, trends), Dashboard news widget, college search, scholarships search, SerpApi cache/error handling; cleaned up the menu; hid Events and Cutoffs |
| — | Initial backend (search, colleges map) and frontend |
