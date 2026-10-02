import { CATALOG, DEVOTIONALS } from './catalog.js';

// Application State
const STATE = {
  currentEpisode: null,
  currentCategory: null,
  watchlist: JSON.parse(localStorage.getItem('brunno_live_watchlist') || '[]'),
  watched: JSON.parse(localStorage.getItem('brunno_live_watched') || '[]'),
  notes: JSON.parse(localStorage.getItem('brunno_live_notes') || '{}'),
  activeFilter: 'all',
  isCinemaMode: false,
  ytPlayer: null,
  isYTReady: false,
  pendingVideo: null,
  autoplayTimer: null,
  autoplayCountdown: 5,
  resumeTimes: JSON.parse(localStorage.getItem('brunno_live_resume') || '{}'),
  saveTimeInterval: null
};

// DOM Cache
const DOM = {
  // Views
  browseView: document.getElementById('browse-view'),
  cinemaView: document.getElementById('cinema-view'),

  // Navigation
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

  // Browse Progress Banner
  campaignProgressBanner: document.getElementById('campaign-progress-banner'),
  browseProgressSub: document.getElementById('browse-progress-sub'),
  browseProgressFill: document.getElementById('browse-progress-fill'),
  browseProgressPercent: document.getElementById('browse-progress-percent'),

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

  // Devotionals Grid
  devotionalsGrid: document.getElementById('devotionals-grid'),

  // Cinema Mode Elements
  cinemaBtnBack: document.getElementById('cinema-btn-back'),
  cinemaCrumbEpisode: document.getElementById('cinema-crumb-episode'),
  cinemaPrevBtn: document.getElementById('cinema-prev-btn'),
  cinemaNextBtn: document.getElementById('cinema-next-btn'),
  cinemaPlayerTarget: document.getElementById('cinema-player-target'),
  cinemaAutoplayOverlay: document.getElementById('cinema-autoplay-overlay'),
  autoplayNextTitle: document.getElementById('autoplay-next-title'),
  autoplaySeconds: document.getElementById('autoplay-seconds'),
  btnAutoplayNow: document.getElementById('btn-autoplay-now'),
  btnAutoplayCancel: document.getElementById('btn-autoplay-cancel'),

  cinemaDayBadge: document.getElementById('cinema-day-badge'),
  cinemaDuration: document.getElementById('cinema-duration'),
  cinemaWatchedPill: document.getElementById('cinema-watched-pill'),
  cinemaTitle: document.getElementById('cinema-title'),
  cinemaSubtitle: document.getElementById('cinema-subtitle'),
  cinemaToggleWatchedBtn: document.getElementById('cinema-toggle-watched-btn'),
  cinemaWatchedIcon: document.getElementById('cinema-watched-icon'),
  cinemaWatchedLabel: document.getElementById('cinema-watched-label'),
  cinemaAddListBtn: document.getElementById('cinema-add-list-btn'),
  cinemaListIcon: document.getElementById('cinema-list-icon'),
  cinemaListLabel: document.getElementById('cinema-list-label'),
  cinemaShareBtn: document.getElementById('cinema-share-btn'),

  // Cinema PDF & Scripture
  cinemaPdfContainer: document.getElementById('cinema-pdf-container'),
  cinemaPdfTitle: document.getElementById('cinema-pdf-title'),
  cinemaPdfDesc: document.getElementById('cinema-pdf-desc'),
  cinemaPdfBtn: document.getElementById('cinema-pdf-btn'),
  cinemaScriptureContainer: document.getElementById('cinema-scripture-container'),
  cinemaScripture: document.getElementById('cinema-scripture'),
  cinemaSynopsis: document.getElementById('cinema-synopsis'),

  // Cinema Notes (Diário Espiritual)
  cinemaNotesInput: document.getElementById('cinema-notes-input'),
  notesStatus: document.getElementById('notes-status'),

  // Cinema Sidebar
  cinemaProgressText: document.getElementById('cinema-progress-text'),
  cinemaProgressFill: document.getElementById('cinema-progress-fill'),
  cinemaProgressCongrats: document.getElementById('cinema-progress-congrats'),
  cinemaChaptersWidget: document.getElementById('cinema-chapters-widget'),
  cinemaChaptersList: document.getElementById('cinema-chapters-list'),
  cinemaPlaylistList: document.getElementById('cinema-playlist-list')
};

