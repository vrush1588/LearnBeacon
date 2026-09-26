import {
  searchEducationQuery,
  getCollegesOnMap,
  getEducationNews,
  searchVideos,
  getEducationEvents,
  getTrends,
  searchScholarships,
  searchBooks,
  searchResearch,
  getCareerPaths,
  searchJobs,
  streamAgent,
} from './api.js';
import {
  renderSearchResults,
  renderCollegesOnMap,
  renderCollegesList,
  renderSourceBadge,
  renderNewsList,
  renderVideoGrid,
  renderVideoPlayer,
  renderBookGrid,
  renderResearchList,
  renderCareerPaths,
  renderJobList,
  renderEventsList,
  renderTrendsChart,
  renderScholarshipList,
  renderAgentShell,
  renderAgentStep,
  renderAgentAnswer,
  renderAgentColleges,
  renderAgentNotice,
  renderQuickSearchBanner,
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

  function setBusy(busy) {
    startButton.disabled = busy;
    startButton.classList.toggle('opacity-70', busy);
    startButton.classList.toggle('cursor-not-allowed', busy);
    if (labelEl) labelEl.textContent = busy ? 'Researching...' : originalLabel;
  }

  // Research mode switch (Auto / Quick search / AI agent), remembered per browser.
  const MODE_KEY = 'learnbeacon.researchMode';
  const modeButtons = document.querySelectorAll('.research-mode');
  let researchMode = 'auto';
  try {
    researchMode = localStorage.getItem(MODE_KEY) || 'auto';
  } catch {
    // storage unavailable: keep default
  }

  function applyMode(mode) {
    researchMode = mode;
    modeButtons.forEach((btn) => {
      const active = btn.dataset.mode === mode;
      btn.setAttribute('aria-checked', String(active));
      btn.classList.toggle('bg-white', active);
      btn.classList.toggle('text-navy-900', active);
      btn.classList.toggle('text-slate-300', !active);
      btn.classList.toggle('hover:text-white', !active);
    });
  }

  modeButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      applyMode(btn.dataset.mode);
      try {
        localStorage.setItem(MODE_KEY, btn.dataset.mode);
      } catch {
        // ignore
      }
    })
  );
  applyMode(['auto', 'search', 'agent'].includes(researchMode) ? researchMode : 'auto');

  // Original behaviour: top web results. Used for quick search and as the agent fallback.
  async function runPlainSearch(query, notice, quickReason) {
    resultsPanel.classList.remove('hidden');
    resultsPanel.innerHTML =
      '<p class="text-sm text-slate-400">Running AI research across live sources…</p>';

    try {
      const data = await searchEducationQuery(query);
      renderSearchResults(data, resultsPanel);
      if (quickReason) {
        renderQuickSearchBanner(quickReason, resultsPanel, () => runSearch('agent'));
      }
      if (notice) {
        resultsPanel.insertAdjacentHTML(
          'afterbegin',
          `<p class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">${notice}</p>`
        );
      }
    } catch (err) {
      resultsPanel.innerHTML = `<p class="text-sm text-rose-400">Research failed: ${err.message}</p>`;
    } finally {
      setBusy(false);
    }
  }

  let stopAgent = null;

  function runSearch(modeOverride) {
    const query = queryEl.value.trim();
    if (!query || startButton.disabled) return;

    setBusy(true);
    stopAgent?.();
    resultsPanel.classList.remove('hidden');
    resultsPanel.innerHTML = '<p class="text-sm text-slate-400">Choosing the best way to answer…</p>';
    let answered = false;

    stopAgent = streamAgent(query, {
      route: ({ mode, reason }) => {
        if (mode === 'search') {
          runPlainSearch(query, null, reason);
        } else {
          renderAgentShell(query, resultsPanel, reason);
        }
      },
      step: (step) => renderAgentStep(step, resultsPanel),
      answer: ({ markdown }) => {
        answered = true;
        renderAgentAnswer(markdown, resultsPanel);
      },
      colleges: ({ names }) => renderAgentColleges(names, resultsPanel),
      agentError: ({ message }) => {
        if (answered) {
          renderAgentNotice(message, resultsPanel);
        } else {
          runPlainSearch(query, `${message} Showing top web results instead.`);
        }
      },
      unavailable: () =>
        runPlainSearch(query, 'AI agent is not configured (add GEMINI_API_KEY). Showing quick search results.'),
      // Without an answer, the plain-search fallback owns the busy state.
      done: () => answered && setBusy(false),
      connectionError: () => {
        if (!answered) {
          runPlainSearch(query, 'The AI agent could not be reached. Showing top web results instead.');
        } else {
          setBusy(false);
        }
      },
    }, modeOverride || researchMode);
  }

  document.querySelectorAll('.try-asking').forEach((pill) => {
    pill.addEventListener('click', () => {
      queryEl.value = pill.dataset.query;
      runSearch();
    });
  });

  startButton.addEventListener('click', () => runSearch());
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
  const booksEl = document.getElementById('book-grid');
  const bookInput = document.getElementById('book-search-input');
  const researchEl = document.getElementById('research-list');
  const researchInput = document.getElementById('research-search-input');
  const researchSince = document.getElementById('research-since');
  let trendsChart = null;

  function loadNews(query) {
    newsEl.innerHTML = '<p class="text-sm text-slate-400">Loading latest news…</p>';
    return getEducationNews(query, 10)
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

  function loadBooks(query) {
    booksEl.innerHTML = '<p class="text-sm text-slate-400">Searching Google Play Books…</p>';
    return searchBooks(query)
      .then((data) => {
        renderBookGrid(data, booksEl);
        renderSourceBadge(data, document.getElementById('books-badge'));
      })
      .catch((err) => showError(booksEl, 'books', err));
  }

  function loadResearch(query) {
    researchEl.innerHTML = '<p class="text-sm text-slate-400">Searching Google Scholar…</p>';
    return searchResearch(query, researchSince.value)
      .then((data) => {
        renderResearchList(data, researchEl);
        renderSourceBadge(data, document.getElementById('research-badge'));
      })
      .catch((err) => showError(researchEl, 'research papers', err));
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

  wireChips('.book-chip', (query) => {
    bookInput.value = query;
    loadBooks(query);
  });

  document.getElementById('book-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = bookInput.value.trim();
    if (query) loadBooks(query);
  });

  wireChips('.research-chip', (query) => {
    researchInput.value = query;
    loadResearch(query);
  });

  document.getElementById('research-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = researchInput.value.trim();
    if (query) loadResearch(query);
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
    loadBooks(bookInput.value),
    loadResearch(researchInput.value),
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

function wireCareersPage() {
  const form = document.getElementById('career-profile-form');
  const levelEl = document.getElementById('career-level');
  const branchEl = document.getElementById('career-branch');
  const branchField = document.getElementById('career-branch-field');
  const scoreEl = document.getElementById('career-score');
  const pathsEl = document.getElementById('career-paths');
  const exploreEl = document.getElementById('career-explore');
  const jobsEl = document.getElementById('career-jobs');
  const videosEl = document.getElementById('video-grid');
  const playerEl = document.getElementById('video-player');
  const advisorEl = document.getElementById('career-advisor');
  const aiButton = document.getElementById('career-ai-button');
  const interestChips = document.querySelectorAll('.interest-chip');
  let lastPaths = null;
  let stopAgent = null;

  const selectedText = (select) => select.options[select.selectedIndex].text;
  const isBtech = () => levelEl.value === 'btech';
  const selectedInterests = () =>
    [...interestChips].filter((c) => c.getAttribute('aria-pressed') === 'true');

  function loadPaths() {
    branchField.classList.toggle('hidden', !isBtech());
    branchField.classList.toggle('block', isBtech());
    pathsEl.innerHTML = '<p class="text-sm text-slate-400">Loading your options…</p>';
    getCareerPaths(levelEl.value, isBtech() ? branchEl.value : '')
      .then((data) => {
        lastPaths = data;
        const title = data.branch_label ? `${data.level_label} (${data.branch_label})` : data.level_label;
        document.getElementById('career-paths-title').textContent = `Your options after ${title}`;
        renderCareerPaths(data, pathsEl, selectedInterests().map((c) => c.dataset.interest));
      })
      .catch((err) => showError(pathsEl, 'career options', err));
  }

  function explore(button) {
    exploreEl.classList.remove('hidden');
    exploreEl.classList.add('grid');
    document.getElementById('career-jobs-title').textContent = `Live jobs in Pune: ${button.dataset.title}`;
    jobsEl.innerHTML = '<p class="text-sm text-slate-400">Searching Google Jobs…</p>';
    videosEl.innerHTML = '<p class="text-sm text-slate-400">Searching YouTube…</p>';
    playerEl.classList.add('hidden');
    exploreEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    searchJobs(button.dataset.jobQuery)
      .then((data) => {
        renderJobList(data, jobsEl);
        renderSourceBadge(data, document.getElementById('jobs-badge'));
      })
      .catch((err) => showError(jobsEl, 'jobs', err));
    searchVideos(button.dataset.videoQuery)
      .then((data) => {
        renderVideoGrid(data, videosEl);
        renderSourceBadge(data, document.getElementById('videos-badge'));
      })
      .catch((err) => showError(videosEl, 'videos', err));
  }

  function buildQuestion() {
    const education = isBtech() ? `${selectedText(levelEl)} in ${selectedText(branchEl)}` : selectedText(levelEl);
    const score = scoreEl.value.trim();
    const interests = selectedInterests().map((c) => c.dataset.label);
    return [
      `I have completed ${education}${score ? ` with ${score}` : ''}.`,
      interests.length ? `I'm interested in ${interests.join(', ')}.` : '',
      'I live in Maharashtra (Pune). What are my best career paths? For each, give the course and entrance exam,',
      'typical roles, and how job demand and fresher salaries look in Pune right now.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  function askAdvisor() {
    stopAgent?.();
    const question = buildQuestion();
    aiButton.disabled = true;
    const done = () => {
      aiButton.disabled = false;
    };
    renderAgentShell(question, advisorEl, 'Career guidance');
    advisorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    stopAgent = streamAgent(
      question,
      {
        step: (step) => renderAgentStep(step, advisorEl),
        answer: ({ markdown }) => renderAgentAnswer(markdown, advisorEl),
        colleges: ({ names }) => renderAgentColleges(names, advisorEl),
        agentError: ({ message }) => renderAgentNotice(message, advisorEl),
        unavailable: () => {
          renderAgentNotice('The AI advisor is not configured (add GEMINI_API_KEY). Your options below still work.', advisorEl);
          done();
        },
        done,
        connectionError: () => {
          renderAgentNotice('The AI advisor could not be reached. Please try again.', advisorEl);
          done();
        },
      },
      'agent'
    );
  }

  interestChips.forEach((chip) => {
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      const on = chip.getAttribute('aria-pressed') !== 'true';
      chip.setAttribute('aria-pressed', String(on));
      chip.classList.toggle('bg-blue-600', on);
      chip.classList.toggle('text-white', on);
      chip.classList.toggle('border-blue-600', on);
      chip.classList.toggle('bg-white', !on);
      chip.classList.toggle('text-slate-600', !on);
      chip.classList.toggle('border-slate-200', !on);
      if (lastPaths) renderCareerPaths(lastPaths, pathsEl, selectedInterests().map((c) => c.dataset.interest));
    });
  });

  levelEl.addEventListener('change', loadPaths);
  branchEl.addEventListener('change', loadPaths);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    askAdvisor();
  });

  pathsEl.addEventListener('click', (event) => {
    const button = event.target.closest('.explore-path');
    if (button) explore(button);
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

  loadPaths();
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
  if (document.getElementById('careers-hub')) {
    wireCareersPage();
  }
});
