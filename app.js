import { CATALOG, DEVOTIONALS } from './catalog.js';

// State Management
const STATE = {
  currentEpisode: null,
  currentCategory: null,
  watchlist: JSON.parse(localStorage.getItem('brunno_live_watchlist') || '[]'),
  activeFilter: 'all'
};

// DOM Elements
const DOM = {
  navbar: document.getElementById('navbar'),
  mobileToggle: document.getElementById('mobile-toggle'),
  navMenu: document.getElementById('nav-menu'),
  searchBox: document.getElementById('search-box'),
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  searchResultsSection: document.getElementById('search-results-section'),
  searchTermDisplay: document.getElementById('search-term-display'),
  searchGrid: document.getElementById('search-grid'),
  clearSearchView: document.getElementById('clear-search-view'),
  catalogContainer: document.getElementById('catalog-container'),
  filterPills: document.getElementById('filter-pills'),
  listCount: document.getElementById('list-count'),
  toast: document.getElementById('toast'),

  // Hero Elements
  heroBgImage: document.getElementById('hero-bg-image'),
  heroBadge: document.getElementById('hero-badge'),
  heroTitle: document.getElementById('hero-title'),
  heroSubtitle: document.getElementById('hero-subtitle'),
  heroSynopsis: document.getElementById('hero-synopsis'),
  heroTags: document.getElementById('hero-tags'),
  heroPlayBtn: document.getElementById('hero-play-btn'),
  heroInfoBtn: document.getElementById('hero-info-btn'),
  heroAddListBtn: document.getElementById('hero-add-list-btn'),

  // Devotionals Hub Elements
  devotionalsSection: document.getElementById('devocionais'),
  devotionalsGrid: document.getElementById('devotionals-grid'),

  // Modal Elements
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalWindow: document.getElementById('modal-window'),
  modalClose: document.getElementById('modal-close'),
  youtubePlayer: document.getElementById('youtube-player'),
  modalDay: document.getElementById('modal-day'),
  modalDuration: document.getElementById('modal-duration'),
  modalCategory: document.getElementById('modal-category'),
  modalTitle: document.getElementById('modal-title'),
  modalSubtitle: document.getElementById('modal-subtitle'),
  modalScriptureContainer: document.getElementById('modal-scripture-container'),
  modalScripture: document.getElementById('modal-scripture'),
  modalPdfContainer: document.getElementById('modal-pdf-container'),
  modalPdfTitle: document.getElementById('modal-pdf-title'),
  modalPdfDesc: document.getElementById('modal-pdf-desc'),
  modalPdfBtn: document.getElementById('modal-pdf-btn'),
  modalPdfBtnText: document.getElementById('modal-pdf-btn-text'),
  modalSynopsis: document.getElementById('modal-synopsis'),
  modalChaptersContainer: document.getElementById('modal-chapters-container'),
  modalChaptersList: document.getElementById('modal-chapters-list'),
  nextEpisodeCard: document.getElementById('next-episode-card'),
  nextThumb: document.getElementById('next-thumb'),
  nextTitle: document.getElementById('next-title'),
  nextSubtitle: document.getElementById('next-subtitle'),
  btnPlayNext: document.getElementById('btn-play-next'),
  modalAddListBtn: document.getElementById('modal-add-list-btn'),
  modalShareBtn: document.getElementById('modal-share-btn')
};

// Initialize Application
function init() {
  renderHero();
  renderCatalog();
  renderDevotionals();
  updateWatchlistBadge();
  setupEventListeners();
}

// Render Hero Billboard
function renderHero() {
  const feat = CATALOG.featured;
  const firstEp = CATALOG.categories[0].episodes[0];

  DOM.heroBgImage.style.backgroundImage = `url('https://i.ytimg.com/vi/${firstEp.videoId}/maxresdefault.jpg')`;
  DOM.heroBadge.textContent = feat.badge;
  DOM.heroTitle.textContent = feat.title;
  DOM.heroSubtitle.textContent = feat.subtitle;
  DOM.heroSynopsis.textContent = feat.synopsis;

  DOM.heroTags.innerHTML = feat.tags.map(t => `<span class="tag-pill">${t}</span>`).join('');

  DOM.heroPlayBtn.onclick = () => openPlayerModal(firstEp, CATALOG.categories[0]);
  DOM.heroInfoBtn.onclick = () => openPlayerModal(firstEp, CATALOG.categories[0]);

  updateHeroListButton(firstEp.id);
  DOM.heroAddListBtn.onclick = () => {
    toggleWatchlist(firstEp);
    updateHeroListButton(firstEp.id);
  };
}

