**MCP Datadog Server**

- Servidor MCP (Model Context Protocol) para Datadog.
- Gera tools automaticamente a partir do Postman Collection `datadog-api-collection-schema.json`.
- Faz chamadas HTTP às APIs do Datadog usando suas chaves (API/Application) via headers.

**Instalação**

- Requisitos: Node.js 18+
- Instalar deps: `npm install` ou `make install`

**Execução**

- Padrão (stdio): `node src/index.js` ou `make start`
- Integre no seu host MCP apontando para esse comando (protocolo stdio).
 - O Makefile carrega variáveis de um arquivo `.env` automaticamente (se existir).

**Configuração no Host MCP (LLM)**

- Exemplos de configuração JSON do host MCP para adicionar servidores (Github e Datadog):

Exemplo 1 (Github, referência):

```
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

Exemplo 2 (Datadog via arquivo local):

```
{
  "mcpServers": {
    "datadog": {
      "command": "node",
      "args": ["/path/to/mcp-datadog-server/src/index.js"],
      "env": {
        "DATADOG_API_KEY": "<YOUR_API_KEY>",
        "DATADOG_APP_KEY": "<YOUR_APP_KEY>",
        "DATADOG_SITE": "<YOUR_SITE>" // opcional, ex.: datadoghq.com / datadoghq.eu
      }
    }
  }
}
```

Exemplo 3 (Datadog via npx do pacote publicado):

```
{
  "mcpServers": {
    "datadog": {
      "command": "npx",
      "args": ["-y", "mcp-datadog-server"],
      "env": {
        "DATADOG_API_KEY": "<YOUR_API_KEY>",
        "DATADOG_APP_KEY": "<YOUR_APP_KEY>",
        "DATADOG_SITE": "<YOUR_SITE>" // opcional
      }
    }
  }
}
```

Observações:
- O servidor aceita variáveis `DD_API_KEY`/`DD_APP_KEY` ou `DATADOG_API_KEY`/`DATADOG_APP_KEY`.
- O site pode ser configurado com `DD_SITE` ou `DATADOG_SITE` (ex.: `datadoghq.com`, `datadoghq.eu`, `us3.datadoghq.com`).
- Você também pode usar `MCP_DD_FOLDERS` para reduzir as tools carregadas (ex.: `Logs,Monitors`).

**Variáveis de Ambiente**

- `DD_API_KEY` e `DD_APP_KEY` (obrigatórias)
- `DD_SITE` (opcional, padrão `datadoghq.com`)
- `DD_SUBDOMAIN` (opcional, padrão `api`)
- `MCP_DD_SCHEMA_PATH` (opcional, caminho do JSON do Postman Collection; padrão é `datadog-api-collection-schema.json` no repositório)
- `MCP_DD_FOLDERS` (opcional, CSV de pastas topo da coleção para filtrar tools, ex.: `Logs,Monitors,Metrics,Incidents,Dashboards`)
- `NODE_EXTRA_CA_CERTS` (opcional) caminho para um certificado CA adicional (PEM/CRT) quando sua rede corporativa usa interceptação TLS. Ex.: `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/zscaler.pem` (Linux) ou `NODE_EXTRA_CA_CERTS="C:\\Users\\seu.usuario\\Devops\\zscaler.cer"` (Windows)

Exemplo `.env`:

```
DD_API_KEY=xxxx
DD_APP_KEY=yyyy
DD_SITE=datadoghq.eu
MCP_DD_FOLDERS=Logs,Monitors,Metrics
# Para redes corporativas com CA própria (ex.: Zscaler)
# Linux/macOS
# NODE_EXTRA_CA_CERTS=/etc/ssl/certs/zscaler.pem
# Windows (atenção às barras invertidas e aspas)
# NODE_EXTRA_CA_CERTS="C:\\Users\\claudio.lazaro\\Devops\\zscaler.cer"
```

**Capacidades**

- Listar tools (MCP `list_tools`) com nomes amigáveis, ex.:
  - Monitors: `get_monitors`, `get_monitor`, `create_monitor`, `update_monitor`, `delete_monitor`, `mute_monitor`, `unmute_monitor`, `search_monitors`, `search_monitor_groups`, `can_delete_monitors`, `validate_monitor`.
  - Logs: `send_logs`, `search_logs_events`, `get_logs_events`, `aggregate_logs_analytics`.
  - Metrics: `get_metrics_v1`, `get_metrics_v2`, `get_metric`, `get_metric_tags`, `update_metric`, `submit_series`, `submit_distribution_points`, `query_timeseries`, `query_scalars`, `estimate_metric`.
- Executar tools (MCP `call_tool`) para qualquer endpoint da coleção.
- Geração dinâmica de tools a partir do Postman Collection, com:
  - Naming amigável por heurística (ver `src/schema.js`).
  - Overrides de nomes para rotas populares (Monitors, Logs intake, Métricas de envio).
  - Desambiguação por versão automática (`_v1`, `_v2`) quando necessário.
  - Filtro por pastas de alto nível com `MCP_DD_FOLDERS` (ex.: `Logs,Monitors,Metrics`).
- Suporte a variáveis de path/query/body/headers por tool.
- Resolução de `{{baseUrl}}`, `{{site}}`, `{{subdomain}}` conforme seu ambiente.

**Como as Tools Funcionam**

- Cada tool aceita:
  - `path`: parâmetros de caminho (ex.: `{ "monitor_id": 123 }`).
  - `query`: parâmetros de querystring.
  - `body`: corpo da requisição (objeto/array ou string JSON bruta).
  - `headers`: headers adicionais (chaves do Datadog são adicionadas automaticamente).
  - `site` / `subdomain`: sobrescreve `DD_SITE`/`DD_SUBDOMAIN` só nessa chamada.

**Exemplos Práticos**

- Monitors
  - `get_monitors` → GET `/api/v1/monitor` (filtros via `query`).
  - `get_monitor` → GET `/api/v1/monitor/:monitor_id` (`path.monitor_id`).
  - `create_monitor` → POST `/api/v1/monitor` (`body` com a definição do monitor).
  - `mute_monitor`/`unmute_monitor` → POST `/api/v1/monitor/:monitor_id/mute|unmute`.
- Logs
  - `send_logs` → POST `https://http-intake.logs.{{site}}/api/v2/logs` (corpo: array de eventos de log).
  - `search_logs_events` → POST `/api/v2/logs/events/search` (corpo com `filter`, `page`, etc.).
