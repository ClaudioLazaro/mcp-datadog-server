SHELL := bash

.PHONY: help install start list-tools test smoke

help:
	@echo "Targets: install, start, list-tools, test, smoke"

# Export variables from .env if present (single-line, no trailing semicolon)
DOTENV := set -a; [ -f .env ] && . ./.env; set +a

install:
	npm install

start:
	@# Exemplo: make start DD_API_KEY=xxx DD_APP_KEY=yyy MCP_DD_FOLDERS="Logs,Monitors"
	@$(DOTENV); node src/index.js

list-tools:
	@# Lista tools geradas. Use FOLDERS=Logs,Monitors para filtrar.
	@$(DOTENV); [ -z "$$FOLDERS" ] && export FOLDERS="Logs,Monitors,Metrics" || true; \
	node -e "import('./src/schema.js').then(m=>{const c=m.loadPostmanCollection('./datadog-api-collection-schema.json'); const idx=m.buildToolsFromPostman(c,{allowedFolders:process.env.FOLDERS}); console.log('Total tools:', idx.tools.length); console.log(idx.tools.map(t=>t.name).join('\\n'));}).catch(e=>{console.error(e);process.exit(1);});"

.PHONY: test
test:
	@$(DOTENV); npm test

smoke:
	@# Executa um teste funcional real contra a API Datadog (requer chaves válidas)
	@$(DOTENV); node scripts/live-smoke.js
