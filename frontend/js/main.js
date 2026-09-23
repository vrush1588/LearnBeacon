import {
  searchEducationQuery,
  getCollegesOnMap,
  getEducationNews,
  searchVideos,
  getEducationEvents,
  getTrends,
  searchScholarships,
} from './api.js';
import {
  renderSearchResults,
  renderCollegesOnMap,
  renderCollegesList,
  renderSourceBadge,
  renderNewsList,
  renderVideoGrid,
  renderVideoPlayer,
  renderEventsList,
  renderTrendsChart,
  renderScholarshipList,
} from './render.js';

function wireIndexPage() {
  const queryEl = document.getElementById('ai-research-query');
  const resultsPanel = document.getElementById('live-results-panel');
  const startButton = Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent.includes('Start AI Research')
  );

  if (!queryEl || !resultsPanel || !startButton) return;

  const labelEl = startButton.querySelector('span:not([class])');
  const originalLabel = labelEl ? labelEl.textContent : 'Start AI Research';

  async function runSearch() {
    const query = queryEl.value.trim();
    if (!query) return;

    startButton.disabled = true;
    startButton.classList.add('opacity-70', 'cursor-not-allowed');
    if (labelEl) labelEl.textContent = 'Researching...';

    resultsPanel.classList.remove('hidden');
    resultsPanel.innerHTML =
      '<p class="text-sm text-slate-400">Running AI research across live sources…</p>';

    try {
      const data = await searchEducationQuery(query);
      renderSearchResults(data, resultsPanel);
    } catch (err) {
      resultsPanel.innerHTML = `<p class="text-sm text-rose-400">Research failed: ${err.message}</p>`;
    } finally {
      startButton.disabled = false;
      startButton.classList.remove('opacity-70', 'cursor-not-allowed');
      if (labelEl) labelEl.textContent = originalLabel;
    }
  }

  startButton.addEventListener('click', runSearch);
  queryEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      runSearch();
    }
  });
}

function wireCollegesPage() {
  const mapEl = document.getElementById('college-map');
  const listEl = document.getElementById('colleges-list');
  if (!mapEl) return;

  const requestedCollege = new URLSearchParams(window.location.search).get('college');

  const map = L.map('college-map').setView([18.5204, 73.8567], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);
  const searchInput = document.getElementById('college-search-input');

  function loadColleges(query, focusCollege) {
    if (listEl) listEl.innerHTML = '<p class="text-sm text-slate-400">Loading colleges…</p>';

    return getCollegesOnMap(query)
      .then((data) => {
        markerLayer.clearLayers();
        const markersByName = renderCollegesOnMap(data, map, markerLayer);
        if (listEl) renderCollegesList(data, listEl);
        renderSourceBadge(data, document.getElementById('colleges-badge'));

        if (focusCollege && markersByName.has(focusCollege)) {
          const { marker, lat, lng } = markersByName.get(focusCollege);
          map.setView([lat, lng], 15);
          marker.openPopup();
        }
      })
      .catch((err) => {
        if (listEl) {
          listEl.innerHTML = `<p class="text-sm text-rose-600">Failed to load colleges: ${err.message}</p>`;
        }
      });
  }

  if (searchInput) {
    wireChips('.college-chip', (query) => {
      searchInput.value = query;
      loadColleges(query);
    });

    document.getElementById('college-search-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const query = searchInput.value.trim();
      if (query) loadColleges(query);
    });
  }

  loadColleges(searchInput?.value.trim() || 'Computer Engineering colleges Pune', requestedCollege);
}

function showError(containerEl, label, err) {
  containerEl.innerHTML = `<p class="text-sm text-rose-600">Failed to load ${label}: ${err.message}</p>`;
}

const CHIP_ACTIVE_CLASSES = ['bg-blue-600', 'text-white', 'border-blue-600'];
const CHIP_IDLE_CLASSES = ['bg-white', 'text-slate-600', 'border-slate-200', 'hover:border-blue-300'];

function wireChips(chipSelector, onSelect) {
  const chips = document.querySelectorAll(chipSelector);
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => {
        c.classList.remove(...CHIP_ACTIVE_CLASSES);
        c.classList.add(...CHIP_IDLE_CLASSES);
      });
      chip.classList.remove(...CHIP_IDLE_CLASSES);
      chip.classList.add(...CHIP_ACTIVE_CLASSES);
      onSelect(chip.dataset.query);
    });
  });
}