function updateHeroListButton(epId) {
  const isSaved = STATE.watchlist.some(item => item.id === epId);
  DOM.heroAddListBtn.innerHTML = isSaved
    ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" color="#D4AF37"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
    : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
}

// Render Catalog Rows
function renderCatalog() {
  DOM.catalogContainer.innerHTML = '';

  CATALOG.categories.forEach(category => {
    const rowEl = document.createElement('section');
    rowEl.className = 'catalog-row';
    rowEl.id = category.id;

    rowEl.innerHTML = `
      <div class="row-header">
        <div class="row-title-group">
          <h2 class="row-title">${category.title}</h2>
          <span class="row-badge">${category.badge}</span>
        </div>
        <p class="row-subtitle">${category.subtitle}</p>
      </div>
      <div class="cards-slider">
        ${category.episodes.map(ep => createCardHTML(ep, category)).join('')}
      </div>
    `;

    DOM.catalogContainer.appendChild(rowEl);
  });

  // Attach card event listeners
  document.querySelectorAll('.video-card').forEach(card => {
    const epId = card.getAttribute('data-id');
    const catId = card.getAttribute('data-category');
    const cat = CATALOG.categories.find(c => c.id === catId);
    const ep = cat?.episodes.find(e => e.id === epId);

    if (ep) {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-btn-action')) return;
        openPlayerModal(ep, cat);
      });

      const listBtn = card.querySelector('.card-btn-list');
      if (listBtn) {
        listBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleWatchlist(ep);
          renderCatalog();
        });
      }
    }
  });
}

// Helper: Card HTML Template
function createCardHTML(ep, category) {
  const isSaved = STATE.watchlist.some(item => item.id === ep.id);
  const thumbUrl = `https://i.ytimg.com/vi/${ep.videoId}/hqdefault.jpg`;

  return `
    <article class="video-card" data-id="${ep.id}" data-category="${category.id}">
      <div class="card-media">
        <img class="card-thumb" src="${thumbUrl}" alt="${ep.title}" loading="lazy">
        <div class="card-overlay-gradient"></div>
        <span class="card-day-tag">${ep.day}</span>
        <span class="card-duration">${ep.duration}</span>
        <div class="card-play-hover">
          <div class="card-play-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
        </div>
      </div>
      <div class="card-content">
        <div class="card-meta-row">
          <span class="card-badge">${ep.badge || 'HD'}</span>
          <span class="card-tag">Episódio ${ep.number}</span>
          ${ep.pdfMaterial ? `<span class="card-pdf-indicator">📄 PDF</span>` : ''}
        </div>
        <h3 class="card-title">${ep.title}</h3>
        <p class="card-synopsis">${ep.synopsis}</p>
        <div class="card-footer">
          <div class="card-tags-list">
            ${ep.tags ? ep.tags.slice(0, 2).map(t => `<span class="card-tag">• ${t}</span>`).join('') : ''}
          </div>
          <button class="card-btn-action card-btn-list" title="${isSaved ? 'Remover da Minha Lista' : 'Adicionar à Minha Lista'}">
            ${isSaved ? '★' : '＋'}
          </button>
        </div>
      </div>
    </article>
  `;
}

