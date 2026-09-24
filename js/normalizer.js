(function (global) {
  'use strict';

  const CATEGORY_RULES = [
    { key: 'identificacao', title: 'IDENTIFICAÇÃO', match: /(^|_)(NOME|CPF|RG|SEXO|GENERO|DT_NASCIMENTO|DATA_NASCIMENTO|NASCIMENTO|NACIONALIDADE|RACA_COR|ESCOLARIDADE|NOME_MAE|NOME_PAI)($|_)/i },
    { key: 'endereco', title: 'ENDEREÇO', match: /ENDEREC|LOGRADOURO|BAIRRO|CIDADE|MUNICIPIO|ESTADO|\bUF\b|CEP|NUMERO|COMPLEMENTO/i },
    { key: 'trabalho', title: 'TRABALHO', match: /CNPJ|RAZAO_SOCIAL|PIS|CTPS|OCUPACAO|CBO|CNAE|ADMISSAO|SALARIO|VINCULO|DESLIGAMENTO|EMPREGO|HORAS_CONTRATADAS/i },
    { key: 'renda', title: 'RENDA', match: /RENDA|REMUNERACAO|SALARIO|PROVENTO|FATURAMENTO/i },
    { key: 'parentes', title: 'RELACIONAMENTOS', match: /PARENTE|PARENTESCO|RELACIONAMENTO|NOME_MAE|NOME_PAI|CONJUGE|FILHO|FILHA/i },
    { key: 'veiculos', title: 'VEÍCULOS', match: /VEICULO|PLACA|RENAVAM|CHASSI|MARCA_MODELO/i },
    { key: 'interesses', title: 'INTERESSES', match: /INTERESSE|PREFERENCIA|HOBBY|HOBBIES/i },
    { key: 'divida', title: 'DÍVIDA ATIVA', match: /DIVIDA|DEBITO|PENDENCIA/i }
  ];

  function isPlainObject(v) {
    return Object.prototype.toString.call(v) === '[object Object]';
  }

  function classifyKey(key) {
    for (const rule of CATEGORY_RULES) if (rule.match.test(String(key))) return rule;
    return null;
  }

  function buildRootGroups(data) {
    if (!isPlainObject(data)) return [{ id: 'dados', title: 'DADOS', value: data, sourceKeys: [] }];

    const buckets = new Map();
    const others = {};
    for (const [key, value] of Object.entries(data)) {
      const rule = classifyKey(key);
      if (!rule) {
        others[key] = value;
        continue;
      }
      if (!buckets.has(rule.key)) buckets.set(rule.key, { id: rule.key, title: rule.title, value: {}, sourceKeys: [] });
      const bucket = buckets.get(rule.key);
      bucket.value[key] = value;
      bucket.sourceKeys.push(key);
    }

    const out = Array.from(buckets.values());
    if (Object.keys(others).length) out.push({ id: 'outros-dados', title: 'OUTROS DADOS', value: others, sourceKeys: Object.keys(others) });
    return out;
  }

  function collectStats(value) {
    const stats = { objects: 0, arrays: 0, records: 0, fields: 0, maxDepth: 0 };
    const seen = new WeakSet();
    function walk(v, depth) {
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      if (v && typeof v === 'object') {
        if (seen.has(v)) return;
        seen.add(v);
      }
      if (Array.isArray(v)) {
        stats.arrays++;
        stats.records += v.length;
        v.forEach(x => walk(x, depth + 1));
      } else if (isPlainObject(v)) {
        stats.objects++;
        for (const val of Object.values(v)) walk(val, depth + 1);
      } else {
        stats.fields++;
      }
    }
    walk(value, 0);
    return stats;
  }

  function findFirstByKeys(root, keys) {
    const normalized = keys.map(k => String(k).toUpperCase());
    const queue = [{ value: root, depth: 0 }];
    const seen = new WeakSet();
    while (queue.length) {
      const { value, depth } = queue.shift();
      if (depth > 6 || value == null) continue;
      if (typeof value === 'object') {
        if (seen.has(value)) continue;
        seen.add(value);
      }
      if (isPlainObject(value)) {
        for (const [k, v] of Object.entries(value)) {
          if (normalized.includes(String(k).toUpperCase()) && v !== null && v !== '' && typeof v !== 'object') return { key: k, value: v };
          if (v && typeof v === 'object') queue.push({ value: v, depth: depth + 1 });
        }
      } else if (Array.isArray(value)) {
        for (const item of value.slice(0, 100)) if (item && typeof item === 'object') queue.push({ value: item, depth: depth + 1 });
      }
    }
    return null;
  }

  function buildSummary(data) {
    const definitions = [
      ['NOME', ['NOME', 'NOME_COMPLETO', 'FULL_NAME']],
      ['CPF', ['CPF']],
      ['CNPJ', ['CNPJ']],
      ['CIDADE', ['CIDADE', 'MUNICIPIO', 'MUNICIPIO_TRABALHO']],
      ['UF', ['UF', 'ESTADO']],
      ['EMPRESA', ['RAZAO_SOCIAL', 'EMPRESA', 'NOME_EMPRESA']],
      ['EMPREGO', ['VINCULO_ATIVO', 'STATUS_VINCULO']],
      ['RENDA', ['RENDA_ATUAL', 'ULTIMO_SALARIO', 'SALARIO', 'REMUNERACAO']]
    ];
    return definitions.map(([label, keys]) => {
      const hit = findFirstByKeys(data, keys);
      return hit ? { label, key: hit.key, value: hit.value } : null;
    }).filter(Boolean);
  }

  function detectCountWrapper(obj) {
    if (!isPlainObject(obj)) return null;
    const entries = Object.entries(obj);
    const dataEntry = entries.find(([k, v]) => /^(DADOS|DATA|REGISTROS|ITEMS|RESULTADOS)$/i.test(k) && Array.isArray(v));
    if (!dataEntry) return null;
    const qtyEntry = entries.find(([k, v]) => /^(QTD|QUANTIDADE|TOTAL|COUNT)$/i.test(k) && typeof v !== 'object');
    return { arrayKey: dataEntry[0], items: dataEntry[1], count: qtyEntry ? qtyEntry[1] : dataEntry[1].length };
  }

  global.TDVNormalizer = { isPlainObject, classifyKey, buildRootGroups, collectStats, buildSummary, detectCountWrapper };
})(window);
