(function () {
  const state = {
    meta: { columns: [], categories: [] },
    officeList: [], // [{id,name,type,rowCount}]
    selectedOffices: new Set(),
    selectedCategory: '', // '' = all categories
    itemSearch: '',
    officeFilter: '',
    view: 'browse',
    compareMetric: 'proposedBE2026_27',
    chart: null
  };

  const GROUP_LABELS = { headquarters: 'Headquarters', summary: 'Summaries', regional: 'Regional Offices' };
  const GROUP_ORDER = ['headquarters', 'summary', 'regional'];

  const el = (id) => document.getElementById(id);

  function fmt(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return Math.round(n).toLocaleString('en-PK');
  }

  function fmtPct(n) {
    if (n === null || n === undefined || Number.isNaN(n) || !isFinite(n)) return '—';
    return `${n.toFixed(1)}%`;
  }

  async function api(path, opts) {
    const res = await fetch(path, opts);
    if (res.status === 401) {
      window.location.href = '/';
      throw new Error('Not authenticated');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ---------------- Boot ----------------

  async function boot() {
    const session = await api('/api/session');
    if (!session.authenticated) {
      window.location.href = '/';
      return;
    }
    el('user-name').textContent = session.user.displayName || session.user.username;

    const meta = await api('/api/meta');
    state.meta = meta;
    renderCategoryList();
    populateMetricSelect();

    await loadOffices();

    attachEvents();
    render();
  }

  async function loadOffices(forceRefresh) {
    const data = await api(`/api/offices${forceRefresh ? '?forceRefresh=1' : ''}`);
    state.officeList = data.offices;
    updateSourceStatus(data);
    renderOfficeGroups();
  }

  function updateSourceStatus(data) {
    const elStatus = el('source-status');
    const when = data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : '';
    if (data.source === 'google-sheets') {
      elStatus.textContent = `Live from Google Sheets · updated ${when}`;
      elStatus.className = 'source-status live';
    } else if (data.source === 'sample-fallback') {
      elStatus.textContent = `Google Sheets unavailable — showing bundled sample data (${when})`;
      elStatus.className = 'source-status stale';
    } else {
      elStatus.textContent = `Demo mode: bundled sample data (add Google credentials in .env for live data)`;
      elStatus.className = 'source-status demo';
    }
    const banner = el('error-banner');
    if (data.error) {
      banner.textContent = data.error;
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  // ---------------- Sidebar: offices ----------------

  function renderOfficeGroups() {
    const container = el('office-groups');
    const filterText = state.officeFilter.toLowerCase();
    const grouped = {};
    for (const o of state.officeList) {
      if (filterText && !o.name.toLowerCase().includes(filterText)) continue;
      (grouped[o.type] = grouped[o.type] || []).push(o);
    }

    container.innerHTML = '';
    for (const type of GROUP_ORDER) {
      const list = grouped[type];
      if (!list || !list.length) continue;
      const labelEl = document.createElement('div');
      labelEl.className = 'office-group-label';
      labelEl.textContent = GROUP_LABELS[type];
      container.appendChild(labelEl);

      for (const o of list) {
        const row = document.createElement('label');
        row.className = 'office-item';
        row.innerHTML = `
          <input type="checkbox" value="${o.id}" ${state.selectedOffices.has(o.id) ? 'checked' : ''} />
          <span>${o.name}</span>
          <span class="rowcount">${o.rowCount}</span>
        `;
        row.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) state.selectedOffices.add(o.id);
          else state.selectedOffices.delete(o.id);
          render();
        });
        container.appendChild(row);
      }
    }
    if (!container.children.length) {
      container.innerHTML = '<p class="muted">No offices match.</p>';
    }
  }

  // ---------------- Sidebar: categories ----------------

  function renderCategoryList() {
    const container = el('category-list');
    container.innerHTML = '';

    const allRow = document.createElement('label');
    allRow.className = 'category-item';
    allRow.innerHTML = `<input type="radio" name="category" value="" checked /> <span>All categories</span>`;
    container.appendChild(allRow);

    for (const cat of state.meta.categories) {
      const row = document.createElement('label');
      row.className = 'category-item';
      row.innerHTML = `<input type="radio" name="category" value="${cat}" /> <span>${cat}</span>`;
      container.appendChild(row);
    }

    container.querySelectorAll('input[name="category"]').forEach((input) => {
      input.addEventListener('change', (e) => {
        state.selectedCategory = e.target.value;
        render();
      });
    });
  }

  function populateMetricSelect() {
    const select = el('metric-select');
    select.innerHTML = '';
    const numericCols = state.meta.columns.filter((c) => c.numeric);
    for (const col of numericCols) {
      const opt = document.createElement('option');
      opt.value = col.key;
      opt.textContent = col.label;
      select.appendChild(opt);
    }
    select.value = state.compareMetric;
    select.addEventListener('change', () => {
      state.compareMetric = select.value;
      renderCompareView();
    });
  }

  // ---------------- Events ----------------

  function attachEvents() {
    el('office-search').addEventListener('input', (e) => {
      state.officeFilter = e.target.value;
      renderOfficeGroups();
    });

    el('item-search').addEventListener('input', debounce((e) => {
      state.itemSearch = e.target.value;
      render();
    }, 300));

    el('select-none').addEventListener('click', () => {
      state.selectedOffices.clear();
      renderOfficeGroups();
      render();
    });

    el('refresh-btn').addEventListener('click', async () => {
      el('refresh-btn').textContent = '⟳ Refreshing…';
      await loadOffices(true);
      el('refresh-btn').textContent = '⟳ Refresh data';
      render();
    });

    el('logout-btn').addEventListener('click', async () => {
      await api('/api/logout', { method: 'POST' });
      window.location.href = '/';
    });

    document.querySelectorAll('.view-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.view = btn.dataset.view;
        el('browse-view').hidden = state.view !== 'browse';
        el('compare-view').hidden = state.view !== 'compare';
        render();
      });
    });
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  // ---------------- Render dispatch ----------------

  function render() {
    if (state.view === 'browse') renderBrowseView();
    else renderCompareView();
  }

  // ---------------- Browse view ----------------

  async function renderBrowseView() {
    const container = el('office-tables');
    if (!state.selectedOffices.size) {
      container.innerHTML = '<p class="muted">Select one or more offices from the sidebar to see their budget lines.</p>';
      el('stat-row').innerHTML = '';
      return;
    }

    const params = new URLSearchParams();
    params.set('offices', Array.from(state.selectedOffices).join(','));
    if (state.selectedCategory) params.set('category', state.selectedCategory);
    if (state.itemSearch) params.set('search', state.itemSearch);

    const data = await api(`/api/data?${params.toString()}`);
    renderStats(data.offices);

    container.innerHTML = '';
    for (const office of data.offices) {
      const card = document.createElement('div');
      card.className = 'office-table-card';
      card.innerHTML = `
        <h3>${office.name} <span class="badge">${office.rows.length} line item${office.rows.length === 1 ? '' : 's'}</span></h3>
        <div class="table-scroll">${buildLedgerTable(office.rows)}</div>
      `;
      container.appendChild(card);
    }
    if (!data.offices.length) {
      container.innerHTML = '<p class="muted">No matching line items.</p>';
    }
  }

  function buildLedgerTable(rows) {
    if (!rows.length) return '<p class="muted" style="padding:16px 18px;">No line items match the current filters.</p>';
    const cols = [
      { key: 'code', label: 'Code', cls: 'code' },
      { key: 'description', label: 'Description', cls: 'desc' },
      { key: 'be2025_26', label: 'BE 2025-26', cls: 'num', money: true },
      { key: 'totalReleases', label: 'Released 25-26', cls: 'num', money: true },
      { key: 'expenditure', label: 'Expenditure 25-26', cls: 'num', money: true },
      { key: 'proposedBE2026_27', label: 'Proposed BE 26-27', cls: 'num', money: true },
      { key: 'variationOverBE2', label: 'Variation', cls: 'num', money: true }
    ];
    let html = '<table class="ledger"><thead><tr>';
    for (const c of cols) html += `<th>${c.label}</th>`;
    html += '</tr></thead><tbody>';
    for (const r of rows) {
      html += '<tr>';
      for (const c of cols) {
        const val = r[c.key];
        if (c.key === 'description') {
          html += `<td class="${c.cls}">${val || ''}</td>`;
        } else if (c.money) {
          html += `<td class="${c.cls}">${fmt(val)}</td>`;
        } else {
          html += `<td class="${c.cls}">${val || ''}</td>`;
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  function renderStats(offices) {
    const container = el('stat-row');
    let sumBE = 0, sumProposed = 0, sumExp = 0;
    for (const o of offices) {
      for (const r of o.rows) {
        sumBE += r.be2025_26 || 0;
        sumProposed += r.proposedBE2026_27 || 0;
        sumExp += r.expenditure || 0;
      }
    }
    const change = sumBE ? ((sumProposed - sumBE) / sumBE) * 100 : null;
    container.innerHTML = `
      <div class="stat-card">
        <p class="label">BE 2025-26 (selected)</p>
        <p class="value">Rs ${fmt(sumBE)}</p>
      </div>
      <div class="stat-card">
        <p class="label">Expenditure 2025-26</p>
        <p class="value">Rs ${fmt(sumExp)}</p>
      </div>
      <div class="stat-card">
        <p class="label">Proposed BE 2026-27</p>
        <p class="value">Rs ${fmt(sumProposed)}</p>
      </div>
      <div class="stat-card">
        <p class="label">Change vs BE 25-26</p>
        <p class="value ${change === null ? '' : change >= 0 ? 'good' : 'bad'}">${fmtPct(change)}</p>
      </div>
    `;
  }

  // ---------------- Compare view ----------------

  async function renderCompareView() {
    if (!state.selectedOffices.size) {
      el('compare-table-wrap').innerHTML = '<p class="muted">Select two or more offices from the sidebar to compare them.</p>';
      if (state.chart) { state.chart.destroy(); state.chart = null; }
      return;
    }

    const params = new URLSearchParams();
    params.set('offices', Array.from(state.selectedOffices).join(','));
    params.set('metric', state.compareMetric);
    if (state.selectedCategory) params.set('category', state.selectedCategory);

    const compareData = await api(`/api/compare?${params.toString()}`);
    renderChart(compareData);

    // Pivot table: line items (rows) x offices (columns) for the selected metric.
    const dataParams = new URLSearchParams();
    dataParams.set('offices', Array.from(state.selectedOffices).join(','));
    if (state.selectedCategory) dataParams.set('category', state.selectedCategory);
    if (state.itemSearch) dataParams.set('search', state.itemSearch);
    const detail = await api(`/api/data?${dataParams.toString()}`);
    renderPivotTable(detail.offices);
  }

  function renderChart(compareData) {
    const ctx = el('compare-chart').getContext('2d');
    const labels = compareData.results.map((r) => r.name);
    const values = compareData.results.map((r) => r.total);
    const metricLabel = (state.meta.columns.find((c) => c.key === state.compareMetric) || {}).label || state.compareMetric;

    if (state.chart) state.chart.destroy();
    state.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: metricLabel,
          data: values,
          backgroundColor: '#c9a227',
          borderRadius: 3,
          maxBarThickness: 46
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: false } },
        scales: {
          x: { ticks: { color: '#9fb0c5', font: { family: 'Inter' } }, grid: { display: false } },
          y: {
            ticks: {
              color: '#9fb0c5',
              font: { family: 'IBM Plex Mono' },
              callback: (v) => fmt(v)
            },
            grid: { color: 'rgba(159,176,197,0.12)' }
          }
        }
      }
    });
  }

  function renderPivotTable(offices) {
    const wrap = el('compare-table-wrap');
    if (offices.length < 2) {
      wrap.innerHTML = '<p class="muted">Select at least two offices to see a side-by-side line-item comparison.</p>';
      return;
    }

    // Key rows by code+description so the same budget line lines up across offices.
    const rowMap = new Map(); // key -> { code, description, values: { officeId: number } }
    for (const office of offices) {
      for (const r of office.rows) {
        const key = `${r.code || ''}|${r.description || ''}`;
        if (!rowMap.has(key)) {
          rowMap.set(key, { code: r.code, description: r.description, values: {} });
        }
        rowMap.get(key).values[office.id] = r[state.compareMetric];
      }
    }

    const metricLabel = (state.meta.columns.find((c) => c.key === state.compareMetric) || {}).label || state.compareMetric;

    let html = `<div class="office-table-card"><h3>Line-item comparison <span class="badge">${metricLabel}</span></h3><div class="table-scroll"><table class="ledger"><thead><tr>`;
    html += `<th>Description</th>`;
    for (const o of offices) html += `<th>${o.name}</th>`;
    html += `</tr></thead><tbody>`;

    for (const { description, values } of rowMap.values()) {
      if (!description) continue;
      html += `<tr><td class="desc">${description}</td>`;
      for (const o of offices) {
        html += `<td class="num">${fmt(values[o.id])}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div></div>`;
    wrap.innerHTML = html;
  }

  boot().catch((err) => {
    console.error(err);
    const banner = el('error-banner');
    if (banner) {
      banner.textContent = err.message;
      banner.hidden = false;
    }
  });
})();
