# MCP Datadog Server

> **Servidor MCP (Model Context Protocol) completo e robusto para integração com APIs do Datadog**

Um servidor MCP de produção que oferece **351 tools** para interagir com todas as APIs do Datadog através de LLMs, incluindo operações CRUD completas, tools curadas e ferramentas geradas automaticamente do schema.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://github.com/modelcontextprotocol)
[![License](https://img.shields.io/badge/License-Apache%202.0-yellow.svg)](LICENSE)

## 🚀 **Características Principais**

### **📊 Tools Disponíveis (351 total)**
- **9 Tools Curadas** 🎯 - Handcrafted, otimizadas para casos específicos
- **25 Tools CRUD** ⚡ - Operações CREATE, READ, UPDATE, DELETE para recursos principais
- **319 Tools Geradas** 🔧 - Geradas automaticamente do schema oficial do Datadog

### **🔍 Recursos Avançados**
- ✅ **Autodescoberta de Schema** - LLMs descobrem parâmetros automaticamente
- ✅ **Validação Robusta** - Zod schemas com validação completa
- ✅ **Progress Tracking** - Acompanhamento em tempo real para operações longas
- ✅ **Error Handling** - Tratamento inteligente de erros e retry automático
- ✅ **CLI Rica** - Interface completa para gestão e debugging

### **🛡️ Conformidade MCP**
- ✅ **100% Compatível** com TypeScript SDK oficial
- ✅ **JSON Schema** completo para todas as tools
- ✅ **Metadata Annotations** detalhadas
- ✅ **Type Safety** com validação Zod

## 📦 **Instalação**

### **Requisitos**
- Node.js 18+
- Chaves de API do Datadog (API Key + Application Key)

### **Instalação via npm**
```bash
npm install -g mcp-datadog-server
```

### **Instalação Local**
```bash
git clone https://github.com/ClaudioLazaro/mcp-datadog-server.git
cd mcp-datadog-server
npm install
```

## ⚙️ **Configuração**

### **1. Variáveis de Ambiente**

#### **Obrigatórias**
```bash
DD_API_KEY=your_api_key         # Chave da API Datadog
DD_APP_KEY=your_app_key         # Chave da aplicação Datadog
```

#### **Opcionais**
```bash
DD_SITE=datadoghq.com           # Site Datadog (padrão: datadoghq.com)
DD_SUBDOMAIN=api                # Subdomínio (padrão: api)
MCP_DD_FOLDERS=Dashboards,Logs  # Categorias permitidas (padrão: todas)
MCP_DD_SCHEMA_PATH=./schema.json # Caminho do schema (padrão: incluído)
MCP_DD_MAX_RETRIES=3            # Máximo de tentativas (padrão: 3)
MCP_DD_RETRY_BASE_MS=1000       # Base para retry em ms (padrão: 1000)
MCP_DD_TIMEOUT_MS=30000         # Timeout das requisições (padrão: 30000)
MCP_DD_USER_AGENT=mcp-datadog   # User agent customizado
```

### **2. Arquivo .env (Recomendado)**
```bash
# .env
DD_SITE=\"us3.datadoghq.com\"
DD_API_KEY=\"xxxxxxxxxxxxxxxxxxxxxxxx\"
DD_APP_KEY=\"xxxxxxxxxxxxxxxxxxxxxxxxxxxx\"
MCP_DD_FOLDERS=\"Dashboards,Monitors,Logs\"
```

### **3. Sites Datadog Suportados**
- `datadoghq.com` (US1)
- `datadoghq.eu` (EU)
- `us3.datadoghq.com` (US3)
- `us5.datadoghq.com` (US5)
- `ap1.datadoghq.com` (AP1)
- `ddog-gov.com` (US Gov)

## 🎮 **Uso**

### **Servidor MCP (Padrão)**
```bash
# Iniciar servidor MCP
mcp-datadog-server serve
# ou
npm start

# Com filtros
mcp-datadog-server serve --folders=Dashboards,Monitors
```

### **Interface CLI**

#### **Listar Tools**
```bash
# Lista básica
mcp-datadog-server list-tools

# Lista detalhada ordenada
mcp-datadog-server list-tools --detailed

# JSON output
mcp-datadog-server list-tools --json
```

#### **Inspeção de Tools**
```bash
# Ver detalhes de uma tool
mcp-datadog-server get-tool create_monitor

# Ver schema completo de uma tool
mcp-datadog-server show-schema create_monitor

# JSON output
mcp-datadog-server show-schema create_monitor --json
```

#### **Validação e Análise**
```bash
# Validar configuração
mcp-datadog-server validate

# Analisar schema da API
mcp-datadog-server analyze-schema

# Ajuda
mcp-datadog-server help
```

## 🔧 **Tools CRUD Disponíveis**

### **⚡ Monitors (5 operações)**
```bash
create_monitor    # Criar novo monitor
get_monitor       # Obter monitor por ID
update_monitor    # Atualizar monitor existente
delete_monitor    # Deletar monitor
list_monitor      # Listar todos os monitors
```

### **📊 Dashboards (5 operações)**
```bash
create_dashboard  # Criar novo dashboard
get_dashboard     # Obter dashboard por ID
update_dashboard  # Atualizar dashboard existente
delete_dashboard  # Deletar dashboard
list_dashboard    # Listar todos os dashboards
```

### **⏰ Downtimes (5 operações)**
```bash
create_downtime   # Agendar downtime
get_downtime      # Obter downtime por ID
update_downtime   # Atualizar downtime
delete_downtime   # Cancelar downtime
list_downtime     # Listar todos os downtimes
```

### **👥 Users (5 operações)**
```bash
create_user       # Criar usuário
get_user          # Obter usuário por ID
update_user       # Atualizar usuário
delete_user       # Deletar usuário
list_user         # Listar todos os usuários
```

### **🏗️ Teams (5 operações)**
```bash
create_team       # Criar equipe
get_team          # Obter equipe por ID
update_team       # Atualizar equipe
delete_team       # Deletar equipe
list_team         # Listar todas as equipes
```

## 📋 **Como o LLM Descobre os Parâmetros**

### **🔍 Autodescoberta Automática**

O LLM **NÃO precisa saber** os parâmetros antecipadamente. Através do protocolo MCP, ele:

1. **Lista** todas as tools disponíveis
2. **Obtém** o schema JSON Schema completo de cada tool
3. **Entende** todos os parâmetros, tipos e validações
4. **Constrói** chamadas válidas automaticamente

### **📄 Schema Exemplo - create_monitor**

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Monitor name"
    },
    "type": {
      "type": "string",
      "enum": ["metric alert", "service check", "event alert", "query alert", "composite", "log alert"],
      "description": "Monitor type"
    },
    "query": {
      "type": "string",
      "description": "Monitor query"
    },
    "message": {
      "type": "string",
      "description": "Notification message"
    },
    "tags": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Monitor tags"
    },
    "priority": {
      "type": "number",
      "minimum": 1,
      "maximum": 5,
      "description": "Priority (1-5)"
    },
    "options": {
      "type": "object",
      "properties": {
        "thresholds": {
          "type": "object",
          "properties": {
            "critical": {"type": "number"},
            "warning": {"type": "number"},
            "ok": {"type": "number"}
          }
        },
        "notify_audit": {"type": "boolean"},
        "require_full_window": {"type": "boolean"}
      }
    }
  },
  "required": ["name", "type", "query"]
}
```

### **🎯 Exemplo de Uso pelo LLM**

**Input do usuário:**
> "Create a monitor to alert when CPU usage is above 90%"

**Chamada automática do LLM:**
```javascript
await use_tool("create_monitor", {
  "name": "High CPU Usage Alert",
  "type": "metric alert",
  "query": "avg(last_5m):avg:system.cpu.user{*} > 0.9",
  "message": "CPU usage is high! Please investigate @ops-team",
  "tags": ["alert", "cpu", "infrastructure"],
  "priority": 3,
  "options": {
    "thresholds": {
      "critical": 0.9,
      "warning": 0.8
    },
    "notify_audit": true,
    "require_full_window": false
  }
})
```

**O LLM automaticamente:**
- ✅ Descobriu todos os parâmetros disponíveis
- ✅ Preencheu campos obrigatórios (name, type, query)
- ✅ Adicionou campos opcionais relevantes
- ✅ Estruturou objetos complexos (options.thresholds)
- ✅ Validou tipos e constraints

## 🎯 **Tools Curadas Especiais**

### **🎯 Dashboards**
```bash
list_dashboards   # Lista com filtros avançados e paginação
```

### **🎯 Logs**
```bash
search_logs       # Busca avançada de logs com filtros
```

### **🎯 Metrics**
```bash
query_metrics     # Query de métricas timeseries
```

### **🎯 Incidents**
```bash
manage_incidents  # Gerenciamento completo de incidentes
```

### **🎯 Synthetics**
```bash
manage_synthetics # Testes sintéticos completos
```

## 🏗️ **Integração com LLMs**

### **Claude Desktop (Recomendado)**

Adicione ao arquivo de configuração do Claude:

```json
{
  "mcpServers": {
    "datadog": {
      "command": "mcp-datadog-server",
      "args": ["serve"],
      "env": {
        "DD_API_KEY": "your_api_key",
        "DD_APP_KEY": "your_app_key",
        "DD_SITE": "datadoghq.com"
      }
    }
  }
}
```

### **Via npx (Global)**
```json
{
  "mcpServers": {
    "datadog": {
      "command": "npx",
      "args": ["-y", "mcp-datadog-server", "serve"],
      "env": {
        "DD_API_KEY": "your_api_key",
        "DD_APP_KEY": "your_app_key"
      }
    }
  }
}
```

### **Local Development**
```json
{
  "mcpServers": {
    "datadog": {
      "command": "node",
      "args": ["/path/to/mcp-datadog-server/src/index.js", "serve"],
      "env": {
        "DD_API_KEY": "your_api_key",
        "DD_APP_KEY": "your_app_key"
      }
    }
  }
}
```

## 🛠️ **Desenvolvimento**

### **Scripts Disponíveis**
```bash
npm test              # Executar testes
npm run serve         # Iniciar servidor
npm run list-tools    # Listar tools
npm run validate      # Validar configuração
npm run analyze-schema # Analisar schema da API
```

### **Makefile**
```bash
make install          # Instalar dependências
make start           # Iniciar servidor
make test            # Executar testes
make list-tools      # Listar tools
make validate        # Validar configuração
```

### **Estrutura do Projeto**
```
src/
├── index.js                    # CLI principal
├── server.js                   # Servidor MCP principal
├── core/
│   ├── config.js              # Sistema de configuração
│   ├── http-client.js         # Cliente HTTP com retry
│   ├── schema-parser.js       # Parser do schema Datadog
│   └── validation.js          # Validações robustas
└── tools/
    ├── core-tools.js          # Ferramentas base
    ├── curated-tools.js       # Tools curadas otimizadas
    └── crud-tools.js          # Tools CRUD automáticas
