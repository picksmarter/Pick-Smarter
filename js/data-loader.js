/**
 * Loads and validates a weekly Pick Smarter CSV.
 *
 * Design goal (per data/README.md): fail clearly and specifically when the
 * data is malformed, rather than silently rendering blank or wrong content.
 * Every error names the row and field so a non-technical weekly update can
 * be debugged from the message alone.
 */

const QUICK_READ_KINDS = ['safest_favorite', 'best_leverage', 'best_upset'];

class DataValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'DataValidationError';
    this.details = details || [];
  }
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function toNumber(value, fieldLabel, rowLabel, errors) {
  const raw = String(value).trim();
  if (/%/.test(raw)) {
    errors.push(
      `${rowLabel}: "${fieldLabel}" contains a "%" sign ("${raw}"). Use a plain number like 56.4, not "56.4%".`
    );
    return null;
  }
  const n = Number(raw);
  if (Number.isNaN(n)) {
    errors.push(`${rowLabel}: "${fieldLabel}" is not a number ("${raw}").`);
    return null;
  }
  return n;
}

function checkPercent(value, fieldLabel, rowLabel, errors) {
  const n = toNumber(value, fieldLabel, rowLabel, errors);
  if (n === null) return null;
  if (n > 0 && n < 1) {
    errors.push(
      `${rowLabel}: "${fieldLabel}" is ${n}, which looks like a fraction. Did the Excel export use a raw decimal instead of a percentage-point number? Use 56.4 to mean 56.4%, not 0.564.`
    );
    return null;
  }
  if (n < 0 || n > 100) {
    errors.push(`${rowLabel}: "${fieldLabel}" is ${n}, expected a value between 0 and 100.`);
    return null;
  }
  return n;
}

/**
 * Validate + normalize the raw parsed CSV rows for one sport's current week.
 * Throws DataValidationError (with every problem found, not just the first)
 * on any malformed required data.
 */
