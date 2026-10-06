import json
import logging
import os
import time
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, urlparse

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

from agent import agent_available, run_agent  # noqa: E402  (reads env at call time)
from router import MODES, choose_route  # noqa: E402
import search_tools  # noqa: E402
from careers import BRANCHES, LEVELS, career_paths  # noqa: E402

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "").strip()
SERPAPI_URL = "https://serpapi.com/search"

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

NEWS_TTL = 30 * 60
TRENDS_TTL = 6 * 60 * 60

app = FastAPI(title="LearnBeacon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def revalidate_frontend_files(request, call_next):
    """Make browsers check for new HTML/JS on every load, so an old cached script never
    runs against a newer page. Unchanged files still return a quick 304 via their ETag."""
    response = await call_next(request)
    if not request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache"
    return response


_serpapi_cache: dict[tuple, tuple[float, dict]] = {}


async def serpapi_get(params: dict, ttl: int = NEWS_TTL) -> dict:
    """Call SerpApi with a small in-memory TTL cache to save search credits."""
    key = tuple(sorted(params.items()))
    cached = _serpapi_cache.get(key)
    if cached and cached[0] > time.time():
        return cached[1]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(SERPAPI_URL, params={**params, "api_key": SERPAPI_KEY})
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"SerpApi request failed: {exc}") from exc

    if "error" not in data:
        _serpapi_cache[key] = (time.time() + ttl, data)
    return data


def mock_search_results(query: str) -> list[dict]:
    return [
        {
            "title": "PICT Pune - MHT-CET Cutoff 2024 (Computer Engineering)",
            "snippet": "Pune Institute of Computer Technology (PICT) Computer Engineering closed "
            "at 99.42 percentile (Home State, General category) in MHT-CET CAP round 2, 2024.",
            "link": "https://www.pict.edu/admissions/cutoff",
            "source_type": "mock",
        },
        {
            "title": "COEP Technological University - Cutoff Trends",
            "snippet": "College of Engineering Pune (COEP Tech) CSE cutoff for MHT-CET 2024 "
            "closed around 99.71 percentile for the General - Home State category.",
            "link": "https://www.coep.org.in/admission",
            "source_type": "mock",
        },
        {
            "title": "VIT Pune Admission 2024 - Eligibility & Cutoff",
            "snippet": "Vishwakarma Institute of Technology (VIT) Pune IT branch cutoff stood "
            "at 98.85 percentile in the last CAP round for MHT-CET candidates.",
            "link": "https://www.vit.edu/admission",
            "source_type": "mock",
        },
        {
            "title": "MHT-CET 2024 Merit List & CAP Round Schedule",
            "snippet": "State CET Cell released the MHT-CET merit list; CAP round 1 seat "
            "allotment for engineering colleges in Pune region begins this week.",
            "link": "https://cetcell.mahacet.org",
            "source_type": "mock",
        },
        {
            "title": "Top Engineering Colleges in Pune for MHT-CET Students",
            "snippet": "A comparison of PICT, COEP Tech, VIT Pune and MIT-WPU based on "
            "placement records, NBA accreditation, and MHT-CET cutoff percentile.",
            "link": "https://www.shiksha.com/college/pune-engineering-colleges",
            "source_type": "mock",
        },
    ]


def google_maps_link(name: str, place_id: str | None = None) -> str:
    link = f"https://www.google.com/maps/search/?api=1&query={quote_plus(name)}"
    return f"{link}&query_place_id={place_id}" if place_id else link


