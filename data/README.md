# Updating weekly data

The website never has team names, percentages, or picks hard-coded in HTML. Every dashboard is rendered from a CSV file at request time. To publish a new week, you replace a CSV — nothing else.

Two files drive the live dashboards:

- `data/college-current.csv` → renders `/college/`
- `data/nfl-current.csv` → renders `/nfl/`

## The weekly workflow

1. Finish your calculations in your `CURRENT WEEK` tab in Excel, same as always.
2. For each game, you need: the two teams, which one is the **General Pick**, and that pick's **Win %**, **Public %**, **Leverage**, and (optional) **Ratio** — this is almost exactly your `Pick Win %` / `Pick Public %` / `Pick Leverage` / `Pick Ratio` / `Quick Insight` columns already.
3. Decide which 3 rows are your Quick Read cards this week (Safest Pick, Best Leverage, Best Upset Upside) — see "Quick Read" below.
4. Optionally flag up to 3 rows as `upset_featured` for the "Upsets Worth a Look" section — see that section below.
5. Paste the values into the CSV using the column order below (a spreadsheet "Save As → CSV" works fine, but see the percentage-formatting warning first).
6. Replace `data/college-current.csv` (or `data/nfl-current.csv`) with the new file, keeping the exact filename.
7. Reload the page. If something's wrong, the dashboard will show a red error box naming the exact row and field instead of silently displaying bad numbers.

You can check a file before publishing by running:

```
node scripts/validate-data.js data/college-current.csv
```

## Column reference

