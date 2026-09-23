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

export function renderCollegesOnMap(data, mapInstance, markerLayer = mapInstance) {
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

    const marker = L.marker([c.lat, c.lng]).addTo(markerLayer).bindPopup(popupHtml);
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

export function renderSourceBadge(data, badgeEl) {
  if (!badgeEl) return;
  const isMock = data?.source === 'mock';
  badgeEl.textContent = isMock ? 'Mock Data' : 'SerpApi Live';
  badgeEl.className = `text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
    isMock
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }`;
}

export function renderNewsList(data, containerEl, { compact = false } = {}) {
  const results = data?.results || [];

  if (results.length === 0) {
    containerEl.innerHTML = '<p class="text-sm text-slate-400">No news found for this topic.</p>';
    return;
  }

  containerEl.innerHTML = results
    .map((n, i) => {
      const thumb =
        !compact && n.thumbnail
          ? `<img src="${escapeHtml(n.thumbnail)}" alt="" loading="lazy" class="w-20 h-16 rounded-lg object-cover shrink-0 bg-slate-100"/>`
          : `<span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-display font-bold text-xs flex items-center justify-center shrink-0">${i + 1}</span>`;
      return `
        <a href="${escapeHtml(n.link || '#')}" target="_blank" rel="noopener noreferrer"
           class="flex items-start gap-3 bg-white border border-slate-200/90 rounded-xl p-3 shadow-card-subtle hover:shadow-card-elevated hover:border-blue-200 transition-all">
          ${thumb}
          <div class="min-w-0">
            <div class="font-display font-semibold text-sm text-slate-900 leading-snug">${escapeHtml(n.title)}</div>
            <div class="text-[11px] text-slate-500 mt-1">${escapeHtml(n.source || '')}${n.date ? ` · ${escapeHtml(n.date)}` : ''}</div>
          </div>
        </a>
      `;
    })
    .join('');
}

export function renderVideoGrid(data, containerEl) {
  const results = data?.results || [];

  if (results.length === 0) {
    containerEl.innerHTML = '<p class="text-sm text-slate-400">No videos found for this search.</p>';
    return;
  }

  containerEl.innerHTML = results
    .map((v) => {
      const thumb = v.thumbnail
        ? `<img src="${escapeHtml(v.thumbnail)}" alt="" loading="lazy" class="w-full h-full object-cover"/>`
        : '<div class="w-full h-full bg-gradient-to-tr from-navy-900 to-blue-700 flex items-center justify-center text-white text-3xl">▶</div>';
      const meta = [v.channel, v.views != null ? `${Number(v.views).toLocaleString()} views` : null, v.published_date]
        .filter(Boolean)
        .map(escapeHtml)
        .join(' · ');
      return `
        <button type="button" data-video-id="${escapeHtml(v.video_id || '')}" data-link="${escapeHtml(v.link || '')}"
                class="video-card text-left bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-card-subtle hover:shadow-card-elevated hover:border-blue-200 transition-all">
          <div class="relative aspect-video">
            ${thumb}
            ${v.length ? `<span class="absolute bottom-1.5 right-1.5 text-[10px] font-semibold bg-black/75 text-white px-1.5 py-0.5 rounded">${escapeHtml(v.length)}</span>` : ''}
          </div>
          <div class="p-3">
            <div class="font-display font-semibold text-sm text-slate-900 leading-snug line-clamp-2">${escapeHtml(v.title)}</div>
            <div class="text-[11px] text-slate-500 mt-1">${meta}</div>
          </div>
        </button>
      `;
    })
    .join('');
}

export function renderVideoPlayer(videoId, containerEl) {
  containerEl.classList.remove('hidden');
  containerEl.innerHTML = `
    <div class="relative aspect-video rounded-xl overflow-hidden bg-black">
      <iframe class="absolute inset-0 w-full h-full"
              src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1"
              title="YouTube video player" frameborder="0" allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
    </div>
  `;
  containerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function renderEventsList(data, containerEl) {
  const results = data?.results || [];

  if (results.length === 0) {
    containerEl.innerHTML = '<p class="text-sm text-slate-400">No upcoming events found.</p>';
    return;
  }

  containerEl.innerHTML = results
    .map(
      (e) => `
        <a href="${escapeHtml(e.link || '#')}" target="_blank" rel="noopener noreferrer"
           class="block bg-white border border-slate-200/90 rounded-xl p-4 shadow-card-subtle hover:shadow-card-elevated hover:border-blue-200 transition-all">
          <div class="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">${escapeHtml(e.when || 'Date TBA')}</div>
          <div class="font-display font-semibold text-sm text-slate-900 mt-1 leading-snug">${escapeHtml(e.title)}</div>
          <div class="text-xs text-slate-500 mt-1.5 leading-relaxed">📍 ${escapeHtml(e.address || e.venue || 'Venue TBA')}</div>
        </a>
      `
    )
    .join('');
}

export function renderScholarshipList(data, containerEl) {
  const results = data?.results || [];

  if (results.length === 0) {
    containerEl.innerHTML = '<p class="text-sm text-slate-400">No scholarships found for this search.</p>';
    return;
  }

  containerEl.innerHTML = results
    .map(
      (s) => `
        <a href="${escapeHtml(s.link || '#')}" target="_blank" rel="noopener noreferrer"
           class="block bg-white border border-slate-200/90 rounded-xl p-4 shadow-card-subtle hover:shadow-card-elevated hover:border-blue-200 transition-all">
          <div class="text-[11px] font-semibold text-blue-700 uppercase tracking-wider truncate">${escapeHtml(s.source || '')}</div>
          <div class="font-display font-semibold text-sm text-slate-900 mt-1 leading-snug">${escapeHtml(s.title)}</div>
          <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${escapeHtml(s.snippet)}</p>
        </a>
      `
    )
    .join('');
}

const TREND_COLORS = ['#2563eb', '#06b6d4', '#f59e0b', '#e11d48', '#10b981'];

export function renderTrendsChart(data, canvasEl, previousChart) {
  if (previousChart) previousChart.destroy();
  const { labels = [], series = [] } = data?.results || {};

  return new Chart(canvasEl, {
    type: 'line',
    data: {
      labels,
      datasets: series.map((s, i) => ({
        label: s.query,
        data: s.values,
        borderColor: TREND_COLORS[i % TREND_COLORS.length],
        backgroundColor: TREND_COLORS[i % TREND_COLORS.length],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
      scales: {
        y: { min: 0, max: 100, title: { display: true, text: 'Search interest' }, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
      },
    },
  });
}