// Render Devotionals Dedicated Grid
function renderDevotionals() {
  if (!DOM.devotionalsGrid) return;

  DOM.devotionalsGrid.innerHTML = DEVOTIONALS.map(dev => {
    return `
      <article class="devotional-card" id="${dev.id}">
        <div class="devotional-card-glow"></div>
        <div class="devotional-card-header">
          <div class="devotional-icon-box">
            <span class="devotional-icon">${dev.icon}</span>
          </div>
          <div class="devotional-badge-col">
            <span class="badge-gold">${dev.day}</span>
            <span class="devotional-format-badge">PDF OFICIAL</span>
          </div>
        </div>

        <div class="devotional-card-body">
          <h3 class="devotional-title">${dev.title}</h3>
          <p class="devotional-theme">${dev.theme}</p>
          <div class="devotional-scripture">
            <span class="scripture-pill">📖 ${dev.scripture}</span>
          </div>
        </div>

        <div class="devotional-card-actions">
          <a href="${dev.pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-gold btn-dev-download">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Baixar PDF</span>
          </a>

          <button class="btn btn-secondary btn-dev-watch" data-epid="${dev.episodeId}" title="Assistir ministração">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Assistir</span>
          </button>
        </div>
      </article>
    `;
  }).join('');

  // Attach watch button click listeners
  DOM.devotionalsGrid.querySelectorAll('.btn-dev-watch').forEach(btn => {
    btn.addEventListener('click', () => {
      const epId = btn.getAttribute('data-epid');
      const cat = CATALOG.categories[0];
      const ep = cat.episodes.find(e => e.id === epId);
      if (ep) {
        openPlayerModal(ep, cat);
      }
    });
  });
}

// Open Cinematic Player Modal
function openPlayerModal(episode, category, startTime = 0) {
  STATE.currentEpisode = episode;
  STATE.currentCategory = category;

  // Set YouTube Embed URL
  const autoPlayParam = 'autoplay=1&rel=0&modestbranding=1';
  const startParam = startTime > 0 ? `&start=${startTime}` : '';
  DOM.youtubePlayer.src = `https://www.youtube-nocookie.com/embed/${episode.videoId}?${autoPlayParam}${startParam}`;

  // Populate Meta Info
  DOM.modalDay.textContent = episode.day;
  DOM.modalDuration.textContent = episode.duration;
  DOM.modalCategory.textContent = category.title;
  DOM.modalTitle.textContent = episode.title;
  DOM.modalSubtitle.textContent = episode.subtitle || '';
  DOM.modalSynopsis.textContent = episode.synopsis;

  // Scripture Base
  if (episode.scripture) {
    DOM.modalScriptureContainer.style.display = 'flex';
    DOM.modalScripture.textContent = episode.scripture;
  } else {
    DOM.modalScriptureContainer.style.display = 'none';
  }

  // PDF Material Download Section
  if (episode.pdfMaterial) {
    DOM.modalPdfContainer.style.display = 'flex';
    DOM.modalPdfTitle.textContent = episode.pdfMaterial.title;
    DOM.modalPdfDesc.textContent = episode.pdfMaterial.subtitle;
    DOM.modalPdfBtn.href = episode.pdfMaterial.downloadUrl;
    DOM.modalPdfBtnText.textContent = episode.pdfMaterial.buttonLabel || 'Baixar Devocional (PDF)';
  } else {
    DOM.modalPdfContainer.style.display = 'none';
  }

  // Chapters & Timestamps
  if (episode.timestamps && episode.timestamps.length > 0) {
    DOM.modalChaptersContainer.style.display = 'block';
    DOM.modalChaptersList.innerHTML = episode.timestamps.map(t => `
      <div class="chapter-item" data-seconds="${t.seconds}">
        <span class="chapter-time">${t.time}</span>
        <span class="chapter-label">${t.label}</span>
        <span class="chapter-arrow">Pular ▶</span>
      </div>
    `).join('');

    DOM.modalChaptersList.querySelectorAll('.chapter-item').forEach(item => {
      item.onclick = () => {
        const secs = parseInt(item.getAttribute('data-seconds'), 10);
        jumpToVideoTime(episode.videoId, secs);
      };
    });
  } else {
    DOM.modalChaptersContainer.style.display = 'none';
  }

  // Next Episode Card
  const currentIndex = category.episodes.findIndex(e => e.id === episode.id);
  const nextEp = category.episodes[currentIndex + 1];

  if (nextEp) {
    DOM.nextEpisodeCard.style.display = 'block';
    DOM.nextThumb.style.backgroundImage = `url('https://i.ytimg.com/vi/${nextEp.videoId}/hqdefault.jpg')`;
    DOM.nextTitle.textContent = `${nextEp.day}: ${nextEp.title}`;
    DOM.nextSubtitle.textContent = nextEp.synopsis;
    DOM.btnPlayNext.onclick = () => openPlayerModal(nextEp, category);
  } else {
    DOM.nextEpisodeCard.style.display = 'none';
  }

  // Update Modal Buttons
  updateModalListButton(episode.id);

  DOM.modalAddListBtn.onclick = () => {
    toggleWatchlist(episode);
    updateModalListButton(episode.id);
    renderCatalog();
  };

  DOM.modalShareBtn.onclick = () => shareEpisode(episode);

  // Show Modal
  DOM.modalBackdrop.classList.add('active');
  DOM.modalBackdrop.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function jumpToVideoTime(videoId, seconds) {
  DOM.youtubePlayer.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&start=${seconds}&rel=0`;
  showToast(`Avançado para o momento selecionado!`);
}

function updateModalListButton(epId) {
  const isSaved = STATE.watchlist.some(item => item.id === epId);
  DOM.modalAddListBtn.innerHTML = isSaved
    ? `<span class="action-icon">✓</span><span class="action-text">Na Lista</span>`
    : `<span class="action-icon">＋</span><span class="action-text">Minha Lista</span>`;
}

// Close Modal
function closeModal() {
  DOM.modalBackdrop.classList.remove('active');
  DOM.modalBackdrop.setAttribute('aria-hidden', 'true');
  DOM.youtubePlayer.src = '';
  document.body.style.overflow = '';
  STATE.currentEpisode = null;
}

// Watchlist (Minha Lista)
function toggleWatchlist(episode) {
  const index = STATE.watchlist.findIndex(item => item.id === episode.id);
  if (index >= 0) {
    STATE.watchlist.splice(index, 1);
    showToast(`"${episode.title}" removido da Minha Lista.`);
  } else {
    STATE.watchlist.push(episode);
    showToast(`"${episode.title}" adicionado à Minha Lista!`);
  }
  localStorage.setItem('brunno_live_watchlist', JSON.stringify(STATE.watchlist));
  updateWatchlistBadge();

  if (STATE.activeFilter === 'my-list') {
    renderWatchlistView();
  }
}

function updateWatchlistBadge() {
  DOM.listCount.textContent = STATE.watchlist.length;
}

function renderWatchlistView() {
  DOM.searchResultsSection.style.display = 'block';
  DOM.searchTermDisplay.textContent = 'Minha Lista de Favoritos';
  DOM.catalogContainer.style.display = 'none';
  if (DOM.devotionalsSection) DOM.devotionalsSection.style.display = 'none';

  if (STATE.watchlist.length === 0) {
    DOM.searchGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem 0; text-align: center; color: var(--text-muted);">
        <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Sua lista de favoritos está vazia.</p>
        <p>Clique no botão <strong>＋</strong> em qualquer vídeo para salvar e maratonar depois.</p>
      </div>
    `;
    return;
  }

  DOM.searchGrid.innerHTML = STATE.watchlist.map(ep => {
    const parentCat = CATALOG.categories.find(c => c.episodes.some(e => e.id === ep.id)) || CATALOG.categories[0];
    return createCardHTML(ep, parentCat);
  }).join('');

  attachGridListeners(DOM.searchGrid);
}

