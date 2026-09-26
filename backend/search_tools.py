"""SerpApi's official `serpapi-search-tools` library, used by the AI agent's search tools.

The agent's web, news, maps and video tools fetch through this library. The library is
optional: if it isn't installed (or a call fails), main.py falls back to its own
`serpapi_get()` helper, so the agent keeps working.
"""

import asyncio
import json
import time

try:
    from serpapi_search_tools import maps_search, news_search, videos_search, web_search
except ImportError:  # optional dependency
    web_search = None

LIB_AVAILABLE = web_search is not None

CACHE_TTL = 30 * 60  # same as NEWS_TTL in main.py; repeat questions use no credits
# Fresh Google searches with a location can take SerpApi 20-50 s; 30 s lets most of them finish.
_COMMON = {"provider": "function", "response_format": "json", "mode": "compact", "result_limit": 5, "timeout": 30}

_tools: dict = {}
_cache: dict[tuple[str, str], tuple[float, dict]] = {}


def _get_tools() -> dict:
    """Build the library's plain-function tools once. They read SERPAPI_KEY from the environment."""
    if not _tools:
        _tools.update(
            web=web_search(
                allowed_engines=["google"],
                default_params={"location": "Pune, Maharashtra, India", "gl": "in", "hl": "en"},
                **_COMMON,
            ),
            news=news_search(default_params={"gl": "in", "hl": "en"}, **_COMMON),
            maps=maps_search(default_params={"gl": "in", "hl": "en"}, **_COMMON),
            videos=videos_search(default_params={"gl": "in", "hl": "en"}, **_COMMON),
        )
    return _tools


async def search(tool: str, query: str) -> dict:
    """Run one library tool ("web", "news", "maps" or "videos") and return its compact JSON."""
    key = (tool, query)
    cached = _cache.get(key)
    if cached and cached[0] > time.time():
        return cached[1]

    fn = _get_tools()[tool]
    # The library's tools are synchronous; keep them off the event loop.
    data = json.loads(await asyncio.to_thread(fn, query))
    if "error" in data:
        raise RuntimeError(f"SerpApi error: {data['error']}")

    _cache[key] = (time.time() + CACHE_TTL, data)
    return data
