import { z } from 'zod';
import { createToolResponse, createProgressResponse } from './core-tools.js';

// Mapping of Datadog resources to their CRUD operations
const DATADOG_RESOURCES = {
  monitor: {
    name: 'monitor',
    category: 'Monitors',
    baseEndpoint: '/api/v1/monitor',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v1/monitor',
        description: 'Create a new monitor',
        schema: z.object({
          name: z.string().describe('Monitor name'),
          type: z.enum(['metric alert', 'service check', 'event alert', 'query alert', 'composite', 'log alert']).describe('Monitor type'),
          query: z.string().describe('Monitor query'),
          message: z.string().optional().describe('Notification message'),
          tags: z.array(z.string()).optional().describe('Monitor tags'),
          priority: z.number().int().min(1).max(5).optional().describe('Priority (1-5)'),
          options: z.object({
            thresholds: z.object({
              critical: z.number().optional(),
              warning: z.number().optional(),
              ok: z.number().optional(),
            }).optional(),
            notify_audit: z.boolean().optional(),
            require_full_window: z.boolean().optional(),
            new_host_delay: z.number().optional(),
            evaluation_delay: z.number().optional(),
          }).optional().describe('Monitor options'),
        }),
      },
      get: {
        method: 'GET',
        endpoint: '/api/v1/monitor/{monitor_id}',
        description: 'Get a specific monitor',
        schema: z.object({
          monitor_id: z.number().int().describe('Monitor ID'),
          group_states: z.array(z.string()).optional().describe('Specific group states to retrieve'),
        }),
      },
      update: {
        method: 'PUT',
        endpoint: '/api/v1/monitor/{monitor_id}',
        description: 'Update an existing monitor',
        schema: z.object({
          monitor_id: z.number().int().describe('Monitor ID'),
          name: z.string().optional().describe('Monitor name'),
          type: z.enum(['metric alert', 'service check', 'event alert', 'query alert', 'composite', 'log alert']).optional().describe('Monitor type'),
          query: z.string().optional().describe('Monitor query'),
          message: z.string().optional().describe('Notification message'),
          tags: z.array(z.string()).optional().describe('Monitor tags'),
          priority: z.number().int().min(1).max(5).optional().describe('Priority (1-5)'),
          options: z.object({
            thresholds: z.object({
              critical: z.number().optional(),
              warning: z.number().optional(),
              ok: z.number().optional(),
            }).optional(),
            notify_audit: z.boolean().optional(),
            require_full_window: z.boolean().optional(),
            new_host_delay: z.number().optional(),
            evaluation_delay: z.number().optional(),
          }).optional().describe('Monitor options'),
        }),
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v1/monitor/{monitor_id}',
        description: 'Delete a monitor',
        schema: z.object({
          monitor_id: z.number().int().describe('Monitor ID'),
          force: z.boolean().optional().describe('Force delete even if referenced by other resources'),
        }),
      },
      list: {
        method: 'GET',
        endpoint: '/api/v1/monitor',
        description: 'Get all monitors',
        schema: z.object({
          group_states: z.array(z.string()).optional().describe('Filter by group states'),
          name: z.string().optional().describe('Filter by monitor name'),
          tags: z.array(z.string()).optional().describe('Filter by tags'),
          monitor_tags: z.array(z.string()).optional().describe('Filter by monitor tags'),
          with_downtimes: z.boolean().optional().describe('Include downtime info'),
          id_offset: z.number().int().optional().describe('Use for pagination'),
          page_size: z.number().int().min(1).max(1000).optional().describe('Number of monitors to return'),
        }),
      },
    },
  },

  dashboard: {
    name: 'dashboard',
    category: 'Dashboards',
    baseEndpoint: '/api/v1/dashboard',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v1/dashboard',
        description: 'Create a new dashboard',
        schema: z.object({
          title: z.string().describe('Dashboard title'),
          description: z.string().optional().describe('Dashboard description'),
          widgets: z.array(z.any()).describe('Dashboard widgets configuration'),
          layout_type: z.enum(['ordered', 'free']).describe('Dashboard layout type'),
          is_read_only: z.boolean().optional().describe('Read-only status'),
          notify_list: z.array(z.string()).optional().describe('List of notification handles'),
          tags: z.array(z.string()).optional().describe('Dashboard tags'),
        }),
      },
      get: {
        method: 'GET',
        endpoint: '/api/v1/dashboard/{dashboard_id}',
        description: 'Get a specific dashboard',
        schema: z.object({
          dashboard_id: z.string().describe('Dashboard ID'),
        }),
      },
      update: {
        method: 'PUT',
        endpoint: '/api/v1/dashboard/{dashboard_id}',
        description: 'Update an existing dashboard',
        schema: z.object({
          dashboard_id: z.string().describe('Dashboard ID'),
          title: z.string().optional().describe('Dashboard title'),
          description: z.string().optional().describe('Dashboard description'),
          widgets: z.array(z.any()).optional().describe('Dashboard widgets configuration'),
          layout_type: z.enum(['ordered', 'free']).optional().describe('Dashboard layout type'),
          is_read_only: z.boolean().optional().describe('Read-only status'),
          notify_list: z.array(z.string()).optional().describe('List of notification handles'),
          tags: z.array(z.string()).optional().describe('Dashboard tags'),
        }),
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v1/dashboard/{dashboard_id}',
        description: 'Delete a dashboard',
        schema: z.object({
          dashboard_id: z.string().describe('Dashboard ID'),
        }),
      },
      list: {
        method: 'GET',
        endpoint: '/api/v1/dashboard',
        description: 'Get all dashboards',
        schema: z.object({
          filter_shared: z.boolean().optional().describe('Filter by shared status'),
          filter_deleted: z.boolean().optional().describe('Include deleted dashboards'),
          count: z.number().int().min(1).max(1000).optional().describe('Number of dashboards to return'),
          start: z.number().int().min(0).optional().describe('Offset for pagination'),
        }),
      },
    },
  },

  downtime: {
    name: 'downtime',
    category: 'Downtimes',
    baseEndpoint: '/api/v1/downtime',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v1/downtime',
        description: 'Schedule a downtime',
        schema: z.object({
          scope: z.array(z.string()).describe('Scope of the downtime (tags/hosts)'),
          start: z.number().int().optional().describe('Start time (unix timestamp)'),
          end: z.number().int().optional().describe('End time (unix timestamp)'),
          type: z.enum(['host', 'service']).optional().describe('Downtime type'),
          message: z.string().optional().describe('Downtime message'),
          timezone: z.string().optional().describe('Timezone for the downtime'),
          recurrence: z.object({
            type: z.enum(['days', 'weeks', 'months', 'years']).optional(),
            period: z.number().int().optional(),
            week_days: z.array(z.string()).optional(),
            until_date: z.number().int().optional(),
          }).optional().describe('Recurrence configuration'),
        }),
      },
      get: {
        method: 'GET',
        endpoint: '/api/v1/downtime/{downtime_id}',
        description: 'Get a specific downtime',
        schema: z.object({
          downtime_id: z.number().int().describe('Downtime ID'),
        }),
      },
      update: {
        method: 'PUT',
        endpoint: '/api/v1/downtime/{downtime_id}',
        description: 'Update a downtime',
        schema: z.object({
          downtime_id: z.number().int().describe('Downtime ID'),
          scope: z.array(z.string()).optional().describe('Scope of the downtime (tags/hosts)'),
          start: z.number().int().optional().describe('Start time (unix timestamp)'),
          end: z.number().int().optional().describe('End time (unix timestamp)'),
          message: z.string().optional().describe('Downtime message'),
          timezone: z.string().optional().describe('Timezone for the downtime'),
        }),
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v1/downtime/{downtime_id}',
        description: 'Cancel a downtime',
        schema: z.object({
          downtime_id: z.number().int().describe('Downtime ID'),
        }),
      },
      list: {
        method: 'GET',
        endpoint: '/api/v1/downtime',
        description: 'Get all downtimes',
        schema: z.object({
          current_only: z.boolean().optional().describe('Only active downtimes'),
          with_creator: z.boolean().optional().describe('Include creator information'),
        }),
      },
    },
  },

  user: {
    name: 'user',
    category: 'Users',
    baseEndpoint: '/api/v2/users',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v2/users',
        description: 'Create a user',
        schema: z.object({
          email: z.string().email().describe('User email address'),
          name: z.string().describe('User full name'),
          access_role: z.object({
            id: z.string().describe('Role ID'),
          }).optional().describe('User access role'),
        }),
      },
      get: {
        method: 'GET',
        endpoint: '/api/v2/users/{user_id}',
        description: 'Get user details',
        schema: z.object({
          user_id: z.string().describe('User ID'),
        }),
      },
      update: {
        method: 'PATCH',
        endpoint: '/api/v2/users/{user_id}',
        description: 'Update a user',
        schema: z.object({
          user_id: z.string().describe('User ID'),
          name: z.string().optional().describe('User full name'),
          email: z.string().email().optional().describe('User email address'),
          disabled: z.boolean().optional().describe('Disable/enable user'),
        }),
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v2/users/{user_id}',
        description: 'Delete a user',
        schema: z.object({
          user_id: z.string().describe('User ID'),
        }),
      },
      list: {
        method: 'GET',
        endpoint: '/api/v2/users',
        description: 'List all users',
        schema: z.object({
          page_size: z.number().int().min(1).max(1000).optional().describe('Number of users to return'),
          page_number: z.number().int().min(0).optional().describe('Page number for pagination'),
          sort: z.string().optional().describe('Sort order'),
          filter: z.string().optional().describe('Filter query'),
        }),
      },
    },
  },

  team: {
    name: 'team',
    category: 'Teams',
    baseEndpoint: '/api/v2/teams',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v2/teams',
        description: 'Create a team',
        schema: z.object({
          name: z.string().describe('Team name'),
          handle: z.string().describe('Team handle'),
          description: z.string().optional().describe('Team description'),
          visible_modules: z.array(z.string()).optional().describe('Visible modules for the team'),
        }),
      },
      get: {
        method: 'GET',
        endpoint: '/api/v2/teams/{team_id}',
        description: 'Get team details',
        schema: z.object({
          team_id: z.string().describe('Team ID'),
        }),
      },
      update: {
        method: 'PATCH',
        endpoint: '/api/v2/teams/{team_id}',
        description: 'Update a team',
        schema: z.object({
          team_id: z.string().describe('Team ID'),
          name: z.string().optional().describe('Team name'),
          handle: z.string().optional().describe('Team handle'),
          description: z.string().optional().describe('Team description'),
          visible_modules: z.array(z.string()).optional().describe('Visible modules for the team'),
        }),
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v2/teams/{team_id}',
        description: 'Delete a team',
        schema: z.object({
          team_id: z.string().describe('Team ID'),
        }),
      },
      list: {
        method: 'GET',
        endpoint: '/api/v2/teams',
        description: 'List all teams',
        schema: z.object({
          page_size: z.number().int().min(1).max(1000).optional().describe('Number of teams to return'),
          page_number: z.number().int().min(0).optional().describe('Page number for pagination'),
          sort: z.enum(['name', 'created_at', 'user_count']).optional().describe('Sort field'),
          filter_keyword: z.string().optional().describe('Filter by keyword'),
        }),
      },
    },
  },
};

