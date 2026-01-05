// app.js - loads CSV, provides search and category lists, download
let data = []; // loaded dataset (array of objects)
const sampleCsvUrl = 'data/Avocado registred Chemicals.csv'; // the CSV file we included
const resultsEl = document.getElementById('results');
const resultsCatEl = document.getElementById('results-category');
const keywordArea = document.getElementById('keyword-area');
const categoryArea = document.getElementById('category-area');
const downloadArea = document.getElementById('download-area');
const categoryTitle = document.getElementById('category-title');

document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=> {
    const action = btn.dataset.action;
    showPanelFor(action);
  });
});

document.getElementById('keyword-search').addEventListener('click', ()=> {
  const q = document.getElementById('keyword-input').value.trim();
  const regOnly = document.getElementById('registered-only').checked;
  showKeywordSearch(q, regOnly);
});

document.getElementById('category-filter').addEventListener('change', (e)=>{
  const cat = categoryTitle.dataset.cat;
  renderCategoryList(cat);
});

document.getElementById('download-csv').addEventListener('click', ()=> downloadCSV());
document.getElementById('download-pdf').addEventListener('click', ()=> downloadPDF());
document.getElementById('excel-file').addEventListener('change', handleExcelUpload);

// Try load CSV that was included in repo
fetch(sampleCsvUrl)
  .then(r => {
    if (!r.ok) throw new Error('no csv');
    return r.text();
  })
  .then(txt => {
    const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
    data = parsed.data.map(mapRow);
    console.log('Loaded CSV with', data.length, 'records');
  })
  .catch(err => {
    console.log('No preloaded CSV found. Upload Excel or place CSV at', sampleCsvUrl, err.message);
  });

// helpers
function mapRow(r){
  // maps CSV column names to normalized keys used by the UI
  return {
    active_ingredient: r['Active ingredient'] || r['Active Ingredient'] || '',
    trade_name: r['Trade name'] || r['Trade Name'] || '',
    registration_holder: r['Registration holder'] || r['Registration Holder'] || '',
    target_pest_disease: r['Target'] || r['Target / Pest'] || r['Target/Pest'] || '',
    category: r['Category'] || '',
    // fields not present in the CSV are left blank for now
    mrl_value: r['MRL'] || '',
    mrl_unit: r['MRL unit'] || '',
    registered: r['Registered'] || '',
    registration_notes: r['Registration notes'] || ''
  };
}

function hideAllPanels(){
  keywordArea.classList.add('hidden');
  categoryArea.classList.add('hidden');
  downloadArea.classList.add('hidden');
}

function showPanelFor(action){
  hideAllPanels();
  if (action === 'keyword') {
    keywordArea.classList.remove('hidden');
  } else if (['insecticides','fungicides','postharvest','adjuvants','herbicides','mrls'].includes(action)) {
    categoryArea.classList.remove('hidden');
    categoryTitle.textContent = humanLabel(action);
    categoryTitle.dataset.cat = action;
    renderCategoryList(action);
  } else if (action === 'download') {
    downloadArea.classList.remove('hidden');
  }
}

function humanLabel(action){
  const map = {
    insecticides: 'Insecticides',
    fungicides: 'Fungicides (Pre-Harvest)',
    postharvest: 'Post-Harvest Chemicals',
    adjuvants: 'Adjuvants',
    herbicides: 'Herbicides',
    mrls: "MRL's"
  };
  return map[action] || action;
}

function showKeywordSearch(query, registeredOnly=false){
  if (!data || data.length===0) { resultsEl.innerHTML = '<p>No data loaded. Upload your Excel or add CSV to data folder.</p>'; return; }
  const q = query.toLowerCase();
  const filtered = data.filter(row=>{
    if (registeredOnly && (!row.registered || row.registered.toString().toLowerCase() !== 'yes')) return false;
    if (!q) return true;
    const fields = ['trade_name','active_ingredient','registration_holder','target_pest_disease','category','mrl_value','registration_notes'];
    return fields.some(f => (row[f] || '').toString().toLowerCase().includes(q));
  });
  renderResultsTable(filtered, resultsEl);
}