function wireDashboardNews() {
  const listEl = document.getElementById('dashboard-news');
  getEducationNews('education India', 5)
    .then((data) => {
      renderNewsList(data, listEl, { compact: true });
      renderSourceBadge(data, document.getElementById('dashboard-news-badge'));
    })
    .catch((err) => showError(listEl, 'news', err));
}

function wireLearnPage() {
  const newsEl = document.getElementById('news-list');
  const videosEl = document.getElementById('video-grid');
  const playerEl = document.getElementById('video-player');
  const eventsEl = document.getElementById('events-list');
  const trendsCanvas = document.getElementById('trends-chart');
  const trendsInput = document.getElementById('trends-input');
  const videoInput = document.getElementById('video-search-input');
  let trendsChart = null;

  function loadNews(query) {
    newsEl.innerHTML = '<p class="text-sm text-slate-400">Loading latest news…</p>';
    return getEducationNews(query, 5)
      .then((data) => {
        renderNewsList(data, newsEl);
        renderSourceBadge(data, document.getElementById('news-badge'));
      })
      .catch((err) => showError(newsEl, 'news', err));
  }

  function loadVideos(query) {
    videosEl.innerHTML = '<p class="text-sm text-slate-400">Searching YouTube…</p>';
    return searchVideos(query)
      .then((data) => {
        renderVideoGrid(data, videosEl);
        renderSourceBadge(data, document.getElementById('videos-badge'));
      })
      .catch((err) => showError(videosEl, 'videos', err));
  }

  function loadEvents(query) {
    return getEducationEvents(query)
      .then((data) => {
        renderEventsList(data, eventsEl);
        renderSourceBadge(data, document.getElementById('events-badge'));
      })
      .catch((err) => showError(eventsEl, 'events', err));
  }

  function loadTrends(terms) {
    return getTrends(terms)
      .then((data) => {
        trendsChart = renderTrendsChart(data, trendsCanvas, trendsChart);
        renderSourceBadge(data, document.getElementById('trends-badge'));
      })
      .catch((err) => showError(trendsCanvas.parentElement, 'trends', err));
  }

  wireChips('.news-chip', loadNews);
  wireChips('.video-chip', (query) => {
    videoInput.value = query;
    loadVideos(query);
  });

  document.getElementById('video-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = videoInput.value.trim();
    if (query) loadVideos(query);
  });

  document.getElementById('trends-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const terms = trendsInput.value.trim();
    if (terms) loadTrends(terms);
  });

  videosEl.addEventListener('click', (event) => {
    const card = event.target.closest('.video-card');
    if (!card) return;
    if (card.dataset.videoId) {
      renderVideoPlayer(card.dataset.videoId, playerEl);
    } else if (card.dataset.link) {
      window.open(card.dataset.link, '_blank', 'noopener');
    }
  });

  Promise.allSettled([
    loadNews('education India'),
    loadVideos(videoInput.value),
    // Events section is hidden on learn.html until the SerpApi plan supports google_events.
    eventsEl && loadEvents('education fair Pune'),
    loadTrends(trendsInput.value),
  ]);
}

function wireScholarshipsPage() {
  const listEl = document.getElementById('scholarships-list');
  const searchInput = document.getElementById('scholarship-search-input');

  function loadScholarships(query) {
    listEl.innerHTML = '<p class="text-sm text-slate-400">Searching scholarships…</p>';
    return searchScholarships(query)
      .then((data) => {
        renderScholarshipList(data, listEl);
        renderSourceBadge(data, document.getElementById('scholarships-badge'));
      })
      .catch((err) => showError(listEl, 'scholarships', err));
  }

  wireChips('.scholarship-chip', (query) => {
    searchInput.value = query;
    loadScholarships(query);
  });

  document.getElementById('scholarship-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (query) loadScholarships(query);
  });

  loadScholarships(searchInput.value.trim());
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('ai-research-query')) {
    wireIndexPage();
  }
  if (document.getElementById('college-map')) {
    wireCollegesPage();
  }
  if (document.getElementById('dashboard-news')) {
    wireDashboardNews();
  }
  if (document.getElementById('learn-hub')) {
    wireLearnPage();
  }
  if (document.getElementById('scholarships-hub')) {
    wireScholarshipsPage();
  }
});
