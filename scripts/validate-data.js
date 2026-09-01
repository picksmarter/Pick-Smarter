#!/usr/bin/env node
/**
 * Command-line CSV validator — same rules as the in-browser check in
 * js/data-loader.js, so a bad weekly export can be caught before publishing.
 *
 * Usage:
 *   node scripts/validate-data.js data/college-current.csv
 *   node scripts/validate-data.js data/college-current.csv data/nfl-current.csv
 *   node scripts/validate-data.js            (checks both current-week files)
 */
const fs = require('fs');
const path = require('path');
const { parseCSV } = require('../js/csv.js');
const { validateMatchupRows, deriveQuickReadCards, deriveFeaturedUpsets } = require('../js/data-loader.js');

const ROOT = path.join(__dirname, '..');
const targets = process.argv.slice(2);
const files = targets.length > 0
  ? targets
  : ['data/college-current.csv', 'data/nfl-current.csv'];

let hadError = false;

files.forEach((relPath) => {
  const fullPath = path.resolve(ROOT, relPath);
  const label = relPath;
  console.log(`\nChecking ${label}...`);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ✗ File not found: ${fullPath}`);
    hadError = true;
    return;
  }

  const text = fs.readFileSync(fullPath, 'utf8');
  const rawRows = parseCSV(text);

  try {
    const rows = validateMatchupRows(rawRows, label);
    const cards = deriveQuickReadCards(rows);
    const featured = deriveFeaturedUpsets(rows);
    const goldRows = rows.filter((r) => r.winPct < 50).length;
    console.log(`  ✓ Valid — ${rows.length} matchups, ${cards.length} Quick Read card(s) tagged.`);
    if (cards.length < 3) {
      console.log(`  ! Warning: expected 3 Quick Read cards (best_leverage, safest_favorite, best_upset), found ${cards.length}.`);
    }
    console.log(`    Strategic Read: ${goldRows} row(s) gold, ${rows.length - goldRows} quiet.`);
    console.log(`    Upsets Worth a Look: ${featured.length} featured (max 3)${featured.length === 0 ? ' — section will be hidden' : ''}.`);
  } catch (err) {
    hadError = true;
    console.log(`  ✗ ${err.message}`);
    (err.details || []).forEach((d) => console.log(`      - ${d}`));
  }
});

console.log('');
process.exit(hadError ? 1 : 0);
