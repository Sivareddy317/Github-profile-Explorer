/**
 * GitHub Profile Explorer - Application Controller
 * Orchestrates state, UI rendering, event listeners, and URL synchronization.
 */

import { fetchProfileOverview, fetchReadme } from './api.js';
import { renderBarChart, renderDonutChart, renderHeatmap } from './charts.js';
import { parseMarkdown } from './markdown.js';

// Application State
const state = {
  currentUsername: 'sivareddy317',
  user: null,
  repos: [],
  events: [],
  stats: null,
  languages: [],
  searchFilter: '',
  selectedLanguage: 'all',
  sortBy: 'stars',
  recentSearches: [],
  loading: false,
};

const SUGGESTIONS = ['sivareddy317', 'torvalds', 'gaearon', 'sindresorhus', 'vercel'];
const RECENT_KEY = 'gh_explorer_recent';

// DOM Element references
const els = {
  themeToggle: document.getElementById('theme-toggle'),
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  chipsContainer: document.getElementById('chips-container'),
  alertBanner: document.getElementById('alert-banner'),
  alertMessage: document.getElementById('alert-message'),
  loadingSkeleton: document.getElementById('loading-skeleton'),
  contentArea: document.getElementById('content-area'),
  
  // Profile elements
  profileAvatar: document.getElementById('profile-avatar'),
  profileName: document.getElementById('profile-name'),
  profileHandle: document.getElementById('profile-handle'),
  profileBio: document.getElementById('profile-bio'),
  profileMeta: document.getElementById('profile-meta'),
  profileBadges: document.getElementById('profile-badges'),

  // Metric cards
  statStars: document.getElementById('stat-stars'),
  statForks: document.getElementById('stat-forks'),
  statWatchers: document.getElementById('stat-watchers'),
  statIssues: document.getElementById('stat-issues'),

  // Charts
  barChartContainer: document.getElementById('bar-chart-container'),
  donutChartContainer: document.getElementById('donut-chart-container'),
  heatmapContainer: document.getElementById('heatmap-container'),

  // Repo Browser
  repoSearch: document.getElementById('repo-search'),
  repoLangFilter: document.getElementById('repo-lang-filter'),
  repoSort: document.getElementById('repo-sort'),
  repoGrid: document.getElementById('repo-grid'),
  repoCountBadge: document.getElementById('repo-count-badge'),

  // Activity Feed
  activityList: document.getElementById('activity-list'),

  // Drawer
  drawerBackdrop: document.getElementById('drawer-backdrop'),
  drawerCloseBtn: document.getElementById('drawer-close-btn'),
  drawerTitle: document.getElementById('drawer-title'),
  drawerBody: document.getElementById('drawer-body'),
};

/**
 * Initialize application
 */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadRecentSearches();
  setupEventListeners();

  // Parse URL query parameter: ?user=username
  const params = new URLSearchParams(window.location.search);
  const targetUser = params.get('user') || 'sivareddy317';
  loadProfile(targetUser);
});

/**
 * Theme Manager
 */
function initTheme() {
  const saved = localStorage.getItem('gh_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  els.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gh_theme', next);
    updateThemeIcon(next);
  });
}

function updateThemeIcon(theme) {
  els.themeToggle.innerHTML = theme === 'dark'
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
}

/**
 * Recent searches in localStorage
 */
function loadRecentSearches() {
  try {
    state.recentSearches = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    state.recentSearches = [];
  }
  renderChips();
}

function saveRecentSearch(username) {
  const filtered = state.recentSearches.filter(u => u.toLowerCase() !== username.toLowerCase());
  state.recentSearches = [username, ...filtered].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(state.recentSearches));
  renderChips();
}

function renderChips() {
  const combined = [...new Set([...SUGGESTIONS, ...state.recentSearches])].slice(0, 10);
  els.chipsContainer.innerHTML = `
    <span class="chips-label">Popular & Recent:</span>
    ${combined.map(u => `
      <button class="chip-btn ${u.toLowerCase() === state.currentUsername.toLowerCase() ? 'active' : ''}" data-user="${u}">
        ${u}
      </button>
    `).join('')}
  `;
}

/**
 * Event Listeners
 */
function setupEventListeners() {
  // Search form submit
  els.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = els.searchInput.value.trim();
    if (val) loadProfile(val);
  });

  // Chip click delegation
  els.chipsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (btn && btn.dataset.user) {
      loadProfile(btn.dataset.user);
    }
  });

  // Filter & Sort events
  els.repoSearch.addEventListener('input', (e) => {
    state.searchFilter = e.target.value.toLowerCase();
    renderRepositories();
  });

  els.repoLangFilter.addEventListener('change', (e) => {
    state.selectedLanguage = e.target.value;
    renderRepositories();
  });

  els.repoSort.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderRepositories();
  });

  // Drawer Close
  els.drawerCloseBtn.addEventListener('click', closeDrawer);
  els.drawerBackdrop.addEventListener('click', (e) => {
    if (e.target === els.drawerBackdrop) closeDrawer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.drawerBackdrop.classList.contains('open')) {
      closeDrawer();
    }
  });
}

