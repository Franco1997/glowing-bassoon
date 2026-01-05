// app.js - category lists with per-row details modal on trade-name click
let data = []; // array of chemical objects
let lastFiltered = []; // store last rendered set for detail lookups

const workarea = document.getElementById('workarea');
const sampleCsvUrl = 'data/Avocado registred Chemicals.csv';
const sampleJsonUrl = 'data/chemical.json';

// --------- Data loading (JSON preferred, CSV fallback) ----------
async function loadData() {
  // try JSON first
  try {
    const r = await fetch(sampleJsonUrl, { cache: "no-store" });
    if (r.ok) {
      data = await r.json();
      console.log('Loaded data from chemical.json — rows:', data.length);
      return;
    }
  } catch (e) {
    console.log('No chemical.json or failed to load it, will try CSV', e.message);
  }

  // fallback to CSV via PapaParse
  try {
    const r = await fetch(sampleCsvUrl, { cache: "no-store" });
    if (!r.ok) throw new Error('CSV not found');
    const txt = await r.text();
    const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
    data = parsed.data.map(mapRow);
    console.log('Loaded CSV rows:', data.length);
  } catch (e) {
    console.warn('No data loaded:', e.message);
    data = [];
  }
}

// map CSV row keys to a predictable object shape
function mapRow(r) {
  return {
    trade_name: r['Trade name'] || r['Trade Name'] || r['Trade'] || '',
    active_ingredient: r['Active ingredient'] || r['Active Ingredient'] || r['Active'] || '',
    category: r['Category'] || '',
    target_pest_disease: r['Target'] || r['Target / Pest'] || r['Target/Pest'] || r['Target Pest/Disease'] || '',
    registration_notes: r['Registration notes'] || r['Registration Notes'] || r['Notes'] || '',
    // include raw row for any extra fields (MRL, formulation, company, etc)
    raw: r
  };
}

// small HTML escape
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

