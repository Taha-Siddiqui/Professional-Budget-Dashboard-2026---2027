require('dotenv').config();

/**
 * HARDCODED USERS
 * -----------------------------------------------------------------------
 * Passwords are stored as bcrypt hashes, never in plain text, and this
 * whole file lives on the SERVER ONLY. It is never sent to the browser,
 * so nothing here ever shows up in the browser's "Inspect" / dev tools.
 *
 * To add or change a user:
 *   1. Run:  npm run hash-password
 *   2. Paste the plain-text password when asked, copy the hash it prints
 *   3. Put the username + hash in the USERS array below
 *
 * A couple of demo accounts are included so you can log in immediately.
 * Demo password for both is:  password123
 * CHANGE / REMOVE these before you deploy anywhere public.
 */
const USERS = [
  {
    username: 'admin',
    // password123
    passwordHash: '$2b$12$hk1s2H5QTjV9/cU.n9w.6uxrkeLTWg93YLauAjQLDyP6Y2es2X3Uq',
    displayName: 'Administrator',
    role: 'admin'
  },
  {
    username: 'viewer',
    // password123
    passwordHash: '$2b$12$hk1s2H5QTjV9/cU.n9w.6uxrkeLTWg93YLauAjQLDyP6Y2es2X3Uq',
    displayName: 'Viewer',
    role: 'viewer'
  }
];

// Sheet (tab) names that are NOT office data and should be ignored entirely.
const EXCLUDED_SHEETS = [
  'Payments and Cheques',
  'Receipts and Releases',
  'Basic Pay',
  'Pivot table'
];

// Sheet names that represent roll-up summaries rather than a single office.
const SUMMARY_SHEETS = ['Summary', 'Regional Offices Summary'];

// Sheet name(s) that represent Headquarters rather than a regional office.
const HEADQUARTERS_SHEETS = ['Headquarter'];

// Column layout shared by every office/summary sheet in the workbook.
// `col` is the 1-indexed spreadsheet column letter/number this maps to.
const COLUMNS = [
  { key: 'code', label: 'Code', col: 1 },
  { key: 'description', label: 'Description', col: 2 },
  { key: 'majorObject', label: 'Major Object (raw)', col: 3 },
  { key: 'minorObject', label: 'Minor Object', col: 4 },
  { key: 'bps', label: 'BPS', col: 7 },
  { key: 'posts', label: 'No. of Posts', col: 8 },
  { key: 'be2025_26', label: 'BE 2025-26', col: 9, numeric: true },
  { key: 'q1', label: '1st Qtr', col: 10, numeric: true },
  { key: 'q2', label: '2nd Qtr', col: 11, numeric: true },
  { key: 'q3', label: '3rd Qtr', col: 12, numeric: true },
  { key: 'q4', label: '4th Qtr', col: 13, numeric: true },
  { key: 'totalReleases', label: 'Total Releases 2025-26', col: 14, numeric: true },
  { key: 'withheldBalance', label: 'Withheld / Balance', col: 15, numeric: true },
  { key: 'reApproNeg', label: 'Re-Appro (-)', col: 16, numeric: true },
  { key: 'reApproPos', label: 'Re-Appro (+)', col: 17, numeric: true },
  { key: 'modifiedBE', label: 'Modified BE 2025-26', col: 18, numeric: true },
  { key: 'expenditure', label: 'Expenditure 2025-26', col: 19, numeric: true },
  { key: 'proposedRE', label: 'Proposed RE 2025-26', col: 20, numeric: true },
  { key: 'variationOverBE', label: 'Variation Over BE 2025-26', col: 21, numeric: true },
  { key: 'variationPct', label: 'Variation %', col: 22, numeric: true },
  { key: 'totalSavings', label: 'Total Savings', col: 23, numeric: true },
  { key: 'savingsPct', label: '% Savings', col: 24, numeric: true },
  { key: 'proposedBE2026_27', label: 'Proposed BE 2026-27', col: 25, numeric: true },
  { key: 'variationOverBE2', label: 'Variation (Proposed BE 26-27 vs BE 25-26)', col: 26, numeric: true }
];

// The 6 fixed top-level spend categories used throughout the workbook.
const CATEGORIES = [
  'Total employees related expenses',
  'Total operating expenses',
  'Total repairs and maintenance',
  'Total transfers',
  'Total physical assets',
  'Total grants, subsidies and write off loans'
];

module.exports = {
  USERS,
  EXCLUDED_SHEETS,
  SUMMARY_SHEETS,
  HEADQUARTERS_SHEETS,
  COLUMNS,
  CATEGORIES,
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-this-secret-in-.env',
  // The sheet ID isn't a secret on its own (it's just part of the sheet's
  // URL) - it's baked in here as a default so you don't have to set it as
  // a Netlify env var too. GOOGLE_SHEET_ID still overrides it if set.
  SPREADSHEET_ID: process.env.GOOGLE_SHEET_ID || '1_PrLzYms0VTI9Hm4nIfnc8mp1ymCOU6LzFUDGkp4XGI',
  HEADER_ROW: 3, // row 3 in each sheet holds column titles; data starts row 4
  CACHE_TTL_MS: Number(process.env.CACHE_TTL_MS || 5 * 60 * 1000), // 5 min
  PORT: Number(process.env.PORT || 3000)
};
