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
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mt-2">
            <span class="text-slate-400">${c.reviews ?? 0} reviews</span>
            ${c.website ? `<a href="${escapeHtml(c.website)}" target="_blank" rel="noopener noreferrer" class="font-semibold text-blue-600 hover:underline">Website ↗</a>` : ''}
            ${c.maps_link ? `<a href="${escapeHtml(c.maps_link)}" target="_blank" rel="noopener noreferrer" class="font-semibold text-blue-600 hover:underline">Google Maps ↗</a>` : ''}
          </div>
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

export function renderBookGrid(data, containerEl) {
  const results = data?.results || [];

  if (results.length === 0) {
    containerEl.innerHTML = '<p class="text-sm text-slate-400">No books found for this search.</p>';
    return;
  }

  containerEl.innerHTML = results
    .map((b) => {
      const cover = b.thumbnail
        ? `<img src="${escapeHtml(b.thumbnail)}" alt="" loading="lazy" class="w-full h-full object-cover"/>`
        : '<div class="w-full h-full bg-gradient-to-tr from-navy-900 to-blue-700 flex items-center justify-center text-white text-3xl">📘</div>';
      const price = b.free
        ? '<span class="text-xs font-bold text-emerald-600">Free</span>'
        : b.price
          ? `<span class="text-xs font-bold text-slate-900">${escapeHtml(b.price)}</span>`
          : '';
      const originalPrice = b.original_price && !b.free
        ? `<span class="text-[11px] text-slate-400 line-through">${escapeHtml(b.original_price)}</span>`
        : '';
      const rating = b.rating != null ? `<span class="text-[11px] text-amber-600">★ ${escapeHtml(b.rating)}</span>` : '';
      return `
        <a href="${escapeHtml(b.link || '#')}" target="_blank" rel="noopener noreferrer"
           class="flex flex-col bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-card-subtle hover:shadow-card-elevated hover:border-blue-200 transition-all">
          <div class="aspect-[3/4] bg-slate-100">${cover}</div>
          <div class="p-2.5 flex flex-col gap-1 flex-1">
            <div class="font-display font-semibold text-xs text-slate-900 leading-snug line-clamp-3" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</div>
            ${b.author ? `<div class="text-[11px] text-slate-500 truncate">${escapeHtml(b.author)}</div>` : ''}
            <div class="mt-auto flex items-center gap-1.5 flex-wrap">${price}${originalPrice}${rating}</div>
          </div>
        </a>
      `;
    })
    .join('');
}

export function renderResearchList(data, containerEl) {
  const results = data?.results || [];

  if (results.length === 0) {
    containerEl.innerHTML = '<p class="text-sm text-slate-400">No research papers found for this search.</p>';
    return;
  }

  const pill = 'text-[11px] font-semibold px-2 py-0.5 rounded-full border';
  containerEl.innerHTML = results
    .map((p) => {
      const citedBy = p.cited_by != null
        ? p.cited_by_link
          ? `<a href="${escapeHtml(p.cited_by_link)}" target="_blank" rel="noopener noreferrer" class="${pill} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">Cited by ${escapeHtml(Number(p.cited_by).toLocaleString())}</a>`
          : `<span class="${pill} bg-blue-50 text-blue-700 border-blue-200">Cited by ${escapeHtml(Number(p.cited_by).toLocaleString())}</span>`
        : '';
      const pdf = p.pdf_link
        ? `<a href="${escapeHtml(p.pdf_link)}" target="_blank" rel="noopener noreferrer" class="${pill} bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100">PDF</a>`
        : '';
      return `
        <div class="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-card-subtle hover:border-blue-200 transition-all">
          <a href="${escapeHtml(p.link || '#')}" target="_blank" rel="noopener noreferrer"
             class="font-display font-semibold text-sm text-slate-900 leading-snug hover:text-blue-700">${escapeHtml(p.title)}</a>
          ${p.authors ? `<div class="text-[11px] text-emerald-700 mt-1">${escapeHtml(p.authors)}</div>` : ''}
          ${p.snippet ? `<p class="text-xs text-slate-600 mt-1.5 line-clamp-3">${escapeHtml(p.snippet)}</p>` : ''}
          ${citedBy || pdf ? `<div class="flex items-center gap-2 mt-2">${citedBy}${pdf}</div>` : ''}
        </div>
      `;
    })
    .join('');
}

export function renderCareerPaths(data, containerEl, interests = []) {
  const paths = data?.results || [];
  const matches = (p) => p.interests.some((i) => interests.includes(i));
  // Paths that match the student's interests come first.
  const sorted = [...paths].sort((a, b) => Number(matches(b)) - Number(matches(a)));
  const line = (label, items) =>
    `<div class="text-[11px] text-slate-500 mt-1.5"><span class="font-semibold text-slate-700">${label}:</span> ${items
      .map(escapeHtml)
      .join(' · ')}</div>`;

  containerEl.innerHTML = sorted
    .map((p) => {
      const match = matches(p);
      return `
        <div class="flex flex-col rounded-xl border p-4 ${match ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white'} shadow-card-subtle">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-display font-semibold text-sm text-slate-900">${escapeHtml(p.title)}</h3>
            ${match ? '<span class="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Matches your interests</span>' : ''}
          </div>
          ${line('Course', p.courses)}
          ${line('Entrance', p.exams)}
          ${line('Careers', p.careers)}
          <button type="button" data-job-query="${escapeHtml(p.job_query)}" data-video-query="${escapeHtml(p.video_query)}" data-title="${escapeHtml(p.title)}"
                  class="explore-path mt-3 self-start text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full px-3 py-1 transition-colors">
            See jobs &amp; videos →
          </button>
        </div>
      `;
    })
    .join('');
}

