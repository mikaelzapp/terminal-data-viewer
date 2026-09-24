(function (global) {
  'use strict';

  const F = global.TDVFormatter;
  const N = global.TDVNormalizer;

  function textLine(key, value, options, indent) {
    const pad = ' '.repeat(indent);
    const label = F.humanizeKey(key);
    const formatted = F.formatScalar(key, value, options).text;
    const dots = '.'.repeat(Math.max(3, 24 - label.length));
    return `${pad}${label} ${dots} ${formatted}`;
  }

  function toTerminalText(value, key, options, depth) {
    const indent = depth * 2;
    if (Array.isArray(value)) {
      if (!value.length) return `${' '.repeat(indent)}Nenhum registro encontrado.`;
      return value.map((item, i) => {
        const head = `${' '.repeat(indent)}[${String(i + 1).padStart(2, '0')}]`;
        return `${head}\n${toTerminalText(item, key, options, depth + 1)}`;
      }).join('\n\n');
    }
    if (N.isPlainObject(value)) {
      return Object.entries(value).map(([k, v]) => {
        if (v && typeof v === 'object') {
          const title = `${' '.repeat(indent)}${F.humanizeKey(k).toUpperCase()}${Array.isArray(v) ? ` [${v.length}]` : ''}`;
          return `${title}\n${toTerminalText(v, k, options, depth + 1)}`;
        }
        return textLine(k, v, options, indent);
      }).join('\n');
    }
    return textLine(key, value, options, indent);
  }

  function buildReport(data, options) {
    const groups = N.buildRootGroups(data);
    const chunks = [
      '╔══════════════════════════════════════════════════════════════╗',
      '║                    TERMINAL DATA VIEWER                     ║',
      '╚═════════════════════════════════════════════════════════════╝',
      ''
    ];
    for (const group of groups) {
      const title = ` ${group.title} `;
      chunks.push(`┌${'─'.repeat(18)}${title}${'─'.repeat(Math.max(3, 42 - title.length))}┐`);
      chunks.push(toTerminalText(group.value, group.title, options, 0));
      chunks.push('└────────────────────────────────────────────────────────────────┘', '');
    }
    return chunks.join('\n');
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  function exportTxt(data, options) { download('terminal-data-viewer-report.txt', buildReport(data, options)); }
  function exportJson(originalText) { download('original-data.json', originalText, 'application/json;charset=utf-8'); }
  function exportHtml() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('script').forEach(s => s.remove());
    clone.querySelectorAll('.input-panel,.control-bar,.sidebar,.scanlines,.copy-inline,.toast').forEach(n => n.remove());
    download('terminal-data-viewer-report.html', '<!doctype html>\n' + clone.outerHTML, 'text/html;charset=utf-8');
  }

  global.TDVExporter = { buildReport, exportTxt, exportJson, exportHtml, download };
})(window);
