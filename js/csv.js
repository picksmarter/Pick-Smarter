/**
 * Minimal dependency-free CSV parser.
 * Handles quoted fields, escaped quotes (""), commas/newlines inside quotes,
 * and CRLF or LF line endings. Returns an array of objects keyed by the
 * header row. Blank trailing lines are ignored.
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\r') {
      // skip, \n handles the line break
    } else if (c === '\n') {
      pushRow();
    } else {
      field += c;
    }
  }

  // Final field/row if the file doesn't end with a newline
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  const nonEmptyRows = rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  if (nonEmptyRows.length === 0) return [];

  const headers = nonEmptyRows[0].map((h) => h.trim());
  return nonEmptyRows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] !== undefined ? r[idx] : '').trim();
    });
    return obj;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseCSV };
}
