import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "").strip()
SERPAPI_URL = "https://serpapi.com/search"

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

app = FastAPI(title="LearnBeacon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


def mock_college_map_results(query: str) -> list[dict]:
    return [
        {
            "name": "Pune Institute of Computer Technology (PICT)",
            "address": "Survey No. 27, Near Trimurti Chowk, Dhankawadi, Pune, Maharashtra 411043",
            "lat": 18.4593,
            "lng": 73.8567,
            "rating": 4.4,
            "reviews": 2891,
        },
        {
            "name": "College of Engineering Pune Technological University (COEP Tech)",
            "address": "Wellesley Rd, Shivajinagar, Pune, Maharashtra 411005",
            "lat": 18.5293,
            "lng": 73.8553,
            "rating": 4.5,
            "reviews": 3654,
        },
        {
            "name": "Vishwakarma Institute of Technology (VIT Pune)",
            "address": "666, Upper Indiranagar, Bibwewadi, Pune, Maharashtra 411037",
            "lat": 18.4726,
            "lng": 73.8567,
            "rating": 4.3,
            "reviews": 2417,
        },
        {
            "name": "MIT World Peace University (MIT-WPU)",
            "address": "S No 124, Paud Rd, Kothrud, Pune, Maharashtra 411038",
            "lat": 18.4989,
            "lng": 73.8065,
            "rating": 4.2,
            "reviews": 5203,
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
        params = {
            "engine": "google",
            "q": q,
            "location": "Pune, Maharashtra, India",
            "hl": "en",
            "gl": "in",
            "api_key": SERPAPI_KEY,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(SERPAPI_URL, params=params)
            response.raise_for_status()
            data = response.json()

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
        return {
            "query": q,
            "source": "mock",
            "colleges": mock_college_map_results(q),
        }

    params = {
        "engine": "google_maps",
        "type": "search",
        "q": q,
        "hl": "en",
        "gl": "in",
        "api_key": SERPAPI_KEY,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(SERPAPI_URL, params=params)
        response.raise_for_status()
        data = response.json()

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
            }
        )

    return {
        "query": q,
        "source": "serpapi",
        "colleges": colleges,
    }


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
