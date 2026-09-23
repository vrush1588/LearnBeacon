export async function searchEducationQuery(query) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function getCollegesOnMap(query) {
  const res = await fetch(`/api/colleges/map?q=${encodeURIComponent(query)}`);
  return res.json();
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export function getEducationNews(query = 'education India', limit = 5) {
  return getJson(`/api/news?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export function searchVideos(query) {
  return getJson(`/api/videos?q=${encodeURIComponent(query)}`);
}

export function getEducationEvents(query) {
  return getJson(`/api/events?q=${encodeURIComponent(query)}`);
}

export function getTrends(terms) {
  return getJson(`/api/trends?q=${encodeURIComponent(terms)}`);
}

export function searchScholarships(query) {
  return getJson(`/api/scholarships?q=${encodeURIComponent(query)}`);
}

// Streams research events. mode: 'auto' | 'search' | 'agent'.
// handlers: { route, step, answer, colleges, agentError, unavailable, done, connectionError }
export function streamAgent(query, handlers, mode = 'auto') {
  const source = new EventSource(
    `/api/agent?q=${encodeURIComponent(query)}&mode=${encodeURIComponent(mode)}`
  );
  const on = (name, handler) =>
    source.addEventListener(name, (event) => handler?.(JSON.parse(event.data || '{}')));

  on('route', handlers.route);
  on('step', handlers.step);
  on('answer', handlers.answer);
  on('colleges', handlers.colleges);
  on('agent_error', handlers.agentError);
  source.addEventListener('unavailable', (event) => {
    source.close();
    handlers.unavailable?.(JSON.parse(event.data || '{}'));
  });
  source.addEventListener('done', () => {
    source.close();
    handlers.done?.();
  });
  // Named server events never reach onerror; this fires only on connection problems.
  source.onerror = () => {
    source.close();
    handlers.connectionError?.();
  };
  return () => source.close();
}
