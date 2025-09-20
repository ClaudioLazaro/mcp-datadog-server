**MCP Datadog Server**

- Servidor MCP (Model Context Protocol) para Datadog.
- Tools pré-geradas a partir do Postman Collection `datadog-api-collection-schema.json` (arquivo `src/generatedTools.js`).
- Regere o arquivo gerado com `node scripts/generate-tools.js` caso a collection seja atualizada.
- Faz chamadas HTTP às APIs do Datadog usando suas chaves (API/Application) via headers.

**Instalação**

- Requisitos: Node.js 18+
- Instalar deps: `npm install` ou `make install`

**Execução**

- Padrão (stdio): `node src/index.js` ou `make start`
- Integre no seu host MCP apontando para esse comando (protocolo stdio).
  - O servidor usa `McpServer` e registra todas as tools no startup (como na doc oficial do MCP).
  - O Makefile carrega variáveis de um arquivo `.env` automaticamente (se existir).

**CLI utilitária**

- `mcp-datadog-server help` → lista comandos e flags disponíveis
- `mcp-datadog-server list-tools --folders=Logs,Monitors` → imprime as tools carregadas
- `mcp-datadog-server document-tools --output=docs/TOOLS.md` → gera documentação completa das tools
- `mcp-datadog-server doctor --live` → valida configuração local e (opcional) executa smoke tests reais
- `mcp-datadog-server smoke-test` → executa o conjunto padrão de smoke tests (mesmo que `make smoke`)

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
- Qualquer querystring de exemplo embutida na coleção Postman é removida na geração das tools. Forneça `query` explicitamente ao chamar a tool.

**Variáveis de Ambiente**

- `DD_API_KEY` e `DD_APP_KEY` (obrigatórias)
- `DD_SITE` (opcional, padrão `datadoghq.com`)
- `DD_SUBDOMAIN` (opcional, padrão `api`)
- `MCP_DD_SCHEMA_PATH` (opcional, caminho do JSON do Postman Collection; padrão é `datadog-api-collection-schema.json` no repositório)
- `MCP_DD_FOLDERS` (opcional, CSV de pastas topo da coleção para filtrar tools; por padrão **todas** as pastas são carregadas, ex.: `Logs,Monitors,Metrics`)
- `MCP_DD_USER_AGENT` (opcional, identifica o agente nas chamadas HTTP; padrão `mcp-datadog-server`)
- `MCP_DD_MAX_RETRIES` / `MCP_DD_RETRY_BASE_MS` / `MCP_DD_RESPECT_RETRY_AFTER` (opcionais, controlam a estratégia de retry automática)
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
- Tools pré-geradas garantem nomes estáveis (arquivo `src/generatedTools.js`).
- Script `node scripts/generate-tools.js` recria o arquivo gerado usando a collection Postman (mantendo as heurísticas de naming em `src/schema.js`).
- Filtro por pastas de alto nível com `MCP_DD_FOLDERS` (ex.: `Logs,Monitors,Metrics`).
- Suporte a variáveis de path/query/body/headers por tool.
- Resolução de `{{baseUrl}}`, `{{site}}`, `{{subdomain}}` conforme seu ambiente.

Curated tools (alto nível)

- Monitors: `list_monitors`, `get_monitor_by_id`, `create_monitor_v1`, `update_monitor_v1`, `delete_monitor_v1`, `mute_monitor_v1`, `unmute_monitor_v1`.
- Dashboards: `list_dashboards`, `get_dashboard_by_id`, `create_dashboard_v1`, `update_dashboard_v1`, `delete_dashboard_v1`.
- Logs: `logs_send`, `logs_search_events`, `logs_aggregate_analytics`.
- Metrics: `metrics_submit_series`, `metrics_query_timeseries`, `metrics_query_scalars`.
- Incidents: `incidents_list`, `incidents_get`, `incidents_create`, `incidents_update`.
- Downtimes: `downtimes_list`, `downtimes_create`, `downtimes_cancel`.
- Events: `events_post`, `events_list`.
- Notebooks: `notebooks_list`, `notebooks_get`, `notebooks_create`, `notebooks_update`, `notebooks_delete`.
- Synthetics: `synthetics_list_tests`, `synthetics_get_test`, `synthetics_create_test`, `synthetics_update_test`, `synthetics_delete_test`.
- SLOs: `slos_list`, `slos_get`, `slos_create`, `slos_update`, `slos_delete`.
- Users: `users_list`, `users_get`, `users_create`, `users_update`.
- Roles: `roles_list`, `roles_get`.
- Teams: `teams_list`, `teams_get`.

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
  - `make list-tools` → lista tools geradas (`FOLDERS=Logs,Monitors` para filtrar)
  - `make document-tools` → gera TOOLS.md (`OUTPUT=docs/TOOLS.md` para escrever em outro local)
  - `make test` → roda testes unitários e valida o JSON da coleção
  - `make smoke` → executa os smoke tests reais contra a API do Datadog (usa `.env`)

**Teste Funcional (Live) com a API do Datadog**

1. Configure `.env` com suas chaves:

```
DD_API_KEY=xxxx
DD_APP_KEY=yyyy
DD_SITE=datadoghq.com
```

2. Rode o teste de fumaça:

```
make smoke
# ou, diretamente:
# mcp-datadog-server smoke-test
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
