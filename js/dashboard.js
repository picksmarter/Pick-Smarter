/**
 * Shared weekly dashboard renderer, used by both /college/ and /nfl/.
 * Sport-specific behavior is limited to the config passed to initDashboard().
 */

const ICONS = {
  leverageUp:
    '<svg class="leverage-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 13l5-5 3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 4h-4M17 4v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  leverageDown:
    '<svg class="leverage-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 6l5 5 3-3 5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 16h-4M17 16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  leverageFlat:
    '<svg class="leverage-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  bestLeverage:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 7h-6v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  safestFavorite:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bestUpset:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5l2.6 5.6 6.1.6-4.6 4.1 1.4 6-5.5-3-5.5 3 1.4-6-4.6-4.1 6.1-.6L12 2.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  checkQuiet:
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5-5.5"/></svg>',
};

const QUICK_READ_META = {
  safest_favorite: { label: 'Safest Pick', icon: ICONS.safestFavorite },
  best_leverage: { label: 'Best Leverage', icon: ICONS.bestLeverage },
  best_upset: { label: 'Best Upset Upside', icon: ICONS.bestUpset },
};

function slugifyTeam(name) {
  return String(name)
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function teamLogoHTML(name) {
  const slug = slugifyTeam(name);
  const safeName = escapeHTML(name);
  return (
    `<span class="team-mark" aria-hidden="true">` +
    `<img src="/assets/teams/logos/${slug}.png" alt="" loading="lazy" ` +
    `onerror="this.onerror=null;this.src='/assets/teams/placeholder.svg';">` +
    `</span>`
  );
}

function formatPct(n) {
  return `${Math.round(n)}%`;
}

function leverageMarkup(n) {
  const rounded = Math.round(n);
  // A value that displays as 0% (no edge either way) gets a neutral gray
  // dash instead of a colored up/down arrow — a colored arrow next to
  // "0%" implies a direction that isn't really there.
  if (rounded === 0) {
    return `<span class="leverage leverage-neutral">${ICONS.leverageFlat}0%</span>`;
  }
  const isPositive = n >= 0;
  const cls = isPositive ? 'leverage-positive' : 'leverage-negative';
  const icon = isPositive ? ICONS.leverageUp : ICONS.leverageDown;
  const sign = isPositive ? '+' : '';
  return `<span class="leverage ${cls}">${icon}${sign}${rounded}%</span>`;
}

function renderQuickReadCard(card) {
  const meta = QUICK_READ_META[card.kind];
  return `
    <article class="quick-read-card" data-kind="${card.kind}">
      <div class="quick-read-label">${meta.icon}<span>${meta.label}</span></div>
      <div class="quick-read-matchup">
        ${teamLogoHTML(card.team)}
        <div>
          <div class="quick-read-team">${escapeHTML(card.team)}</div>
          <div class="quick-read-vs">vs ${escapeHTML(card.opponent)}</div>
        </div>
      </div>
      <div class="quick-read-stats">
        <div class="quick-read-stat">
          <span class="stat-value">${formatPct(card.winPct)}</span>
          <span class="stat-label">Win Chance</span>
        </div>
        <div class="quick-read-stat">
          <span class="stat-value">${formatPct(card.publicPct)}</span>
          <span class="stat-label">Public Picks</span>
        </div>
        <div class="quick-read-stat">
          <span class="stat-value">${leverageMarkup(card.leverage)}</span>
          <span class="stat-label">Leverage</span>
        </div>
      </div>
      <p class="quick-read-insight">${escapeHTML(card.insight)}</p>
    </article>
  `;
}

/**
 * Horizontal fill bar under a win-chance number. Supporting visualization
 * only — the number itself is always shown as text alongside it.
 */
function probabilityBarHTML(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  return `
    <div class="prob-bar" role="presentation">
      <div class="prob-bar-fill" style="width:${clamped}%"></div>
    </div>
  `;
}

function pickBlockHTML(team, winPct, publicPct, leverage) {
  const positiveClass = leverage > 0 ? ' pick-block--positive-leverage' : '';
  return `
    <div class="pick-block${positiveClass}">
      ${teamLogoHTML(team)}
      <div class="pick-block-body">
        <span class="badge badge-navy">Likely Favorite</span>
        <div class="pick-block-team">${escapeHTML(team)}</div>
        <div class="pick-block-stat-row">
          <span class="pick-block-pct">${formatPct(winPct)}</span>
          <span class="pick-block-pct-label">Win Chance</span>
        </div>
        ${probabilityBarHTML(winPct)}
        <div class="pick-block-secondary-stats">
          <span>${formatPct(publicPct)} <span class="pick-block-secondary-label">Public Picks</span></span>
          <span>${leverageMarkup(leverage)} <span class="pick-block-secondary-label">Leverage</span></span>
        </div>
      </div>
    </div>
  `;
}

/**
 * The Strategic Read area for one matchup. Two states:
 * gold ("worth considering") only when deriveStrategicRead() found the
 * spreadsheet's own general_pick diverging from the raw favorite; quiet
 * ("no worthwhile alternative") for every straightforward game. Most rows
 * should be quiet — that contrast is the point.
 */
function strategicReadHTML(sr) {
  if (!sr.isStrategic) {
    return `
      <div class="strategic-read strategic-read--quiet">
        <div class="strategic-read-label">${ICONS.checkQuiet}<span>No worthwhile strategic alternative</span></div>
      </div>
    `;
  }
  return `
    <div class="strategic-read strategic-read--gold">
      <div class="strategic-read-label">${ICONS.bestUpset}<span>Strategic Read</span></div>
      <div class="strategic-read-team">
        ${teamLogoHTML(sr.altTeam)}
        <span class="strategic-read-team-name">${escapeHTML(sr.altTeam)}</span>
      </div>
      <div class="strategic-read-stats">
        <span>${formatPct(sr.altWinPct)} Win Chance</span>
        <span>${formatPct(sr.altPublicPct)} Public Picks</span>
        <span>${leverageMarkup(sr.altEdge)} Leverage</span>
      </div>
    </div>
  `;
}

function renderMatchupsTableRow(row) {
  const sr = deriveStrategicRead(row);
  return `
    <tr>
      <td>
        <div class="mt-matchup">${teamLogoHTML(row.teamA)} ${escapeHTML(row.teamA)}
          <span aria-hidden="true">vs</span> ${teamLogoHTML(row.teamB)} ${escapeHTML(row.teamB)}
        </div>
      </td>
      <td>${pickBlockHTML(sr.defaultTeam, sr.defaultWinPct, sr.defaultPublicPct, sr.defaultLeverage)}</td>
      <td>${strategicReadHTML(sr)}</td>
      <td class="mt-insight">${escapeHTML(row.quickInsight)}</td>
    </tr>
  `;
}

function renderMatchupCard(row) {
  const sr = deriveStrategicRead(row);
  return `
    <article class="matchup-card">
      <div class="matchup-card-top">
        <span class="matchup-teams">${escapeHTML(row.teamA)} vs ${escapeHTML(row.teamB)}</span>
      </div>
      ${pickBlockHTML(sr.defaultTeam, sr.defaultWinPct, sr.defaultPublicPct, sr.defaultLeverage)}
      ${strategicReadHTML(sr)}
      <p class="matchup-insight"><strong>Why it matters:</strong> ${escapeHTML(row.quickInsight)}</p>
    </article>
  `;
}

/**
 * One card in the "Upsets Worth a Look" hero section — only rendered for
 * rows the spreadsheet explicitly flagged (upset_featured=TRUE), never
 * auto-selected by the site. Shows team_to_consider (the underdog you want
 * featured), not general_pick — same complementary-math derivation as
 * deriveStrategicRead/deriveQuickReadCards when the two differ.
 */
function renderUpsetCard(row) {
  const highlightingOpponent = row.teamToConsider !== row.generalPick;
  const team = row.teamToConsider;
  const opponent = team === row.teamA ? row.teamB : row.teamA;
  const winPct = highlightingOpponent ? +(100 - row.winPct).toFixed(1) : row.winPct;
  const publicPct = highlightingOpponent ? +(100 - row.publicPct).toFixed(1) : row.publicPct;
  const leverage = highlightingOpponent ? +(-row.leverage).toFixed(1) : row.leverage;
  return `
    <article class="upset-card">
      <div class="upset-card-matchup">
        ${teamLogoHTML(team)}
        <div>
          <div class="upset-card-team">${escapeHTML(team)}</div>
          <div class="upset-card-vs">vs ${escapeHTML(opponent)}</div>
        </div>
      </div>
      <div class="upset-card-stats">
        <div class="upset-card-stat"><span class="stat-value">${formatPct(winPct)}</span><span class="stat-label">Win Chance</span></div>
        <div class="upset-card-stat"><span class="stat-value">${formatPct(publicPct)}</span><span class="stat-label">Public Picks</span></div>
        <div class="upset-card-stat">${leverageMarkup(leverage)}<span class="stat-label">Leverage</span></div>
      </div>
      <p class="upset-card-insight">${escapeHTML(row.quickInsight)}</p>
    </article>
  `;
}

function renderDataError(container, error) {
  const details = (error.details || [])
    .map((d) => `<li><code>${escapeHTML(d)}</code></li>`)
    .join('');
  container.innerHTML = `
    <div class="data-alert" role="alert">
      <h3>This week's data couldn't be loaded</h3>
      <p>${escapeHTML(error.message)}</p>
      ${details ? `<ul>${details}</ul>` : ''}
      <p>See <code>data/README.md</code> for the expected CSV format.</p>
    </div>
  `;
}

/**
 * Compact single-card preview used on the homepage — shows the Best
 * Leverage Pick (falling back to the first row) for one sport, with a
 * "see full report" link. Keeps the homepage short per the spec.
 */
async function initHomePreview(config) {
  const { csvPath, sourceLabel, mountEl, week: weekEl, reportHref } = config;
  try {
    const rows = await loadWeeklyMatchups(csvPath, sourceLabel);
    const cards = deriveQuickReadCards(rows);
    const featured = cards.find((c) => c.kind === 'best_leverage') || {
      kind: 'best_leverage',
      team: rows[0].generalPick,
      opponent: rows[0].generalPick === rows[0].teamA ? rows[0].teamB : rows[0].teamA,
      winPct: rows[0].winPct,
      publicPct: rows[0].publicPct,
      leverage: rows[0].leverage,
      insight: rows[0].quickInsight,
    };
    if (weekEl) weekEl.textContent = `Week ${rows[0].week} · Updated ${rows[0].updatedAt}`;
    if (mountEl) {
      mountEl.innerHTML = `
        <a class="quick-read-card home-preview-card" data-kind="${featured.kind}" href="${reportHref}">
          <div class="quick-read-label">${QUICK_READ_META[featured.kind].icon}<span>${QUICK_READ_META[featured.kind].label}</span></div>
          <div class="quick-read-matchup">
            ${teamLogoHTML(featured.team)}
            <div>
              <div class="quick-read-team">${escapeHTML(featured.team)}</div>
              <div class="quick-read-vs">vs ${escapeHTML(featured.opponent)}</div>
            </div>
          </div>
          <div class="quick-read-stats">
            <div class="quick-read-stat"><span class="stat-value">${formatPct(featured.winPct)}</span><span class="stat-label">Win Chance</span></div>
            <div class="quick-read-stat"><span class="stat-value">${formatPct(featured.publicPct)}</span><span class="stat-label">Public Picks</span></div>
            <div class="quick-read-stat"><span class="stat-value">${leverageMarkup(featured.leverage)}</span><span class="stat-label">Leverage</span></div>
          </div>
          <p class="quick-read-insight">${escapeHTML(featured.insight)}</p>
          <span class="preview-cta">See the full report &rarr;</span>
        </a>
      `;
    }
  } catch (err) {
    if (mountEl) {
      mountEl.innerHTML = `<p class="field-hint">This week's report isn't available right now.</p>`;
    }
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

async function initDashboard(config) {
  const {
    csvPath,
    sourceLabel,
    metaEl,
    quickReadEl,
    upsetsSectionEl,
    upsetsGridEl,
    matchupsTbodyEl,
    matchupsListEl,
    errorEl,
  } = config;

  try {
    const rows = await loadWeeklyMatchups(csvPath, sourceLabel);
    if (rows.length === 0) {
      throw new DataValidationError(`${sourceLabel}: no matchups found.`, []);
    }

    const first = rows[0];
    if (metaEl) {
      metaEl.innerHTML = `
        <span><strong>Season ${escapeHTML(String(first.season))}</strong> &middot; Week ${escapeHTML(String(first.week))}</span>
        <span>Updated ${escapeHTML(first.updatedAt)}</span>
      `;
    }

    const quickReadCards = deriveQuickReadCards(rows);
    if (quickReadEl) {
      quickReadEl.innerHTML = quickReadCards.map(renderQuickReadCard).join('');
    }

    const featuredUpsets = deriveFeaturedUpsets(rows);
    if (upsetsSectionEl && upsetsGridEl) {
      if (featuredUpsets.length === 0) {
        upsetsSectionEl.hidden = true;
      } else {
        upsetsSectionEl.hidden = false;
        upsetsGridEl.setAttribute('data-count', String(featuredUpsets.length));
        upsetsGridEl.innerHTML = featuredUpsets.map(renderUpsetCard).join('');
      }
    }

    if (matchupsTbodyEl) {
      matchupsTbodyEl.innerHTML = rows.map(renderMatchupsTableRow).join('');
    }
    if (matchupsListEl) {
      matchupsListEl.innerHTML = rows.map(renderMatchupCard).join('');
    }
  } catch (err) {
    if (errorEl) {
      errorEl.hidden = false;
      renderDataError(errorEl, err);
    }
    if (quickReadEl) quickReadEl.innerHTML = '';
    if (upsetsSectionEl) upsetsSectionEl.hidden = true;
    if (matchupsTbodyEl) matchupsTbodyEl.innerHTML = '';
    if (matchupsListEl) matchupsListEl.innerHTML = '';
    // eslint-disable-next-line no-console
    console.error(err);
  }
}