```

## 🔍 **Debugging e Troubleshooting**

### **Verificar Tools Carregadas**
```bash
# Ver resumo
mcp-datadog-server list-tools

# Ver lista completa ordenada
mcp-datadog-server list-tools --detailed

# Ver schema de uma tool específica
mcp-datadog-server show-schema create_monitor
```

### **Validar Configuração**
```bash
# Validar tudo
mcp-datadog-server validate

# Ver configuração resumida
mcp-datadog-server validate --json
```

### **Testar Conectividade**
```bash
# Analisar schema carregado
mcp-datadog-server analyze-schema

# Testar servidor básico
timeout 5s mcp-datadog-server serve
```

### **Logs e Debugging**
```bash
# O servidor gera logs estruturados:
[2025-01-20T10:30:00.000Z] [INFO] Starting server with config: {...}
[2025-01-20T10:30:01.000Z] [INFO] Registered 9 curated tools
[2025-01-20T10:30:02.000Z] [INFO] Registered 25 CRUD tools
[2025-01-20T10:30:03.000Z] [INFO] Registered 319 generated tools
[2025-01-20T10:30:04.000Z] [INFO] Registered 351 tools total
```

## 🚨 **Solução de Problemas Comuns**

### **1. "Tool não encontrada"**
```bash
# Verificar se a tool existe
mcp-datadog-server list-tools --detailed | grep nome_da_tool

