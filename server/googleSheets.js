const { google } = require('googleapis');
const { SPREADSHEET_ID, HEADER_ROW } = require('./config');
const { parseSheetRows, isExcludedSheet } = require('./parse');

function isConfigured() {
  return Boolean(
    SPREADSHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );
}

/**
 * Fetches every tab in the spreadsheet and returns the parsed office list.
 * Uses a single batchGet so it costs one API call regardless of tab count.
 */
async function fetchLiveData() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetNames = meta.data.sheets
    .map((s) => s.properties.title)
    .filter((name) => !isExcludedSheet(name));

  // A1:Z is enough to cover every column we care about; row 4 onward is data.
  const ranges = sheetNames.map((name) => `'${name}'!A${HEADER_ROW + 1}:Z1000`);

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SPREADSHEET_ID,
    ranges
  });

  const offices = res.data.valueRanges.map((vr, i) =>
    parseSheetRows(sheetNames[i], vr.values || [])
  );

  return offices;
}

module.exports = { fetchLiveData, isConfigured };