- Métricas
  - `submit_series` → POST `/api/v2/series` (envio de métricas v2).
  - `submit_distribution_points` → POST `/api/v1/distribution_points`.
  - `query_timeseries` / `query_scalars` → POST `/api/v2/query/*`.

**Segurança**

- Lê chaves apenas das variáveis de ambiente e envia em headers (`DD-API-KEY`, `DD-APPLICATION-KEY`). Não registra chaves em logs.

**Dicas**

- Muitas tools? Use `MCP_DD_FOLDERS="Logs,Monitors,Metrics"` para reduzir o escopo.
- Quando houver endpoints v1 e v2 equivalentes, os nomes terão sufixos (`*_v1`, `*_v2`).
- Ajuste nomes exatos via overrides em `src/schema.js` (procure `getOverrideName`).

**Makefile**

- Use `make` para tarefas comuns:
  - `make install` → instala dependências
  - `make start` → inicia o servidor MCP (stdio)
  - `make list-tools` → lista tools geradas (use `FOLDERS=Logs,Monitors` para filtrar)
  - `make test` → roda testes unitários e valida o JSON da coleção
  - `make smoke` → executa um teste funcional real contra a API do Datadog (usa `.env`)

**Teste Funcional (Live) com a API do Datadog**

1) Configure `.env` com suas chaves:

```
DD_API_KEY=xxxx
DD_APP_KEY=yyyy
DD_SITE=datadoghq.com
```

2) Rode o teste de fumaça:

```
make smoke
```

O script executa:
- `GET /api/v1/validate` para validar as chaves
- `GET /api/v1/monitor?page_size=1` para listar monitores (pode falhar se a conta/escopo não tiver permissão; o teste segue mesmo assim)

Saída esperada (exemplo):

```
Smoke test: Validate API key
Validate: 200 true { valid: true, ... }

Smoke test: List monitors (page_size=1)
Monitors: 200 true
{ "...": "..." }
```

Observação: chamadas reais podem incorrer em custos/limites e dependem das permissões dos tokens.