def mock_college_map_results(query: str) -> list[dict]:
    return [
        {
            "name": "Pune Institute of Computer Technology (PICT)",
            "address": "Survey No. 27, Near Trimurti Chowk, Dhankawadi, Pune, Maharashtra 411043",
            "lat": 18.4593,
            "lng": 73.8567,
            "rating": 4.4,
            "reviews": 2891,
            "website": "https://pict.edu",
        },
        {
            "name": "College of Engineering Pune Technological University (COEP Tech)",
            "address": "Wellesley Rd, Shivajinagar, Pune, Maharashtra 411005",
            "lat": 18.5293,
            "lng": 73.8553,
            "rating": 4.5,
            "reviews": 3654,
            "website": "https://www.coep.org.in",
        },
        {
            "name": "Vishwakarma Institute of Technology (VIT Pune)",
            "address": "666, Upper Indiranagar, Bibwewadi, Pune, Maharashtra 411037",
            "lat": 18.4726,
            "lng": 73.8567,
            "rating": 4.3,
            "reviews": 2417,
            "website": "https://www.vit.edu",
        },
        {
            "name": "MIT World Peace University (MIT-WPU)",
            "address": "S No 124, Paud Rd, Kothrud, Pune, Maharashtra 411038",
            "lat": 18.4989,
            "lng": 73.8065,
            "rating": 4.2,
            "reviews": 5203,
            "website": "https://mitwpu.edu.in",
        },
    ]


def mock_news_results(query: str) -> list[dict]:
    return [
        {
            "title": "MHT-CET 2026 CAP Round 3 Seat Allotment Result Declared",
            "link": "https://cetcell.mahacet.org",
            "source": "State CET Cell",
            "date": "2 hours ago",
            "thumbnail": None,
        },
        {
            "title": "UGC Announces New Guidelines for Dual Degree Programmes",
            "link": "https://www.ugc.gov.in",
            "source": "The Hindu",
            "date": "5 hours ago",
            "thumbnail": None,
        },
        {
            "title": "JEE Main 2027 Registration Dates Expected Soon: NTA",
            "link": "https://jeemain.nta.ac.in",
            "source": "Indian Express",
            "date": "1 day ago",
            "thumbnail": None,
        },
        {
            "title": "Pune Engineering Colleges See Record Demand for AI & Data Science",
            "link": "https://timesofindia.indiatimes.com/city/pune",
            "source": "Times of India",
            "date": "1 day ago",
            "thumbnail": None,
        },
        {
            "title": "Maharashtra Extends Scholarship Portal Deadline for 2026-27",
            "link": "https://mahadbt.maharashtra.gov.in",
            "source": "Lokmat",
            "date": "2 days ago",
            "thumbnail": None,
        },
    ]


def mock_video_results(query: str) -> list[dict]:
    titles = [
        ("COEP Tech Campus Tour 2026", "Campus Diaries", "12:45"),
        ("MHT-CET Preparation Strategy: Last 60 Days", "CET Guru", "18:02"),
        ("PICT Pune: Placements, Cutoff & Hostel Review", "College Insider", "15:30"),
        ("CSE vs AI&DS vs ENTC: Which Branch to Choose?", "Career Compass", "10:12"),
    ]
    return [
        {
            "title": title,
            "link": "https://www.youtube.com/results?search_query=" + title.replace(" ", "+"),
            "video_id": None,
            "thumbnail": None,
            "channel": channel,
            "length": length,
            "views": None,
            "published_date": "1 month ago",
        }
        for title, channel, length in titles
    ]


def mock_event_results(query: str) -> list[dict]:
    return [
        {
            "title": "Pune Education Fair 2026",
            "when": "Sat, Oct 10, 10 AM - 6 PM",
            "address": "Auto Cluster Exhibition Centre, Chinchwad, Pune",
            "venue": "Auto Cluster Exhibition Centre",
            "link": "https://www.google.com/search?q=Pune+Education+Fair",
            "thumbnail": None,
        },
        {
            "title": "Engineering Admissions Guidance Seminar (MHT-CET CAP)",
            "when": "Sun, Oct 11, 11 AM - 1 PM",
            "address": "Balgandharva Rang Mandir, Shivajinagar, Pune",
            "venue": "Balgandharva Rang Mandir",
            "link": "https://www.google.com/search?q=MHT-CET+admission+seminar+Pune",
            "thumbnail": None,
        },
        {
            "title": "Study Abroad Expo - Pune Edition",
            "when": "Sat, Oct 17, 11 AM - 5 PM",
            "address": "JW Marriott, Senapati Bapat Rd, Pune",
            "venue": "JW Marriott Pune",
            "link": "https://www.google.com/search?q=Study+Abroad+Expo+Pune",
            "thumbnail": None,
        },
    ]


