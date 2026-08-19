# Regional Offices Budget Dashboard

A Node.js/Express + vanilla JS website for browsing and comparing the
BE 2025-26 / 2026-27 budget workbook across your 19 regional offices,
Headquarters, and the two summary sheets.

- Pick one or more offices, filter by the 6 spend categories (or search
  individual line items), and view a clean "ledger" style table.
- Switch to **Compare offices** to see a bar chart and a side-by-side
  line-item table across every office you've selected.
- Sign-in is required. Users are hardcoded on the server with bcrypt
  password hashes — nothing about them is ever sent to the browser, so
  they will not appear in the browser's Inspect / dev tools, even once
  deployed.
- Data is fetched live from your Google Sheet via the Google Sheets API
  and cached in memory for a few minutes. Until you connect a sheet, the
  app runs in **demo mode** using a bundled snapshot of the workbook you
  uploaded, so you can try it immediately.

---

## 1. Run it locally in VS Code

```bash
cd reo-budget-dashboard
npm install
cp .env.example .env
npm run dev        # or: npm start
```

Open **http://localhost:3000**. Demo login:

- Username: `admin` or `viewer`
- Password: `password123`

This works immediately with no Google setup — it serves the bundled
`server/data/sampleData.json`, which was parsed from the workbook you
uploaded, so the UI and comparisons already work with real numbers.

---

## 2. Connect your live Google Sheet

1. **Put the workbook in Google Sheets** (File → Import, or just open
   your existing Google Sheet). Keep each office as its own tab, with
   the same layout as today: row 3 = column headers, data from row 4,
   columns A–Z in the same order as the current workbook.

2. **Create a Google Cloud service account:**
   - Go to console.cloud.google.com → create/select a project.
   - Enable the **Google Sheets API** (APIs & Services → Library).
   - APIs & Services → Credentials → Create Credentials → **Service account**.
   - Open the new service account → Keys → Add key → **JSON**. This
     downloads a `.json` key file — keep it private, never commit it.

3. **Share the sheet with the service account:**
   - Open the JSON key file, copy the `client_email` value
     (looks like `something@your-project.iam.gserviceaccount.com`).
   - In your Google Sheet, click **Share** and add that email as a
     **Viewer**. Real-time data only requires read access.

4. **Fill in `.env`:**
   ```
   GOOGLE_SHEET_ID=the-long-id-from-the-sheet-url
   GOOGLE_SERVICE_ACCOUNT_EMAIL=something@your-project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   ```
   The sheet ID is the part of the URL between `/d/` and `/edit`.
   Copy `private_key` from the JSON file exactly, including the `\n`
   sequences, wrapped in quotes.

5. Restart the server (`npm run dev`). The header will switch from
   "Demo mode" to "Live from Google Sheets", and the **Refresh data**
   button re-fetches on demand. Data otherwise auto-refreshes every
   5 minutes (`CACHE_TTL_MS` in `.env`).

If a tab name in your sheet doesn't match `server/config.js`'s
`EXCLUDED_SHEETS` / `SUMMARY_SHEETS` / `HEADQUARTERS_SHEETS` lists,
everything not explicitly excluded is treated as a regular office —
so new office tabs show up automatically with no code changes.

---

## 3. Managing hardcoded users

Users live in `server/config.js` as `{ username, passwordHash, displayName, role }`.
Passwords are bcrypt hashes, not plain text, and this file is server-only
— it's never bundled or served to the browser.

To add or change a user:

```bash
npm run hash-password
# paste the password when prompted, copy the printed hash
```

Then edit `server/config.js` and add/update the entry. **Replace or
remove the two demo accounts before deploying anywhere public.**

---

## 4. Deploying to Netlify (free)

The auth layer uses a signed, httpOnly **JWT cookie** rather than an
in-memory session, specifically so it works statelessly across Netlify's
serverless functions — nothing about the login rules, hardcoded users,
or API routes changed to get here.

**One-time setup:**
1. Push this project to a GitHub (or GitLab/Bitbucket) repo. `.env`
   stays out of it — `.gitignore` already covers that.
2. On [app.netlify.com](https://app.netlify.com) → **Add new site** →
   **Import an existing project** → pick the repo.
3. Netlify auto-detects `netlify.toml` (publish dir `public`, functions
   dir `netlify/functions`) — you shouldn't need to change build settings.
4. Under **Site configuration → Environment variables**, add the same
   values from your `.env`:
   - `SESSION_SECRET` (now used to sign the JWT — pick a long random string)
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (keep the `\n` sequences literal, wrapped in quotes)
   - `CACHE_TTL_MS` (optional, defaults to 5 minutes)
5. Set `NODE_ENV=production` too — this switches the login cookie to
   `secure`, which is safe since Netlify serves everything over HTTPS.
6. Deploy. Your site is live at `https://<your-site-name>.netlify.app`.

**Testing locally against the Netlify setup (optional):**
```bash
npm install -g netlify-cli
npm run netlify:dev
```
This runs the site through Netlify's local emulator (functions + redirects
+ static files together) instead of the plain Express server, so you can
catch any Netlify-specific issues before deploying.

**Free-tier limits to be aware of:** Netlify's free plan includes
100 GB bandwidth and 125,000 function invocations a month — this
dashboard is well within that for normal internal use. The one
trade-off versus a persistent server (like Render) is that the
in-memory 5-minute Google Sheets cache is "best effort" on serverless —
a cold function instance will simply re-fetch from Google Sheets, which
just means an occasional extra API call, not a broken app.

*(If you'd rather run this on a persistent Node process instead —
Render or Railway, for example — the same build works there too:
build command `npm install`, start command `npm start`.)*

---

## Project structure

```
reo-budget-dashboard/
├── netlify.toml            Netlify build + redirect config
├── netlify/functions/
│   └── api.js               Wraps server/app.js for serverless use
├── server/
│   ├── app.js               Express app + all API routes (shared)
│   ├── index.js              Local-only entry point (npm start)
│   ├── auth.js               Login/logout via signed JWT cookie
│   ├── config.js             Hardcoded users, sheet layout, categories
│   ├── parse.js               Shared row-parsing logic
│   ├── googleSheets.js         Live Google Sheets fetch
│   ├── dataStore.js             Live-data vs sample-data + caching
│   └── data/sampleData.json      Bundled demo dataset (from your upload)
├── public/
│   ├── index.html            Login page
│   ├── dashboard.html         App shell
│   ├── css/style.css           Styling
│   └── js/login.js, dashboard.js
└── scripts/hashPassword.js      Helper to hash new passwords
```

## API summary

- `POST /api/login`, `POST /api/logout`, `GET /api/session`
- `GET /api/meta` — column definitions + the 6 categories
- `GET /api/offices` — office list with row counts + data source status
- `GET /api/data?offices=east,korangi&category=...&search=...`
- `GET /api/compare?offices=east,korangi&metric=proposedBE2026_27&category=...`

All `/api/*` routes except login/session require a valid `reo_token`
cookie (set automatically on login).
