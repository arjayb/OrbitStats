// OrbitStats — Contributor Analytics Dashboard
// Vanilla JS, GitHub REST API, no backend, no auth required.

const LANG_COLORS = {
  JavaScript: '#ffb547',
  TypeScript: '#4fd0b8',
  Python: '#7cc48f',
  HTML: '#ff6f5e',
  CSS: '#b78af0',
  Go: '#5fd0d8',
  Rust: '#e0725f',
  Java: '#e8a15f',
  Ruby: '#e85f80',
  Shell: '#9ad46a',
  'C++': '#f06e9e',
  C: '#a4a7c9',
  default: '#8fabc9',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

const input = document.getElementById('repo-input');
const btn = document.getElementById('plot-btn');
const status = document.getElementById('status-line');
const dash = document.getElementById('dash');
const repoMeta = document.getElementById('repo-meta');
const commitChart = document.getElementById('commit-chart');
const langChart = document.getElementById('lang-chart');
const langList = document.getElementById('lang-list');
const contributorTable = document.getElementById('contributor-table');

btn.addEventListener('click', () => run(input.value.trim()));
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(input.value.trim()); });

async function run(slug) {
  const match = /^([\w.-]+)\/([\w.-]+)$/.exec(slug);
  if (!match) {
    setStatus('Enter a repo as "owner/name", e.g. facebook/react.', true);
    return;
  }
  const [, owner, repo] = match;
  setBusy(true);
  setStatus(`Plotting ${owner}/${repo}…`, false);
  dash.classList.add('hidden');

  try {
    const repoData = await fetchJson(`https://api.github.com/repos/${owner}/${repo}`);
    const languages = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/languages`);
    const contributors = await fetchContributorStats(owner, repo);

    renderMeta(repoData, contributors);
    renderCommitChart(contributors);
    renderLanguages(languages);
    renderContributors(contributors);

    dash.classList.remove('hidden');
    setStatus(`Showing analytics for ${owner}/${repo}.`, false);
  } catch (err) {
    setStatus(err.message || 'Something went wrong.', true);
  } finally {
    setBusy(false);
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Repository not found. Check the owner/name spelling.');
    if (res.status === 403) throw new Error('GitHub API rate limit reached. Try again shortly.');
    throw new Error('GitHub API returned an unexpected error.');
  }
  return res.json();
}

// GitHub computes contributor stats asynchronously — a 202 means "come back
// in a moment." Poll a few times before giving up.
async function fetchContributorStats(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/stats/contributors`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    if (!res.ok) throw new Error('Could not load contributor statistics for this repository.');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }
  return [];
}

function setBusy(busy) {
  btn.disabled = busy;
  input.disabled = busy;
}

function setStatus(msg, isError) {
  status.textContent = msg;
  status.classList.toggle('error', !!isError);
}

function renderMeta(repo, contributors) {
  const totalCommits = contributors.reduce((sum, c) => sum + (c.total || 0), 0);
  repoMeta.innerHTML = `
    <h2 class="repo-meta-title"><a href="${repo.html_url}" target="_blank" rel="noopener">${escapeHtml(repo.full_name)}</a></h2>
    <p class="repo-meta-desc">${escapeHtml(repo.description || 'No description provided.')}</p>
    <div class="repo-meta-stats">
      <span><b>${repo.stargazers_count.toLocaleString()}</b>stars</span>
      <span><b>${repo.forks_count.toLocaleString()}</b>forks</span>
      <span><b>${repo.open_issues_count.toLocaleString()}</b>open issues</span>
      <span><b>${totalCommits.toLocaleString()}</b>commits (52wk)</span>
    </div>
  `;
}

function renderCommitChart(contributors) {
  clearSvg(commitChart);
  const weeks = 52;
  const totals = new Array(weeks).fill(0);

  contributors.forEach((c) => {
    (c.weeks || []).slice(-weeks).forEach((w, i) => {
      totals[i] += w.c || 0;
    });
  });

  const max = Math.max(...totals, 1);
  const chartW = 640, chartH = 220, padBottom = 18, padTop = 6;
  const barW = chartW / weeks;

  totals.forEach((count, i) => {
    const h = ((chartH - padBottom - padTop) * count) / max;
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', i * barW + 1);
    rect.setAttribute('y', chartH - padBottom - h);
    rect.setAttribute('width', Math.max(barW - 2, 1));
    rect.setAttribute('height', h);
    rect.setAttribute('class', 'bar');
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = `${count} commits`;
    rect.appendChild(title);
    commitChart.appendChild(rect);
  });

  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', 2);
  label.setAttribute('y', chartH - 4);
  label.setAttribute('class', 'axis-label');
  label.textContent = '52 weeks ago';
  commitChart.appendChild(label);

  const label2 = document.createElementNS(SVG_NS, 'text');
  label2.setAttribute('x', chartW - 2);
  label2.setAttribute('y', chartH - 4);
  label2.setAttribute('text-anchor', 'end');
  label2.setAttribute('class', 'axis-label');
  label2.textContent = 'this week';
  commitChart.appendChild(label2);
}

function renderLanguages(languages) {
  clearSvg(langChart);
  langList.innerHTML = '';
  const total = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
  let x = 0;
  const chartW = 640, chartH = 60;

  Object.entries(languages).forEach(([lang, bytes]) => {
    const w = (bytes / total) * chartW;
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', Math.max(w - 1, 0));
    rect.setAttribute('height', chartH);
    rect.setAttribute('fill', LANG_COLORS[lang] || LANG_COLORS.default);
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = `${lang}: ${((bytes / total) * 100).toFixed(1)}%`;
    rect.appendChild(title);
    langChart.appendChild(rect);
    x += w;

    const li = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'lang-swatch';
    swatch.style.background = LANG_COLORS[lang] || LANG_COLORS.default;
    li.appendChild(swatch);
    li.appendChild(document.createTextNode(`${lang} · ${((bytes / total) * 100).toFixed(1)}%`));
    langList.appendChild(li);
  });
}

function renderContributors(contributors) {
  contributorTable.innerHTML = '';
  const sorted = [...contributors].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 8);
  const max = Math.max(...sorted.map((c) => c.total || 0), 1);

  sorted.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'contrib-row';
    row.innerHTML = `
      <span class="contrib-rank">${String(i + 1).padStart(2, '0')}</span>
      <span class="contrib-name">${escapeHtml(c.author?.login || 'unknown')}</span>
      <span class="contrib-count">${(c.total || 0).toLocaleString()}</span>
      <span class="contrib-bar-track"><span class="contrib-bar-fill" style="width:${((c.total || 0) / max) * 100}%"></span></span>
    `;
    contributorTable.appendChild(row);
  });

  if (sorted.length === 0) {
    contributorTable.innerHTML = '<p>No contributor data available for this repository yet.</p>';
  }
}

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