def mock_trends_results(terms: list[str]) -> dict:
    labels = [
        "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026",
        "Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026",
    ]
    base_curves = [
        [22, 25, 30, 38, 45, 60, 88, 100, 72, 55, 40, 30],
        [35, 40, 55, 92, 70, 50, 85, 60, 45, 30, 28, 26],
        [18, 20, 24, 30, 36, 48, 70, 95, 80, 50, 32, 25],
        [10, 12, 14, 15, 18, 22, 30, 42, 50, 38, 25, 18],
        [8, 9, 10, 12, 14, 16, 20, 26, 30, 24, 16, 12],
    ]
    return {
        "labels": labels,
        "series": [{"query": term, "values": base_curves[i]} for i, term in enumerate(terms)],
    }


def mock_book_results(query: str) -> list[dict]:
    books = [
        ("MHT-CET Engineering Entrance Solved Papers", "Arihant Experts", 3.9, "₹229.95", "₹328.50"),
        ("TARGET MHT-CET Online Engineering Test (Free Sample)", "Disha Experts", 4.2, "Free", None),
        ("MTG MHT CET 10 Years Previous Year Solved Papers", "MTG Learning Media", 4.5, "₹265.50", "₹531.00"),
        ("MHT CET Physics Practice Booklet", "Ashish V Rajwade", None, "₹329.57", "₹470.82"),
        ("24 Practice Sets MHT CET Engineering", "Arihant Experts", 3.2, "₹229.95", "₹328.50"),
        ("MHT CET Engineering Entrances Prep Guide", "Aadithi Dalvi", 4.3, "₹343.70", "₹491.00"),
    ]
    return [
        {
            "title": title,
            "author": author,
            "rating": rating,
            "price": price,
            "original_price": original_price,
            "free": price == "Free",
            "category": None,
            "thumbnail": None,
            "link": "https://play.google.com/store/search?c=books&q=" + quote_plus(title),
        }
        for title, author, rating, price, original_price in books
    ]


def mock_research_results(query: str) -> list[dict]:
    papers = [
        ("Attention Is All You Need", "A Vaswani, N Shazeer, N Parmar… - Advances in Neural Information Processing Systems, 2017",
         "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. "
         "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms…", 150000),
        ("Deep Residual Learning for Image Recognition", "K He, X Zhang, S Ren, J Sun - Proceedings of the IEEE CVPR, 2016",
         "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the "
         "training of networks that are substantially deeper than those used previously…", 250000),
        ("Machine Learning for Crop Yield Prediction in Maharashtra", "S Patil, A Kulkarni - Computers and Electronics in Agriculture, 2023",
         "This study compares random forest, XGBoost and LSTM models for district-level crop yield prediction "
         "using weather and soil data from Maharashtra…", 42),
        ("A Survey on Autonomous Mobile Robot Navigation", "R Deshmukh, P Joshi - Robotics and Autonomous Systems, 2022",
         "We review classical and learning-based approaches to path planning, localisation and obstacle "
         "avoidance for autonomous mobile robots…", 118),
        ("IoT-Based Smart Energy Monitoring for Campus Buildings", "V Shinde, M Gokhale - IEEE Internet of Things Journal, 2024",
         "A low-cost IoT system that measures and reports electricity use in real time across a university campus…", 17),
    ]
    return [
        {
            "title": title,
            "link": "https://scholar.google.com/scholar?q=" + quote_plus(title),
            "snippet": snippet,
            "authors": authors,
            "cited_by": cited_by,
            "cited_by_link": None,
            "pdf_link": None,
        }
        for title, authors, snippet, cited_by in papers
    ]


