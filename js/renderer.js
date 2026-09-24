(function (global) {
  'use strict';

  const N = global.TDVNormalizer;
  const F = global.TDVFormatter;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function safeId(input) {
    return String(input).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'secao';
  }

  function makeCopyButton(value, notify) {
    const btn = el('button', 'copy-inline', '[COPY]');
    btn.type = 'button';
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(String(value));
        notify('COPIADO ✓');
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = String(value); document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        notify('COPIADO ✓');
      }
    });
    return btn;
  }

  function renderField(key, value, options) {
    const row = el('div', 'field-row searchable');
    const label = el('div', 'field-label', F.humanizeKey(key));
    const formatted = F.formatScalar(key, value, options);
    row.dataset.searchText = `${key} ${formatted.text}`.toLowerCase();
    const val = el('div', `field-value ${formatted.className || ''}`.trim());
    const valueText = el('span', 'value-text', formatted.text);
    valueText.dataset.originalText = formatted.text;
    val.appendChild(valueText);
    if (value != null && typeof value !== 'object') val.appendChild(makeCopyButton(formatted.text, options.notify));
    row.append(label, val);
    return row;
  }

  function renderBooleanObject(obj, options) {
    const wrap = el('div', 'bool-list');
    for (const [key, value] of Object.entries(obj)) {
      const item = el('div', `bool-item ${value ? 'true' : 'false'} searchable`);
      item.dataset.searchText = `${key} ${value}`.toLowerCase();
      const text = `${value ? '[✓]' : '[ ]'} ${F.humanizeKey(key)}`;
      item.textContent = text;
      item.dataset.originalText = text;
      wrap.appendChild(item);
    }
    return wrap;
  }

  function isBooleanMap(obj) {
    const vals = Object.values(obj);
    return vals.length > 0 && vals.every(v => typeof v === 'boolean');
  }

  function renderArray(arr, key, options, depth) {
    const wrap = el('div', 'array-list');
    if (!arr.length) {
      wrap.appendChild(el('div', 'empty-state', 'Nenhum registro encontrado.'));
      return wrap;
    }
    arr.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const card = el('article', 'record-card searchable');
        card.dataset.searchText = `${key} ${index + 1}`.toLowerCase();
        const title = el('div', 'record-title', `[ REGISTRO ${String(index + 1).padStart(2, '0')} ]`);
        const body = el('div', 'record-body');
        body.appendChild(renderValue(item, `${key}_${index + 1}`, options, depth + 1));
        card.append(title, body);
        wrap.appendChild(card);
      } else {
        wrap.appendChild(renderField(`[${index + 1}]`, item, options));
      }
    });
    return wrap;
  }

  function renderObject(obj, key, options, depth) {
    const countWrapper = N.detectCountWrapper(obj);
    if (countWrapper && Object.keys(obj).length <= 5) {
      const wrap = el('div', 'nested-block');
      wrap.appendChild(renderField('Quantidade', countWrapper.count, options));
      wrap.appendChild(renderArray(countWrapper.items, countWrapper.arrayKey, options, depth + 1));
      const rest = Object.fromEntries(Object.entries(obj).filter(([k]) => k !== countWrapper.arrayKey && !/^(QTD|QUANTIDADE|TOTAL|COUNT)$/i.test(k)));
      if (Object.keys(rest).length) wrap.appendChild(renderObject(rest, key, options, depth + 1));
      return wrap;
    }

    if (isBooleanMap(obj)) return renderBooleanObject(obj, options);

    const grid = el('div', depth <= 1 ? 'fields-grid' : 'nested-block');
    for (const [childKey, childValue] of Object.entries(obj)) {
      if (childValue && typeof childValue === 'object') {
        const block = el('div', 'nested-block searchable');
        block.dataset.searchText = String(childKey).toLowerCase();
        const heading = el('div', 'record-title', F.humanizeKey(childKey).toUpperCase() + (Array.isArray(childValue) ? ` [${childValue.length}]` : ''));
        block.append(heading, renderValue(childValue, childKey, options, depth + 1));
        grid.appendChild(block);
      } else {
        grid.appendChild(renderField(childKey, childValue, options));
      }
    }
    if (!Object.keys(obj).length) grid.appendChild(el('div', 'empty-state', 'Nenhum registro encontrado.'));
    return grid;
  }

  function renderValue(value, key, options, depth) {
    if (Array.isArray(value)) return renderArray(value, key, options, depth);
    if (N.isPlainObject(value)) return renderObject(value, key, options, depth);
    return renderField(key, value, options);
  }

  function createSection(group, index, options) {
    const section = el('section', 'data-section searchable');
    const id = `section-${safeId(group.id || group.title || index)}`;
    section.id = id;
    section.dataset.searchText = String(group.title).toLowerCase();
    const button = el('button', 'section-toggle', `[-] ${group.title}`);
    button.type = 'button';
    button.setAttribute('aria-expanded', 'true');
    const body = el('div', 'section-body');
    body.appendChild(renderValue(group.value, group.title, options, 0));
    button.addEventListener('click', () => {
      const collapsed = body.classList.toggle('collapsed');
      button.setAttribute('aria-expanded', String(!collapsed));
      button.textContent = `${collapsed ? '[+]' : '[-]'} ${group.title}`;
    });
    section.append(button, body);
    return { section, nav: { id, label: group.title } };
  }

  function renderDataset(data, root, options) {
    root.innerHTML = '';
    const groups = N.buildRootGroups(data);
    const nav = [];
    groups.forEach((group, i) => {
      const out = createSection(group, i, options);
      root.appendChild(out.section);
      nav.push(out.nav);
    });
    return nav;
  }

  function renderSummary(data, root, options) {
    root.innerHTML = '';
    root.appendChild(el('div', 'summary-title', '════════════════ DATA SUMMARY ════════════════'));
    const items = N.buildSummary(data);
    const grid = el('div', 'summary-grid');
    if (!items.length) grid.appendChild(el('div', 'empty-state', 'Nenhum campo prioritário detectado; use as seções abaixo.'));
    for (const item of items) {
      const row = el('div', 'summary-item searchable');
      const formatted = F.formatScalar(item.key, item.value, options);
      row.dataset.searchText = `${item.label} ${formatted.text}`.toLowerCase();
      row.append(el('div', 'summary-label', item.label), el('div', `summary-value ${formatted.className || ''}`.trim(), formatted.text));
      grid.appendChild(row);
    }
    root.appendChild(grid);
  }

  global.TDVRenderer = { renderDataset, renderSummary, renderValue };
})(window);
