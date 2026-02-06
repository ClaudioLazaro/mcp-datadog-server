import { z } from 'zod';
import { createToolResponse } from './core-tools.js';
import { log } from '../core/logger.js';

/**
 * CRUD tools: auto-generated Create/Read/Update/Delete/List operations
 * for core Datadog resources.
 *
 * Each tool exports:
 *   - description: string
 *   - schema: ZodRawShape (raw shape for MCP SDK)
 *   - annotations: MCP ToolAnnotations
 *   - execute(args, client): Promise<CallToolResult>
 */

const DATADOG_RESOURCES = {
  monitor: {
    name: 'monitor',
    category: 'Monitors',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v1/monitor',
        description: 'Create a new Datadog monitor for alerting on metrics, services, events, or logs.',
        schema: {
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
        },
        annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
      },
      get: {
        method: 'GET',
        endpoint: '/api/v1/monitor/{monitor_id}',
        description: 'Get a specific Datadog monitor by ID with full details.',
        schema: {
          monitor_id: z.number().int().describe('Monitor ID'),
          group_states: z.array(z.string()).optional().describe('Specific group states to retrieve'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
      update: {
        method: 'PUT',
        endpoint: '/api/v1/monitor/{monitor_id}',
        description: 'Update an existing Datadog monitor configuration.',
        schema: {
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
        },
        annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v1/monitor/{monitor_id}',
        description: 'Delete a Datadog monitor permanently.',
        schema: {
          monitor_id: z.number().int().describe('Monitor ID'),
          force: z.boolean().optional().describe('Force delete even if referenced by other resources'),
        },
        annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
      },
      list: {
        method: 'GET',
        endpoint: '/api/v1/monitor',
        description: 'List all Datadog monitors with optional filtering by name, tags, and state.',
        schema: {
          group_states: z.array(z.string()).optional().describe('Filter by group states'),
          name: z.string().optional().describe('Filter by monitor name'),
          tags: z.array(z.string()).optional().describe('Filter by tags'),
          monitor_tags: z.array(z.string()).optional().describe('Filter by monitor tags'),
          with_downtimes: z.boolean().optional().describe('Include downtime info'),
          id_offset: z.number().int().optional().describe('Use for pagination'),
          page_size: z.number().int().min(1).max(1000).optional().describe('Number of monitors to return'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
    },
  },

  dashboard: {
    name: 'dashboard',
    category: 'Dashboards',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v1/dashboard',
        description: 'Create a new Datadog dashboard with widgets and layout configuration.',
        schema: {
          title: z.string().describe('Dashboard title'),
          description: z.string().optional().describe('Dashboard description'),
          widgets: z.array(z.any()).describe('Dashboard widgets configuration'),
          layout_type: z.enum(['ordered', 'free']).describe('Dashboard layout type'),
          is_read_only: z.boolean().optional().describe('Read-only status'),
          notify_list: z.array(z.string()).optional().describe('List of notification handles'),
          tags: z.array(z.string()).optional().describe('Dashboard tags'),
        },
        annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
      },
      get: {
        method: 'GET',
        endpoint: '/api/v1/dashboard/{dashboard_id}',
        description: 'Get a specific Datadog dashboard by ID.',
        schema: {
          dashboard_id: z.string().describe('Dashboard ID'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
      update: {
        method: 'PUT',
        endpoint: '/api/v1/dashboard/{dashboard_id}',
        description: 'Update an existing Datadog dashboard.',
        schema: {
          dashboard_id: z.string().describe('Dashboard ID'),
          title: z.string().optional().describe('Dashboard title'),
          description: z.string().optional().describe('Dashboard description'),
          widgets: z.array(z.any()).optional().describe('Dashboard widgets configuration'),
          layout_type: z.enum(['ordered', 'free']).optional().describe('Dashboard layout type'),
          is_read_only: z.boolean().optional().describe('Read-only status'),
          notify_list: z.array(z.string()).optional().describe('List of notification handles'),
          tags: z.array(z.string()).optional().describe('Dashboard tags'),
        },
        annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v1/dashboard/{dashboard_id}',
        description: 'Delete a Datadog dashboard permanently.',
        schema: {
          dashboard_id: z.string().describe('Dashboard ID'),
        },
        annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
      },
      list: {
        method: 'GET',
        endpoint: '/api/v1/dashboard',
        description: 'List all Datadog dashboards with optional filtering.',
        schema: {
          filter_shared: z.boolean().optional().describe('Filter by shared status'),
          filter_deleted: z.boolean().optional().describe('Include deleted dashboards'),
          count: z.number().int().min(1).max(1000).optional().describe('Number of dashboards to return'),
          start: z.number().int().min(0).optional().describe('Offset for pagination'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
    },
  },

  downtime: {
    name: 'downtime',
    category: 'Downtimes',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v1/downtime',
        description: 'Schedule a Datadog downtime to suppress alerts for specific scopes.',
        schema: {
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
        },
        annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
      },
      get: {
        method: 'GET',
        endpoint: '/api/v1/downtime/{downtime_id}',
        description: 'Get a specific Datadog downtime by ID.',
        schema: {
          downtime_id: z.number().int().describe('Downtime ID'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
      update: {
        method: 'PUT',
        endpoint: '/api/v1/downtime/{downtime_id}',
        description: 'Update an existing Datadog downtime.',
        schema: {
          downtime_id: z.number().int().describe('Downtime ID'),
          scope: z.array(z.string()).optional().describe('Scope of the downtime (tags/hosts)'),
          start: z.number().int().optional().describe('Start time (unix timestamp)'),
          end: z.number().int().optional().describe('End time (unix timestamp)'),
          message: z.string().optional().describe('Downtime message'),
          timezone: z.string().optional().describe('Timezone for the downtime'),
        },
        annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v1/downtime/{downtime_id}',
        description: 'Cancel a Datadog downtime.',
        schema: {
          downtime_id: z.number().int().describe('Downtime ID'),
        },
        annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
      },
      list: {
        method: 'GET',
        endpoint: '/api/v1/downtime',
        description: 'List all Datadog downtimes, optionally filtering to active-only.',
        schema: {
          current_only: z.boolean().optional().describe('Only active downtimes'),
          with_creator: z.boolean().optional().describe('Include creator information'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
    },
  },

  user: {
    name: 'user',
    category: 'Users',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v2/users',
        description: 'Create a new Datadog user with email and role.',
        schema: {
          email: z.string().email().describe('User email address'),
          name: z.string().describe('User full name'),
          access_role: z.object({
            id: z.string().describe('Role ID'),
          }).optional().describe('User access role'),
        },
        annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
      },
      get: {
        method: 'GET',
        endpoint: '/api/v2/users/{user_id}',
        description: 'Get Datadog user details by ID.',
        schema: {
          user_id: z.string().describe('User ID'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
      update: {
        method: 'PATCH',
        endpoint: '/api/v2/users/{user_id}',
        description: 'Update a Datadog user profile.',
        schema: {
          user_id: z.string().describe('User ID'),
          name: z.string().optional().describe('User full name'),
          email: z.string().email().optional().describe('User email address'),
          disabled: z.boolean().optional().describe('Disable/enable user'),
        },
        annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v2/users/{user_id}',
        description: 'Delete a Datadog user.',
        schema: {
          user_id: z.string().describe('User ID'),
        },
        annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
      },
      list: {
        method: 'GET',
        endpoint: '/api/v2/users',
        description: 'List all Datadog users with pagination and filtering.',
        schema: {
          page_size: z.number().int().min(1).max(1000).optional().describe('Number of users to return'),
          page_number: z.number().int().min(0).optional().describe('Page number for pagination'),
          sort: z.string().optional().describe('Sort order'),
          filter: z.string().optional().describe('Filter query'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
    },
  },

  team: {
    name: 'team',
    category: 'Teams',
    operations: {
      create: {
        method: 'POST',
        endpoint: '/api/v2/teams',
        description: 'Create a new Datadog team.',
        schema: {
          name: z.string().describe('Team name'),
          handle: z.string().describe('Team handle'),
          description: z.string().optional().describe('Team description'),
          visible_modules: z.array(z.string()).optional().describe('Visible modules for the team'),
        },
        annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
      },
      get: {
        method: 'GET',
        endpoint: '/api/v2/teams/{team_id}',
        description: 'Get Datadog team details by ID.',
        schema: {
          team_id: z.string().describe('Team ID'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
      update: {
        method: 'PATCH',
        endpoint: '/api/v2/teams/{team_id}',
        description: 'Update a Datadog team.',
        schema: {
          team_id: z.string().describe('Team ID'),
          name: z.string().optional().describe('Team name'),
          handle: z.string().optional().describe('Team handle'),
          description: z.string().optional().describe('Team description'),
          visible_modules: z.array(z.string()).optional().describe('Visible modules for the team'),
        },
        annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
      },
      delete: {
        method: 'DELETE',
        endpoint: '/api/v2/teams/{team_id}',
        description: 'Delete a Datadog team.',
        schema: {
          team_id: z.string().describe('Team ID'),
        },
        annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
      },
      list: {
        method: 'GET',
        endpoint: '/api/v2/teams',
        description: 'List all Datadog teams with pagination and filtering.',
        schema: {
          page_size: z.number().int().min(1).max(1000).optional().describe('Number of teams to return'),
          page_number: z.number().int().min(0).optional().describe('Page number for pagination'),
          sort: z.enum(['name', 'created_at', 'user_count']).optional().describe('Sort field'),
          filter_keyword: z.string().optional().describe('Filter by keyword'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
      },
    },
  },
};

/**
 * Build a single CRUD tool from a resource + operation definition.
 */
function createCrudTool(resource, operation, operationConfig) {
  const toolName = `${operation}_${resource}`;

  return {
    name: toolName,
    description: operationConfig.description,
    schema: operationConfig.schema,
    annotations: operationConfig.annotations,
    method: operationConfig.method,
    endpoint: operationConfig.endpoint,

    async execute(args, client) {
      try {
        const endpoint = operationConfig.endpoint;
        const pathParams = {};
        const pathParamKeys = [...endpoint.matchAll(/{([^}]+)}/g)].map(m => m[1]);
        const remainingArgs = { ...args };

        for (const key of pathParamKeys) {
          if (Object.prototype.hasOwnProperty.call(remainingArgs, key)) {
            pathParams[key] = remainingArgs[key];
            delete remainingArgs[key];
          }
        }

        const requestConfig = {
          method: operationConfig.method,
          rawUrlTemplate: `{{baseUrl}}${endpoint}`,
          pathParams,
        };

        if (operationConfig.method === 'GET' || operationConfig.method === 'DELETE') {
          requestConfig.query = remainingArgs;
        } else {
          requestConfig.body = remainingArgs;
        }

        const response = await client.request(requestConfig);
        return createToolResponse(response.data);
      } catch (error) {
        log(`Error in CRUD tool ${toolName}: ${error.message}`, 'error');
        return createToolResponse(null, error);
      }
    },
  };
}

// Generate all CRUD tools from resource definitions
const CRUD_TOOLS = {};

for (const [resourceName, resourceConfig] of Object.entries(DATADOG_RESOURCES)) {
  for (const [operation, operationConfig] of Object.entries(resourceConfig.operations)) {
    const tool = createCrudTool(resourceName, operation, operationConfig);
    CRUD_TOOLS[tool.name] = tool;
  }
}

export { CRUD_TOOLS, DATADOG_RESOURCES };