def mock_job_results(query: str) -> list[dict]:
    jobs = [
        ("Graduate Engineer Trainee", "Tata Motors", "Pimpri-Chinchwad, Maharashtra", "LinkedIn", "3 days ago", "Full-time", "₹3.5–4.5 LPA"),
        ("Junior Software Engineer (Fresher)", "Persistent Systems", "Pune, Maharashtra", "Naukri", "1 week ago", "Full-time", None),
        ("Data Analyst Intern", "Fractal Analytics", "Pune, Maharashtra", "Internshala", "5 days ago", "Internship", "₹15K a month"),
        ("Embedded Systems Engineer", "KPIT Technologies", "Hinjawadi, Pune", "Indeed", "2 weeks ago", "Full-time", None),
        ("Site Engineer (Civil)", "Kolte-Patil Developers", "Pune, Maharashtra", "Shine", "4 days ago", "Full-time", "₹25K a month"),
    ]
    return [
        {
            "title": title,
            "company": company,
            "location": location,
            "via": via,
            "posted": posted,
            "job_type": job_type,
            "salary": salary,
            "apply_link": "https://www.google.com/search?ibp=htl;jobs&q=" + quote_plus(f"{title} {company}"),
        }
        for title, company, location, via, posted, job_type, salary in jobs
    ]


def mock_scholarship_results(query: str) -> list[dict]:
    return [
        {
            "title": "Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti (EBC)",
            "snippet": "Tuition fee concession for economically backward class students in professional "
            "courses with family income up to 8 lakh per year. Apply on MahaDBT.",
            "link": "https://mahadbt.maharashtra.gov.in",
            "source": "MahaDBT",
        },
        {
            "title": "Post Matric Scholarship for SC / ST / OBC Students - Maharashtra",
            "snippet": "Covers tuition, exam fees and maintenance allowance for eligible reserved-category "
            "students enrolled in post-matric courses.",
            "link": "https://mahadbt.maharashtra.gov.in",
            "source": "MahaDBT",
        },
        {
            "title": "Central Sector Scheme of Scholarships for College Students",
            "snippet": "Merit-based scholarship of up to Rs 20,000 per year for students above the 80th "
            "percentile in Class 12. Apply via the National Scholarship Portal.",
            "link": "https://scholarships.gov.in",
            "source": "National Scholarship Portal",
        },
        {
            "title": "AICTE Pragati Scholarship for Girl Students",
            "snippet": "Rs 50,000 per year for girl students admitted to AICTE-approved technical degree "
            "and diploma programmes, family income up to 8 lakh.",
            "link": "https://www.aicte-india.org/schemes/students-development-schemes",
            "source": "AICTE",
        },
        {
            "title": "Minority Merit-cum-Means Scholarship for Professional Courses",
            "snippet": "Supports minority-community students in technical and professional courses; "
            "covers course fee and maintenance allowance.",
            "link": "https://scholarships.gov.in",
            "source": "National Scholarship Portal",
        },
        {
            "title": "Reliance Foundation Undergraduate Scholarships",
            "snippet": "Merit-cum-means scholarship of up to Rs 2 lakh over the degree for first-year "
            "undergraduate students across India.",
            "link": "https://www.scholarships.reliancefoundation.org",
            "source": "Reliance Foundation",
        },
    ]


KNOWN_COLLEGES: list[dict] = [
    {
        "name": "Pune Institute of Computer Technology (PICT)",
        "aliases": ["pict", "pune institute of computer technology"],
    },
    {
        "name": "College of Engineering Pune Technological University (COEP Tech)",
        "aliases": ["coep", "college of engineering pune"],
    },
    {
        "name": "Vishwakarma Institute of Technology (VIT Pune)",
        "aliases": ["vit pune", "vishwakarma institute of technology"],
    },
    {
        "name": "MIT World Peace University (MIT-WPU)",
        "aliases": ["mit-wpu", "mit wpu", "mit world peace university"],
    },
]


