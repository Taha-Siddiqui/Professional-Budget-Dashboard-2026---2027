const { COLUMNS, CATEGORIES, EXCLUDED_SHEETS, SUMMARY_SHEETS, HEADQUARTERS_SHEETS, HEADER_ROW } = require('./config');

function clean(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return s.length ? s : null;
  }
  return v;
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

function sheetType(name) {
  if (SUMMARY_SHEETS.includes(name)) return 'summary';
  if (HEADQUARTERS_SHEETS.includes(name)) return 'headquarters';
  return 'regional';
}

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function isExcludedSheet(name) {
  return EXCLUDED_SHEETS.some((ex) => ex.trim() === name.trim());
}

/**
 * Turns a 2D array of raw cell values (rows x columns, 1-indexed columns
 * matching COLUMNS[].col) for a single sheet into { id, name, type, rows }.
 * `rawRows` should start at the row right after the header row.
 */
function parseSheetRows(sheetName, rawRows) {
  let currentCategory = null;
  const rows = [];

  for (const raw of rawRows) {
    if (!raw || raw.every((v) => clean(v) === null)) continue;

    const rowObj = {};
    for (const col of COLUMNS) {
      const val = clean(raw[col.col - 1]);
      rowObj[col.key] = col.numeric ? toNumber(val) : val;
    }

    const maj = rowObj.majorObject;
    if (maj) {
      const exact = CATEGORIES.find((c) => c.toLowerCase() === String(maj).toLowerCase());
      if (exact) {
        currentCategory = exact;
      } else {
        const loose = CATEGORIES.find((c) => String(maj).toLowerCase().includes(c.toLowerCase()));
        if (loose) currentCategory = loose;
      }
    }
    rowObj.category = currentCategory;

    if (rowObj.description === null && rowObj.code === null) continue;

    rows.push(rowObj);
  }

  return {
    id: slugify(sheetName),
    name: sheetName.trim(),
    type: sheetType(sheetName.trim()),
    rows
  };
}

module.exports = { parseSheetRows, isExcludedSheet, clean, toNumber, slugify };