// =========================================================================
// YOUTUBE IFRAME API INITIALIZATION & CONTROLLER
// =========================================================================
window.onYouTubeIframeAPIReady = function() {
  STATE.isYTReady = true;
  if (STATE.pendingVideo) {
    createOrLoadPlayer(STATE.pendingVideo.videoId, STATE.pendingVideo.startTime);
    STATE.pendingVideo = null;
  }
};

function createOrLoadPlayer(videoId, startTime = 0) {
  if (!STATE.isYTReady || typeof YT === 'undefined' || !YT.Player) {
    STATE.pendingVideo = { videoId, startTime };
    return;
  }

  if (STATE.ytPlayer && typeof STATE.ytPlayer.loadVideoById === 'function') {
    STATE.ytPlayer.loadVideoById({
      videoId: videoId,
      startSeconds: startTime
    });
  } else {
    STATE.ytPlayer = new YT.Player('cinema-player-target', {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onReady: (event) => {
          if (startTime > 0) {
            event.target.seekTo(startTime, true);
          }
          event.target.playVideo();
        },
        onStateChange: onPlayerStateChange
      }
    });
  }

  startPlaybackTracker();
}

function onPlayerStateChange(event) {
  // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
  if (event.data === YT.PlayerState.ENDED) {
    handleVideoEnded();
  } else if (event.data === YT.PlayerState.PLAYING) {
    cancelAutoplayTimer();
  }
}

// When video finishes playing
function handleVideoEnded() {
  if (!STATE.currentEpisode) return;

  // 1. Mark as Watched automatically!
  markAsWatched(STATE.currentEpisode.id, true);
  showToast(`🎉 "${STATE.currentEpisode.title}" concluído!`);

  // 2. Check for next episode and trigger Netflix autoplay countdown
  const category = STATE.currentCategory || CATALOG.categories[0];
  const currentIndex = category.episodes.findIndex(e => e.id === STATE.currentEpisode.id);
  const nextEp = category.episodes[currentIndex + 1];

  if (nextEp) {
    triggerAutoplayCountdown(nextEp, category);
  }
}

// Netflix Autoplay Countdown
function triggerAutoplayCountdown(nextEp, category) {
  cancelAutoplayTimer();
  DOM.autoplayNextTitle.textContent = `${nextEp.day}: ${nextEp.title}`;
  DOM.cinemaAutoplayOverlay.style.display = 'flex';
  STATE.autoplayCountdown = 5;
  DOM.autoplaySeconds.textContent = STATE.autoplayCountdown;

  DOM.btnAutoplayNow.onclick = () => {
    cancelAutoplayTimer();
    openCinemaMode(nextEp, category);
  };

  DOM.btnAutoplayCancel.onclick = () => {
    cancelAutoplayTimer();
  };

  STATE.autoplayTimer = setInterval(() => {
    STATE.autoplayCountdown--;
    DOM.autoplaySeconds.textContent = STATE.autoplayCountdown;

    if (STATE.autoplayCountdown <= 0) {
      cancelAutoplayTimer();
      openCinemaMode(nextEp, category);
    }
  }, 1000);
}

function cancelAutoplayTimer() {
  if (STATE.autoplayTimer) {
    clearInterval(STATE.autoplayTimer);
    STATE.autoplayTimer = null;
  }
  if (DOM.cinemaAutoplayOverlay) {
    DOM.cinemaAutoplayOverlay.style.display = 'none';
  }
}

// Playback Position Tracker (Resume watching)
function startPlaybackTracker() {
  if (STATE.saveTimeInterval) clearInterval(STATE.saveTimeInterval);
  STATE.saveTimeInterval = setInterval(() => {
    if (STATE.ytPlayer && typeof STATE.ytPlayer.getCurrentTime === 'function' && STATE.currentEpisode) {
      try {
        const time = Math.floor(STATE.ytPlayer.getCurrentTime());
        if (time > 10) {
          STATE.resumeTimes[STATE.currentEpisode.id] = time;
          localStorage.setItem('brunno_live_resume', JSON.stringify(STATE.resumeTimes));
        }
      } catch (err) {
        // Player not ready or cross-origin safe
      }
    }
  }, 5000);
}