export function renderJobList(data, containerEl) {
  const results = data?.results || [];

  if (results.length === 0) {
    containerEl.innerHTML = '<p class="text-sm text-slate-400">No live jobs found for this path right now.</p>';
    return;
  }

  containerEl.innerHTML = results
    .map((j) => {
      const meta = [j.posted, j.job_type, j.via ? `via ${j.via}` : null].filter(Boolean).map(escapeHtml).join(' · ');
      return `
        <a href="${escapeHtml(j.apply_link || '#')}" target="_blank" rel="noopener noreferrer"
           class="block bg-white border border-slate-200/90 rounded-xl p-3 shadow-card-subtle hover:shadow-card-elevated hover:border-blue-200 transition-all">
          <div class="font-display font-semibold text-sm text-slate-900 leading-snug">${escapeHtml(j.title)}</div>
          <div class="text-xs text-slate-600 mt-0.5">${escapeHtml(j.company || '')}${j.location ? ` · ${escapeHtml(j.location)}` : ''}</div>
          <div class="flex flex-wrap items-center gap-2 mt-1.5">
            ${j.salary ? `<span class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">${escapeHtml(j.salary)}</span>` : ''}
            <span class="text-[11px] text-slate-500">${meta}</span>
          </div>
        </a>
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

const AGENT_TOOL_LABELS = {
  search_web: ['🔎', 'Searching the web'],
  find_colleges: ['📍', 'Mapping colleges'],
  get_education_news: ['📰', 'Reading education news'],
  search_scholarships: ['🎓', 'Searching scholarships'],
  search_videos: ['▶️', 'Finding videos'],
  search_books: ['📚', 'Finding study books'],
  search_jobs: ['💼', 'Checking live jobs'],
  get_search_trends: ['📈', 'Checking search trends'],
};

export function renderAgentShell(query, containerEl, reason = '') {
  containerEl.classList.remove('hidden');
  containerEl.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs font-semibold text-slate-700 uppercase tracking-wider">AI Research Agent · "${escapeHtml(query)}"</span>
      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">Gemini + SerpApi</span>
    </div>
    <p class="text-[11px] text-slate-500 mb-3">✨ AI agent${reason ? ` · ${escapeHtml(reason)}` : ''}</p>
    <ol class="space-y-1.5 mb-4" data-agent-steps>
      <li class="text-xs text-slate-400">Planning research…</li>
    </ol>
    <div data-agent-answer></div>
    <div class="flex flex-wrap gap-2 mt-3" data-agent-colleges></div>
  `;
}

export function renderAgentStep(step, containerEl) {
  const list = containerEl.querySelector('[data-agent-steps]');
  if (!list) return;
  if (list.dataset.started !== 'true') {
    list.innerHTML = '';
    list.dataset.started = 'true';
  }
  const [icon, label] = AGENT_TOOL_LABELS[step.tool] || ['🛠️', step.tool];
  const detail = Object.values(step.input || {}).join(', ');
  list.insertAdjacentHTML(
    'beforeend',
    `<li class="flex items-start gap-2 text-xs text-slate-600">
       <span>${icon}</span>
       <span><span class="font-semibold text-slate-800">${escapeHtml(label)}</span>${detail ? `: ${escapeHtml(detail)}` : ''}</span>
     </li>`
  );
}

function markdownToSafeHtml(markdown) {
  if (window.marked && window.DOMPurify) {
    return window.DOMPurify.sanitize(window.marked.parse(markdown));
  }
  // CDN unavailable: show plain text safely.
  return `<p>${escapeHtml(markdown).replace(/\n/g, '<br>')}</p>`;
}

export function renderAgentAnswer(markdown, containerEl) {
  const answerEl = containerEl.querySelector('[data-agent-answer]');
  if (!answerEl) return;
  answerEl.className =
    'text-sm text-slate-700 leading-relaxed space-y-2 [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline [&_table]:w-full [&_table]:text-xs [&_table]:border [&_table]:border-slate-200 [&_th]:bg-slate-50 [&_th]:text-left [&_th]:font-semibold [&_th]:px-2 [&_th]:py-1.5 [&_td]:px-2 [&_td]:py-1.5 [&_td]:border-t [&_td]:border-slate-200 [&_td]:align-top';
  answerEl.innerHTML = markdownToSafeHtml(markdown);
  answerEl.querySelectorAll('a[href]').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
}

export function renderAgentColleges(names, containerEl) {
  const chipsEl = containerEl.querySelector('[data-agent-colleges]');
  if (!chipsEl) return;
  chipsEl.innerHTML = (names || [])
    .map(
      (name) => `
        <a href="colleges.html?college=${encodeURIComponent(name)}"
           class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full px-2.5 py-1 transition-colors">
          📍 View on map: ${escapeHtml(name)}
        </a>
      `
    )
    .join('');
}

export function renderAgentNotice(message, containerEl) {
  const answerEl = containerEl.querySelector('[data-agent-answer]');
  if (!answerEl) return;
  answerEl.insertAdjacentHTML(
    'beforebegin',
    `<p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">${escapeHtml(message)}</p>`
  );
}

export function renderQuickSearchBanner(reason, containerEl, onAskAgent) {
  containerEl.insertAdjacentHTML(
    'afterbegin',
    `<div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
       <span class="text-[11px] text-slate-500">⚡ Quick search${reason ? ` · ${escapeHtml(reason)}` : ''}</span>
       <button type="button" data-ask-agent
               class="text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full px-2.5 py-1 transition-colors">
         ✨ Ask the AI agent instead
       </button>
     </div>`
  );
  containerEl.querySelector('[data-ask-agent]').addEventListener('click', onAskAgent);
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