function validateMatchupRows(rawRows, sourceLabel) {
  const errors = [];
  const rows = [];
  const seenQuickRead = {};

  if (rawRows.length === 0) {
    throw new DataValidationError(`${sourceLabel}: the CSV has no data rows.`, []);
  }

  rawRows.forEach((raw, idx) => {
    const rowLabel = `${sourceLabel} row ${idx + 2}`; // +2: header is row 1, data is 1-indexed after it
    const required = [
      'order', 'season', 'week', 'team_a', 'team_b',
      'general_pick', 'win_pct', 'public_pct', 'leverage',
      'quick_insight', 'updated_at',
    ];
    required.forEach((field) => {
      if (isBlank(raw[field])) {
        errors.push(`${rowLabel}: missing required field "${field}".`);
      }
    });
    if (errors.length && required.some((f) => isBlank(raw[f]))) {
      // Skip deeper checks on a row that's already missing required fields
      return;
    }

    const order = toNumber(raw.order, 'order', rowLabel, errors);
    const season = toNumber(raw.season, 'season', rowLabel, errors);
    const week = toNumber(raw.week, 'week', rowLabel, errors);
    const teamA = raw.team_a.trim();
    const teamB = raw.team_b.trim();
    const generalPick = raw.general_pick.trim();

    if (teamA && teamB && teamA === teamB) {
      errors.push(`${rowLabel}: "team_a" and "team_b" are both "${teamA}".`);
    }
    if (generalPick && teamA && teamB && generalPick !== teamA && generalPick !== teamB) {
      errors.push(
        `${rowLabel}: "general_pick" is "${generalPick}", which doesn't exactly match "team_a" (${teamA}) or "team_b" (${teamB}). Check for typos or extra spaces.`
      );
    }

    const winPct = checkPercent(raw.win_pct, 'win_pct', rowLabel, errors);
    const publicPct = checkPercent(raw.public_pct, 'public_pct', rowLabel, errors);
    const leverage = toNumber(raw.leverage, 'leverage', rowLabel, errors);

    if (winPct !== null && publicPct !== null && leverage !== null) {
      const expected = winPct - publicPct;
      if (Math.abs(expected - leverage) > 1.0) {
        errors.push(
          `${rowLabel}: "leverage" (${leverage}) doesn't match win_pct - public_pct (${winPct} - ${publicPct} = ${expected.toFixed(1)}). Check the export.`
        );
      }
    }

    let ratio = null;
    if (!isBlank(raw.ratio)) {
      ratio = toNumber(raw.ratio, 'ratio', rowLabel, errors);
    }

    let quickRead = '';
    if (!isBlank(raw.quick_read)) {
      quickRead = raw.quick_read.trim().toLowerCase();
      if (!QUICK_READ_KINDS.includes(quickRead)) {
        errors.push(
          `${rowLabel}: "quick_read" is "${raw.quick_read}", expected one of: ${QUICK_READ_KINDS.join(', ')}, or blank.`
        );
      } else {
        if (seenQuickRead[quickRead]) {
          errors.push(
            `${rowLabel}: "quick_read" value "${quickRead}" is already used on ${sourceLabel} row ${seenQuickRead[quickRead]}. Only one row per Quick Read card.`
          );
        }
        seenQuickRead[quickRead] = idx + 2;
      }
    }

    let teamToConsider = '';
    if (!isBlank(raw.team_to_consider)) {
      teamToConsider = raw.team_to_consider.trim();
      if (teamToConsider !== teamA && teamToConsider !== teamB) {
        errors.push(
          `${rowLabel}: "team_to_consider" is "${teamToConsider}", which doesn't match team_a or team_b.`
        );
      }
    }

    let homeTeam = '';
    if (!isBlank(raw.home_team)) {
      homeTeam = raw.home_team.trim();
      if (homeTeam !== teamA && homeTeam !== teamB) {
        errors.push(
          `${rowLabel}: "home_team" is "${homeTeam}", which doesn't match team_a or team_b.`
        );
      }
    }

    let upsetFeatured = false;
    if (!isBlank(raw.upset_featured)) {
      const v = raw.upset_featured.trim().toLowerCase();
      if (v !== 'true' && v !== 'false') {
        errors.push(
          `${rowLabel}: "upset_featured" is "${raw.upset_featured}", expected TRUE, FALSE, or blank.`
        );
      } else {
        upsetFeatured = v === 'true';
      }
    }

    let upsetRank = null;
    if (!isBlank(raw.upset_rank)) {
      const n = toNumber(raw.upset_rank, 'upset_rank', rowLabel, errors);
      if (n !== null && ![1, 2, 3].includes(n)) {
        errors.push(`${rowLabel}: "upset_rank" is ${n}, expected 1, 2, or 3.`);
      } else {
        upsetRank = n;
      }
    }
    if (upsetFeatured && upsetRank === null) {
      errors.push(`${rowLabel}: "upset_featured" is TRUE but "upset_rank" is missing — needs 1, 2, or 3.`);
    }
    if (!upsetFeatured && upsetRank !== null) {
      errors.push(`${rowLabel}: "upset_rank" is set but "upset_featured" isn't TRUE — remove one or the other.`);
    }

    rows.push({
      order: order || idx + 1,
      season,
      week,
      teamA,
      teamB,
      generalPick,
      winPct,
      publicPct,
      leverage,
      ratio,
      quickInsight: raw.quick_insight.trim(),
      quickRead,
      teamToConsider: teamToConsider || generalPick,
      updatedAt: raw.updated_at.trim(),
      kickoffTime: (raw.kickoff_time || '').trim(),
      homeTeam,
      upsetFeatured,
      upsetRank,
    });
  });

  const featuredRows = rows.filter((r) => r.upsetFeatured);
  if (featuredRows.length > 3) {
    errors.push(
      `${sourceLabel}: ${featuredRows.length} rows have "upset_featured" set to TRUE — the Upsets Worth a Look section supports at most 3.`
    );
  }
  const seenRank = {};
  featuredRows.forEach((r) => {
    if (seenRank[r.upsetRank]) {
      errors.push(
        `${sourceLabel}: "upset_rank" ${r.upsetRank} is used by more than one row (${r.teamA} vs ${r.teamB} and others) — each rank should be unique.`
      );
    }
    seenRank[r.upsetRank] = true;
  });

  if (errors.length > 0) {
    throw new DataValidationError(
      `${sourceLabel}: found ${errors.length} problem${errors.length === 1 ? '' : 's'} in the data.`,
      errors
    );
  }

  rows.sort((a, b) => a.order - b.order);
  return rows;
}