// =========================================================================
// APPLICATION INITIALIZATION
// =========================================================================
function init() {
  renderHero();
  renderCatalog();
  renderDevotionals();
  updateWatchlistBadge();
  updateProgressUI();
  setupEventListeners();
  handleInitialRouting();
}

// =========================================================================
// RENDER HERO BILLBOARD
// =========================================================================
function renderHero() {
  const feat = CATALOG.featured;
  const firstEp = CATALOG.categories[0].episodes[0];

  DOM.heroBgImage.style.backgroundImage = `url('https://i.ytimg.com/vi/${firstEp.videoId}/maxresdefault.jpg')`;
  DOM.heroBadge.textContent = feat.badge;
  DOM.heroTitle.textContent = feat.title;
  DOM.heroSubtitle.textContent = feat.subtitle;
  DOM.heroSynopsis.textContent = feat.synopsis;

  DOM.heroTags.innerHTML = feat.tags.map(t => `<span class="tag-pill">${t}</span>`).join('');

  DOM.heroPlayBtn.onclick = () => openCinemaMode(firstEp, CATALOG.categories[0]);
  DOM.heroInfoBtn.onclick = () => openCinemaMode(firstEp, CATALOG.categories[0]);

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

// =========================================================================
// RENDER CATALOG ROWS
// =========================================================================
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
        if (ep.isLocked) {
          showToast(`🔒 "${ep.title}" será liberado em breve!`);
          return;
        }
        openCinemaMode(ep, cat);
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

function createCardHTML(ep, category) {
  const thumbUrl = `https://i.ytimg.com/vi/${ep.videoId}/hqdefault.jpg`;

  if (ep.isLocked) {
    return `
      <article class="video-card card-locked" data-id="${ep.id}" data-category="${category.id}">
        <div class="card-media">
          <img class="card-thumb" src="${thumbUrl}" alt="${ep.title}" loading="lazy">
          <div class="card-overlay-gradient"></div>
          <span class="card-day-tag">${ep.day}</span>
          <span class="card-duration">${ep.duration}</span>
          <div class="card-lock-overlay">
            <div class="lock-icon-badge">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <span class="lock-overlay-label">EM BREVE</span>
          </div>
        </div>
        <div class="card-content">
          <div class="card-meta-row">
            <span class="card-badge badge-locked">🔒 EM BREVE</span>
            <span class="card-tag">Episódio ${ep.number}</span>
          </div>
          <h3 class="card-title">${ep.title}</h3>
          <p class="card-synopsis">${ep.synopsis}</p>
          <div class="card-footer">
            <div class="card-tags-list">
              ${ep.tags ? ep.tags.slice(0, 2).map(t => `<span class="card-tag">• ${t}</span>`).join('') : ''}
            </div>
            <span class="card-lock-notice">🔒 Liberado em breve</span>
          </div>
        </div>
      </article>
    `;
  }

  const isSaved = STATE.watchlist.some(item => item.id === ep.id);
  const isEpWatched = STATE.watched.includes(ep.id);

  return `
    <article class="video-card ${isEpWatched ? 'card-watched' : ''}" data-id="${ep.id}" data-category="${category.id}">
      <div class="card-media">
        <img class="card-thumb" src="${thumbUrl}" alt="${ep.title}" loading="lazy">
        <div class="card-overlay-gradient"></div>
        <span class="card-day-tag">${ep.day}</span>
        <span class="card-duration">${ep.duration}</span>
        ${isEpWatched ? `<span class="card-watched-tag">✓ Assistido</span>` : ''}
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

// =========================================================================
// RENDER DEVOTIONALS GRID
// =========================================================================
function renderDevotionals() {
  if (!DOM.devotionalsGrid) return;

  DOM.devotionalsGrid.innerHTML = DEVOTIONALS.map(dev => {
    if (dev.isLocked) {
      return `
        <article class="devotional-card card-locked" id="${dev.id}">
          <div class="devotional-card-glow"></div>
          <div class="devotional-card-header">
            <div class="devotional-icon-box lock-box">
              <span class="devotional-icon">🔒</span>
            </div>
            <div class="devotional-badge-col">
              <span class="badge-gold">${dev.day}</span>
              <span class="devotional-format-badge">EM BREVE</span>
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
            <button class="btn btn-locked-dev btn-dev-locked" onclick="window.showLockedToast()">
              <span>🔒 Material Liberado em Breve</span>
            </button>
          </div>
        </article>
      `;
    }

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

          <button class="btn btn-secondary btn-dev-watch" data-epid="${dev.episodeId}" title="Assistir no Modo Cinema">
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
        openCinemaMode(ep, cat);
      }
    });
  });
}

// =========================================================================
// CINEMA MODE DEDICATED PLAYER EXPERIENCE
// =========================================================================
function openCinemaMode(episode, category, startTime = 0) {
  STATE.currentEpisode = episode;
  STATE.currentCategory = category;
  STATE.isCinemaMode = true;

  cancelAutoplayTimer();

  // 1. Switch View Container
  DOM.browseView.style.display = 'none';
  DOM.cinemaView.style.display = 'block';

  // 2. Update Browser URL Hash (Deep Linking)
  if (window.location.hash !== `#assistir/${episode.id}`) {
    history.pushState(null, '', `#assistir/${episode.id}`);
  }

  // 3. Populate Header & Breadcrumbs
  DOM.cinemaCrumbEpisode.textContent = episode.day;
  DOM.cinemaDayBadge.textContent = episode.day;
  DOM.cinemaDuration.textContent = episode.duration;
  DOM.cinemaTitle.textContent = episode.title;
  DOM.cinemaSubtitle.textContent = episode.subtitle || '';

  // 4. Update Prev / Next Arrows
  const currentIndex = category.episodes.findIndex(e => e.id === episode.id);
  const prevEp = category.episodes[currentIndex - 1];
  const nextEp = category.episodes[currentIndex + 1];

  DOM.cinemaPrevBtn.disabled = !prevEp;
  DOM.cinemaPrevBtn.onclick = () => prevEp && openCinemaMode(prevEp, category);

  DOM.cinemaNextBtn.disabled = !nextEp;
  DOM.cinemaNextBtn.onclick = () => nextEp && openCinemaMode(nextEp, category);

  // 5. Update Watched Toggle Status
  updateCinemaWatchedButton(episode.id);

  DOM.cinemaToggleWatchedBtn.onclick = () => {
    toggleWatched(episode.id);
    updateCinemaWatchedButton(episode.id);
  };

  // 6. Update Watchlist Button
  updateCinemaListButton(episode.id);
  DOM.cinemaAddListBtn.onclick = () => {
    toggleWatchlist(episode);
    updateCinemaListButton(episode.id);
  };

  // 7. Share Action (WhatsApp 1-Click)
  DOM.cinemaShareBtn.onclick = () => shareEpisode(episode);

  // 8. PDF Material Card
  if (episode.pdfMaterial) {
    DOM.cinemaPdfContainer.style.display = 'flex';
    DOM.cinemaPdfTitle.textContent = episode.pdfMaterial.title;
    DOM.cinemaPdfDesc.textContent = episode.pdfMaterial.subtitle;
    DOM.cinemaPdfBtn.href = episode.pdfMaterial.downloadUrl;
  } else {
    DOM.cinemaPdfContainer.style.display = 'none';
  }

  // 9. Scripture Card
  if (episode.scripture) {
    DOM.cinemaScriptureContainer.style.display = 'flex';
    DOM.cinemaScripture.textContent = episode.scripture;
  } else {
    DOM.cinemaScriptureContainer.style.display = 'none';
  }

  // 10. Synopsis
  DOM.cinemaSynopsis.textContent = episode.synopsis;

  // 11. Diário Espiritual (Notes Persistence)
  loadEpisodeNotes(episode.id);

  // 12. Render Chapters (Timestamps with smooth seekTo)
  renderCinemaChapters(episode);

  // 13. Render Sidebar Playlist
  renderCinemaPlaylist(category, episode);

  // 14. Update Progress Card in Sidebar
  updateProgressUI();

  // 15. Check for saved resume time
  const savedTime = startTime > 0 ? startTime : (STATE.resumeTimes[episode.id] || 0);

  // 16. Load or Create YouTube Player
  createOrLoadPlayer(episode.videoId, savedTime);

  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeCinemaMode() {
  STATE.isCinemaMode = false;
  cancelAutoplayTimer();

  // Pause YouTube Video
  if (STATE.ytPlayer && typeof STATE.ytPlayer.pauseVideo === 'function') {
    STATE.ytPlayer.pauseVideo();
  }

  // Switch View
  DOM.cinemaView.style.display = 'none';
  DOM.browseView.style.display = 'block';

  // Reset Hash
  if (window.location.hash.startsWith('#assistir')) {
    history.pushState(null, '', window.location.pathname);
  }

  // Refresh Catalog and Progress
  renderCatalog();
  updateProgressUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render Chapters (Timestamps)
function renderCinemaChapters(episode) {
  if (!episode.timestamps || episode.timestamps.length === 0) {
    DOM.cinemaChaptersWidget.style.display = 'none';
    return;
  }

  DOM.cinemaChaptersWidget.style.display = 'block';
  DOM.cinemaChaptersList.innerHTML = episode.timestamps.map(t => `
    <div class="cinema-chapter-item" data-seconds="${t.seconds}">
      <span class="chapter-time-pill">${t.time}</span>
      <span class="chapter-label-text">${t.label}</span>
      <span class="chapter-play-arrow">▶</span>
    </div>
  `).join('');

  DOM.cinemaChaptersList.querySelectorAll('.cinema-chapter-item').forEach(item => {
    item.onclick = () => {
      const secs = parseInt(item.getAttribute('data-seconds'), 10);
      seekVideoTo(secs);
    };
  });
}

function seekVideoTo(seconds) {
  if (STATE.ytPlayer && typeof STATE.ytPlayer.seekTo === 'function') {
    STATE.ytPlayer.seekTo(seconds, true);
    STATE.ytPlayer.playVideo();
    showToast(`Avançado para o momento selecionado!`);
  }
}

// Global toast for locked devotionals
window.showLockedToast = function() {
  showToast('🔒 O material do Último Encontro estará disponível logo após a ministração!');
};

// Render Sidebar Playlist
function renderCinemaPlaylist(category, currentEp) {
  DOM.cinemaPlaylistList.innerHTML = category.episodes.map(ep => {
    if (ep.isLocked) {
      return `
        <div class="cinema-playlist-item locked-item" data-id="${ep.id}">
          <div class="playlist-item-thumb locked-thumb">
            <div class="locked-icon-center">🔒</div>
          </div>
          <div class="playlist-item-info">
            <span class="playlist-day-tag">${ep.day}</span>
            <h4 class="playlist-ep-title">${ep.title}</h4>
            <span class="playlist-ep-duration locked-tag">🔒 Em Breve</span>
          </div>
        </div>
      `;
    }

    const isCurrent = ep.id === currentEp.id;
    const isWatched = STATE.watched.includes(ep.id);
    const thumbUrl = `https://i.ytimg.com/vi/${ep.videoId}/default.jpg`;

    return `
      <div class="cinema-playlist-item ${isCurrent ? 'active' : ''} ${isWatched ? 'watched' : ''}" data-id="${ep.id}">
        <div class="playlist-item-thumb" style="background-image: url('${thumbUrl}');">
          ${isCurrent ? '<div class="playing-badge">▶ NO AR</div>' : ''}
          ${isWatched && !isCurrent ? '<div class="watched-check-badge">✓</div>' : ''}
        </div>
        <div class="playlist-item-info">
          <span class="playlist-day-tag">${ep.day}</span>
          <h4 class="playlist-ep-title">${ep.title}</h4>
          <span class="playlist-ep-duration">${ep.duration}</span>
        </div>
      </div>
    `;
  }).join('');

  DOM.cinemaPlaylistList.querySelectorAll('.cinema-playlist-item').forEach(item => {
    item.onclick = () => {
      const epId = item.getAttribute('data-id');
      const targetEp = category.episodes.find(e => e.id === epId);
      if (targetEp) {
        if (targetEp.isLocked) {
          showToast(`🔒 "${targetEp.title}" será liberado em breve!`);
          return;
        }
        if (targetEp.id !== currentEp.id) {
          openCinemaMode(targetEp, category);
        }
      }
    };
  });
}

// Diário Espiritual (Notes)
function loadEpisodeNotes(epId) {
  DOM.cinemaNotesInput.value = STATE.notes[epId] || '';
  DOM.notesStatus.textContent = STATE.notes[epId] ? 'Salvo no seu dispositivo' : 'Em branco';
}

function handleNotesInput(e) {
  if (!STATE.currentEpisode) return;
  const epId = STATE.currentEpisode.id;
  STATE.notes[epId] = e.target.value;
  localStorage.setItem('brunno_live_notes', JSON.stringify(STATE.notes));

  DOM.notesStatus.textContent = 'Salvando...';
  setTimeout(() => {
    DOM.notesStatus.textContent = '✓ Salvo automaticamente';
  }, 400);
}

// =========================================================================
// WATCHED & CAMPAIGN PROGRESS LOGIC (LOCALSTORAGE)
// =========================================================================
function toggleWatched(epId) {
  const index = STATE.watched.indexOf(epId);
  const ep = CATALOG.categories[0].episodes.find(e => e.id === epId);
  const title = ep ? ep.title : 'Episódio';

  if (index >= 0) {
    STATE.watched.splice(index, 1);
    showToast(`"${title}" desmarcado.`);
  } else {
    STATE.watched.push(epId);
    showToast(`✓ "${title}" marcado como concluído!`);
  }

  localStorage.setItem('brunno_live_watched', JSON.stringify(STATE.watched));
  updateProgressUI();
  updateCinemaWatchedButton(epId);
  if (!STATE.isCinemaMode) renderCatalog();
}

function markAsWatched(epId, watched = true) {
  const index = STATE.watched.indexOf(epId);
  if (watched && index === -1) {
    STATE.watched.push(epId);
  } else if (!watched && index >= 0) {
    STATE.watched.splice(index, 1);
  }

  localStorage.setItem('brunno_live_watched', JSON.stringify(STATE.watched));
  updateProgressUI();
  if (STATE.currentEpisode && STATE.currentEpisode.id === epId) {
    updateCinemaWatchedButton(epId);
  }
}

function updateCinemaWatchedButton(epId) {
  const isDone = STATE.watched.includes(epId);
  DOM.cinemaWatchedPill.style.display = isDone ? 'inline-block' : 'none';

  if (isDone) {
    DOM.cinemaToggleWatchedBtn.classList.add('active');
    DOM.cinemaWatchedIcon.textContent = '✓';
    DOM.cinemaWatchedLabel.textContent = 'Concluído';
  } else {
    DOM.cinemaToggleWatchedBtn.classList.remove('active');
    DOM.cinemaWatchedIcon.textContent = '○';
    DOM.cinemaWatchedLabel.textContent = 'Marcar como Assistido';
  }
}

function updateProgressUI() {
  const availableEpisodes = CATALOG.categories[0].episodes.filter(e => !e.isLocked);
  const total = availableEpisodes.length;
  const count = STATE.watched.filter(id => availableEpisodes.some(e => e.id === id)).length;
  const percentage = Math.round((count / total) * 100);

  // 1. Browse Progress Banner
  if (DOM.browseProgressSub) {
    DOM.browseProgressSub.textContent = `${count} de ${total} ministrações concluídas`;
  }
  if (DOM.browseProgressFill) {
    DOM.browseProgressFill.style.width = `${percentage}%`;
  }
  if (DOM.browseProgressPercent) {
    DOM.browseProgressPercent.textContent = `${percentage}%`;
  }

  // 2. Cinema Sidebar Progress
  if (DOM.cinemaProgressText) {
    DOM.cinemaProgressText.textContent = `${count} de ${total} concluídos (${percentage}%)`;
  }
  if (DOM.cinemaProgressFill) {
    DOM.cinemaProgressFill.style.width = `${percentage}%`;
  }
  if (DOM.cinemaProgressCongrats) {
    DOM.cinemaProgressCongrats.style.display = count >= total ? 'block' : 'none';
  }
}

// Watchlist
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

function updateCinemaListButton(epId) {
  const isSaved = STATE.watchlist.some(item => item.id === epId);
  DOM.cinemaListIcon.textContent = isSaved ? '★' : '＋';
  DOM.cinemaListLabel.textContent = isSaved ? 'Na Lista' : 'Minha Lista';
  DOM.cinemaAddListBtn.classList.toggle('active', isSaved);
}

function renderWatchlistView() {
  DOM.searchResultsSection.style.display = 'block';
  DOM.searchTermDisplay.textContent = 'Minha Lista de Favoritos';
  DOM.catalogContainer.style.display = 'none';

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

// =========================================================================
// SEARCH & SHARING
// =========================================================================
function handleSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    DOM.searchResultsSection.style.display = 'none';
    DOM.catalogContainer.style.display = 'flex';
    DOM.searchClearBtn.style.display = 'none';
    return;
  }

  DOM.searchClearBtn.style.display = 'block';
  DOM.searchResultsSection.style.display = 'block';
  DOM.catalogContainer.style.display = 'none';
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
        openCinemaMode(ep, cat);
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

// 1-Click WhatsApp & Social Share
function shareEpisode(episode) {
  const shareUrl = `${window.location.origin}${window.location.pathname}#assistir/${episode.id}`;
  const shareText = `🕊️ *${episode.day} — ${episode.title}*\n\nAssista à ministração profética com o Pr. Brunno Anastácio e baixe o Devocional em PDF:\n\n${shareUrl}`;

  // WhatsApp Web / App direct intent
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  window.open(waUrl, '_blank');

  // Copy link as fallback
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  }
}

// Toast
function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.add('show');
  setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 3500);
}

