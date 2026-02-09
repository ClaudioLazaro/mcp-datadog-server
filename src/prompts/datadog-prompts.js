import { z } from 'zod';
import { log } from '../core/logger.js';

/**
 * MCP Prompts for Datadog workflows.
 *
 * Prompts provide pre-built conversation templates that guide
 * LLMs through common Datadog operations and investigations.
 */

export function registerPrompts(server) {

  // --- Investigate Monitor ---
  server.prompt(
    'investigate-monitor',
    'Investigate a Datadog monitor that is alerting or has issues. Provides a structured investigation workflow.',
    {
      monitor_id: z.string().describe('The monitor ID to investigate'),
    },
    async ({ monitor_id }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Investigate Datadog monitor ${monitor_id}. Follow this workflow:`,
              '',
              '1. First, use the get_monitor tool with this monitor_id to retrieve the monitor details.',
              '2. Check the monitor state (OK, Alert, Warn, No Data).',
              '3. Review the monitor query and thresholds.',
              '4. If the monitor is alerting:',
              '   - Use search_logs to look for related errors in the last hour.',
              '   - Use query_metrics to check the underlying metric trend.',
              '   - Check if there are any related downtimes with list_downtimes.',
              '5. Summarize findings with:',
              '   - Current state and when it changed',
              '   - Likely root cause',
              '   - Recommended actions',
            ].join('\n'),
          },
        },
      ],
    })
  );

  // --- Create Dashboard ---
  server.prompt(
    'create-dashboard',
    'Guided workflow for creating a new Datadog dashboard with best practices.',
    {
      purpose: z.string().describe('What this dashboard is for (e.g., "API performance monitoring")'),
      service: z.string().optional().describe('Service name to focus on'),
    },
    async ({ purpose, service }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Help me create a Datadog dashboard for: ${purpose}`,
              service ? `Focused on service: ${service}` : '',
              '',
              'Follow this workflow:',
              '1. First, list existing dashboards with list_dashboards to avoid duplicates.',
              '2. Suggest a dashboard structure with appropriate widgets:',
              '   - Summary/overview widgets at the top',
              '   - Key metrics timeseries in the middle',
              '   - Detailed breakdown widgets at the bottom',
              '3. For each widget, suggest appropriate:',
              '   - Widget type (timeseries, query_value, toplist, heatmap, etc.)',
              '   - Metric queries with proper aggregation',
              '   - Meaningful titles and display options',
              '4. Create the dashboard using create_dashboard with layout_type "ordered".',
              '5. Share the dashboard URL.',
            ].join('\n'),
          },
        },
      ],
    })
  );

  // --- Analyze Logs ---
  server.prompt(
    'analyze-logs',
    'Guided log analysis workflow for investigating issues in Datadog logs.',
    {
      query: z.string().describe('Initial search query or error description'),
      timeframe: z.string().optional().describe('Time range (e.g., "1h", "24h", "7d"). Default: 1h'),
    },
    async ({ query, timeframe }) => {
      const tf = timeframe || '1h';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                `Analyze Datadog logs for: ${query}`,
                '',
                `Time range: last ${tf}`,
                '',
                'Follow this workflow:',
                `1. Use search_logs with query "${query}" and from "now-${tf}" to find matching logs.`,
                '2. Analyze the results:',
                '   - Count error frequency and patterns',
                '   - Identify common error messages',
                '   - Note affected services/hosts',
                '3. If errors are found, drill deeper:',
                '   - Refine the search query with specific error patterns',
                '   - Check for correlated events around the same timeframe',
                '   - Use query_metrics to check if related metrics spiked',
                '4. Provide a summary with:',
                '   - Total log count and error rate',
                '   - Top error patterns',
                '   - Affected components',
                '   - Recommended next steps',
              ].join('\n'),
            },
          },
        ],
      };
    }
  );

  // --- Incident Response ---
  server.prompt(
    'incident-response',
    'Structured incident response workflow using Datadog data for diagnosis and triage.',
    {
      description: z.string().describe('Brief description of the incident'),
      severity: z.enum(['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4']).optional().describe('Incident severity level'),
    },
    async ({ description, severity }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Incident Response: ${description}`,
              severity ? `Severity: ${severity}` : '',
              '',
              'Follow this incident response workflow:',
              '',
              '## 1. Assess Current State',
              '- Use list_monitors with group_states "alert,warn" to find all alerting monitors.',
              '- Use list_incidents to check for existing incidents.',
              '- Use list_hosts to verify infrastructure health.',
              '',
              '## 2. Gather Evidence',
              `- Use search_logs with query related to "${description}" in the last hour.`,
              '- Use query_metrics to check key infrastructure metrics (CPU, memory, network, errors).',
              '- Check for any recent downtimes with list_downtimes.',
              '',
              '## 3. Determine Impact',
              '- List affected services, hosts, and users.',
              '- Quantify error rates and latency increases.',
              '- Identify the blast radius.',
              '',
              '## 4. Recommend Actions',
              '- Immediate mitigation steps.',
              '- Communication plan.',
              '- Follow-up investigation items.',
              '',
              '## 5. Document',
              '- Timeline of events.',
              '- Root cause hypothesis.',
              '- Actions taken.',
            ].join('\n'),
          },
        },
      ],
    })
  );

  // --- Service Health Check ---
  server.prompt(
    'service-health-check',
    'Comprehensive health check for a specific service using Datadog monitoring data.',
    {
      service_name: z.string().describe('Name of the service to check'),
    },
    async ({ service_name }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Perform a comprehensive health check for service: ${service_name}`,
              '',
              'Check the following areas:',
              '',
              '## 1. Monitors',
              `- Use list_monitors with name "${service_name}" to find all related monitors.`,
              '- Report any monitors in alert or warn state.',
              '',
              '## 2. Logs',
              `- Use search_logs with query "service:${service_name} status:error" from the last hour.`,
              '- Report error count and top error messages.',
              '',
              '## 3. Metrics',
              '- Use query_metrics to check key service metrics:',
              `  - Request rate: avg:trace.http.request.hits{service:${service_name}}`,
              `  - Error rate: avg:trace.http.request.errors{service:${service_name}}`,
              `  - Latency: avg:trace.http.request.duration{service:${service_name}}`,
              '',
              '## 4. Infrastructure',
              `- Use list_hosts with filter "${service_name}" to check host health.`,
              '',
              '## 5. Summary',
              '- Overall health: Healthy / Degraded / Critical',
              '- Key issues found',
              '- Recommended actions',
            ].join('\n'),
          },
        },
      ],
    })
  );

  log('Registered 5 MCP prompts');
}
