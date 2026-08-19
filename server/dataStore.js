const fs = require('fs');
const path = require('path');
const { CACHE_TTL_MS, COLUMNS, CATEGORIES } = require('./config');
const googleSheets = require('./googleSheets');

let cache = { offices: null, fetchedAt: 0, source: 'none', error: null };
let inFlight = null;

function loadSampleData() {
  const file = path.join(__dirname, 'data', 'sampleData.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return json.offices;
}

async function refresh() {
  if (googleSheets.isConfigured()) {
    try {
      const offices = await googleSheets.fetchLiveData();
      cache = { offices, fetchedAt: Date.now(), source: 'google-sheets', error: null };
      return cache;
    } catch (err) {
      // Live fetch failed - fall back to sample data but surface the error
      // so the dashboard can show a banner instead of failing silently.
      const offices = loadSampleData();
      cache = {
        offices,
        fetchedAt: Date.now(),
        source: 'sample-fallback',
        error: `Google Sheets fetch failed: ${err.message}`
      };
      return cache;
    }
  }
  const offices = loadSampleData();
  cache = { offices, fetchedAt: Date.now(), source: 'sample-demo', error: null };
  return cache;
}

async function getData({ forceRefresh = false } = {}) {
  const isStale = Date.now() - cache.fetchedAt > CACHE_TTL_MS;
  if (!cache.offices || isStale || forceRefresh) {
    // De-dupe concurrent refreshes.
    if (!inFlight) {
      inFlight = refresh().finally(() => {
        inFlight = null;
      });
    }
    await inFlight;
  }
  return cache;
}

function getMeta() {
  return { columns: COLUMNS.map(({ key, label, numeric }) => ({ key, label, numeric: !!numeric })), categories: CATEGORIES };
}

module.exports = { getData, getMeta };