| Column | Required? | Format | Meaning |
|---|---|---|---|
| `order` | Required | Whole number | Display order (usually your Game #). |
| `season` | Required | Whole number | e.g. `2026` |
| `week` | Required | Whole number | e.g. `1` |
| `team_a` | Required | Text | First team's name. |
| `team_b` | Required | Text | Second team's name. |
| `general_pick` | Required | Text | Must exactly match `team_a` or `team_b`. Always shown as the headline "Likely Favorite" pick — this should be whichever team has the higher `win_pct`. |
| `win_pct` | Required | Number, 0–100 | The **General Pick's** win probability. `56.4`, not `0.564` or `"56.4%"`. |
| `public_pct` | Required | Number, 0–100 | The **General Pick's** public pick share. Same format as `win_pct`. |
| `leverage` | Required | Number, can be negative | The **General Pick's** `win_pct − public_pct`. The site double-checks this matches. |
| `ratio` | Optional | Number | `win_pct ÷ public_pct`. Stored for the Methodology page; not shown on the main dashboard. |
| `quick_insight` | Required | Short text (1 sentence) | Explains *why*, not just the numbers. See "Writing quick_insight" below. |
| `quick_read` | Optional | `best_leverage` / `safest_favorite` / `best_upset` / blank | Tags this row as one of the 3 Quick Read cards. See below. |
| `team_to_consider` | Optional | Text | The one field that controls both Strategic Read and Upsets Worth a Look. Set it to the **opponent** of `general_pick` to flag that team as the underdog worth featuring; leave it blank to keep the row quiet. See "Default Pick vs. Strategic Read" below. |
| `updated_at` | Required | Text | Shown as "Updated ___" at the top of the page, e.g. `Fri, Aug 28, 2026 – 3:15 PM ET`. |
| `kickoff_time` | Optional | Text | Not currently displayed on the site. Safe to leave filled in or blank — the columns still exist in the schema in case this comes back later. |
| `home_team` | Optional | Text | Not currently displayed on the site. Same as above. |
| `upset_featured` | Optional | `TRUE` / blank | Flags this row for the "Upsets Worth a Look" hero section. Up to 3 rows per sport. See below. |
| `upset_rank` | Optional | `1`, `2`, or `3` | Display order within that section. Required if `upset_featured` is `TRUE`; must be blank otherwise. |

## The #1 formatting mistake: percentages

Always use a **plain number of percentage points**, with no `%` sign and no fraction:

- Correct: `56.4`
- Wrong: `0.564` (a fraction — Excel's raw "Save As CSV" export of a percentage-formatted cell often produces this)
- Wrong: `"56.4%"` (has the % sign baked in)

If Excel exports a fraction like `0.564` instead of `56.4`, the site will refuse to render that row and tell you exactly which row and column looks wrong, rather than silently showing `1%` instead of `56%`.

## Default Pick vs. Strategic Read

`general_pick` is always shown as the headline "Likely Favorite" pick, with its own `win_pct` / `public_pct` / `leverage` exactly as given — no derivation, no flipping.

Whether a row also gets a gold, starred **Strategic Read** is controlled by one field: `team_to_consider`.

- **`team_to_consider` blank (or equal to `general_pick`)** — the Strategic Read area quietly says "No worthwhile strategic alternative." This is the default, and should be true for most games.
- **`team_to_consider` set to the *other* team** — that team becomes the gold Strategic Read alternative. Its win chance, public picks, and leverage are derived automatically as the complement of `general_pick`'s own numbers (`100 − win_pct`, `100 − public_pct`, `−leverage`) — you never need to type them in separately, since the two teams' numbers always add up to 100 / negate exactly.

So to put a specific team in Strategic Read: set `team_to_consider` to that team's name on that row. That's the only switch.

## How Quick Read works

Exactly one row per sport should carry each `quick_read` value: `safest_favorite`, `best_leverage`, `best_upset`. (A blank `quick_read` is normal for every other row — most weeks only 3 of 8–16 rows are tagged.) The 3 tagged rows don't need any relationship to each other — they can be 3 completely unrelated matchups. The site doesn't compute which row deserves a tag; you decide that in Excel, then mark it here. These are internal values only — the values themselves don't change, just what's displayed:

- **`safest_favorite`** (displayed as **"Safest Pick"**): your most confident, likely-to-hit pick.
- **`best_leverage`** (displayed as **"Best Leverage"**): whichever matchup you consider your top leverage spot for the week.
- **`best_upset`** (displayed as **"Best Upset Upside"**): an underdog worth seriously considering. Set `team_to_consider` on this row to that underdog (the opponent of `general_pick`) — the card shows `team_to_consider`, not `general_pick`, with the underdog's own derived win chance / public picks / leverage.

For `safest_favorite` and `best_leverage`, leave `team_to_consider` blank — the card shows `general_pick` with that row's own `win_pct` / `public_pct` / `leverage`.

## How "Upsets Worth a Look" works

This is a separate, more selective section from Quick Read — a dynamic hero area above All Matchups showing 1 to 3 underdogs you specifically want to call out. It is driven entirely by `upset_featured` / `upset_rank`; the site never auto-selects rows for it, even if they'd otherwise show gold in All Matchups.

- Set `upset_featured` to `TRUE` on up to 3 rows, and `upset_rank` to `1`, `2`, or `3` on each (unique per rank).
- Every `upset_featured` row should also have `team_to_consider` set to the underdog (the opponent of `general_pick`) — the card shows `team_to_consider`, exactly like the gold Strategic Read box does. If `team_to_consider` is blank, the card just shows `general_pick` again, which defeats the point of the section.
- If no rows are flagged, the section simply doesn't appear on the page — it does not fall back to guessing.
- This is independent of `quick_read=best_upset`: a row can be one, both, or neither. It's normal for a week to have more Strategic Read (gold) rows in All Matchups than featured Upset cards — featuring is your editorial choice of which 1-3 are worth the extra prominence.

## Writing `quick_insight` (shown as "Why It Matters")

This single sentence has to do triple duty: it's the "Why It Matters" text in All Matchups, the Quick Read card text if the row is tagged, and the Upset card text if featured. Write it about the *relationship* between the numbers, not a restatement of them:

- Good: *"Likely winner, but heavily over-picked by the public."*
- Good: *"UNLV is more likely to win, but Hawai'i has a much better chance than the public's picks suggest."*
- Good: *"LSU remains the safer choice, but the field is more confident in LSU than the probability supports."*
- Good: *"SMU has the best of both worlds: the higher win probability and slightly lower public ownership."*
- Avoid: *"Hawai'i has a 43% win chance and 16% public picks."* (the reader can already see that — say what it *means*)

## Archiving a finished week

Once a week's games are final:

1. Copy the CSV (with real results) into `data/archive/college/` or `data/archive/nfl/` using a filename like `2026-week1.csv`.
2. Add two columns to that copy: `winner` (who actually won) and `pick_result` (`win`, `loss`, or leave blank if still pending).
3. Add an entry to `data/archive/college/manifest.json` (or `nfl/manifest.json`):
   ```json
   { "label": "2026 Season, Week 1", "file": "2026-week1.csv" }
   ```
4. **Never edit the numbers in an archived file after the fact.** The Track Record page's entire point is that these are frozen calls — win or lose.

## Required vs. optional, at a glance

**Required on every row:** `order`, `season`, `week`, `team_a`, `team_b`, `general_pick`, `win_pct`, `public_pct`, `leverage`, `quick_insight`, `updated_at`

**Optional:** `ratio`, `quick_read`, `team_to_consider`, `kickoff_time`, `home_team`, `upset_featured`, `upset_rank`
