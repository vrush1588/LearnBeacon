function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderSearchResults(data, containerEl) {
  const results = data?.results || [];
  const sourceLabel = data?.source === 'mock' ? 'Mock Data' : 'SerpApi Live';

  if (results.length === 0) {
    containerEl.innerHTML = '<p class="text-sm text-slate-400">No results found for this query.</p>';
    return;
  }

  const cards = results
    .map((r) => {
      const badgeClasses =
        r.source_type === 'mock'
          ? 'bg-amber-50 text-amber-700 border border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

      const chips = (r.colleges_mentioned || [])
        .map(
          (name) => `
            <a href="colleges.html?college=${encodeURIComponent(name)}"
               class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full px-2.5 py-1 transition-colors">
              📍 View on map: ${escapeHtml(name)}
            </a>
          `
        )
        .join('');
      const chipsRow = chips ? `<div class="flex flex-wrap gap-2 mt-3">${chips}</div>` : '';

      return `
        <div class="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card-subtle hover:shadow-card-elevated transition-all">
          <div class="flex items-start justify-between gap-3">
            <a href="${escapeHtml(r.link || '#')}" target="_blank" rel="noopener noreferrer"
               class="font-display font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors">${escapeHtml(r.title)}</a>
            <span class="shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm ${badgeClasses}">${escapeHtml(r.source_type || 'source')}</span>
          </div>
          <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${escapeHtml(r.snippet)}</p>
          <a href="${escapeHtml(r.link || '#')}" target="_blank" rel="noopener noreferrer"
             class="text-[11px] text-blue-600 hover:underline mt-2 inline-block truncate max-w-full">${escapeHtml(r.link)}</a>
          ${chipsRow}
        </div>
      `;
    })
    .join('');

  containerEl.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs font-semibold text-slate-700 uppercase tracking-wider">Live Results for "${escapeHtml(data.query)}"</span>
      <span class="text-[11px] text-slate-400">${sourceLabel}</span>
    </div>
    <div class="space-y-2.5">${cards}</div>
  `;
}

export function renderCollegesOnMap(data, mapInstance) {
  const colleges = data?.colleges || [];
  const points = [];
  const markersByName = new Map();

  colleges.forEach((c) => {
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') return;
    points.push([c.lat, c.lng]);

    const popupHtml = `
      <div class="text-sm">
        <div class="font-semibold text-slate-900">${escapeHtml(c.name)}</div>
        <div class="text-slate-600 text-xs mt-1">${escapeHtml(c.address)}</div>
        <div class="text-xs mt-1.5 flex items-center gap-1.5">
          <span class="font-semibold text-amber-600">★ ${c.rating ?? 'N/A'}</span>
          <span class="text-slate-400">(${c.reviews ?? 0} reviews)</span>
        </div>
      </div>
    `;

    const marker = L.marker([c.lat, c.lng]).addTo(mapInstance).bindPopup(popupHtml);
    markersByName.set(c.name, { marker, lat: c.lat, lng: c.lng });
  });

  if (points.length) {
    mapInstance.fitBounds(points, { padding: [40, 40] });
  }

  return markersByName;
}

export function renderCollegesList(data, containerEl) {
  const colleges = data?.colleges || [];

  if (colleges.length === 0) {
    containerEl.innerHTML = '<p class="text-sm text-slate-500">No colleges found for this query.</p>';
    return;
  }

  containerEl.innerHTML = colleges
    .map(
      (c) => `
        <div class="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card-subtle hover:shadow-card-elevated transition-all">
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-display font-bold text-sm text-slate-900">${escapeHtml(c.name)}</h4>
            <span class="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              ★ ${c.rating ?? 'N/A'}
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">${escapeHtml(c.address)}</p>
          <div class="text-[11px] text-slate-400 mt-2">${c.reviews ?? 0} reviews</div>
        </div>
      `
    )
    .join('');
}