def detect_known_colleges(text: str) -> list[str]:
    haystack = text.lower()
    return [c["name"] for c in KNOWN_COLLEGES if any(alias in haystack for alias in c["aliases"])]


@app.get("/api/search")
async def search(q: str):
    if not SERPAPI_KEY:
        results = mock_search_results(q)
    else:
        # serpapi-search-tools first (no LLM involved); None means use our own helper.
        data = await _library_search("web", q)
        if data is None:
            params = {
                "engine": "google",
                "q": q,
                "location": "Pune, Maharashtra, India",
                "hl": "en",
                "gl": "in",
            }
            data = await serpapi_get(params)

        organic_results = data.get("organic_results", [])[:5]
        results = [
            {
                "title": item.get("title"),
                "snippet": item.get("snippet"),
                "link": item.get("link"),
                "source_type": "serpapi",
            }
            for item in organic_results
        ]

    for r in results:
        r["colleges_mentioned"] = detect_known_colleges(f"{r.get('title', '')} {r.get('snippet', '')}")

    return {
        "query": q,
        "source": "mock" if not SERPAPI_KEY else "serpapi",
        "results": results,
    }


@app.get("/api/colleges/map")
async def colleges_map(q: str):
    if not SERPAPI_KEY:
        colleges = mock_college_map_results(q)
        for c in colleges:
            c["maps_link"] = google_maps_link(c["name"])
        return {
            "query": q,
            "source": "mock",
            "colleges": colleges,
        }

    params = {
        "engine": "google_maps",
        "type": "search",
        "q": q,
        "hl": "en",
        "gl": "in",
    }
    data = await serpapi_get(params)

    local_results = data.get("local_results", [])
    colleges = []
    for item in local_results:
        gps = item.get("gps_coordinates")
        if not gps:
            continue
        colleges.append(
            {
                "name": item.get("title"),
                "address": item.get("address"),
                "lat": gps.get("latitude"),
                "lng": gps.get("longitude"),
                "rating": item.get("rating"),
                "reviews": item.get("reviews"),
                "website": item.get("website"),
                "maps_link": google_maps_link(item.get("title") or q, item.get("place_id")),
            }
        )

    return {
        "query": q,
        "source": "serpapi",
        "colleges": colleges,
    }


def _source_name(source) -> str | None:
    if isinstance(source, dict):
        return source.get("name")
    return source


@app.get("/api/news")
async def news(q: str = "education India", limit: int = 5):
    limit = max(1, min(limit, 20))
    if not SERPAPI_KEY:
        return {"query": q, "source": "mock", "results": mock_news_results(q)[:limit]}

    data = await serpapi_get({"engine": "google_news", "q": q, "gl": "in", "hl": "en"})

    items = []
    for item in data.get("news_results", []):
        # Story clusters nest their articles under "stories".
        items.extend(item.get("stories") or [item])

    results = [
        {
            "title": item.get("title"),
            "link": item.get("link"),
            "source": _source_name(item.get("source")),
            "date": item.get("date"),
            "thumbnail": item.get("thumbnail"),
        }
        for item in items
        if item.get("title") and item.get("link")
    ][:limit]

    return {"query": q, "source": "serpapi", "results": results}


def _youtube_video_id(link: str | None) -> str | None:
    if not link:
        return None
    return parse_qs(urlparse(link).query).get("v", [None])[0]


@app.get("/api/videos")
async def videos(q: str = "MHT-CET preparation"):
    if not SERPAPI_KEY:
        return {"query": q, "source": "mock", "results": mock_video_results(q)}

    data = await serpapi_get({"engine": "youtube", "search_query": q, "gl": "in", "hl": "en"})

    results = [
        {
            "title": item.get("title"),
            "link": item.get("link"),
            "video_id": _youtube_video_id(item.get("link")),
            "thumbnail": (item.get("thumbnail") or {}).get("static"),
            "channel": (item.get("channel") or {}).get("name"),
            "length": item.get("length"),
            "views": item.get("views"),
            "published_date": item.get("published_date"),
        }
        for item in data.get("video_results", [])[:8]
    ]

    return {"query": q, "source": "serpapi", "results": results}


