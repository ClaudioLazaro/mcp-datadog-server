SHELL := bash

.PHONY: help install start list-tools document-tools test smoke

help:
	@echo "Targets: install, start, list-tools, document-tools, test, smoke"

# Export variables from .env if present
DOTENV := set -a; [ -f .env ] && . ./.env; set +a

install:
	npm install

start:
	@# Example: make start DD_API_KEY=xxx DD_APP_KEY=yyy MCP_DD_FOLDERS="Logs,Monitors"
	@$(DOTENV); node src/index.js

list-tools:
	@# List generated tools. Use FOLDERS=Logs,Monitors to filter.
	@$(DOTENV); [ -z "$$FOLDERS" ] && export FOLDERS="Logs,Monitors,Metrics" || true; \
	node -e "import('./src/schema.js').then(m=>{const c=m.loadPostmanCollection('./datadog-api-collection-schema.json'); const idx=m.buildToolsFromPostman(c,{allowedFolders:process.env.FOLDERS}); console.log('Total tools:', idx.tools.length); console.log(idx.tools.map(t=>t.name).join('\n'));}).catch(e=>{console.error(e);process.exit(1);});"

document-tools:
	@# Generate detailed tool documentation in TOOLS.md
	@$(DOTENV); node -e "import fs from 'fs'; import('./src/schema.js').then(m=>{const c=m.loadPostmanCollection(); const idx=m.buildToolsFromPostman(c); const docs = idx.tools.map(t => `### ${t.name}

${t.description}

**Input Schema:**
```json
${JSON.stringify(t.input_schema, null, 2)}
```
`).join('\n'); fs.writeFileSync('TOOLS.md', docs); console.log('Generated TOOLS.md');}).catch(e=>{console.error(e);process.exit(1);});"


.PHONY: test
test:
	@$(DOTENV); npm test

smoke:
	@# Run a live smoke test against the Datadog API (requires valid keys)
	@$(DOTENV); node scripts/live-smoke.js