// =========================================================================
// DEEP LINKING ROUTER & EVENT LISTENERS
// =========================================================================
function handleInitialRouting() {
  const hash = window.location.hash;
  if (hash.startsWith('#assistir/')) {
    const epId = hash.replace('#assistir/', '');
    const cat = CATALOG.categories[0];
    const ep = cat.episodes.find(e => e.id === epId);
    if (ep) {
      openCinemaMode(ep, cat);
      return;
    }
  }

  window.addEventListener('hashchange', () => {
    const currentHash = window.location.hash;
    if (currentHash.startsWith('#assistir/')) {
      const epId = currentHash.replace('#assistir/', '');
      const cat = CATALOG.categories[0];
      const ep = cat.episodes.find(e => e.id === epId);
      if (ep && (!STATE.currentEpisode || STATE.currentEpisode.id !== ep.id)) {
        openCinemaMode(ep, cat);
      }
    } else if (STATE.isCinemaMode && !currentHash.startsWith('#assistir')) {
      closeCinemaMode();
    }
  });
}

function setupEventListeners() {
  // Cinema Back Button
  DOM.cinemaBtnBack.addEventListener('click', closeCinemaMode);

  // Notes Input
  DOM.cinemaNotesInput.addEventListener('input', handleNotesInput);

  // Navbar scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      DOM.navbar.classList.add('scrolled');
    } else {
      DOM.navbar.classList.remove('scrolled');
    }
  });

  // Mobile Menu
  DOM.mobileToggle.addEventListener('click', () => {
    DOM.navMenu.classList.toggle('open');
  });

  // Search input
  DOM.searchInput.addEventListener('input', (e) => {
    if (STATE.isCinemaMode) closeCinemaMode();
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

      if (STATE.isCinemaMode) {
        closeCinemaMode();
      }

      STATE.activeFilter = filter;

      document.querySelectorAll('.pill-btn').forEach(p => p.classList.toggle('active', p.getAttribute('data-filter') === filter));
      document.querySelectorAll('.nav-link').forEach(n => n.classList.toggle('active', n.getAttribute('data-filter') === filter));
      DOM.navMenu.classList.remove('open');

      if (filter === 'my-list') {
        renderWatchlistView();
      } else if (filter === 'all') {
        DOM.searchResultsSection.style.display = 'none';
        DOM.catalogContainer.style.display = 'flex';
        document.querySelectorAll('.catalog-row').forEach(row => row.style.display = 'flex');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (filter === 'devocionais') {
        DOM.searchResultsSection.style.display = 'none';
        DOM.catalogContainer.style.display = 'flex';
        const devSec = document.getElementById('devocionais');
        if (devSec) {
          devSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // ESC key to exit Cinema Mode
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && STATE.isCinemaMode) {
      closeCinemaMode();
    }
  });
}

// Start Application
document.addEventListener('DOMContentLoaded', init);
