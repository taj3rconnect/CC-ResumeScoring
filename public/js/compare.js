const params = new URLSearchParams(window.location.search);
const ids = (params.get('ids') || '').split(',').filter(Boolean);

const loadingEl = document.getElementById('loading');
const overviewSection = document.getElementById('overviewSection');
const overviewCards = document.getElementById('overviewCards');
const breakdownSection = document.getElementById('breakdownSection');
const breakdownContainer = document.getElementById('breakdownContainer');
const summarySection = document.getElementById('summarySection');
const summaryContainer = document.getElementById('summaryContainer');

const COLORS = ['var(--md-primary)', 'var(--md-tertiary)', 'var(--md-warning)'];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadComparison() {
  if (ids.length < 2) {
    loadingEl.innerHTML = '<p style="color:var(--md-error);">Need at least 2 candidate IDs to compare.</p>';
    return;
  }

  try {
    const response = await authFetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeIds: ids }),
    });
    if (!response.ok) throw new Error('Failed to load comparison data');
    const data = await response.json();

    loadingEl.style.display = 'none';
    renderOverview(data.candidates);
    renderBreakdown(data.candidates);
    renderSummary(data.candidates);
  } catch (err) {
    loadingEl.innerHTML = `<p style="color:var(--md-error);">Error: ${escapeHtml(err.message)}</p>`;
  }
}

function renderOverview(candidates) {
  overviewSection.style.display = 'block';
  overviewCards.innerHTML = candidates.map((c, i) => {
    const scoreClass = c.score >= 70 ? 'score-high' : c.score >= 50 ? 'score-mid' : 'score-low';
    return `<div class="compare-card" style="border-top: 3px solid ${COLORS[i]}">
      <div class="score-badge ${scoreClass}" style="width:64px; height:64px; font-size:24px;">${c.score}</div>
      <div class="compare-card-name">${escapeHtml(c.candidateName || 'Unknown')}</div>
      <div class="compare-card-file">${escapeHtml(c.originalName)}</div>
      <p class="compare-card-reasoning">${escapeHtml(c.reasoning || '')}</p>
    </div>`;
  }).join('');
}

function renderBreakdown(candidates) {
  // Collect all criteria names
  const criteriaNames = [];
  for (const c of candidates) {
    if (c.subScores && c.subScores.criteria) {
      for (const cr of c.subScores.criteria) {
        if (!criteriaNames.includes(cr.name)) criteriaNames.push(cr.name);
      }
    }
  }

  if (criteriaNames.length === 0) {
    return;
  }

  breakdownSection.style.display = 'block';

  breakdownContainer.innerHTML = criteriaNames.map(name => {
    const scores = candidates.map((c, i) => {
      const criterion = c.subScores?.criteria?.find(cr => cr.name === name);
      return { score: criterion?.score ?? 0, color: COLORS[i], name: c.candidateName || 'Unknown' };
    });
    const maxScore = Math.max(...scores.map(s => s.score));

    return `<div class="compare-criterion">
      <div class="compare-criterion-name">${escapeHtml(name)}</div>
      <div class="compare-criterion-bars">
        ${scores.map(s => {
          const isWinner = s.score === maxScore && maxScore > 0;
          return `<div class="compare-bar-row">
            <span class="compare-bar-label">${escapeHtml(s.name)}</span>
            <div class="compare-bar-track">
              <div class="compare-bar-fill${isWinner ? ' winner' : ''}" style="width:${s.score}%; background:${s.color};"></div>
            </div>
            <span class="compare-bar-val${isWinner ? ' winner' : ''}">${s.score}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderSummary(candidates) {
  summarySection.style.display = 'block';

  summaryContainer.innerHTML = candidates.map((c, i) => {
    if (!c.subScores || !c.subScores.criteria) return '';
    const sorted = [...c.subScores.criteria].sort((a, b) => b.score - a.score);
    const strengths = sorted.slice(0, 2).filter(s => s.score >= 50);
    const weaknesses = sorted.slice(-2).filter(s => s.score < 70).reverse();

    return `<div class="compare-card" style="border-top: 3px solid ${COLORS[i]}">
      <div class="compare-card-name">${escapeHtml(c.candidateName || 'Unknown')}</div>
      <div class="compare-tags">
        <div class="compare-tag-label">Strengths</div>
        ${strengths.length > 0 ? strengths.map(s =>
          `<span class="compare-tag tag-strength">${escapeHtml(s.name)} (${s.score})</span>`
        ).join('') : '<span class="compare-tag-none">None above 50</span>'}
      </div>
      <div class="compare-tags" style="margin-top:8px;">
        <div class="compare-tag-label">Areas to Improve</div>
        ${weaknesses.length > 0 ? weaknesses.map(s =>
          `<span class="compare-tag tag-weakness">${escapeHtml(s.name)} (${s.score})</span>`
        ).join('') : '<span class="compare-tag-none">All criteria 70+</span>'}
      </div>
    </div>`;
  }).join('');
}

loadComparison();