@app.get("/api/events")
async def events(q: str = "education fair Pune"):
    if not SERPAPI_KEY:
        return {"query": q, "source": "mock", "results": mock_event_results(q)}

    data = await serpapi_get({"engine": "google_events", "q": q, "gl": "in", "hl": "en"})

    results = [
        {
            "title": item.get("title"),
            "when": (item.get("date") or {}).get("when"),
            "address": ", ".join(item.get("address") or []),
            "venue": (item.get("venue") or {}).get("name"),
            "link": item.get("link"),
            "thumbnail": item.get("thumbnail"),
        }
        for item in data.get("events_results", [])[:6]
    ]

    return {"query": q, "source": "serpapi", "results": results}


@app.get("/api/trends")
async def trends(q: str = "MHT CET,JEE Main,NEET"):
    terms = [t.strip() for t in q.split(",") if t.strip()][:5]
    if not terms:
        raise HTTPException(status_code=400, detail="Provide at least one search term.")
    normalized_q = ",".join(terms)

    if not SERPAPI_KEY:
        return {"query": normalized_q, "source": "mock", "results": mock_trends_results(terms)}

    data = await serpapi_get(
        {
            "engine": "google_trends",
            "q": normalized_q,
            "data_type": "TIMESERIES",
            "geo": "IN",
            "date": "today 12-m",
        },
        ttl=TRENDS_TTL,
    )

    timeline = (data.get("interest_over_time") or {}).get("timeline_data", [])
    labels = [point.get("date") for point in timeline]
    series = [
        {
            "query": term,
            "values": [
                next(
                    (v.get("extracted_value") for v in point.get("values", []) if v.get("query") == term),
                    0,
                )
                for point in timeline
            ],
        }
        for term in terms
    ]

    return {"query": normalized_q, "source": "serpapi", "results": {"labels": labels, "series": series}}


@app.get("/api/scholarships")
async def scholarships(q: str = "scholarships for engineering students Maharashtra 2026"):
    if not SERPAPI_KEY:
        return {"query": q, "source": "mock", "results": mock_scholarship_results(q)}

    data = await serpapi_get({"engine": "google", "q": q, "gl": "in", "hl": "en", "num": 10})

    results = [
        {
            "title": item.get("title"),
            "snippet": item.get("snippet"),
            "link": item.get("link"),
            "source": item.get("source") or item.get("displayed_link"),
        }
        for item in data.get("organic_results", [])[:8]
    ]

    return {"query": q, "source": "serpapi", "results": results}


@app.get("/api/books")
async def books(q: str = "MHT CET"):
    if not SERPAPI_KEY:
        return {"query": q, "source": "mock", "results": mock_book_results(q)}

    data = await serpapi_get({"engine": "google_play_books", "q": q, "gl": "in", "hl": "en"})

    # Play Books groups results into sections; each section holds a list of items.
    items = [item for section in data.get("organic_results", []) for item in section.get("items", [])]
    results = [
        {
            "title": item.get("title"),
            "author": item.get("author"),
            "rating": item.get("rating"),
            "price": item.get("price"),
            "original_price": item.get("original_price"),
            "free": item.get("extracted_price") == 0,
            "category": item.get("category"),
            "thumbnail": item.get("thumbnail"),
            "link": item.get("link"),
        }
        for item in items[:12]
    ]

    return {"query": q, "source": "serpapi", "results": results}


@app.get("/api/careers/paths")
async def careers_paths(level: str, branch: str | None = None):
    if level not in LEVELS:
        raise HTTPException(status_code=400, detail=f"level must be one of {sorted(LEVELS)}")
    return {
        "level": level,
        "level_label": LEVELS[level],
        "branch_label": BRANCHES.get(branch),
        "results": career_paths(level, branch),
    }


