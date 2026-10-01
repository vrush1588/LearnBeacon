# LearnBeacon — Project Description & Tracker

_Last updated: 2026-09-26_

## 1. What is LearnBeacon?

LearnBeacon is an education and admissions research assistant for students in India, focused on engineering admissions (MHT-CET / JEE). It pulls live data from Google, Google Maps, Google News, YouTube, Google Trends, Google Play Books, Google Scholar and Google Jobs through [SerpApi](https://serpapi.com) and shows it in one place:

- ask research questions about colleges and cutoffs
- find colleges on a map
- follow the latest education news, videos and exam search trends
- search scholarships (MahaDBT, EBC, merit, minority, girls)
- find study books (MHT-CET / JEE prep, solved papers) with prices from Google Play Books
- search research papers (AI, Data Science, Robotics…) with citation counts and PDF links from Google Scholar
- get career guidance from their current education (10th, 12th, diploma, degree): options, live fresher jobs in Pune (Google Jobs), career videos and a personalised AI advisor

When no SerpApi key is set, every feature returns built-in **mock data**, so the UI can be developed and demoed without using search credits. Each section shows a **Mock Data** / **SerpApi Live** badge.

## 2. Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, uvicorn, httpx, python-dotenv |
| Frontend | Static HTML pages, Tailwind CSS (CDN), vanilla JS ES modules |
| Map | Leaflet 1.9.4 + OpenStreetMap tiles |
| Charts | Chart.js 4 (Learn Hub trends) |
| Data | SerpApi (no database, no auth) |
| AI agent | Google Gemini free tier via `google-genai` SDK, optional (see §8) |
| Agent search tools | SerpApi's official [`serpapi-search-tools`](https://serpapi.github.io/serpapi-search-tools-python/) library powers the agent's web, news, maps and video searches (`search_tools.py`), with a fallback to our own `serpapi_get()` helper |

FastAPI serves both the API (`/api/*`) and the `frontend/` folder, so everything runs on one origin.

## 3. Project structure

```
LearnBeacon/
  backend/
    main.py          # all API routes, SerpApi helper + cache, mock data, agent tools
    agent.py         # AI Research Agent: Gemini function-calling loop (optional)
    router.py        # decides quick search vs AI agent for a question (rules, no LLM)
    careers.py       # curated career paths by education level (no API calls)
    search_tools.py  # agent's web/news/maps/video searches via serpapi-search-tools (cached, optional)
    requirements.txt
    .env.example     # copy to .env; set SERPAPI_KEY and (optional) GEMINI_API_KEY
  frontend/
    index.html       # Dashboard: AI research console + latest news widget
    colleges.html    # Explore Colleges: search + map + list
    learn.html       # Learn Hub: news, YouTube videos, study books, research papers, trends
    scholarships.html# Scholarships search
    careers.html     # Career guidance: options by education, live jobs, videos, AI advisor
    js/api.js        # fetch wrappers for /api/*
    js/render.js     # HTML/Chart renderers
    js/main.js       # page wiring (detects the page by element id)
  docs/screenshots/  # page screenshots used in README.md
  README.md          # project overview for the hackathon submission
```

## 4. Running locally

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
copy .env.example .env          # then set SERPAPI_KEY= and (optional) GEMINI_API_KEY=
uvicorn main:app --reload
```

Open http://127.0.0.1:8000. The API docs are at http://127.0.0.1:8000/docs.
Leave `SERPAPI_KEY` empty to run in mock mode. Leave `GEMINI_API_KEY` empty and the Dashboard uses plain web search instead of the agent.

## 5. API endpoints

| Endpoint | SerpApi engine | Used on | Returns |
|---|---|---|---|
| `GET /api/search?q=` | `google` (Pune location) | Dashboard | Top 5 results + colleges mentioned |
| `GET /api/colleges/map?q=` | `google_maps` | Explore Colleges | Colleges with lat/lng, rating, reviews |
| `GET /api/news?q=&limit=5` | `google_news` | Dashboard (5), Learn Hub (10) | Headline, source, date, thumbnail, link. `limit` 1–20 |
| `GET /api/videos?q=` | `youtube` | Learn Hub, Careers | Top 8 videos with id, thumbnail, channel, views |
| `GET /api/trends?q=a,b,c` | `google_trends` | Learn Hub | 12-month interest in India, up to 5 terms |
| `GET /api/scholarships?q=` | `google` (India) | Scholarships | Top 8 results: title, snippet, source, link |
| `GET /api/careers/paths?level=&branch=` | _(none, curated data)_ | Careers | Paths for an education level: courses, entrance exams, careers, job and video queries. `level` = `10th`, `12th-pcm`, `12th-pcb`, `12th-commerce`, `12th-arts`, `diploma`, `btech`, `graduate`; `branch` for `btech` |
| `GET /api/jobs?q=&location=` | `google_jobs` | Careers, AI agent | Top 10 jobs: title, company, location, via, posted, job type, salary, apply link (default location Pune) |
| `GET /api/research?q=&since=` | `google_scholar` | Learn Hub | Top 10 papers: title, link, snippet, authors, cited-by count + link, PDF link. `since` = earliest year (optional) |
| `GET /api/books?q=` | `google_play_books` (India) | Learn Hub | Top 12 books: title, author, rating, price, original price, free flag, cover, Play Store link |
| `GET /api/agent?q=&mode=auto` | Gemini + the tools above | Dashboard, Careers (AI advisor, `mode=agent`) | Server-Sent Events: `route` (quick search or agent), then agent steps + cited answer. `mode` = `auto` \| `search` \| `agent` (see §8) |

All responses have the shape `{ query, source: "mock" | "serpapi", results }`. The map endpoint returns `colleges` instead of `results`.

**Search credits:** `serpapi_get()` in `main.py` caches responses in memory: 30 minutes by default and 6 hours for trends. A repeat search within that window uses no credits. The cache is cleared when the server restarts. SerpApi failures return **HTTP 502** with the error message.

## 6. Feature tracker

Status: ✅ Done · 🔜 Planned · 💡 Idea

### Pages & menu

| Feature | Status | Notes |
|---|---|---|
| Dashboard: AI Research Agent (Gemini + SerpApi tools) | ✅ | Falls back to plain `/api/search` results when the agent is unavailable |
| Dashboard: "Try asking" pills | ✅ | Multi-source questions that show off the agent |
| Dashboard: quick search vs agent routing | ✅ | Auto rules in `router.py` + Mode switch (Auto / Quick / AI agent) + "Ask the AI agent instead" button |
| Dashboard: Latest Education News widget (top 5) | ✅ | Links to Learn Hub |
| Explore Colleges: map + list | ✅ | `?college=<name>` zooms to a college |
| Explore Colleges: search bar + quick filters | ✅ | Computer, Mechanical, MBA, Medical, Pharmacy |
| Learn Hub: Top 10 education news + topic chips | ✅ | Education, MHT-CET, JEE, Admissions, Scholarships |
| Learn Hub: YouTube search + in-page player | ✅ | Uses youtube-nocookie embed |
| Learn Hub: Study Books (Google Play Books) search + subject chips | ✅ | MHT-CET, JEE, Physics, Chemistry, Maths, Engg. maths; the agent can call `search_books` too |
| Learn Hub: Research Papers (Google Scholar) search + field chips + year filter | ✅ | AI, Data Science, Robotics, IoT, Renewable energy, VLSI; not wired into the agent |
| Learn Hub: Google Trends comparison chart | ✅ | Editable comma-separated terms |
| Careers: options by education level + interest highlighting | ✅ | Curated paths in `careers.py`; works without any API key |
| Careers: live fresher jobs (Google Jobs) + career videos per path | ✅ | "See jobs & videos" on each path card |
| Careers: personalised AI career advisor | ✅ | Builds a question from education, score and interests; agent uses the new `search_jobs` tool |
| Scholarships: search + category chips | ✅ | MahaDBT, EBC, Merit, Girls, Minority |

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
| Faculty / department research at a college | 💡 | SerpApi discontinued Google Scholar Profiles, so there's no reliable per-college faculty listing |
| Research paper AI summaries (Gemini reads the PDF) | 💡 | Deferred; many PDF hosts (ResearchGate) block downloads, so it needs an abstract fallback |

## 7. Change log

| Date | Change |
|---|---|
| 2026-09-26 | Added the Careers page (options by education level, Google Jobs, career videos, AI advisor with `search_jobs`), a "careers" router topic, and the Careers menu link on every page; Learn Hub now shows 10 news items |
| 2026-09-26 | Frontend files are served with `Cache-Control: no-cache`, so browsers never run a stale cached script after an update |
| 2026-09-26 | The agent's web, news, maps and video tools now use SerpApi's `serpapi-search-tools` library (`search_tools.py`), with a 30-min cache and a fallback to `serpapi_get()` |
| 2026-09-26 | Added Research Papers: `/api/research` (`google_scholar`), Learn Hub card with field chips and year filter |
| 2026-09-26 | Added Study Books: `/api/books` (`google_play_books`), Learn Hub card with subject chips, `search_books` agent tool, "books" router topic |
| 2026-09-23 | Added question routing (quick SerpApi search vs AI agent) with Mode switch; college website/Maps links; multi-source "Try asking" questions; answer verdict + comparison table |
| 2026-09-23 | Built the Gemini AI Research Agent (`agent.py`, `/api/agent`, Dashboard streaming UI, "Try asking" pills); httpx 0.27.2 → 0.28.1 for google-genai |
| 2026-09-23 | Planned the Gemini AI Research Agent and chose the hackathon track (§8) |
| 2026-09-23 | Added Learn Hub (news, videos, trends), Dashboard news widget, college search, scholarships search, SerpApi cache/error handling; cleaned up the menu |
| — | Initial backend (search, colleges map) and frontend |

## 8. Hackathon submission & AI Research Agent

### Track
**Knowledge & Public Interest (Impact).** Education is named in this track. LearnBeacon gives students one place for admissions research, colleges, scholarships, news, learning videos, study books, research papers and career guidance by education level. The agent upgrade below also makes it a strong **AI Agents** demo.

**SerpApi engines used:** `google`, `google_maps`, `google_news`, `youtube`, `google_trends`, `google_play_books`, `google_scholar`, `google_jobs`.

**SerpApi libraries used:** the agent's `search_web`, `find_colleges`, `get_education_news` and `search_videos` tools call SerpApi through the official `serpapi-search-tools` library (`web_search`, `maps_search`, `news_search`, `videos_search` with `provider="function"`). Scholar, Play Books, Trends and scholarship search have no tool in the library, so they use our own `serpapi_get()` helper. If the library fails (other than a timeout), a tool falls back to that helper.

### Goal
Turn the Dashboard's AI Research Console from a plain Google search into a real agent. For example, a student asks: _"97 percentile MHT-CET, CS colleges in Pune under ₹2L/yr, any scholarships?"_ The agent then:
1. decides which SerpApi-backed tools to call
2. shows each step live ("Searching scholarships…", "Mapping colleges…")
3. compares the results and writes one answer with source links, "View on map" chips and "Next steps"

### LLM
**Google Gemini free tier** (`google-genai` SDK). It costs nothing, and it has rate limits.
- Keys go in `backend/.env`:
  - `GEMINI_API_KEY=`: get one from https://aistudio.google.com
  - `GEMINI_MODEL=`: the current free-tier Flash model; confirm the id in AI Studio
- Free-tier prompts may be used by Google to improve its products, so don't send private student data.

### Backend: `backend/agent.py` + `GET /api/agent?q=`
- **Loop:** a manual function-calling loop, not automatic function calling, so every step can stream to the UI.
  1. Send the question plus tool declarations to Gemini.
  2. Run the function calls it requests, in parallel.
  3. Send the results back and repeat until Gemini replies with text.
- **Limits:** at most **6 tool calls** per question to bound SerpApi credits, and at most **5 model calls** to stay within the free-tier per-minute limit.
- **Tools** reuse the existing route functions in `main.py`, so there's no duplicate SerpApi code. They return compact JSON (title / snippet / link), and errors come back as `{"error": ...}` so the model can recover.

  | Tool | Fetches through |
  |---|---|
  | `search_web(query)` | `serpapi-search-tools` `web_search`, fallback `search()` |
  | `find_colleges(query)` | `serpapi-search-tools` `maps_search`, fallback `colleges_map()` |
  | `get_education_news(query)` | `serpapi-search-tools` `news_search`, fallback `news()` |
  | `search_videos(query)` | `serpapi-search-tools` `videos_search`, fallback `videos()` |
  | `search_scholarships(query)` | `scholarships()` |
  | `search_books(query)` | `books()` |
  | `search_jobs(query)` | `jobs()` |
  | `get_search_trends(terms)` | `trends()` |

- **Instructions to the model:**
  - It's an admissions assistant for Maharashtra/Pune students.
  - Only state facts found in tool results, and cite each one with a link.
  - End with "Next steps".
  - Say so when data is missing, e.g. exact cutoffs.
- **Streaming:** Server-Sent Events: `step` → `answer` → `colleges` (for map chips) → `done`, or `error`.
- **Fallbacks:**
  - A Gemini quota or rate-limit error (429) shows Gemini's reason, e.g. "Gemini quota reached: …".
  - With no `GEMINI_API_KEY`, `/api/agent` sends `unavailable`. The Dashboard then shows plain quick-search results, and the Careers page shows a notice while its options, jobs and videos keep working.
  - A library search that times out is reported to the agent as a tool error (no second slow request); other library failures fall back to `serpapi_get()`.

### Quick search vs AI agent (routing)
Not every question needs the agent. `backend/router.py` decides with simple rules, so there's no LLM cost.

A question goes to the **AI agent** when it has any of:
- personal details (percentile, marks, budget, lakh/₹, category)
- a comparison (vs, compare, better, or)
- advice or planning words (should I, can I, eligible, checklist, how do I)
- two or more topics (e.g. colleges + scholarships, cutoff + fees)
- more than 12 words

Everything else is a **quick search**: one SerpApi search, no Gemini call.

The Dashboard **Mode** switch (Auto / ⚡ Quick search / ✨ AI agent) can override the rules; the choice is remembered in the browser. Quick results show the reason and an **"Ask the AI agent instead"** button.

### Frontend
- **`api.js`:** `streamAgent(query, handlers, mode)` using `EventSource`.
- **`render.js`:**
  - `renderAgentSteps()` shows the live step list.
  - `renderAgentAnswer()` renders markdown with `marked` + `DOMPurify` from the jsDelivr CDN, and reuses the map chips.
- **`main.js`:** the Dashboard console calls the agent, and the "Try asking" pills fill the question and run it.

### Verification
1. With no Gemini key, the Dashboard shows the offline answer with no errors.
2. With keys set, the sample question streams steps, and the answer has working source links and map chips. The server log shows at most 6 tool calls.
3. A failing tool (e.g. a SerpApi error or timeout) shows as a recovered step, not a crash.
4. Learn Hub, Explore Colleges and Scholarships still work.
