(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { data: null, originalText: '', nav: [] };

  const ui = {
    jsonInput: $('jsonInput'), processBtn: $('processBtn'), clearBtn: $('clearBtn'), fileInput: $('fileInput'), dropZone: $('dropZone'),
    maskToggle: $('maskToggle'), correctionNotice: $('correctionNotice'), parseError: $('parseError'), workspace: $('workspace'),
    summaryPanel: $('summaryPanel'), renderRoot: $('renderRoot'), sectionNav: $('sectionNav'), datasetMeta: $('datasetMeta'),
    searchInput: $('searchInput'), searchStatus: $('searchStatus'), toast: $('toast'), bootStatus: $('bootStatus'),
    expandAllBtn: $('expandAllBtn'), collapseAllBtn: $('collapseAllBtn'), copyReportBtn: $('copyReportBtn'),
    exportTxtBtn: $('exportTxtBtn'), exportJsonBtn: $('exportJsonBtn'), exportHtmlBtn: $('exportHtmlBtn')
  };

  function notify(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(notify.t);
    notify.t = setTimeout(() => ui.toast.classList.remove('show'), 1200);
  }

  async function boot() {
    const lines = ['> parsing engine ready', '> recursive renderer ready', '> local privacy mode enabled', '> READY'];
    ui.bootStatus.innerHTML = '';
    for (const line of lines) {
      const div = document.createElement('div'); div.textContent = line; ui.bootStatus.appendChild(div);
      await new Promise(r => setTimeout(r, 90));
    }
  }

  function renderParseError(error) {
    const info = error.parseInfo || {};
    const lines = ['╔══════════════════════════════════╗', '║        JSON PARSE ERROR          ║', '╠══════════════════════════════════╣'];
    if (info.line != null) lines.push(`║ Linha: ${String(info.line).padEnd(26)}║`);
    if (info.column != null) lines.push(`║ Coluna: ${String(info.column).padEnd(25)}║`);
    lines.push('║                                  ║', `║ ${String(error.message || 'JSON inválido').slice(0, 32).padEnd(32)} ║`, '╚══════════════════════════════════╝');
    ui.parseError.textContent = lines.join('\n');
    ui.parseError.classList.remove('hidden');
  }

  function renderCorrections(corrections) {
    if (!corrections.length) { ui.correctionNotice.classList.add('hidden'); ui.correctionNotice.innerHTML = ''; return; }
    ui.correctionNotice.innerHTML = '<strong>[ AUTO-RECOVERY ]</strong><br>' + corrections.map(x => `• ${escapeHtml(x)}`).join('<br>');
    ui.correctionNotice.classList.remove('hidden');
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

  function renderNav(nav) {
    ui.sectionNav.innerHTML = '<button data-target="inputPanel">[0] ENTRADA</button>';
    nav.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.dataset.target = item.id;
      btn.textContent = `[${i + 1}] ${item.label}`;
      ui.sectionNav.appendChild(btn);
    });
  }

  function renderMeta(data) {
    const s = TDVNormalizer.collectStats(data);
    ui.datasetMeta.innerHTML = [
      '<div>STATUS: <span class="status-active">● DATASET LOADED</span></div>',
      `<div>OBJECTS: ${s.objects}</div>`, `<div>ARRAYS: ${s.arrays}</div>`, `<div>RECORDS: ${s.records}</div>`, `<div>FIELDS: ${s.fields}</div>`, `<div>DEPTH: ${s.maxDepth}</div>`
    ].join('');
  }

  function rendererOptions() { return { maskSensitive: ui.maskToggle.checked, notify }; }

  function renderAll() {
    if (state.data == null) return;
    const options = rendererOptions();
    TDVRenderer.renderSummary(state.data, ui.summaryPanel, options);
    state.nav = TDVRenderer.renderDataset(state.data, ui.renderRoot, options);
    renderNav(state.nav);
    renderMeta(state.data);
    ui.workspace.classList.remove('hidden');
    ui.searchInput.value = '';
    ui.searchStatus.textContent = '';
  }

  function processInput() {
    ui.parseError.classList.add('hidden');
    try {
      const parsed = TDVParser.parseJsonSmart(ui.jsonInput.value);
      state.data = parsed.data;
      state.originalText = parsed.originalText;
      renderCorrections(parsed.corrections);
      renderAll();
      notify('PAINEL GERADO ✓');
      ui.workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      renderParseError(error);
    }
  }

  function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { ui.jsonInput.value = reader.result; processInput(); };
    reader.onerror = () => { ui.parseError.textContent = 'Não foi possível ler o arquivo local.'; ui.parseError.classList.remove('hidden'); };
    reader.readAsText(file);
  }

  ui.processBtn.addEventListener('click', processInput);
  ui.clearBtn.addEventListener('click', () => {
    state.data = null; state.originalText = ''; ui.jsonInput.value = ''; ui.workspace.classList.add('hidden');
    ui.parseError.classList.add('hidden'); ui.correctionNotice.classList.add('hidden');
    renderNav([]); ui.datasetMeta.innerHTML = '<div>STATUS: <span class="muted">SEM DADOS</span></div><div>OBJECTS: 0</div><div>RECORDS: 0</div>';
  });
  ui.fileInput.addEventListener('change', e => readFile(e.target.files[0]));
  ['dragenter','dragover'].forEach(ev => ui.dropZone.addEventListener(ev, e => { e.preventDefault(); ui.dropZone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => ui.dropZone.addEventListener(ev, e => { e.preventDefault(); ui.dropZone.classList.remove('dragover'); }));
  ui.dropZone.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));
  ui.dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') ui.fileInput.click(); });

  ui.maskToggle.addEventListener('change', renderAll);
  ui.searchInput.addEventListener('input', () => {
    const a = TDVSearch.search(ui.summaryPanel, ui.searchInput.value);
    const b = TDVSearch.search(ui.renderRoot, ui.searchInput.value);
    const total = a.matches + b.matches;
    ui.searchStatus.textContent = ui.searchInput.value.trim() ? `${total} ocorrência(s) visual(is) encontrada(s).` : '';
  });

  ui.sectionNav.addEventListener('click', e => {
    const btn = e.target.closest('button[data-target]'); if (!btn) return;
    document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  ui.expandAllBtn.addEventListener('click', () => {
    ui.renderRoot.querySelectorAll('.section-body').forEach(b => b.classList.remove('collapsed'));
    ui.renderRoot.querySelectorAll('.section-toggle').forEach(btn => { btn.setAttribute('aria-expanded','true'); btn.textContent = btn.textContent.replace(/^\[\+\]/, '[-]'); });
  });
  ui.collapseAllBtn.addEventListener('click', () => {
    ui.renderRoot.querySelectorAll('.section-body').forEach(b => b.classList.add('collapsed'));
    ui.renderRoot.querySelectorAll('.section-toggle').forEach(btn => { btn.setAttribute('aria-expanded','false'); btn.textContent = btn.textContent.replace(/^\[-\]/, '[+]'); });
  });

  ui.copyReportBtn.addEventListener('click', async () => {
    if (!state.data) return;
    const text = TDVExporter.buildReport(state.data, rendererOptions());
    try { await navigator.clipboard.writeText(text); } catch (_) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    notify('RELATÓRIO COPIADO ✓');
  });
  ui.exportTxtBtn.addEventListener('click', () => state.data && TDVExporter.exportTxt(state.data, rendererOptions()));
  ui.exportJsonBtn.addEventListener('click', () => state.data && TDVExporter.exportJson(state.originalText));
  ui.exportHtmlBtn.addEventListener('click', () => state.data && TDVExporter.exportHtml());

  boot();
})();
