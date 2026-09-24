# TERMINAL DATA VIEWER

Visualizador local de JSON com estética de terminal preto/verde. O projeto não usa APIs externas, analytics, CDN ou backend: todo o processamento acontece no navegador.

## Recursos implementados

- JSON completo e JSON parcial sem chaves externas
- tolerância a BOM e vírgula final antes de `}`/`]`
- leitura de `.json` e `.txt`
- drag and drop
- renderização recursiva de objetos, arrays, booleanos, nulos, números e strings
- profundidade arbitrária (limitada apenas pelos recursos do navegador)
- agrupamento semântico de campos conhecidos + fallback genérico para qualquer estrutura
- detecção de wrappers `QTD + DADOS`
- seções expansíveis/recolhíveis
- resumo automático
- busca por campo ou valor
- máscara opcional de CPF/CNPJ/email/telefone/CEP e outros dados sensíveis
- formatação de CPF, CNPJ, CEP, data ISO, moeda BRL, sexo e status
- copiar valores e copiar relatório
- exportar TXT, JSON original e HTML
- responsividade para desktop e celular
- nenhuma transmissão automática de dados

## Como executar no Windows

Opção recomendada, com Python instalado:

```bat
cd caminho\para\terminal-data-viewer
python -m http.server 8080
```

Depois abra:

```text
http://localhost:8080
```

## Como executar no Termux

```bash
pkg update
pkg install python
cd /caminho/terminal-data-viewer
python -m http.server 8080
```

No navegador do celular, abra `http://127.0.0.1:8080`.

## Teste rápido

Abra `examples/exemplo.json` pelo botão **ABRIR ARQUIVO** ou arraste o arquivo para a área de drop.

## Estrutura

```text
terminal-data-viewer/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── parser.js
│   ├── normalizer.js
│   ├── formatter.js
│   ├── renderer.js
│   ├── search.js
│   ├── exporter.js
│   └── app.js
├── examples/
│   └── exemplo.json
└── README.md
```

## Suporte a fragmentos de JSON

O TERMINAL DATA VIEWER também aceita textos que não começam no início do JSON original.

Exemplo de entrada comum:

```text
"NATUREZA_JURIDICA": "2062 - Sociedade Empresária Limitada",
"VINCULO_ATIVO": "Não",
"SALARIO_CONTRATADO": 1942.60
},
{
  "NOME": "EXEMPLO",
  "CPF": "00000000000"
}
]
},
"INDICADORES_RENDA": {
  "RENDA_ATUAL": 2500
}
}
```

Quando esse padrão é detectado, o parser tenta recuperar apenas a estrutura externa ausente. Ele não altera silenciosamente valores reais. A interface informa o modo de recuperação utilizado em **AUTO-RECOVERY**.

Perfis tolerados incluem:

- objeto parcial sem `{ }` externos;
- conteúdo iniciado no meio do primeiro registro de um array;
- fragmento de objeto aninhado;
- BOM UTF-8;
- vírgula final antes de `}` ou `]`;
- campos vazios, `null`, `undefined` textual e `[empty]` na visualização.

Se a estrutura não puder ser recuperada de forma conservadora, o visualizador exibe o erro de parsing em vez de inventar conteúdo.
