"""AI Research Agent: Gemini function-calling loop over LearnBeacon's SerpApi tools.

The agent is optional. If the google-genai package or GEMINI_API_KEY is missing,
`agent_available()` returns False and the frontend falls back to plain search.
"""

import asyncio
import os
from collections.abc import AsyncIterator, Awaitable, Callable

try:
    from google import genai
    from google.genai import errors, types
except ImportError:  # optional dependency
    genai = None

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"

MAX_TOOL_CALLS = 6  # bounds SerpApi credits per question
MAX_MODEL_CALLS = 5  # stays well inside free-tier per-minute limits

SYSTEM_INSTRUCTION = """You are LearnBeacon's admissions research assistant for students in \
Maharashtra, India (focus: Pune engineering admissions via MHT-CET / JEE).

Your value is combining sources into a personal decision, not repeating a list.

Research
- Use the tools before answering. For most questions call two or more tools together, e.g. colleges +
  web search for cutoffs/fees, + scholarships when money is mentioned, + news for recent changes,
  + videos when the student wants to see a campus or learn a topic, + books when the student asks what to
  study from or wants practice papers, + trends when comparing options.
- Use the student's details (percentile, budget, branch, category, location) in your tool queries.
- For career guidance, start from the student's current education level: combine search_jobs (live demand
  and salaries) with search_web (courses, entrance exams) and search_videos, then suggest 2-3 paths in a
  table (| Path | Course & exam | Typical roles | Job demand in Pune | Source |).

Answer
- Start with a 1-2 sentence verdict for this student.
- Personalise: say which options fit the student's percentile/budget and which are a stretch, and why.
- Whenever two or more colleges or options appear, include a markdown table
  (e.g. | College | Cutoff | Fees/yr | Fit for you | Source |).
- Keep the whole answer under about 300 words; prefer the table over long bullet lists.
- Only state facts found in tool results; cite each with a markdown link. For colleges, link the name to
  its "website" if present, otherwise to its "maps_link".
- If key data is missing (for example exact cutoffs or fees), say so plainly and where to check.
- Keep it concise with short headings. Finish with a numbered "Next steps" list for the student."""

ToolFn = Callable[..., Awaitable[object]]

TOOL_DECLARATIONS = [
    {
        "name": "search_web",
        "description": "Google web search (Pune, India). Use for cutoffs, fees, admission rules, college details.",
        "params": {"query": "Search query"},
    },
    {
        "name": "find_colleges",
        "description": "Find colleges on Google Maps with address, rating and review count.",
        "params": {"query": "e.g. 'Computer Engineering colleges Pune'"},
    },
    {
        "name": "get_education_news",
        "description": "Latest Indian education news headlines for a topic.",
        "params": {"query": "News topic, e.g. 'MHT-CET CAP round'"},
    },
    {
        "name": "search_scholarships",
        "description": "Search government and private scholarships for Indian students.",
        "params": {"query": "e.g. 'EBC scholarship engineering Maharashtra'"},
    },
    {
        "name": "search_videos",
        "description": "Search YouTube videos (campus tours, exam preparation, career guidance).",
        "params": {"query": "Video search query"},
    },
    {
        "name": "search_books",
        "description": "Search Google Play Books for study books (exam prep, solved papers, textbooks) with author, rating and price in INR.",
        "params": {"query": "Book search query, e.g. 'MHT CET physics'"},
    },
    {
        "name": "search_jobs",
        "description": "Live job listings from Google Jobs (Pune by default): job demand, hiring companies and fresher salaries.",
        "params": {"query": "Job search, e.g. 'embedded engineer fresher' or 'data analyst fresher Pune'"},
    },
    {
        "name": "get_search_trends",
        "description": "Google Trends interest over the last 12 months in India for up to 5 comma-separated terms.",
        "params": {"terms": "Comma-separated terms, e.g. 'MHT CET,JEE Main'"},
    },
]


def _api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


def _model() -> str:
    return os.getenv("GEMINI_MODEL", "").strip() or DEFAULT_GEMINI_MODEL


