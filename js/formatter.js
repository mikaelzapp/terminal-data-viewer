(function (global) {
  'use strict';

  const LABEL_MAP = {
    DT_NASCIMENTO: 'Data de nascimento',
    DATA_NASCIMENTO: 'Data de nascimento',
    ULTIMO_SALARIO: 'Último salário',
    SALARIO: 'Salário',
    TIPO_VINCULO: 'Tipo de vínculo',
    VINCULO_ATIVO: 'Vínculo ativo',
    DT_ADMISSAO: 'Admissão',
    MOTIVO_DESLIGAMENTO: 'Motivo do desligamento',
    HORAS_CONTRATADAS: 'Horas contratadas',
    RAZAO_SOCIAL: 'Razão social',
    NOME_MAE: 'Nome da mãe',
    NOME_PAI: 'Nome do pai',
    STATUS_RECEITA_FEDERAL: 'Status Receita Federal',
    TEMPO_EMPREGO_MESES: 'Tempo de emprego (meses)',
    NATUREZA_JURIDICA: 'Natureza jurídica',
    PORTE_ESTABELECIMENTO: 'Porte do estabelecimento'
  };

  function humanizeKey(key) {
    if (LABEL_MAP[key]) return LABEL_MAP[key];
    const raw = String(key || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_\-.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!raw) return 'Campo';
    const lower = raw.toLocaleLowerCase('pt-BR');
    return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
  }

  function onlyDigits(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }

  function formatCPF(v) {
    const d = onlyDigits(v);
    return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : String(v);
  }
  function formatCNPJ(v) {
    const d = onlyDigits(v);
    return d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : String(v);
  }
  function formatCEP(v) {
    const d = onlyDigits(v);
    return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : String(v);
  }
  function formatDate(v) {
    const s = String(v);
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return s;
  }
  function formatMoney(v) {
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(n)) return String(v);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }

  function isSensitiveKey(key) {
    return /(CPF|CNPJ|RG|PIS|CTPS|RENAVAM|CHASSI|EMAIL|TELEFONE|CELULAR|ENDERECO|LOGRADOURO|CEP)/i.test(String(key));
  }

  function maskByKey(key, formatted, raw) {
    const k = String(key).toUpperCase();
    if (k.includes('CPF')) {
      const d = onlyDigits(raw);
      return d.length === 11 ? `${d.slice(0,3)}.***.***-${d.slice(-2)}` : '***';
    }
    if (k.includes('CNPJ')) {
      const d = onlyDigits(raw);
      return d.length === 14 ? `${d.slice(0,2)}.***.***/${d.slice(8,12)}-${d.slice(-2)}` : '***';
    }
    if (/EMAIL/.test(k)) {
      const s = String(raw);
      const at = s.indexOf('@');
      return at > 1 ? `${s[0]}***${s.slice(at)}` : '***';
    }
    if (/TELEFONE|CELULAR/.test(k)) {
      const d = onlyDigits(raw);
      return d.length >= 4 ? `***-***-${d.slice(-4)}` : '***';
    }
    if (/CEP/.test(k)) {
      const d = onlyDigits(raw);
      return d.length === 8 ? `${d.slice(0,2)}***-${d.slice(-3)}` : '***';
    }
    if (isSensitiveKey(k)) return formatted.length > 6 ? `${formatted.slice(0,2)}***${formatted.slice(-2)}` : '***';
    return formatted;
  }

  function isMoneyKey(key) { return /SALARIO|RENDA|REMUNERACAO|VALOR|PRECO|FATURAMENTO|PROVENTO/i.test(String(key)); }
  function isDateKey(key) { return /(^DT_|DATA|NASCIMENTO|ADMISSAO|DESLIGAMENTO)/i.test(String(key)); }

  function semanticBoolean(value, key) {
    const k = String(key || '').toUpperCase();
    if (/VINCULO_ATIVO|ATIVO|STATUS/.test(k)) return value ? '● ATIVO' : '○ ENCERRADO';
    return value ? '[✓] SIM' : '[ ] NÃO';
  }

  function formatScalar(key, value, options) {
    const opts = options || {};
    let className = '';
    let text;
    const missing = value == null || value === '' || value === '[empty]' || value === 'undefined';
    if (missing) return { text: 'Não informado', className: 'value-null' };

    if (typeof value === 'boolean') {
      text = semanticBoolean(value, key);
      className = value ? 'value-true' : 'value-false';
      return { text, className };
    }

    const s = String(value);
    if (/^(sim|não|nao)$/i.test(s) && /ATIVO|POSSUI|STATUS|VINCULO/i.test(String(key))) {
      const yes = /^sim$/i.test(s);
      text = /VINCULO|ATIVO/.test(String(key).toUpperCase()) ? (yes ? '● ATIVO' : '○ ENCERRADO') : (yes ? '[✓] SIM' : '[ ] NÃO');
      className = yes ? 'status-active' : 'status-closed';
    } else if (/CPF/i.test(key) && onlyDigits(value).length === 11) text = formatCPF(value);
    else if (/CNPJ/i.test(key) && onlyDigits(value).length === 14) text = formatCNPJ(value);
    else if (/CEP/i.test(key) && onlyDigits(value).length === 8) text = formatCEP(value);
    else if (isDateKey(key)) text = formatDate(value);
    else if (isMoneyKey(key) && (typeof value === 'number' || /^-?\d+(?:[.,]\d+)?$/.test(s))) text = formatMoney(value);
    else if (/SEXO|GENERO/i.test(key) && /^[MF]$/i.test(s)) text = /^F$/i.test(s) ? 'Feminino' : 'Masculino';
    else if (/TENDENCIA/i.test(key)) {
      if (/CRESC|ALTA|UP/i.test(s)) { text = `�&� ${s}`; className = 'trend-up'; }
      else if (/QUEDA|BAIXA|DOWN/i.test(s)) { text = `▼ ${s}`; className = 'trend-down'; }
      else text = s;
    } else text = s;

    if (opts.maskSensitive && isSensitiveKey(key)) text = maskByKey(key, text, value);
    return { text, className };
  }

  global.TDVFormatter = { humanizeKey, formatScalar, formatCPF, formatCNPJ, formatCEP, formatDate, formatMoney, isSensitiveKey };
})(window);
