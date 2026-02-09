import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { log } from '../core/logger.js';

/**
 * MCP Resources for Datadog.
 *
 * Resources allow MCP clients to browse and read Datadog data
 * as structured content, using URI-based addressing.
 *
 * Static resources:
 *   datadog://dashboards    - List of dashboards
 *   datadog://monitors      - List of monitors
 *   datadog://hosts         - List of infrastructure hosts
 *   datadog://downtimes     - List of scheduled downtimes
 *
 * Template resources (dynamic):
 *   datadog://dashboard/{dashboard_id}  - Specific dashboard
 *   datadog://monitor/{monitor_id}      - Specific monitor
 */

export function registerResources(server, client, config) {
  // --- Static Resources ---

  server.resource(
    'dashboards',
    'datadog://dashboards',
    {
      description: 'List of all Datadog dashboards',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/dashboard',
          query: { count: 100, start: 0 },
        });

        const dashboards = (response.data?.dashboards || []).map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          url: `https://app.${config.site}/dashboard/${d.id}`,
          created_at: d.created_at,
          modified_at: d.modified_at,
          author_handle: d.author_handle,
        }));

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(dashboards, null, 2),
          }],
        };
      } catch (error) {
        log(`Failed to read dashboards resource: ${error.message}`, 'error');
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }),
          }],
        };
      }
    }
  );

  server.resource(
    'monitors',
    'datadog://monitors',
    {
      description: 'List of all Datadog monitors',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/monitor',
          query: { page_size: 100 },
        });

        const monitors = (Array.isArray(response.data) ? response.data : []).map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          overall_state: m.overall_state,
          tags: m.tags,
          created: m.created,
          modified: m.modified,
        }));

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(monitors, null, 2),
          }],
        };
      } catch (error) {
        log(`Failed to read monitors resource: ${error.message}`, 'error');
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }),
          }],
        };
      }
    }
  );

  server.resource(
    'hosts',
    'datadog://hosts',
    {
      description: 'List of Datadog infrastructure hosts',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/hosts',
          query: { count: 100 },
        });

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(response.data, null, 2),
          }],
        };
      } catch (error) {
        log(`Failed to read hosts resource: ${error.message}`, 'error');
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }),
          }],
        };
      }
    }
  );

  server.resource(
    'downtimes',
    'datadog://downtimes',
    {
      description: 'List of Datadog scheduled downtimes',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/downtime',
        });

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(response.data, null, 2),
          }],
        };
      } catch (error) {
        log(`Failed to read downtimes resource: ${error.message}`, 'error');
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }),
          }],
        };
      }
    }
  );

  // --- Template Resources (dynamic, parameterized) ---

  server.resource(
    'dashboard',
    new ResourceTemplate('datadog://dashboard/{dashboard_id}', { list: undefined }),
    {
      description: 'Get a specific Datadog dashboard by ID',
      mimeType: 'application/json',
    },
    async (uri, params) => {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/dashboard/:dashboard_id',
          pathParams: { dashboard_id: params.dashboard_id },
        });

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(response.data, null, 2),
          }],
        };
      } catch (error) {
        log(`Failed to read dashboard ${params.dashboard_id}: ${error.message}`, 'error');
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }),
          }],
        };
      }
    }
  );

  server.resource(
    'monitor',
    new ResourceTemplate('datadog://monitor/{monitor_id}', { list: undefined }),
    {
      description: 'Get a specific Datadog monitor by ID',
      mimeType: 'application/json',
    },
    async (uri, params) => {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/monitor/:monitor_id',
          pathParams: { monitor_id: params.monitor_id },
        });

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(response.data, null, 2),
          }],
        };
      } catch (error) {
        log(`Failed to read monitor ${params.monitor_id}: ${error.message}`, 'error');
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }),
          }],
        };
      }
    }
  );

  log('Registered 6 MCP resources (4 static + 2 templates)');
}