/**
 * Main Profile Loader
 */
async function loadProfile(username) {
  if (!username) return;
  state.currentUsername = username;
  els.searchInput.value = username;
  renderChips();

  // Sync browser URL
  window.history.replaceState(null, '', `/?user=${encodeURIComponent(username)}`);

  // UI state: loading
  setLoadingState(true);
  hideError();

  try {
    const data = await fetchProfileOverview(username);
    state.user = data.user;
    state.repos = data.repos || [];
    state.events = data.events || [];
    state.stats = data.stats;
    state.languages = data.languages || [];

    saveRecentSearch(data.user.login);
    renderDashboard();
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      showError(`User "${username}" was not found on GitHub. Please check the spelling.`);
    } else if (err.message === 'RATE_LIMITED') {
      showError('GitHub API rate limit exceeded. Set GITHUB_TOKEN in your environment to expand limits.');
    } else {
      showError('Unable to load GitHub data. Check your network connection and try again.');
    }
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(loading) {
  state.loading = loading;
  els.searchBtn.disabled = loading;
  if (loading) {
    els.loadingSkeleton.style.display = 'block';
    els.contentArea.style.display = 'none';
  } else {
    els.loadingSkeleton.style.display = 'none';
  }
}

function showError(msg) {
  els.alertMessage.textContent = msg;
  els.alertBanner.style.display = 'flex';
  els.contentArea.style.display = 'none';
}

function hideError() {
  els.alertBanner.style.display = 'none';
}

/**
 * Render Dashboard Elements
 */
function renderDashboard() {
  els.contentArea.style.display = 'block';

  renderProfileCard();
  renderMetricStats();
  renderCharts();
  populateLanguageFilter();
  renderRepositories();
  renderActivityFeed();
}

function renderProfileCard() {
  const u = state.user;
  els.profileAvatar.src = u.avatar_url;
  els.profileAvatar.alt = `${u.login} avatar`;
  els.profileName.textContent = u.name || u.login;
  els.profileHandle.innerHTML = `@${u.login} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
  els.profileHandle.href = u.html_url;

  els.profileBio.textContent = u.bio || 'No public bio provided.';
  els.profileBio.style.display = u.bio ? 'block' : 'none';

  // Details
  const details = [];
  if (u.company) details.push(`<span class="profile-detail-item">🏢 ${escapeHtml(u.company)}</span>`);
  if (u.location) details.push(`<span class="profile-detail-item">📍 ${escapeHtml(u.location)}</span>`);
  if (u.blog) {
    const link = u.blog.startsWith('http') ? u.blog : `https://${u.blog}`;
    details.push(`<span class="profile-detail-item">🔗 <a href="${link}" target="_blank" rel="noreferrer">${escapeHtml(u.blog)}</a></span>`);
  }
  if (u.twitter_username) details.push(`<span class="profile-detail-item">𝕏 @${escapeHtml(u.twitter_username)}</span>`);

  els.profileMeta.innerHTML = details.join('');

  // Badges
  const createdDate = new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  els.profileBadges.innerHTML = `
    <span class="badge badge-primary">👥 ${formatNumber(u.followers)} followers</span>
    <span class="badge">👤 ${formatNumber(u.following)} following</span>
    <span class="badge">📦 ${formatNumber(u.public_repos)} public repos</span>
    <span class="badge">📅 Joined ${createdDate}</span>
  `;
}

function renderMetricStats() {
  const s = state.stats;
  els.statStars.textContent = formatNumber(s.stars);
  els.statForks.textContent = formatNumber(s.forks);
  els.statWatchers.textContent = formatNumber(s.watchers);
  els.statIssues.textContent = formatNumber(s.openIssues);
}

function renderCharts() {
  renderBarChart(els.barChartContainer, state.repos);
  renderDonutChart(els.donutChartContainer, state.languages);
  renderHeatmap(els.heatmapContainer, state.events);
}

function populateLanguageFilter() {
  const langs = [...new Set(state.repos.map(r => r.language).filter(Boolean))].sort();
  els.repoLangFilter.innerHTML = '<option value="all">All Languages</option>' +
    langs.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
}