// smart category match: check if category contains target keyword
function renderCategoryList(action){
  if (!data || data.length===0) { resultsCatEl.innerHTML = '<p>No data loaded.</p>'; return; }
  let filtered = [];
  if (action === 'mrls') {
    filtered = data.filter(r=> r.mrl_value && r.mrl_value.toString().trim() !== '');
  } else {
    const categoryKeywordMap = {
      insecticides: 'insecticide',
      fungicides: 'fungicide',
      postharvest: 'post-harvest',
      adjuvants: 'adjuvant',
      herbicides: 'herbicide'
    };
    const keyword = categoryKeywordMap[action] || action;
    filtered = data.filter(r => (r.category || '').toString().toLowerCase().includes(keyword.toLowerCase()));
  }

  const filterSetting = document.getElementById('category-filter').value;
  if (filterSetting === 'registered') filtered = filtered.filter(r => (r.registered||'').toString().toLowerCase() === 'yes');

  renderResultsTable(filtered, resultsCatEl);
}

function renderResultsTable(arr, container){
  if (!arr || arr.length===0) { container.innerHTML = '<p>No results.</p>'; return; }
  const cols = ['trade_name','active_ingredient','registration_holder','category','target_pest_disease','mrl_value','mrl_unit','registered','registration_notes'];
  let html = '<table class="table"><thead><tr>' + cols.map(c=>`<th>${labelFor(c)}</th>`).join('') + '</tr></thead><tbody>';
  for (const row of arr){
    html += '<tr>' + cols.map(c=>`<td>${escapeHtml(row[c] || '')}</td>`).join('') + '</tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

function labelFor(key){
  const map = {
    trade_name: 'Trade name',
    active_ingredient: 'Active ingredient',
    registration_holder: 'Registration holder',
    category: 'Category',
    target_pest_disease: 'Target / Pest',
    mrl_value: 'MRL',
    mrl_unit: 'Unit',
    registered: 'Registered',
    registration_notes: 'Registration notes'
  };
  return map[key] || key;
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Downloads
function downloadCSV(){
  if (!data || data.length===0){ alert('No data loaded'); return; }
  const cols = ['active_ingredient','trade_name','registration_holder','target_pest_disease','category','mrl_value','mrl_unit','registered','registration_notes'];
  const csv = [cols.join(',')].concat(data.map(row => cols.map(c => `"${(row[c]||'').toString().replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'chemicals.csv'; a.click();
  URL.revokeObjectURL(url);
}

async function downloadPDF(){
  if (!data || data.length===0){ alert('No data loaded'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  const head = [['Trade name','Active ingredient','Registration holder','Category','Target/Pest','MRL','Unit','Registered']];
  const body = data.map(r => [r.trade_name||'', r.active_ingredient||'', r.registration_holder||'', r.category||'', r.target_pest_disease||'', r.mrl_value||'', r.mrl_unit||'', r.registered||'']);
  doc.autoTable({ head, body, startY: 10, styles: { fontSize: 8 } });
  doc.save('chemicals.pdf');
}

// Excel upload (SheetJS)
function handleExcelUpload(ev){
  const f = ev.target.files[0];
  if (!f) return;
  document.getElementById('upload-status').textContent = `Loading ${f.name}...`;
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataArr = new Uint8Array(e.target.result);
    const wb = XLSX.read(dataArr, { type: 'array' });
    const firstName = wb.SheetNames[0];
    const ws = wb.Sheets[firstName];
    const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
    data = json.map(r => {
      return {
        active_ingredient: r['Active ingredient'] || r['Active Ingredient'] || '',
        trade_name: r['Trade name'] || r['Trade Name'] || '',
        registration_holder: r['Registration holder'] || '',
        target_pest_disease: r['Target'] || '',
        category: r['Category'] || '',
        mrl_value: r['MRL'] || '',
        mrl_unit: r['MRL unit'] || '',
        registered: r['Registered'] || '',
        registration_notes: r['Registration notes'] || ''
      };
    });
    document.getElementById('upload-status').textContent = `Loaded ${data.length} rows from ${f.name} (temporary in browser).`;
    showPanelFor('keyword');
    resultsEl.innerHTML = `<p>Loaded ${data.length} rows. Use the Search Key Word or other tabs.</p>`;
  };
  reader.readAsArrayBuffer(f);
}