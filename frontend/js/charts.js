/**
 * GitHub Profile Explorer - Interactive SVG Chart Library
 * Zero external dependencies: pure dynamic SVG generation with tooltips.
 */

const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981',
  '#f59e0b', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7'
];

/**
 * Render Interactive SVG Bar Chart for Top Starred Repositories
 */
export function renderBarChart(container, repos) {
  if (!repos || repos.length === 0) {
    container.innerHTML = '<div class="empty-state"><p class="text-muted">No repository star data available.</p></div>';
    return;
  }

  const top = [...repos]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 6);

  const maxStars = Math.max(...top.map(r => r.stargazers_count || 0), 1);
  const width = 450;
  const height = 240;
  const paddingBottom = 45;
  const paddingTop = 25;
  const paddingLeft = 35;
  const paddingRight = 15;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barWidth = Math.min(chartWidth / top.length - 14, 38);

  let barsSvg = '';
  top.forEach((repo, idx) => {
    const stars = repo.stargazers_count || 0;
    const barH = (stars / maxStars) * chartHeight;
    const x = paddingLeft + idx * (chartWidth / top.length) + (chartWidth / top.length - barWidth) / 2;
    const y = height - paddingBottom - barH;
    const repoName = repo.name.length > 9 ? repo.name.slice(0, 8) + '…' : repo.name;

    barsSvg += `
      <g class="bar-group" data-title="${escapeHtml(repo.name)}: ${stars.toLocaleString()} stars">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="url(#barGradient)" class="chart-bar" />
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="11" fill="var(--text-secondary)" text-anchor="middle" font-weight="600">${stars > 999 ? (stars/1000).toFixed(1) + 'k' : stars}</text>
        <text x="${x + barWidth / 2}" y="${height - paddingBottom + 18}" font-size="10.5" fill="var(--text-muted)" text-anchor="middle" transform="rotate(-15 ${x + barWidth / 2} ${height - paddingBottom + 18})">${escapeHtml(repoName)}</text>
      </g>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
      <defs>
        <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
      </defs>
      <!-- Grid line -->
      <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" stroke="var(--border-subtle)" stroke-width="1" />
      ${barsSvg}
    </svg>
  `;
}

/**
 * Render Interactive SVG Donut Chart for Language Distribution
 */
export function renderDonutChart(container, languages) {
  if (!languages || languages.length === 0) {
    container.innerHTML = '<div class="empty-state"><p class="text-muted">No language data available.</p></div>';
    return;
  }

  const topLangs = languages.slice(0, 5);
  const total = topLangs.reduce((sum, item) => sum + item.value, 0);

  const size = 200;
  const radius = 70;
  const innerRadius = 45;
  const center = size / 2;

  let startAngle = 0;
  let pathsSvg = '';

  topLangs.forEach((lang, idx) => {
    const fraction = lang.value / total;
    const angle = fraction * 2 * Math.PI;
    const endAngle = startAngle + angle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(startAngle);
    const y4 = center + innerRadius * Math.sin(startAngle);

    const largeArc = fraction > 0.5 ? 1 : 0;
    const color = PALETTE[idx % PALETTE.length];

    const d = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    pathsSvg += `
      <path d="${d}" fill="${color}" stroke="var(--bg-card-solid)" stroke-width="2" class="donut-slice" data-lang="${escapeHtml(lang.name)}" data-pct="${Math.round(fraction * 100)}%" />
    `;

    startAngle = endAngle;
  });

  const legendHtml = topLangs.map((l, i) => {
    const pct = Math.round((l.value / total) * 100);
    const color = PALETTE[i % PALETTE.length];
    return `
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;">
        <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; display: inline-block;"></span>
        <span style="color: var(--text-secondary);">${escapeHtml(l.name)}</span>
        <span style="font-weight: 600; margin-left: auto; color: var(--text-muted);">${pct}%</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; width: 100%; gap: 1.5rem; flex-wrap: wrap;">
      <svg viewBox="0 0 ${size} ${size}" style="width: 150px; height: 150px; transform: rotate(-90deg); flex-shrink: 0;">
        ${pathsSvg}
      </svg>
      <div style="display: flex; flex-direction: column; gap: 0.45rem; min-width: 130px; flex: 1;">
        ${legendHtml}
      </div>
    </div>
  `;
}

/**
 * Render 365-day SVG GitHub Activity Heatmap
 */
export function renderHeatmap(container, events) {
  const counts = new Map();
  const today = new Date();

  // Initialize last 364 days
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }

  // Populate counts from events
  if (events && Array.isArray(events)) {
    for (const evt of events) {
      if (evt.created_at) {
        const dateStr = evt.created_at.slice(0, 10);
        if (counts.has(dateStr)) {
          counts.set(dateStr, counts.get(dateStr) + 1);
        }
      }
    }
  }

  const entries = [...counts.entries()];
  let cellsHtml = '';

  for (const [date, count] of entries) {
    let bg = 'var(--bg-elevated)';
    if (count > 0) {
      const alpha = Math.min(0.25 + count * 0.2, 1);
      bg = `rgba(99, 102, 241, ${alpha})`;
    }

    cellsHtml += `
      <div class="heatmap-cell"
           style="background-color: ${bg};"
           title="${date}: ${count} public events">
      </div>
    `;
  }

  container.innerHTML = `
    <div class="heatmap-grid">
      ${cellsHtml}
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