# Ver todas as categorias disponíveis
mcp-datadog-server analyze-schema
```

### **2. "API Key inválida"**
```bash
# Validar credenciais
mcp-datadog-server validate

# Verificar variáveis de ambiente
echo $DD_API_KEY
echo $DD_APP_KEY
```

### **3. "Schema não carregado"**
```bash
# Verificar se o schema existe
mcp-datadog-server analyze-schema

# Forçar recarregamento
rm -f datadog-api-collection-schema.json
mcp-datadog-server serve
```

### **4. "Muitas tools carregadas"**
```bash
# Filtrar apenas categorias necessárias
export MCP_DD_FOLDERS="Dashboards,Monitors,Logs"
mcp-datadog-server list-tools
```

## 📈 **Performance e Limites**

### **Rate Limiting**
- ✅ **Automático** - Respeita headers `retry-after`
- ✅ **Configurável** - Ajuste via `MCP_DD_MAX_RETRIES`
- ✅ **Inteligente** - Backoff exponencial

### **Timeouts**
- ✅ **Padrão**: 30 segundos por requisição
- ✅ **Configurável** via `MCP_DD_TIMEOUT_MS`
- ✅ **Progress Tracking** para operações longas

### **Memory Usage**
- ✅ **Otimizado** - Schema carregado uma vez na inicialização
- ✅ **Streaming** - Não mantém responses grandes em memória
- ✅ **Filtros** - Use `MCP_DD_FOLDERS` para reduzir footprint

## 🔐 **Segurança**

### **Credentials**
- ✅ **Environment Only** - Chaves apenas via variáveis de ambiente
- ✅ **No Logging** - Credentials nunca aparecem em logs
- ✅ **Validation** - Formato das chaves validado na inicialização

### **Network**
- ✅ **TLS Only** - Todas as chamadas via HTTPS
- ✅ **Corporate Proxy** - Suporte via `NODE_EXTRA_CA_CERTS`
- ✅ **Headers Security** - User-Agent e headers apropriados

### **Input Validation**
- ✅ **Zod Schemas** - Validação rigorosa de entrada
- ✅ **Sanitization** - Limpeza automática de inputs
- ✅ **Type Safety** - TypeScript + runtime validation

## 📊 **Monitoramento**

### **Health Checks**
```bash
# Status do servidor
mcp-datadog-server validate

