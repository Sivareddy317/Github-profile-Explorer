/**
 * GitHub Profile Explorer - API Service
 * Handles communication with the Python backend API proxy or direct GitHub fallback.
 */

export async function fetchProfileOverview(username) {
  const clean = username.trim();
  if (!clean) throw new Error('EMPTY_USERNAME');

  try {
    // Primary: Call Python backend proxy (provides server-side caching & aggregations)
    const res = await fetch(`/api/overview?username=${encodeURIComponent(clean)}`);
    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) throw new Error('USER_NOT_FOUND');
    if (res.status === 403) throw new Error('RATE_LIMITED');
    throw new Error('API_ERROR');
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND' || err.message === 'RATE_LIMITED') {
      throw err;
    }

    // Secondary fallback: Direct GitHub REST API
    return await fetchDirectFromGitHub(clean);
  }
}

async function fetchDirectFromGitHub(username) {
  const headers = { Accept: 'application/vnd.github+json' };
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });

  if (userRes.status === 404) throw new Error('USER_NOT_FOUND');
  if (userRes.status === 403) throw new Error('RATE_LIMITED');
  if (!userRes.ok) throw new Error('API_ERROR');

  const user = await userRes.json();

  const [reposRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, { headers }),
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, { headers }).catch(() => null),
  ]);

  const repos = reposRes.ok ? await reposRes.json() : [];
  const events = eventsRes && eventsRes.ok ? await eventsRes.json() : [];

  const stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const forks = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);
  const watchers = repos.reduce((sum, r) => sum + (r.watchers_count || 0), 0);
  const openIssues = repos.reduce((sum, r) => sum + (r.open_issues_count || 0), 0);

  const langMap = {};
  for (const r of repos) {
    if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1;
  }
  const languages = Object.entries(langMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    user,
    repos,
    events,
    stats: { stars, forks, watchers, openIssues },
    languages,
  };
}

export async function fetchReadme(username, repo) {
  try {
    const res = await fetch(`/api/readme?username=${encodeURIComponent(username)}&repo=${encodeURIComponent(repo)}`);
    if (res.ok) {
      const data = await res.json();
      return data.readme || '';
    }
  } catch {
    // Fallback to direct raw request
  }

  const directRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/readme`, {
    headers: { Accept: 'application/vnd.github.raw' },
  });
  if (directRes.status === 404) return '';
  if (!directRes.ok) throw new Error('README_FETCH_FAILED');
  return await directRes.text();
}