function createCrudTool(resource, operation, operationConfig) {
  const toolName = `${operation}_${resource}`;
  const operationLabel = `${operation.charAt(0).toUpperCase() + operation.slice(1)}`;
  const operationAction = {
    create: 'Creating',
    update: 'Updating',
    delete: 'Deleting',
    list: 'Listing',
    get: 'Getting',
  }[operation] || `${operationLabel}ing`;

  return {
    name: toolName,
    description: operationConfig.description,
    complexity: operation === 'list' ? 'medium' : 'low',
    api: operationConfig.endpoint.includes('/v2/') ? 'v2' : 'v1',
    endpoint: operationConfig.endpoint,
    supportedMethods: [operationConfig.method],
    rateLimit: 'standard',
    usage: {
      frequency: operation === 'list' || operation === 'get' ? 'high' : 'medium',
      audience: ['developers', 'sre', 'ops'],
      examples: [
        `${operation.charAt(0).toUpperCase() + operation.slice(1)} ${resource}: ${JSON.stringify(getExampleArgs(resource, operation), null, 2)}`,
      ],
    },
    schema: operationConfig.schema,

    async execute(args, client, config, progressCallback = null) {
      const showProgress = operation === 'list' || Boolean(progressCallback);
      let startTime = Date.now();

      if (showProgress && progressCallback) {
        progressCallback(createProgressResponse({
          step: 0,
          total: 100,
          message: `${operationAction} ${resource}...`,
        }));
      }

      try {
        const endpoint = operationConfig.endpoint;
        const pathParams = {};
        const pathParamKeys = [...endpoint.matchAll(/{([^}]+)}/g)].map(match => match[1]);
        const remainingArgs = { ...args };

        for (const key of pathParamKeys) {
          if (Object.prototype.hasOwnProperty.call(remainingArgs, key)) {
            pathParams[key] = remainingArgs[key];
            delete remainingArgs[key];
          }
        }

        if (showProgress && progressCallback) {
          progressCallback(createProgressResponse({
            step: 25,
            total: 100,
            message: 'Sending request to Datadog API...',
            estimatedTimeRemaining: Math.round((Date.now() - startTime) * 3 / 1000),
          }));
        }

        // Prepare request
        const requestConfig = {
          method: operationConfig.method,
          rawUrlTemplate: `{{baseUrl}}${endpoint}`,
          pathParams,
        };

        if (operationConfig.method === 'GET') {
          requestConfig.query = remainingArgs;
        } else {
          requestConfig.body = remainingArgs;
        }

        const response = await client.request(requestConfig);

        if (showProgress && progressCallback) {
          progressCallback(createProgressResponse({
            step: 75,
            total: 100,
            message: 'Processing response...',
            estimatedTimeRemaining: Math.round((Date.now() - startTime) / 3000),
          }));
        }

        if (showProgress && progressCallback) {
          progressCallback(createProgressResponse({
            step: 100,
            total: 100,
            message: `${operationLabel} ${resource} completed successfully`,
          }, response.data));
        }

        return createToolResponse(response.data, null, {
          operation,
          resource,
          status: response.status,
          url: response.url,
          method: response.method,
        });

      } catch (error) {
        if (showProgress && progressCallback) {
          progressCallback(createProgressResponse({
            step: 0,
            total: 100,
            message: `${operationLabel} ${resource} failed: ${error.message}`,
          }));
        }

        return createToolResponse(null, error, {
          operation,
          resource,
        });
      }
    },
  };
}