// Search Logic
function handleSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    DOM.searchResultsSection.style.display = 'none';
    DOM.catalogContainer.style.display = 'flex';
    if (DOM.devotionalsSection) DOM.devotionalsSection.style.display = 'block';
    DOM.searchClearBtn.style.display = 'none';
    return;
  }

  DOM.searchClearBtn.style.display = 'block';
  DOM.searchResultsSection.style.display = 'block';
  DOM.catalogContainer.style.display = 'none';
  if (DOM.devotionalsSection) DOM.devotionalsSection.style.display = 'none';
  DOM.searchTermDisplay.textContent = `"${query}"`;

  const matches = [];
  CATALOG.categories.forEach(cat => {
    cat.episodes.forEach(ep => {
      const matchInTitle = ep.title.toLowerCase().includes(q);
      const matchInSubtitle = ep.subtitle?.toLowerCase().includes(q);
      const matchInSynopsis = ep.synopsis.toLowerCase().includes(q);
      const matchInScripture = ep.scripture?.toLowerCase().includes(q);
      const matchInTags = ep.tags?.some(t => t.toLowerCase().includes(q));
      const matchInDay = ep.day.toLowerCase().includes(q);

      if (matchInTitle || matchInSubtitle || matchInSynopsis || matchInScripture || matchInTags || matchInDay) {
        matches.push({ episode: ep, category: cat });
      }
    });
  });

  if (matches.length === 0) {
    DOM.searchGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 3rem 0; text-align: center; color: var(--text-muted);">
        <p style="font-size: 1.2rem;">Nenhum vídeo encontrado com o termo "${query}".</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Tente buscar por palavras como <em>deserto, escassez, oração, cura, salmo</em>.</p>
      </div>
    `;
    return;
  }

  DOM.searchGrid.innerHTML = matches.map(m => createCardHTML(m.episode, m.category)).join('');
  attachGridListeners(DOM.searchGrid);
}

function attachGridListeners(container) {
  container.querySelectorAll('.video-card').forEach(card => {
    const epId = card.getAttribute('data-id');
    const catId = card.getAttribute('data-category');
    const cat = CATALOG.categories.find(c => c.id === catId);
    const ep = cat?.episodes.find(e => e.id === epId);

    if (ep) {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-btn-action')) return;
        openPlayerModal(ep, cat);
      });

      const listBtn = card.querySelector('.card-btn-list');
      if (listBtn) {
        listBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleWatchlist(ep);
        });
      }
    }
  });
}

// Share Episode
function shareEpisode(episode) {
  const shareData = {
    title: episode.title,
    text: `Assista ao episódio "${episode.title}" da série do Pr. Brunno Anastácio:`,
    url: `https://youtu.be/${episode.videoId}`
  };

  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    navigator.clipboard.writeText(`https://youtu.be/${episode.videoId}`);
    showToast(`Link copiado para a área de transferência!`);
  }
}