/**
 * Distinguishes the Default Pick (general_pick, always shown with its own
 * win_pct/public_pct/leverage exactly as given) from an explicitly flagged
 * Strategic Read alternative. A row only gets a gold Strategic Read when you
 * set team_to_consider to the *other* team in that matchup — that team's
 * numbers are derived via the same complementary math used elsewhere
 * (win_pct/public_pct always sum to 100 between the two sides of a
 * matchup). Leaving team_to_consider blank (or equal to general_pick) keeps
 * the row quiet — that's the default for most games.
 */
function deriveStrategicRead(row) {
  const isStrategic = row.teamToConsider !== row.generalPick;
  if (!isStrategic) {
    return {
      defaultTeam: row.generalPick,
      defaultWinPct: row.winPct,
      defaultPublicPct: row.publicPct,
      defaultLeverage: row.leverage,
      isStrategic: false,
    };
  }
  return {
    defaultTeam: row.generalPick,
    defaultWinPct: row.winPct,
    defaultPublicPct: row.publicPct,
    defaultLeverage: row.leverage,
    isStrategic: true,
    altTeam: row.teamToConsider,
    altWinPct: +(100 - row.winPct).toFixed(1),
    altPublicPct: +(100 - row.publicPct).toFixed(1),
    altEdge: +(-row.leverage).toFixed(1),
  };
}

/**
 * Rows explicitly flagged upset_featured=TRUE, sorted by upset_rank.
 * Never auto-selected — if the spreadsheet hasn't flagged anything yet,
 * this returns an empty array and the section simply doesn't render.
 */
function deriveFeaturedUpsets(rows) {
  return rows
    .filter((r) => r.upsetFeatured)
    .slice()
    .sort((a, b) => a.upsetRank - b.upsetRank);
}

async function loadWeeklyMatchups(csvPath, sourceLabel) {
  let text;
  try {
    const res = await fetch(csvPath, { cache: 'no-store' });
    if (!res.ok) {
      throw new DataValidationError(
        `${sourceLabel}: could not load "${csvPath}" (HTTP ${res.status}).`,
        []
      );
    }
    text = await res.text();
  } catch (err) {
    if (err instanceof DataValidationError) throw err;
    throw new DataValidationError(
      `${sourceLabel}: could not fetch "${csvPath}". If you're opening this file directly (file://), you need to run a local server — see README.md.`,
      [String(err.message || err)]
    );
  }
  const rawRows = parseCSV(text);
  return validateMatchupRows(rawRows, sourceLabel);
}

/**
 * Given validated matchup rows, derive the up-to-3 Quick Read cards.
 * team_to_consider is usually just general_pick (e.g. for "best_upset", the
 * underdog you're already recommending). It only needs to differ from
 * general_pick when a card should name-check the *other* side of that row's
 * matchup instead — win/public/leverage are complementary between the two
 * teams (they always sum to 100 / negate exactly), so that other team's
 * numbers are derived mathematically, never guessed.
 */
function deriveQuickReadCards(rows) {
  return rows
    .filter((r) => r.quickRead)
    .map((r) => {
      const highlightingOpponent = r.teamToConsider !== r.generalPick;
      const opponent = r.teamToConsider === r.teamA ? r.teamB : r.teamA;
      const card = {
        kind: r.quickRead,
        team: r.teamToConsider,
        opponent,
        winPct: highlightingOpponent ? +(100 - r.winPct).toFixed(1) : r.winPct,
        publicPct: highlightingOpponent ? +(100 - r.publicPct).toFixed(1) : r.publicPct,
        leverage: highlightingOpponent ? +(-r.leverage).toFixed(1) : r.leverage,
        insight: r.quickInsight,
        order: r.order,
      };
      return card;
    })
    .sort((a, b) => {
      const idx = (k) => QUICK_READ_KINDS.indexOf(k);
      return idx(a.kind) - idx(b.kind);
    });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DataValidationError,
    validateMatchupRows,
    loadWeeklyMatchups,
    deriveQuickReadCards,
    deriveStrategicRead,
    deriveFeaturedUpsets,
    QUICK_READ_KINDS,
  };
}
