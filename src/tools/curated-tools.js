import { z } from 'zod';
import { createToolResponse } from './core-tools.js';

/** Shorten a string for digest output, marking that it was cut. */
function truncate(value, maxLength) {
  if (typeof value !== 'string') return value;
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

/**
 * Frequency map, highest first, capped so one noisy dimension cannot
 * reintroduce the payload bloat the digest exists to avoid.
 */
function countBy(items, selector, topN = 15) {
  const counts = new Map();

  for (const item of items) {
    const key = selector(item) ?? '(none)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = [...counts].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const result = Object.fromEntries(top);

  if (sorted.length > topN) {
    result['(other)'] = sorted.slice(topN).reduce((sum, [, count]) => sum + count, 0);
  }

  return result;
}

/**
 * Curated tools: hand-crafted, optimized tools for the most common Datadog operations.
 *
 * Each tool exports:
 *   - description: string
 *   - schema: ZodRawShape (NOT z.object — raw shape for MCP SDK)
 *   - annotations: MCP ToolAnnotations
 *   - execute(args, client, config): Promise<CallToolResult>
 */
const CURATED_TOOLS = {

  list_dashboards: {
    description: 'List Datadog dashboards with optional filtering by name and tags. Returns dashboard IDs, titles, and direct URLs.',
    schema: {
      name: z.string().optional().describe('Filter by dashboard name (substring match)'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      count: z.number().int().min(1).max(1000).default(100).describe('Number of dashboards to return'),
      start: z.number().int().min(0).default(0).describe('Offset for pagination'),
      shared: z.boolean().default(false).describe('Include only shared dashboards'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },

    async execute(args, client, config) {
      const { name, tags, count = 100, start = 0, shared = false } = args;

      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/dashboard',
          query: { 'filter[shared]': String(shared), count, start },
        });

        let dashboards = Array.isArray(response.data?.dashboards)
          ? response.data.dashboards
          : [];

        if (name) {
          const searchTerm = name.toLowerCase();
          dashboards = dashboards.filter(d =>
            d.title?.toLowerCase().includes(searchTerm)
          );
        }

        if (tags && tags.length > 0) {
          dashboards = dashboards.filter(d => {
            const dashboardTags = (d.description || '')
              .split(',')
              .map(tag => tag.trim())
              .filter(Boolean);
            return tags.every(tag => dashboardTags.includes(tag));
          });
        }

        const enrichedDashboards = dashboards.map(d => ({
          ...d,
          url: `https://app.${config.site}/dashboard/${d.id}`,
        }));

        return createToolResponse(enrichedDashboards);
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },

  get_dashboard: {
    description: 'Get a specific Datadog dashboard by ID, including all widgets and configuration.',
    schema: {
      dashboard_id: z.string().describe('Dashboard ID'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },

    async execute(args, client) {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/dashboard/:dashboard_id',
          pathParams: { dashboard_id: args.dashboard_id },
        });

        return createToolResponse(response.data);
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },

  list_monitors: {
    description: 'List Datadog monitors with filtering by name, tags, and state. Returns simplified monitor info.',
    schema: {
      name: z.string().optional().describe('Filter by monitor name'),
      tags: z.string().optional().describe('Comma-separated tags to filter by'),
      monitor_tags: z.string().optional().describe('Comma-separated monitor tags'),
      group_states: z.string().optional().describe('Comma-separated states (alert,ok,no data,warn)'),
      page: z.number().int().min(0).default(0).describe('Page number'),
      page_size: z.number().int().min(1).max(1000).default(100).describe('Page size'),
      with_downtimes: z.boolean().default(true).describe('Include downtime information'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },

    async execute(args, client) {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/monitor',
          query: args,
        });

        const monitors = Array.isArray(response.data) ? response.data : [];
        const simplified = monitors.map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          overall_state: m.overall_state,
          tags: m.tags,
          created: m.created,
          modified: m.modified,
        }));

        return createToolResponse(simplified);
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },

  get_monitor: {
    description: 'Get a specific Datadog monitor by ID, including full configuration and state.',
    schema: {
      monitor_id: z.union([z.string(), z.number()]).describe('Monitor ID'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },

    async execute(args, client) {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/monitor/:monitor_id',
          pathParams: { monitor_id: args.monitor_id },
        });

        return createToolResponse(response.data);
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },

  search_logs: {
    description: 'Search Datadog logs with a query and time range. Returns a compact digest: '
      + 'counts by status, service and message, plus one flat line per log. '
      + 'Set include_attributes for the full raw payload (much larger).',
    schema: {
      query: z.string().optional().describe('Log search query (Datadog log query syntax)'),
      from: z.string().default('now-15m').describe('Start time (e.g., now-1h, 2023-01-01T00:00:00Z)'),
      to: z.string().default('now').describe('End time'),
      limit: z.number().int().min(1).max(1000).default(25).describe('Number of logs to return'),
      sort: z.enum(['timestamp', '-timestamp']).default('-timestamp').describe('Sort order'),
      cursor: z.string().optional().describe('Pagination cursor from a previous next_cursor'),
      include_attributes: z.boolean().default(false)
        .describe('Include full nested attributes and tags per log. Verbose; only when you need a specific field.'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },

    async execute(args, client) {
      const { query, from, to, limit, sort, cursor, include_attributes } = args;

      try {
        const page = { limit };
        if (cursor) page.cursor = cursor;

        const response = await client.request({
          method: 'POST',
          rawUrlTemplate: '{{baseUrl}}/api/v2/logs/events/search',
          body: {
            filter: {
              query: query || '*',
              from,
              to,
            },
            sort,
            page,
          },
        });

        if (include_attributes) {
          return createToolResponse(response.data);
        }

        const events = Array.isArray(response.data?.data) ? response.data.data : [];

        // A raw 50-event page is ~85KB, which forces the caller to dump it to
        // disk and post-process it. Return the aggregates it would compute
        // anyway, plus one flat line per event.
        const logs = events.map(event => {
          const attributes = event.attributes ?? {};
          return {
            timestamp: attributes.timestamp,
            status: attributes.status,
            service: attributes.service,
            host: attributes.host,
            message: truncate(attributes.message, 300),
          };
        });

        return createToolResponse({
          summary: {
            returned: logs.length,
            by_status: countBy(logs, log => log.status),
            by_service: countBy(logs, log => log.service),
            by_message: countBy(logs, log => log.message),
          },
          logs,
          next_cursor: response.data?.meta?.page?.after,
          hint: 'Counts are over the returned page only. Use include_attributes for full fields, '
            + 'or next_cursor to page further.',
        });
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },

  query_metrics: {
    description: 'Query Datadog metrics timeseries data. Supports multiple queries with custom time ranges.',
    schema: {
      queries: z.array(z.object({
        data_source: z.string().default('metrics'),
        query: z.string().describe('Metric query (e.g., avg:system.cpu.user{*})'),
        name: z.string().optional().describe('Query name'),
      })).describe('Array of metric queries'),
      from: z.number().int().describe('Start timestamp (Unix timestamp in seconds)'),
      to: z.number().int().describe('End timestamp (Unix timestamp in seconds)'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },

    async execute(args, client) {
      try {
        const response = await client.request({
          method: 'POST',
          rawUrlTemplate: '{{baseUrl}}/api/v2/query/timeseries',
          body: {
            data: {
              type: 'timeseries_request',
              attributes: {
                queries: args.queries,
                from: args.from,
                to: args.to,
              },
            },
          },
        });

        return createToolResponse(response.data);
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },

  list_hosts: {
    description: 'List Datadog infrastructure hosts with optional filtering.',
    schema: {
      filter: z.string().optional().describe('Host filter query'),
      count: z.number().int().min(1).max(1000).default(100).describe('Number of hosts to return'),
      start: z.number().int().min(0).default(0).describe('Starting host for pagination'),
      include_muted_hosts_data: z.boolean().default(false).describe('Include muted hosts data'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },

    async execute(args, client) {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/hosts',
          query: args,
        });

        return createToolResponse(response.data);
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },

  list_incidents: {
    description: 'List Datadog incidents with optional search filtering and pagination.',
    schema: {
      query: z.string().optional().describe('Search query'),
      page_size: z.number().int().min(1).max(100).default(25).describe('Page size'),
      page_offset: z.number().int().min(0).default(0).describe('Page offset'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },

    async execute(args, client) {
      const { query, page_size, page_offset } = args;
      const queryParams = {};

      if (query) queryParams.filter = query;
      if (page_size) queryParams['page[size]'] = page_size;
      if (page_offset) queryParams['page[offset]'] = page_offset;

      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v2/incidents',
          query: queryParams,
        });

        return createToolResponse(response.data);
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },

  list_downtimes: {
    description: 'List Datadog scheduled downtimes, optionally showing only currently active ones.',
    schema: {
      current_only: z.boolean().default(false).describe('Show only current downtimes'),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },

    async execute(args, client) {
      try {
        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/downtime',
          query: args,
        });

        return createToolResponse(response.data);
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },
};

export { CURATED_TOOLS };