// Toast Feedback
function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.add('show');
  setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 3500);
}

// Setup Event Listeners
function setupEventListeners() {
  // Navbar scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      DOM.navbar.classList.add('scrolled');
    } else {
      DOM.navbar.classList.remove('scrolled');
    }
  });

  // Mobile menu
  DOM.mobileToggle.addEventListener('click', () => {
    DOM.navMenu.classList.toggle('open');
  });

  // Modal close events
  DOM.modalClose.addEventListener('click', closeModal);
  DOM.modalBackdrop.addEventListener('click', (e) => {
    if (e.target === DOM.modalBackdrop) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && DOM.modalBackdrop.classList.contains('active')) {
      closeModal();
    }
  });

  // Search input
  DOM.searchInput.addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });
  DOM.searchClearBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    handleSearch('');
  });
  DOM.clearSearchView.addEventListener('click', () => {
    DOM.searchInput.value = '';
    handleSearch('');
  });

  // Filter Pills & Nav Links
  const allFilters = [...document.querySelectorAll('.pill-btn'), ...document.querySelectorAll('.nav-link')];
  allFilters.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = btn.getAttribute('data-filter');
      if (!filter) return;

      e.preventDefault();
      STATE.activeFilter = filter;

      // Update active classes
      document.querySelectorAll('.pill-btn').forEach(p => p.classList.toggle('active', p.getAttribute('data-filter') === filter));
      document.querySelectorAll('.nav-link').forEach(n => n.classList.toggle('active', n.getAttribute('data-filter') === filter));
      DOM.navMenu.classList.remove('open');

      if (filter === 'my-list') {
        renderWatchlistView();
      } else if (filter === 'all') {
        DOM.searchResultsSection.style.display = 'none';
        DOM.catalogContainer.style.display = 'flex';
        if (DOM.devotionalsSection) DOM.devotionalsSection.style.display = 'block';
        document.querySelectorAll('.catalog-row').forEach(row => row.style.display = 'flex');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (filter === 'devocionais') {
        DOM.searchResultsSection.style.display = 'none';
        DOM.catalogContainer.style.display = 'flex';
        if (DOM.devotionalsSection) {
          DOM.devotionalsSection.style.display = 'block';
          DOM.devotionalsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        DOM.searchResultsSection.style.display = 'none';
        DOM.catalogContainer.style.display = 'flex';
        document.querySelectorAll('.catalog-row').forEach(row => {
          row.style.display = row.id === filter ? 'flex' : 'none';
        });
        const targetRow = document.getElementById(filter);
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);
