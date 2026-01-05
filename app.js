// app.js - loads JSON (fallback to CSV) and renders category lists
let data = []; // array of chemical objects

const workarea = document.getElementById('workarea');
const sampleCsvUrl = 'data/Avocado registred Chemicals.csv';
const sampleJsonUrl = 'data/chemical.json';

// Load data: prefer JSON test file if present, otherwise CSV
async function loadData() {
  // try JSON first
  try {
    const r = await fetch(sampleJsonUrl, {cache: "no-store"});
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
    const r = await fetch(sampleCsvUrl, {cache: "no-store"});
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

// map CSV row keys to unified object shape
function mapRow(r){
  return {
    trade_name: r['Trade name'] || r['Trade Name'] || r['Trade'] || '',
    active_ingredient: r['Active ingredient'] || r['Active Ingredient'] || r['Active'] || '',
    category: r['Category'] || '',
    target_pest_disease: r['Target'] || r['Target / Pest'] || r['Target/Pest'] || r['Target Pest/Disease'] || '',
    registration_notes: r['Registration notes'] || r['Registration Notes'] || r['Notes'] || '',
    raw: r
  };
}

// escape for HTML
function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// render category list into workarea
function renderCategoryListByKeyword(keywordLabel, keywordTest){
  if (!data || data.length === 0) {
    workarea.innerHTML = '<div class="panel"><p>No data loaded. Upload chemical.json or place CSV at data/.</p></div>';
    return;
  }
  const filtered = data.filter(r => {
    const cat = (r.category || '').toString().toLowerCase();
    const target = (r.target_pest_disease || '').toString().toLowerCase();
    const trade = (r.trade_name || '').toString().toLowerCase();
    const ai = (r.active_ingredient || '').toString().toLowerCase();
    // test function can inspect row
    return keywordTest({cat, target, trade, ai, row: r});
  });

  if (!filtered.length) {
    workarea.innerHTML = `<div class="panel"><h3>${escapeHtml(keywordLabel)}</h3><p>No results.</p></div>`;
    return;
  }

  const cols = ['trade_name','active_ingredient','category','target_pest_disease','registration_notes'];
  let html = `<div class="panel"><h3>${escapeHtml(keywordLabel)}</h3><table class="table"><thead><tr>` +
    cols.map(c=>`<th>${labelFor(c)}</th>`).join('') +
    `</tr></thead><tbody>`;

  for (const r of filtered) {
    html += '<tr>' + cols.map(c=>`<td>${escapeHtml(r[c] || '')}</td>`).join('') + '</tr>';
  }
  html += '</tbody></table></div>';
  workarea.innerHTML = html;
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

// Handle clicks on tabs (buttons have data-action)
function handleAction(action){
  if (action === 'insecticides') {
    // match rows where category mentions 'insecticide' OR target contains insect pests
    renderCategoryListByKeyword('Insecticides', ({cat, target, trade, ai, row})=>{
      return cat.includes('insecticide') || cat.includes('biological; insecticide') || target.includes('fruit fly') || target.includes('codling') || target.includes('bollworm') || trade.toLowerCase().includes('insect') || ai.toLowerCase().includes('spinosad') || ai.toLowerCase().includes('azadirachtin') || ai.toLowerCase().includes('methoxyfenozide');
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
    // show a simple keyword search UI
    workarea.innerHTML = `<div class="panel">
      <div class="controls"><input id="kw" placeholder="Enter keyword" style="flex:1;padding:8px"/><button id="kwb" class="btn-primary">Search</button></div>
      <div id="kw-results" style="margin-top:12px"></div>
    </div>`;
    document.getElementById('kwb').onclick = ()=> {
      const q = document.getElementById('kw').value.trim().toLowerCase();
      if (!q) { document.getElementById('kw-results').innerHTML = '<p>Enter a search term</p>'; return; }
      const res = data.filter(r => {
        return (r.trade_name||'').toLowerCase().includes(q) ||
               (r.active_ingredient||'').toLowerCase().includes(q) ||
               (r.category||'').toLowerCase().includes(q) ||
               (r.target_pest_disease||'').toLowerCase().includes(q) ||
               (r.registration_notes||'').toLowerCase().includes(q);
      });
      if (!res.length) { document.getElementById('kw-results').innerHTML = '<p>No results</p>'; return; }
      // reuse renderer
      const cols = ['trade_name','active_ingredient','category','target_pest_disease','registration_notes'];
      let html = '<table class="table"><thead><tr>' + cols.map(c=>`<th>${labelFor(c)}</th>`).join('') + '</tr></thead><tbody>';
      for (const r of res) html += '<tr>' + cols.map(c=>`<td>${escapeHtml(r[c]||'')}</td>`).join('') + '</tr>';
      html += '</tbody></table>';
      document.getElementById('kw-results').innerHTML = html;
    };
  } else if (action === 'download') {
    // reuse existing download UI if available; simple message here
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
  // optionally show nothing or a welcome panel
  workarea.innerHTML = `<div class="panel"><p>Choose a search option above (e.g. "Search Insecticides").</p></div>`;
})();
