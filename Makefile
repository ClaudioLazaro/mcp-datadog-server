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
	@$(DOTENV); \
	ARGS="list-tools"; \
	if [ -n "$$FOLDERS" ]; then ARGS="$$ARGS --folders=$$FOLDERS"; fi; \
	node src/index.js $$ARGS

document-tools:
	@# Generate detailed tool documentation in TOOLS.md
	@$(DOTENV); \
	ARGS="document-tools"; \
	if [ -n "$$FOLDERS" ]; then ARGS="$$ARGS --folders=$$FOLDERS"; fi; \
	if [ -n "$$OUTPUT" ]; then ARGS="$$ARGS --output=$$OUTPUT"; fi; \
	node src/index.js $$ARGS


.PHONY: test
test:
	@$(DOTENV); npm test

smoke:
	@# Run a live smoke test against the Datadog API (requires valid keys)
	@$(DOTENV); node src/index.js smoke-test