_JOB_TYPES = ("full-time", "full–time", "part-time", "part–time", "internship", "contractor", "contract")


def _job_details(item: dict) -> dict:
    """Pull posted date, job type and salary out of Google Jobs' free-text extensions."""
    detected = item.get("detected_extensions") or {}
    posted = job_type = salary = None
    for ext in item.get("extensions") or []:
        low = ext.lower()
        if posted is None and low.endswith("ago"):
            posted = ext
        elif job_type is None and low in _JOB_TYPES:
            job_type = ext.replace("–", "-")
        elif salary is None and "₹" in ext:
            salary = ext
    return {
        "posted": detected.get("posted_at") or posted,
        "job_type": detected.get("schedule_type") or job_type,
        "salary": detected.get("salary") or salary,
    }


@app.get("/api/jobs")
async def jobs(q: str = "engineer fresher", location: str = "Pune, Maharashtra, India"):
    if not SERPAPI_KEY:
        return {"query": q, "source": "mock", "results": mock_job_results(q)}

    data = await serpapi_get({"engine": "google_jobs", "q": q, "location": location, "gl": "in", "hl": "en"})

    results = [
        {
            "title": item.get("title"),
            "company": item.get("company_name"),
            "location": item.get("location"),
            "via": item.get("via"),
            **_job_details(item),
            "apply_link": ((item.get("apply_options") or [{}])[0]).get("link") or item.get("share_link"),
        }
        for item in data.get("jobs_results", [])[:10]
    ]

    return {"query": q, "source": "serpapi", "results": results}


def _scholar_pdf_link(item: dict) -> str | None:
    for resource in item.get("resources", []):
        # Scholar often lists an empty placeholder entry (link None) before the real one.
        if resource.get("file_format") == "PDF" and resource.get("link"):
            return resource.get("link")
    return None


@app.get("/api/research")
async def research(q: str = "artificial intelligence", since: int | None = None):
    if not SERPAPI_KEY:
        return {"query": q, "source": "mock", "results": mock_research_results(q)}

    params = {"engine": "google_scholar", "q": q, "hl": "en", "num": 10}
    if since:
        params["as_ylo"] = since
    data = await serpapi_get(params)

    results = []
    for item in data.get("organic_results", [])[:10]:
        cited_by = (item.get("inline_links") or {}).get("cited_by") or {}
        results.append(
            {
                "title": item.get("title"),
                "link": item.get("link"),
                "snippet": item.get("snippet"),
                "authors": (item.get("publication_info") or {}).get("summary"),
                "cited_by": cited_by.get("total"),
                "cited_by_link": cited_by.get("link"),
                "pdf_link": _scholar_pdf_link(item),
            }
        )

    return {"query": q, "source": "serpapi", "results": results}


# ---------- AI Research Agent (optional; see agent.py) ----------


def _compact(items: list[dict], *fields: str) -> list[dict]:
    return [{f: item.get(f) for f in fields if item.get(f) is not None} for item in items]


logger = logging.getLogger("learnbeacon")


async def _library_search(tool: str, query: str) -> dict | None:
    """Search through serpapi-search-tools; None means use our own serpapi_get() path instead."""
    if not SERPAPI_KEY or not search_tools.LIB_AVAILABLE:
        return None
    try:
        return await search_tools.search(tool, query)
    except Exception as exc:
        if "timed out" in str(exc):
            # SerpApi is slow, so a second request would be slow too and cost another credit.
            # The agent gets the error and answers with the other tools' results.
            raise
        logger.warning("serpapi-search-tools %s search failed, falling back: %s", tool, exc)
        return None


async def _tool_search_web(query: str) -> list[dict]:
    # search() already tries serpapi-search-tools first.
    data = await search(q=query)
    return _compact(data["results"], "title", "snippet", "link")


