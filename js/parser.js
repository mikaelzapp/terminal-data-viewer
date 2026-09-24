(function (global) {
  'use strict';

  function stripBom(text) {
    if (text.charCodeAt(0) === 0xFEFF) return { text: text.slice(1), changed: true };
    return { text, changed: false };
  }

  function removeTrailingCommas(text) {
    let out = '';
    let inString = false;
    let escaped = false;
    let changed = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        out += ch;
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        out += ch;
        continue;
      }
      if (ch === ',') {
        let j = i + 1;
        while (j < text.length && /\s/.test(text[j])) j++;
        if (text[j] === '}' || text[j] === ']') {
          changed = true;
          continue;
        }
      }
      out += ch;
    }
    return { text: out, changed };
  }

  function looksLikeBareKeyValue(text) {
    const trimmed = text.trim();
    if (!trimmed || /^[\[{]/.test(trimmed)) return false;
    return /^\s*["'][^\n:]+["']\s*:/.test(trimmed);
  }

  function normalizeSingleQuotedKeysOnly(text) {
    // Pequena tolerância para chaves com aspas simples, sem converter valores silenciosamente.
    return text.replace(/(^|[{,]\s*)'([^'\\]+)'\s*:/gm, '$1"$2":');
  }

  function locateJsonError(error, text) {
    const message = String(error && error.message ? error.message : error);
    let pos = null;
    let match = message.match(/position\s+(\d+)/i);
    if (match) pos = Number(match[1]);
    if (pos == null) {
      match = message.match(/at line\s+(\d+)\s+column\s+(\d+)/i);
      if (match) return { line: Number(match[1]), column: Number(match[2]), position: null, message };
    }
    if (pos == null || Number.isNaN(pos)) return { line: null, column: null, position: null, message };
    const before = text.slice(0, pos);
    const lines = before.split('\n');
    return { line: lines.length, column: lines[lines.length - 1].length + 1, position: pos, message };
  }

  function tryParse(text) {
    try { return { ok: true, data: JSON.parse(text) }; }
    catch (error) { return { ok: false, error }; }
  }

  function inferRecoveredSectionName(text) {
    const sample = text.slice(0, 3500).toUpperCase();
    if (/"(?:CNPJ|RAZAO_SOCIAL|PIS|CTPS|OCUPACAO_CBO|VINCULO_ATIVO|SALARIO_CONTRATADO|ULTIMO_SALARIO)"\s*:/.test(sample)) {
      return 'VINCULOS_TRABALHISTAS_RECUPERADOS';
    }
    if (/"(?:LOGRADOURO|BAIRRO|CIDADE|UF|CEP|ENDERECO)"\s*:/.test(sample)) return 'ENDERECOS_RECUPERADOS';
    if (/"(?:PLACA|RENAVAM|CHASSI|MARCA_MODELO|VEICULO)"\s*:/.test(sample)) return 'VEICULOS_RECUPERADOS';
    if (/"(?:NOME|CPF|RG|DT_NASCIMENTO|NOME_MAE|NOME_PAI)"\s*:/.test(sample)) return 'REGISTROS_RECUPERADOS';
    return 'FRAGMENTO_RECUPERADO';
  }

  function recoverBareFragment(text) {
    if (!looksLikeBareKeyValue(text)) return null;

    const section = inferRecoveredSectionName(text);
    const candidates = [
      {
        mode: 'partial-object',
        text: `{\n${text}\n}`,
        message: 'Objeto parcial detectado; chaves externas { } adicionadas somente para a análise.'
      },
      {
        mode: 'array-record-inside-wrapper',
        text: `{\n"${section}": {\n"DADOS": [\n{\n${text}`,
        message: `Fragmento iniciado no meio de um registro detectado; foi criado o contêiner sintético ${section} > DADOS apenas para recuperar a estrutura externa.`
      },
      {
        mode: 'array-record-at-root',
        text: `[\n{\n${text}`,
        message: 'Fragmento iniciado no meio de um item de array detectado; abertura sintética de array/objeto adicionada somente para a análise.'
      },
      {
        mode: 'nested-object',
        text: `{\n"${section}": {\n${text}`,
        message: `Fragmento de objeto aninhado detectado; foi criado o contêiner sintético ${section} apenas para a análise.`
      }
    ];

    for (const candidate of candidates) {
      const result = tryParse(candidate.text);
      if (result.ok) return { ...candidate, data: result.data };
    }
    return null;
  }

  function parseJsonSmart(raw) {
    const corrections = [];
    const originalText = String(raw == null ? '' : raw);
    let text = originalText.trim();
    if (!text) throw Object.assign(new Error('Nenhum JSON foi informado.'), { userFriendly: true });

    const bom = stripBom(text);
    text = bom.text;
    if (bom.changed) corrections.push('BOM UTF-8 removido antes da análise.');

    const keyFix = normalizeSingleQuotedKeysOnly(text);
    if (keyFix !== text) {
      text = keyFix;
      corrections.push('Aspas simples em nomes de campos foram normalizadas para aspas duplas.');
    }

    const trailing = removeTrailingCommas(text);
    text = trailing.text;
    if (trailing.changed) corrections.push('Vírgula final inválida antes de } ou ] foi removida para permitir a leitura.');

    const direct = tryParse(text);
    if (direct.ok) {
      return { data: direct.data, originalText, parsedText: text, corrections, recoveryMode: null };
    }

    // Recuperação conservadora: adiciona apenas delimitadores/contêineres externos.
    // Nenhum valor fornecido pelo usuário é modificado.
    const recovered = recoverBareFragment(text);
    if (recovered) {
      corrections.push(recovered.message);
      corrections.push('Os valores originais foram preservados; somente a estrutura externa ausente foi reconstruída para visualização.');
      return {
        data: recovered.data,
        originalText,
        parsedText: recovered.text,
        corrections,
        recoveryMode: recovered.mode
      };
    }

    const info = locateJsonError(direct.error, text);
    const wrapped = new Error(info.message);
    wrapped.parseInfo = info;
    wrapped.parsedText = text;
    throw wrapped;
  }

  global.TDVParser = { parseJsonSmart, locateJsonError };
})(window);