def agent_available() -> bool:
    return genai is not None and bool(_api_key())


def _function_declarations() -> list:
    return [
        types.FunctionDeclaration(
            name=t["name"],
            description=t["description"],
            parameters_json_schema={
                "type": "object",
                "properties": {name: {"type": "string", "description": desc} for name, desc in t["params"].items()},
                "required": list(t["params"]),
            },
        )
        for t in TOOL_DECLARATIONS
    ]


def _text_of(content) -> str:
    parts = (content.parts if content else None) or []
    return "".join(p.text for p in parts if p.text and not p.thought).strip()


async def _run_tool(tools: dict[str, ToolFn], name: str, args: dict) -> dict:
    fn = tools.get(name)
    if fn is None:
        return {"error": f"Unknown tool {name}"}
    try:
        return {"result": await fn(**args)}
    except Exception as exc:  # report to the model so it can recover
        return {"error": str(getattr(exc, "detail", exc))}


async def run_agent(question: str, tools: dict[str, ToolFn]) -> AsyncIterator[tuple[str, dict]]:
    """Yield (event, payload) pairs: ("step", ...), ("answer", ...) or ("agent_error", ...)."""
    client = genai.Client(api_key=_api_key())
    tool_list = [types.Tool(function_declarations=_function_declarations())]
    no_auto = types.AutomaticFunctionCallingConfig(disable=True)
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION, tools=tool_list, automatic_function_calling=no_auto
    )
    # Same tools, but calling disabled: used for the last turn so the model must write its answer.
    final_config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        tools=tool_list,
        automatic_function_calling=no_auto,
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(mode=types.FunctionCallingConfigMode.NONE)
        ),
    )

    contents = [types.Content(role="user", parts=[types.Part.from_text(text=question)])]
    tool_calls_used = 0

    try:
        for model_call in range(MAX_MODEL_CALLS):
            last_turn = model_call == MAX_MODEL_CALLS - 1 or tool_calls_used >= MAX_TOOL_CALLS
            response = await client.aio.models.generate_content(
                model=_model(), contents=contents, config=final_config if last_turn else config
            )
            candidate = (response.candidates or [None])[0]
            content = candidate.content if candidate else None
            calls = response.function_calls or []

            if not calls:
                text = _text_of(content)
                if not text:
                    yield "agent_error", {"message": "The agent returned an empty answer. Please try rephrasing."}
                    return
                yield "answer", {"markdown": text}
                return

            # Keep the model turn as-is (it carries thought signatures Gemini needs back).
            contents.append(content)

            runnable = []
            for call in calls:
                args = dict(call.args or {})
                if tool_calls_used < MAX_TOOL_CALLS:
                    tool_calls_used += 1
                    runnable.append((call, args))
                    yield "step", {"tool": call.name, "input": args}
                else:
                    runnable.append((call, None))

            results = await asyncio.gather(
                *[
                    _run_tool(tools, call.name, args) if args is not None else _budget_reached()
                    for call, args in runnable
                ]
            )
            contents.append(
                types.Content(
                    role="user",
                    parts=[
                        types.Part(function_response=types.FunctionResponse(id=call.id, name=call.name, response=result))
                        for (call, _), result in zip(runnable, results)
                    ],
                )
            )

        yield "agent_error", {"message": "The agent ran out of steps before answering. Please try a narrower question."}
    except errors.APIError as exc:
        if exc.code == 429:
            # 429 covers both per-minute rate limits and spend caps; show Gemini's reason.
            reason = (exc.message or "").split(" Learn more")[0]
            yield "agent_error", {"message": f"Gemini quota reached: {reason or 'rate limit, try again in a minute.'}"}
        else:
            yield "agent_error", {"message": f"Gemini error ({exc.code}): {exc.message}"}
    except Exception as exc:  # network errors etc.; never break the stream
        yield "agent_error", {"message": f"Agent failed: {exc}"}


async def _budget_reached() -> dict:
    return {"error": "Tool budget for this question is used up. Answer with the information you already have."}