async def _tool_find_colleges(query: str) -> list[dict]:
    data = await _library_search("maps", query)
    if data is not None:
        return [
            {
                **_compact([item], "address", "rating", "reviews", "website")[0],
                "name": item.get("title"),
                "maps_link": google_maps_link(item.get("title") or query, item.get("place_id")),
            }
            for item in data.get("local_results", [])[:5]
        ]
    data = await colleges_map(q=query)
    return _compact(data["colleges"], "name", "address", "rating", "reviews", "website", "maps_link")


async def _tool_get_education_news(query: str) -> list[dict]:
    data = await _library_search("news", query)
    if data is not None:
        items = []
        for item in data.get("news_results", []):
            # Story clusters nest their articles under "stories".
            items.extend(item.get("stories") or [item])
        results = [
            {**item, "source": _source_name(item.get("source"))}
            for item in items
            if item.get("title") and item.get("link")
        ][:5]
        return _compact(results, "title", "source", "date", "link")
    data = await news(q=query, limit=5)
    return _compact(data["results"], "title", "source", "date", "link")


async def _tool_search_scholarships(query: str) -> list[dict]:
    data = await scholarships(q=query)
    return _compact(data["results"], "title", "snippet", "source", "link")


async def _tool_search_videos(query: str) -> list[dict]:
    data = await _library_search("videos", query)
    if data is not None:
        results = [
            {**item, "channel": (item.get("channel") or {}).get("name")}
            for item in data.get("video_results", [])[:5]
        ]
        return _compact(results, "title", "channel", "link")
    data = await videos(q=query)
    return _compact(data["results"][:5], "title", "channel", "link")


async def _tool_search_books(query: str) -> list[dict]:
    data = await books(q=query)
    return _compact(data["results"][:6], "title", "author", "rating", "price", "link")


async def _tool_search_jobs(query: str, location: str = "Pune, Maharashtra, India") -> list[dict]:
    data = await jobs(q=query, location=location or "Pune, Maharashtra, India")
    return _compact(data["results"][:6], "title", "company", "location", "salary", "posted", "apply_link")


async def _tool_get_search_trends(terms: str) -> dict:
    data = await trends(q=terms)
    series = data["results"]["series"]
    labels = data["results"]["labels"]
    # Summarise instead of sending every weekly point.
    return {
        "period": f"{labels[0]} to {labels[-1]}" if labels else None,
        "terms": [
            {
                "term": s["query"],
                "average_interest": round(sum(s["values"]) / len(s["values"]), 1) if s["values"] else 0,
                "peak_interest": max(s["values"], default=0),
                "peak_at": labels[s["values"].index(max(s["values"]))] if s["values"] else None,
            }
            for s in series
        ],
    }


AGENT_TOOLS = {
    "search_web": _tool_search_web,
    "find_colleges": _tool_find_colleges,
    "get_education_news": _tool_get_education_news,
    "search_scholarships": _tool_search_scholarships,
    "search_videos": _tool_search_videos,
    "search_books": _tool_search_books,
    "search_jobs": _tool_search_jobs,
    "get_search_trends": _tool_get_search_trends,
}


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


@app.get("/api/agent")
async def agent_research(q: str, mode: str = "auto"):
    """Stream research events. mode: "auto" (rules decide), "search" (quick) or "agent"."""
    if mode not in MODES:
        raise HTTPException(status_code=400, detail=f"mode must be one of {sorted(MODES)}")

    async def events():
        route, reason, automatic = choose_route(q, mode)
        yield _sse("route", {"mode": route, "reason": reason, "automatic": automatic})
        if route == "search":
            yield _sse("done", {})
            return
        if not agent_available():
            yield _sse("unavailable", {"message": "AI agent is not configured (GEMINI_API_KEY missing)."})
            return
        async for event, payload in run_agent(q, AGENT_TOOLS):
            yield _sse(event, payload)
            if event == "answer":
                yield _sse("colleges", {"names": detect_known_colleges(payload["markdown"])})
        yield _sse("done", {})

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
