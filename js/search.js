(function (global) {
  'use strict';

  function clearMarks(root) {
    root.querySelectorAll('.value-text, .bool-item').forEach(node => {
      if (node.dataset.originalText != null) node.textContent = node.dataset.originalText;
    });
    root.querySelectorAll('.searchable').forEach(node => node.classList.remove('no-results'));
  }

  function highlightSafe(node, query) {
    const original = node.dataset.originalText != null ? node.dataset.originalText : node.textContent;
    node.dataset.originalText = original;
    node.textContent = '';
    const q = query.toLocaleLowerCase('pt-BR');
    const lower = original.toLocaleLowerCase('pt-BR');
    let cursor = 0;
    let pos = lower.indexOf(q, cursor);
    if (pos < 0) { node.textContent = original; return; }
    while (pos >= 0) {
      if (pos > cursor) node.appendChild(document.createTextNode(original.slice(cursor, pos)));
      const mark = document.createElement('mark');
      mark.className = 'mark';
      mark.textContent = original.slice(pos, pos + query.length);
      node.appendChild(mark);
      cursor = pos + query.length;
      pos = lower.indexOf(q, cursor);
    }
    if (cursor < original.length) node.appendChild(document.createTextNode(original.slice(cursor)));
  }

  function search(root, query) {
    clearMarks(root);
    const q = String(query || '').trim().toLocaleLowerCase('pt-BR');
    if (!q) return { matches: 0, active: false };

    let matches = 0;
    root.querySelectorAll('.field-row, .bool-item, .summary-item').forEach(node => {
      const hay = (node.dataset.searchText || node.textContent || '').toLocaleLowerCase('pt-BR');
      const hit = hay.includes(q);
      node.classList.toggle('no-results', !hit);
      if (hit) matches++;
    });

    root.querySelectorAll('.value-text, .bool-item').forEach(node => {
      const t = (node.dataset.originalText != null ? node.dataset.originalText : node.textContent).toLocaleLowerCase('pt-BR');
      if (t.includes(q)) highlightSafe(node, query.trim());
    });
    return { matches, active: true };
  }

  global.TDVSearch = { search, clearMarks };
})(window);