function getExampleArgs(resource, operation) {
  const examples = {
    monitor: {
      create: {
        name: "High CPU Usage",
        type: "metric alert",
        query: "avg(last_5m):avg:system.cpu.user{*} > 0.9",
        message: "CPU usage is high @slack-alerts",
        tags: ["env:prod", "team:backend"]
      },
      get: { monitor_id: 12345 },
      update: { monitor_id: 12345, message: "Updated alert message" },
      delete: { monitor_id: 12345 },
      list: { tags: ["env:prod"] }
    },
    dashboard: {
      create: {
        title: "System Overview",
        layout_type: "ordered",
        widgets: []
      },
      get: { dashboard_id: "abc-123" },
      update: { dashboard_id: "abc-123", title: "Updated Dashboard" },
      delete: { dashboard_id: "abc-123" },
      list: { filter_shared: false }
    },
    downtime: {
      create: {
        scope: ["host:web01"],
        message: "Planned maintenance",
        start: Math.floor(Date.now() / 1000),
        end: Math.floor(Date.now() / 1000) + 3600
      },
      get: { downtime_id: 12345 },
      update: { downtime_id: 12345, message: "Extended maintenance" },
      delete: { downtime_id: 12345 },
      list: { current_only: true }
    },
    user: {
      create: {
        email: "user@company.com",
        name: "John Doe"
      },
      get: { user_id: "user-123" },
      update: { user_id: "user-123", name: "John Smith" },
      delete: { user_id: "user-123" },
      list: { page_size: 10 }
    },
    team: {
      create: {
        name: "Backend Team",
        handle: "backend-team",
        description: "Backend development team"
      },
      get: { team_id: "team-123" },
      update: { team_id: "team-123", description: "Updated description" },
      delete: { team_id: "team-123" },
      list: { page_size: 10 }
    }
  };

  return examples[resource]?.[operation] || {};
}

// Generate all CRUD tools
const CRUD_TOOLS = {};

Object.entries(DATADOG_RESOURCES).forEach(([resourceName, resourceConfig]) => {
  Object.entries(resourceConfig.operations).forEach(([operation, operationConfig]) => {
    const tool = createCrudTool(resourceName, operation, operationConfig);
    CRUD_TOOLS[tool.name] = tool;
  });
});

export { CRUD_TOOLS, DATADOG_RESOURCES };