// --------- Rendering: table of rows, trade name clickable ----------
function renderCategoryListByKeyword(keywordLabel, keywordTest) {
  if (!data || data.length === 0) {
    workarea.innerHTML = '<div class="panel"><p>No data loaded. Upload chemical.json or place CSV at data/.</p></div>';
    return;
  }

  const filtered = data.filter(r => {
    const cat = (r.category || '').toString().toLowerCase();
    const target = (r.target_pest_disease || '').toString().toLowerCase();
    const trade = (r.trade_name || '').toString().toLowerCase();
    const ai = (r.active_ingredient || '').toString().toLowerCase();
    return keywordTest({ cat, target, trade, ai, row: r });
  });

  lastFiltered = filtered; // save for detail lookup

  if (!filtered.length) {
    workarea.innerHTML = `<div class="panel"><h3>${escapeHtml(keywordLabel)}</h3><p>No results.</p></div>`;
    return;
  }

  // Columns to show in list
  const cols = ['trade_name','active_ingredient','category','target_pest_disease'];
  let html = `<div class="panel"><h3>${escapeHtml(keywordLabel)}</h3><table class="table"><thead><tr>` +
    cols.map(c => `<th>${labelFor(c)}</th>`).join('') +
    `</tr></thead><tbody>`;

  filtered.forEach((r, idx) => {
    html += '<tr>';
    cols.forEach(c => {
      if (c === 'trade_name') {
        // clickable trade name opens detail modal
        html += `<td><a href="#" class="trade-link" data-idx="${idx}">${escapeHtml(r.trade_name || '—')}</a></td>`;
      } else {
        html += `<td>${escapeHtml(r[c] || '')}</td>`;
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  workarea.innerHTML = html;

  // wire up click handlers for trade links
  document.querySelectorAll('.trade-link').forEach(a => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const idx = Number(a.dataset.idx);
      const row = lastFiltered[idx];
      if (row) showDetailModal(row);
    });
  });
}

function labelFor(key){
  const map = {
    trade_name: 'Trade name',
    active_ingredient: 'Active ingredient',
    category: 'Category',
    target_pest_disease: 'Target / Pest / Disease',
    registration_notes: 'Registration notes'
  };
  return map[key] || key;
}

// --------- Detail modal ----------
function showDetailModal(row) {
  // remove existing modal if any
  const existing = document.querySelector('.detail-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'detail-modal';
  modal.innerHTML = `
    <div class="detail-backdrop" role="dialog" aria-modal="true">
      <div class="detail-card">
        <button class="detail-close" aria-label="Close">&times;</button>
        <h2>${escapeHtml(row.trade_name || '—')}</h2>
        <div class="detail-grid">
          <div><strong>Active ingredient</strong></div><div>${escapeHtml(row.active_ingredient || '—')}</div>
          <div><strong>Category</strong></div><div>${escapeHtml(row.category || '—')}</div>
          <div><strong>Target / Pest / Disease</strong></div><div>${escapeHtml(row.target_pest_disease || '—')}</div>
          <div><strong>Registration notes</strong></div><div>${escapeHtml(row.registration_notes || '—')}</div>
        </div>
        <div class="detail-extra">
          <h4>Raw data</h4>
          <pre>${escapeHtml(JSON.stringify(row.raw || row, null, 2))}</pre>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // close handlers
  modal.querySelector('.detail-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.detail-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('detail-backdrop')) modal.remove();
  });
  document.addEventListener('keydown', function esc(e){
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); }
  });
}

// --------- Action handlers (category buttons) ----------
function handleAction(action){
  if (action === 'insecticides') {
    renderCategoryListByKeyword('Insecticides', ({cat, target, trade, ai, row}) => {
      return cat.includes('insecticide') ||
             target.includes('fruit fly') || target.includes('codling') ||
             trade.includes('insect') || ai.includes('spinosad') || ai.includes('azadirachtin') || ai.includes('methoxyfenozide');
    });
  } else if (action === 'fungicides') {
    renderCategoryListByKeyword('Fungicides (Pre-Harvest)', ({cat}) => cat.includes('fungicide'));
  } else if (action === 'adjuvants') {
    renderCategoryListByKeyword('Adjuvants', ({cat}) => cat.includes('adjuvant'));
  } else if (action === 'herbicides') {
    renderCategoryListByKeyword('Herbicides', ({cat}) => cat.includes('herbicide'));
  } else if (action === 'mrls') {
    renderCategoryListByKeyword("MRL's", ({row}) => (row.mrl_value || row.MRL || row['MRL']) && String(row.mrl_value || row.MRL || row['MRL']).trim() !== '');
  } else if (action === 'keyword') {
    workarea.innerHTML = `<div class="panel">
      <div class="controls" style="display:flex;gap:8px">
        <input id="kw" placeholder="Enter keyword" style="flex:1;padding:8px"/>
        <button id="kwb" class="btn-primary">Search</button>
      </div>
      <div id="kw-results" style="margin-top:12px"></div>
    </div>`;
    document.getElementById('kwb').onclick = () => {
      const q = document.getElementById('kw').value.trim().toLowerCase();
      if (!q) { document.getElementById('kw-results').innerHTML = '<p>Enter a search term</p>'; return; }
      const res = data.filter(r => {
        return (r.trade_name||'').toLowerCase().includes(q) ||
               (r.active_ingredient||'').toLowerCase().includes(q) ||
               (r.category||'').toLowerCase().includes(q) ||
               (r.target_pest_disease||'').toLowerCase().includes(q) ||
               (r.registration_notes||'').toLowerCase().includes(q);
      });
      lastFiltered = res;
      if (!res.length) { document.getElementById('kw-results').innerHTML = '<p>No results</p>'; return; }
      // render table similar to category renderer
      const cols = ['trade_name','active_ingredient','category','target_pest_disease'];
      let html = '<table class="table"><thead><tr>' + cols.map(c=>`<th>${labelFor(c)}</th>`).join('') + '</tr></thead><tbody>';
      res.forEach((r, idx) => {
        html += '<tr>' + cols.map(c => c === 'trade_name' ? `<td><a href="#" class="trade-link" data-idx="${idx}">${escapeHtml(r.trade_name||'—')}</a></td>` : `<td>${escapeHtml(r[c]||'')}</td>`).join('') + '</tr>';
      });
      html += '</tbody></table>';
      document.getElementById('kw-results').innerHTML = html;
      document.querySelectorAll('.trade-link').forEach(a => {
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          const idx = Number(a.dataset.idx);
          const row = lastFiltered[idx];
          if (row) showDetailModal(row);
        });
      });
    };
  } else if (action === 'download') {
    workarea.innerHTML = `<div class="panel"><h3>Download</h3><p>Use the download controls on the main page (CSV / PDF).</p></div>`;
  } else {
    workarea.innerHTML = `<div class="panel"><p>Action: ${escapeHtml(action)}</p></div>`;
  }
}

// wire up tab buttons
function initTabHandlers(){
  document.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const action = btn.dataset.action;
      handleAction(action);
      // highlight selected (optional)
      document.querySelectorAll('.tab-card, .tab').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// initialize
(async function init(){
  await loadData();
  initTabHandlers();
  workarea.innerHTML = `<div class="panel"><p>Choose a search option above (e.g. "Search Insecticides").</p></div>`;
})();