function renderRepositories() {
  const query = state.searchFilter;
  const lang = state.selectedLanguage;
  const sort = state.sortBy;

  const filtered = state.repos
    .filter(r => {
      const matchQuery = !query ||
        r.name.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query)) ||
        (r.topics && r.topics.some(t => t.toLowerCase().includes(query)));

      const matchLang = lang === 'all' || r.language === lang;
      return matchQuery && matchLang;
    })
    .sort((a, b) => {
      if (sort === 'stars') return (b.stargazers_count || 0) - (a.stargazers_count || 0);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
    });

  els.repoCountBadge.textContent = `${filtered.length} of ${state.repos.length}`;

  if (filtered.length === 0) {
    els.repoGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p class="text-muted">No repositories matched your criteria.</p>
      </div>
    `;
    return;
  }

  els.repoGrid.innerHTML = filtered.map(repo => `
    <div class="card repo-card">
      <div>
        <div class="repo-name-row">
          <a href="${repo.html_url}" target="_blank" rel="noreferrer" class="repo-title">
            ${escapeHtml(repo.name)}
          </a>
          ${repo.fork ? '<span class="badge" style="font-size: 0.7rem;">Fork</span>' : ''}
        </div>
        <p class="repo-desc">${repo.description ? escapeHtml(repo.description) : 'No description provided.'}</p>
        ${repo.topics && repo.topics.length ? `
          <div class="repo-topics" style="margin-top: 0.6rem;">
            ${repo.topics.slice(0, 4).map(t => `<span class="topic-tag">#${escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="repo-meta-footer">
        <div class="repo-stats-group">
          ${repo.language ? `<span>● ${escapeHtml(repo.language)}</span>` : ''}
          <span>★ ${(repo.stargazers_count || 0).toLocaleString()}</span>
          <span>⑂ ${(repo.forks_count || 0).toLocaleString()}</span>
        </div>
        <button class="readme-btn" data-repo="${escapeHtml(repo.name)}">
          📖 README
        </button>
      </div>
    </div>
  `).join('');

  // Add click listeners to readme buttons
  els.repoGrid.querySelectorAll('.readme-btn').forEach(btn => {
    btn.addEventListener('click', () => openReadme(btn.dataset.repo));
  });
}

function renderActivityFeed() {
  if (!state.events || state.events.length === 0) {
    els.activityList.innerHTML = `<li class="activity-item text-muted">No recent public activity recorded.</li>`;
    return;
  }

  els.activityList.innerHTML = state.events.slice(0, 15).map(evt => {
    const title = formatEventTitle(evt);
    const timeAgo = formatTimeAgo(evt.created_at);
    const repoName = evt.repo ? evt.repo.name : '';

    return `
      <li class="activity-item">
        <div class="activity-header">
          <span class="activity-title">${escapeHtml(title)}</span>
          <span class="activity-time">${timeAgo}</span>
        </div>
        ${repoName ? `<div class="activity-repo">📦 ${escapeHtml(repoName)}</div>` : ''}
        ${evt.payload && evt.payload.commits ? evt.payload.commits.slice(0, 2).map(c => `
          <div class="activity-commit">• ${escapeHtml(c.message)}</div>
        `).join('') : ''}
      </li>
    `;
  }).join('');
}

function formatEventTitle(evt) {
  switch (evt.type) {
    case 'PushEvent':
      return `Pushed ${(evt.payload && evt.payload.commits) ? evt.payload.commits.length : 1} commit(s)`;
    case 'PullRequestEvent':
      return `Pull Request ${(evt.payload && evt.payload.action) ? evt.payload.action : 'updated'}`;
    case 'IssuesEvent':
      return `Issue ${(evt.payload && evt.payload.action) ? evt.payload.action : 'updated'}`;
    case 'WatchEvent':
      return 'Starred a repository';
    case 'ForkEvent':
      return 'Forked a repository';
    case 'CreateEvent':
      return `Created ${(evt.payload && evt.payload.ref_type) ? evt.payload.ref_type : 'branch/tag'}`;
    default:
      return evt.type.replace('Event', '');
  }
}

/**
 * Drawer - README Viewer
 */
async function openReadme(repoName) {
  els.drawerTitle.textContent = `${state.currentUsername} / ${repoName}`;
  els.drawerBody.innerHTML = `
    <div class="skeleton" style="height: 24px; width: 40%; margin-bottom: 1rem;"></div>
    <div class="skeleton" style="height: 16px; width: 90%; margin-bottom: 0.5rem;"></div>
    <div class="skeleton" style="height: 16px; width: 75%; margin-bottom: 0.5rem;"></div>
    <div class="skeleton" style="height: 100px; width: 100%; margin-top: 1rem;"></div>
  `;
  els.drawerBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const rawMarkdown = await fetchReadme(state.currentUsername, repoName);
    els.drawerBody.innerHTML = `<div class="prose">${parseMarkdown(rawMarkdown)}</div>`;
  } catch (err) {
    els.drawerBody.innerHTML = `<p class="text-muted">Unable to load README for ${escapeHtml(repoName)}.</p>`;
  }
}

function closeDrawer() {
  els.drawerBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

/**
 * Utility Helpers
 */
function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatTimeAgo(dateStr) {
  const d = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
