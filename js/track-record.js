/**
 * Past Picks / Track Record renderer.
 *
 * Historical weeks are frozen calls: this reads archive CSVs and displays
 * them as-is (win_pct/public_pct/leverage/general_pick are never
 * recalculated), plus whatever "winner"/"pick_result" values are present.
 * pick_result is "win", "loss", or blank/"pending" until the game is final.
 */

function escapeHTMLTR(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resultBadge(result) {
  const r = (result || '').trim().toLowerCase();
  if (r === 'win') return '<span class="badge badge-teal">Won</span>';
  if (r === 'loss') return '<span class="badge badge-danger">Lost</span>';
  return '<span class="badge badge-navy">Pending</span>';
}

function renderWeekCard(weekLabel, rows) {
  const decided = rows.filter((r) => {
    const v = (r.pick_result || '').trim().toLowerCase();
    return v === 'win' || v === 'loss';
  });
  const wins = decided.filter((r) => r.pick_result.trim().toLowerCase() === 'win').length;
  const record = decided.length ? `${wins}-${decided.length - wins}` : 'Pending';

  const gameRows = rows
    .map((r) => {
      return `
        <div class="matchup-card">
          <div class="matchup-card-top">
            <span class="matchup-teams">${escapeHTMLTR(r.team_a)} vs ${escapeHTMLTR(r.team_b)}</span>
            ${resultBadge(r.pick_result)}
          </div>
          <div class="matchup-pick-row">
            <div>
              <span class="badge badge-teal matchup-pick-badge">Pick Smarter Pick</span>
              <div class="matchup-pick-team">${escapeHTMLTR(r.general_pick)}</div>
            </div>
          </div>
          <div class="matchup-stats">
            <div><span class="stat-value">${Math.round(Number(r.win_pct))}%</span><span class="stat-label">Win %</span></div>
            <div><span class="stat-value">${Math.round(Number(r.public_pct))}%</span><span class="stat-label">Public %</span></div>
            <div><span class="stat-value">${Math.round(Number(r.leverage))}%</span><span class="stat-label">Leverage</span></div>
          </div>
          <p class="matchup-insight">${escapeHTMLTR(r.quick_insight)}${r.winner ? ` <strong>Result:</strong> ${escapeHTMLTR(r.winner)} won.` : ''}</p>
        </div>
      `;
    })
    .join('');

  return `
    <div class="card card-pad" style="margin-bottom: var(--space-5);">
      <div class="section-heading" style="margin-bottom: var(--space-4);">
        <h3 style="margin: 0;">${escapeHTMLTR(weekLabel)}</h3>
        <span class="badge badge-navy">Record: ${record}</span>
      </div>
      <div class="matchups-list" style="display: flex;">${gameRows}</div>
    </div>
  `;
}

async function initTrackRecord(config) {
  const { manifestPath, mountEl, archiveDir } = config;
  try {
    const res = await fetch(manifestPath, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load ${manifestPath}`);
    const manifest = await res.json();

    if (manifest.length === 0) {
      mountEl.innerHTML = '<p class="field-hint">No archived weeks yet — check back after the first week of results.</p>';
      return;
    }

    const weekHTML = [];
    for (const entry of manifest) {
      const csvRes = await fetch(`${archiveDir}/${entry.file}`, { cache: 'no-store' });
      const text = await csvRes.text();
      const rows = parseCSV(text);
      weekHTML.push(renderWeekCard(entry.label, rows));
    }
    mountEl.innerHTML = weekHTML.join('');
  } catch (err) {
    mountEl.innerHTML = '<p class="field-hint">Track record data isn\'t available right now.</p>';
    // eslint-disable-next-line no-console
    console.error(err);
  }
}
