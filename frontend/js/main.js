import { searchEducationQuery, getCollegesOnMap } from './api.js';
import { renderSearchResults, renderCollegesOnMap, renderCollegesList } from './render.js';

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

  getCollegesOnMap('Computer Engineering colleges Pune')
    .then((data) => {
      const markersByName = renderCollegesOnMap(data, map);
      if (listEl) renderCollegesList(data, listEl);

      if (requestedCollege && markersByName.has(requestedCollege)) {
        const { marker, lat, lng } = markersByName.get(requestedCollege);
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('ai-research-query')) {
    wireIndexPage();
  }
  if (document.getElementById('college-map')) {
    wireCollegesPage();
  }
});
