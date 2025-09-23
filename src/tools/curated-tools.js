import { z } from 'zod';
import { createToolResponse, createProgressResponse } from './core-tools.js';

const CURATED_TOOLS = {
  
  list_dashboards: {
    description: 'List dashboards with optional filtering by name and tags',
    complexity: 'medium',
    api: 'v1',
    endpoint: '/api/v1/dashboard',
    supportedMethods: ['GET'],
    rateLimit: 'moderate',
    usage: {
      frequency: 'high',
      audience: ['developers', 'sre', 'ops', 'business'],
      examples: [
        'Get all dashboards: {}',
        'Search dashboards: {"name": "performance"}',
        'Filter by tags: {"tags": ["production", "monitoring"]}',
        'Paginated results: {"count": 50, "start": 100}'
      ],
    },
    schema: z.object({
      name: z.string().optional().describe('Filter by dashboard name (substring match)'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      count: z.number().int().min(1).max(1000).default(100).describe('Number of dashboards to return'),
      start: z.number().int().min(0).default(0).describe('Offset for pagination'),
      shared: z.boolean().default(false).describe('Include only shared dashboards'),
    }),
    
    async execute(args, client, config, progressCallback = null) {
      const { name, tags, count = 100, start = 0, shared = false } = args;

      // Show progress for large requests
      const showProgress = count > 50 || Boolean(progressCallback);
      let startTime = Date.now();

      if (showProgress && progressCallback) {
        progressCallback(createProgressResponse({
          step: 0,
          total: 100,
          message: `Fetching ${count} dashboards from Datadog...`,
        }));
      }
      
      try {
        if (showProgress && progressCallback) {
          progressCallback(createProgressResponse({
            step: 25,
            total: 100,
            message: 'Sending request to Datadog API...',
            estimatedTimeRemaining: Math.round((Date.now() - startTime) * 3 / 1000),
          }));
        }

        const response = await client.request({
          method: 'GET',
          rawUrlTemplate: '{{baseUrl}}/api/v1/dashboard',
          query: { 'filter[shared]': String(shared), count, start },
        });

        if (showProgress && progressCallback) {
          progressCallback(createProgressResponse({
            step: 50,
            total: 100,
            message: 'Processing dashboard data...',
            estimatedTimeRemaining: Math.round((Date.now() - startTime) / 1000),
          }));
        }

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

        if (showProgress && progressCallback) {
          progressCallback(createProgressResponse({
            step: 75,
            total: 100,
            message: 'Enriching dashboard URLs...',
            estimatedTimeRemaining: Math.round((Date.now() - startTime) / 3000),
          }));
        }

        const enrichedDashboards = dashboards.map(d => ({
          ...d,
          url: `https://app.${config.site}/dashboard/${d.id}`,
        }));

        if (showProgress && progressCallback) {
          progressCallback(createProgressResponse({
            step: 100,
            total: 100,
            message: 'Dashboard retrieval completed successfully',
          }, enrichedDashboards));
        }
        
        return createToolResponse(enrichedDashboards, null, {
          total: enrichedDashboards.length,
          filtered: name || (tags && tags.length > 0),
        });
        
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },
  
  get_dashboard: {
    description: 'Get a specific dashboard by ID',
    schema: z.object({
      dashboard_id: z.string().describe('Dashboard ID'),
    }),
    
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
    description: 'List monitors with filtering and pagination',
    schema: z.object({
      name: z.string().optional().describe('Filter by monitor name'),
      tags: z.string().optional().describe('Comma-separated tags to filter by'),
      monitor_tags: z.string().optional().describe('Comma-separated monitor tags'),
      group_states: z.string().optional().describe('Comma-separated states (alert,ok,no data,warn)'),
      page: z.number().int().min(0).default(0).describe('Page number'),
      page_size: z.number().int().min(1).max(1000).default(100).describe('Page size'),
      with_downtimes: z.boolean().default(true).describe('Include downtime information'),
    }),
    
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
        
        return createToolResponse(simplified, null, {
          total: simplified.length,
          page: args.page,
          page_size: args.page_size,
        });
        
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },
  
  get_monitor: {
    description: 'Get a specific monitor by ID',
    schema: z.object({
      monitor_id: z.union([z.string(), z.number()]).describe('Monitor ID'),
    }),
    
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
    description: 'Search logs with query and time range',
    schema: z.object({
      query: z.string().optional().describe('Log search query'),
      from: z.string().default('now-15m').describe('Start time (e.g., now-1h, 2023-01-01T00:00:00Z)'),
      to: z.string().default('now').describe('End time'),
      limit: z.number().int().min(1).max(1000).default(25).describe('Number of logs to return'),
      sort: z.enum(['timestamp', '-timestamp']).default('-timestamp').describe('Sort order'),
    }),
    
    async execute(args, client) {
      const { query, from, to, limit, sort } = args;
      
      try {
        const response = await client.request({
          method: 'POST',
          rawUrlTemplate: '{{baseUrl}}/api/v2/logs/events/search',
          body: {
            filter: {
              query: query || '*',
              from,
              to,
            },
            sort: [sort],
            page: { limit },
          },
        });
        
        return createToolResponse(response.data);
      } catch (error) {
        return createToolResponse(null, error);
      }
    },
  },
  
  query_metrics: {
    description: 'Query metrics timeseries data',
    schema: z.object({
      queries: z.array(z.object({
        data_source: z.string().default('metrics'),
        query: z.string().describe('Metric query (e.g., avg:system.cpu.user{*})'),
        name: z.string().optional().describe('Query name'),
      })).describe('Array of metric queries'),
      from: z.number().int().describe('Start timestamp (Unix timestamp in seconds)'),
      to: z.number().int().describe('End timestamp (Unix timestamp in seconds)'),
    }),
    
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
    description: 'List infrastructure hosts',
    schema: z.object({
      filter: z.string().optional().describe('Host filter query'),
      count: z.number().int().min(1).max(1000).default(100).describe('Number of hosts to return'),
      start: z.number().int().min(0).default(0).describe('Starting host for pagination'),
      include_muted_hosts_data: z.boolean().default(false).describe('Include muted hosts'),
    }),
    
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
    description: 'List incidents with optional filtering',
    schema: z.object({
      query: z.string().optional().describe('Search query'),
      pageSize: z.number().int().min(1).max(100).default(25).describe('Page size'),
      pageOffset: z.number().int().min(0).default(0).describe('Page offset'),
    }),
    
    async execute(args, client) {
      const { query, pageSize, pageOffset } = args;
      const queryParams = {};
      
      if (query) queryParams.filter = query;
      if (pageSize) queryParams['page[size]'] = pageSize;
      if (pageOffset) queryParams['page[offset]'] = pageOffset;
      
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
    description: 'List scheduled downtimes',
    schema: z.object({
      current_only: z.boolean().default(false).describe('Show only current downtimes'),
    }),
    
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