# Análise das tools
mcp-datadog-server list-tools --json | jq '.total'
```

### **Metrics Disponíveis**
- ✅ **Tools Count** - Total de tools carregadas
- ✅ **API Calls** - Tracking de chamadas por tool
- ✅ **Error Rate** - Rate de erros por categoria
- ✅ **Response Time** - Tempos de resposta médios

## 🎓 **Exemplos Práticos**

### **Criar Monitor de CPU**
O LLM pode automaticamente executar:
```javascript
await use_tool("create_monitor", {
  name: "High CPU Alert",
  type: "metric alert",
  query: "avg(last_5m):avg:system.cpu.user{*} > 0.9",
  message: "CPU high @ops-team"
});
```

### **Listar Dashboards Filtrados**
```javascript
await use_tool("list_dashboard", {
  filter_shared: false,
  count: 50
});
```

### **Criar Downtime para Manutenção**
```javascript
await use_tool("create_downtime", {
  scope: ["host:web-server-01"],
  start: Math.floor(Date.now() / 1000),
  end: Math.floor(Date.now() / 1000) + 3600,
  message: "Planned maintenance window"
});
```

## 📚 **Documentação Adicional**

- [🔍 SCHEMA_DISCOVERY.md](SCHEMA_DISCOVERY.md) - Como o LLM descobre parâmetros
- [📋 REFACTOR_CHECKPOINT.md](REFACTOR_CHECKPOINT.md) - Histórico da refatoração
- [⚙️ TOOLS.md](TOOLS.md) - Documentação completa das tools

## 🤝 **Contribuição**

### **Reportar Bugs**
```bash
# Gerar relatório de debug
mcp-datadog-server validate --json > debug-info.json
mcp-datadog-server list-tools --json >> debug-info.json
```

### **Adicionar Tools Curadas**
1. Edite `src/tools/curated-tools.js`
2. Adicione schema Zod completo
3. Implemente função `execute`
4. Teste com `npm test`

### **Melhorar Tools CRUD**
1. Edite `src/tools/crud-tools.js`
2. Adicione novos recursos ao `DATADOG_RESOURCES`
3. Defina schemas e operações
4. Teste todas as operações CRUD

## 📝 **Changelog**

### **v0.3.0** - Current
- ✅ **351 tools** (9 curadas + 25 CRUD + 319 geradas)
- ✅ **CRUD completo** para recursos principais
- ✅ **Schema autodescoberta** via MCP
- ✅ **Progress tracking** para operações longas
- ✅ **CLI rica** com comandos de debugging
- ✅ **100% conformidade** com padrões MCP

### **v0.2.x** - Previous
- ✅ Refatoração completa da arquitetura
- ✅ Validação robusta com Zod
- ✅ Cliente HTTP com retry automático
- ✅ Sistema de configuração limpo

## 📄 **Licença**

Apache License 2.0 - Veja [LICENSE](LICENSE) para detalhes.

## 🙏 **Agradecimentos**

- [Model Context Protocol](https://github.com/modelcontextprotocol) - Framework base
- [Datadog](https://datadoghq.com) - APIs e documentação
- [Zod](https://zod.dev) - Schema validation
- [Undici](https://undici.nodejs.org) - HTTP client

---

**🎉 Pronto para usar com qualquer LLM compatível com MCP!**

Para suporte e discussões, veja as [Issues](https://github.com/ClaudioLazaro/mcp-datadog-server/issues) do repositório.