import { z } from "zod";
import { datadogRequest } from "./http.js";

export function registerCustomTools(server) {
  // Dashboards: list with optional client-side filters
  const ListDashboardsSchema = z.object({
    name: z
      .string()
      .optional()
      .describe("Filter dashboards by name (substring match)"),
    tags: z
      .array(z.string())
      .optional()
      .describe(
        "Filter dashboards by tags (client-side, checks description CSV)"
      ),
    count: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .default(100)
      .describe("Max dashboards per page (API default ~100)"),
    start: z
      .number()
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe("Offset for pagination (API expects >= 0)"),
    shared: z
      .boolean()
      .optional()
      .default(false)
      .describe("Filter shared dashboards (server-side)"),
  });

  server.tool(
    "list_dashboards",
    "List dashboards with optional name/tags filters",
    ListDashboardsSchema,
    async ({ name, tags, count = 100, start = 0, shared = false }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/dashboard",
        query: { "filter[shared]": String(shared), count, start },
      });
      if (!res.ok) {
        const errText =
          typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        return {
          is_error: true,
          content: [
            {
              type: "text",
              text: `Failed to list dashboards: HTTP ${res.status} ${errText}`,
            },
          ],
        };
      }
      const dashboards = Array.isArray(res.data?.dashboards)
        ? res.data.dashboards
        : [];
      let filtered = dashboards;
      if (name) {
        const s = name.toLowerCase();
        filtered = filtered.filter((d) => d.title?.toLowerCase().includes(s));
      }
      if (tags && tags.length) {
        filtered = filtered.filter((d) => {
          const dt = (d.description || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          return tags.every((t) => dt.includes(t));
        });
      }
      const withUrl = filtered.map((d) => ({
        ...d,
        url: `https://app.${
          process.env.DD_SITE || process.env.DATADOG_SITE || "datadoghq.com"
        }/dashboard/${d.id}`,
      }));
      return { content: [{ type: "text", text: JSON.stringify(withUrl) }] };
    }
  );

  const GetDashboardSchema = z.object({
    dashboard_id: z.string().describe("Dashboard ID"),
  });
  server.tool(
    "get_dashboard_by_id",
    "Get dashboard by ID",
    GetDashboardSchema,
    async ({ dashboard_id }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/dashboard/:dashboard_id",
        pathParams: { dashboard_id },
      });
      if (!res.ok) {
        const errText =
          typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        return {
          is_error: true,
          content: [
            {
              type: "text",
              text: `Failed to get dashboard: HTTP ${res.status} ${errText}`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
    }
  );

  // Monitors: list with common server-side filters
  const ListMonitorsSchema = z.object({
    name: z
      .string()
      .optional()
      .describe("Search monitors by name (server-side)"),
    tags: z
      .string()
      .optional()
      .describe(
        'Comma-separated tags filter (server-side, e.g. "team:core,env:prod")'
      ),
    monitor_tags: z
      .string()
      .optional()
      .describe("Comma-separated monitor tags (server-side)"),
    group_states: z
      .string()
      .optional()
      .describe("Comma-separated states e.g. alert,ok,no data,Warn"),
    page: z.number().int().min(0).optional().default(0),
    page_size: z.number().int().min(1).max(1000).optional().default(100),
    with_downtimes: z.boolean().optional().default(true),
  });
  server.tool(
    "list_monitors",
    "List monitors (common filters supported)",
    ListMonitorsSchema,
    async ({
      name,
      tags,
      monitor_tags,
      group_states,
      page = 0,
      page_size = 100,
      with_downtimes = true,
    }) => {
      const query = {
        page,
        page_size,
        with_downtimes,
        name,
        tags,
        monitor_tags,
        group_states,
      };
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/monitor",
        query,
      });
      if (!res.ok) {
        const errText =
          typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        return {
          is_error: true,
          content: [
            {
              type: "text",
              text: `Failed to list monitors: HTTP ${res.status} ${errText}`,
            },
          ],
        };
      }
      const arr = Array.isArray(res.data) ? res.data : [];
      const slim = arr.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        overall_state: m.overall_state,
        tags: m.tags,
      }));
      return { content: [{ type: "text", text: JSON.stringify(slim) }] };
    }
  );

  // Monitors: get, create, update, mute, unmute, delete
  const GetMonitorSchema = z.object({
    monitor_id: z.union([z.string(), z.number()]).describe("Monitor ID"),
  });
  server.tool(
    "get_monitor_by_id",
    "Get a monitor by ID",
    GetMonitorSchema,
    async ({ monitor_id }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/monitor/:monitor_id",
        pathParams: { monitor_id },
      });
      if (!res.ok)
        return {
          is_error: true,
          content: [{ type: "text", text: JSON.stringify(res.data) }],
        };
      return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
    }
  );

  const CreateMonitorSchema = z.object({
    body: z.record(z.any()).describe("Datadog monitor definition body"),
  });
  server.tool(
    "create_monitor_v1",
    "Create a monitor",
    CreateMonitorSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v1/monitor",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const UpdateMonitorSchema = z.object({
    monitor_id: z.union([z.string(), z.number()]),
    body: z.record(z.any()),
  });
  server.tool(
    "update_monitor_v1",
    "Update a monitor",
    UpdateMonitorSchema,
    async ({ monitor_id, body }) => {
      const res = await datadogRequest({
        method: "PUT",
        rawUrlTemplate: "{{baseUrl}}/api/v1/monitor/:monitor_id",
        pathParams: { monitor_id },
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const MuteMonitorSchema = z.object({
    monitor_id: z.union([z.string(), z.number()]),
    body: z.record(z.any()).optional().default({}),
  });
  server.tool(
    "mute_monitor_v1",
    "Mute a monitor",
    MuteMonitorSchema,
    async ({ monitor_id, body = {} }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v1/monitor/:monitor_id/mute",
        pathParams: { monitor_id },
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const UnmuteMonitorSchema = z.object({
    monitor_id: z.union([z.string(), z.number()]),
  });
  server.tool(
    "unmute_monitor_v1",
    "Unmute a monitor",
    UnmuteMonitorSchema,
    async ({ monitor_id }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v1/monitor/:monitor_id/unmute",
        pathParams: { monitor_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const DeleteMonitorSchema = z.object({
    monitor_id: z.union([z.string(), z.number()]),
  });
  server.tool(
    "delete_monitor_v1",
    "Delete a monitor",
    DeleteMonitorSchema,
    async ({ monitor_id }) => {
      const res = await datadogRequest({
        method: "DELETE",
        rawUrlTemplate: "{{baseUrl}}/api/v1/monitor/:monitor_id",
        pathParams: { monitor_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // Dashboards: create, update, delete
  const CreateDashboardSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "create_dashboard_v1",
    "Create a dashboard",
    CreateDashboardSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v1/dashboard",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const UpdateDashboardSchema = z.object({
    dashboard_id: z.string(),
    body: z.record(z.any()),
  });
  server.tool(
    "update_dashboard_v1",
    "Update a dashboard",
    UpdateDashboardSchema,
    async ({ dashboard_id, body }) => {
      const res = await datadogRequest({
        method: "PUT",
        rawUrlTemplate: "{{baseUrl}}/api/v1/dashboard/:dashboard_id",
        pathParams: { dashboard_id },
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const DeleteDashboardSchema = z.object({ dashboard_id: z.string() });
  server.tool(
    "delete_dashboard_v1",
    "Delete a dashboard",
    DeleteDashboardSchema,
    async ({ dashboard_id }) => {
      const res = await datadogRequest({
        method: "DELETE",
        rawUrlTemplate: "{{baseUrl}}/api/v1/dashboard/:dashboard_id",
        pathParams: { dashboard_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // Logs: send, search events, aggregate analytics
  const SendLogsSchema = z.object({
    body: z
      .union([z.array(z.any()), z.record(z.any())])
      .describe("Array de eventos ou objeto de log"),
  });
  server.tool(
    "logs_send",
    "Send logs to intake",
    SendLogsSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "https://http-intake.logs.{{site}}/api/v2/logs",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const SearchLogsSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "logs_search_events",
    "Search logs (events)",
    SearchLogsSchema,
    async ({ body }) => {
      const b = { ...(body || {}) };
      b.page = b.page || { limit: 25 };
      b.filter = b.filter || { from: "now-15m" };
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v2/logs/events/search",
        body: b,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const AggregateLogsSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "logs_aggregate_analytics",
    "Aggregate logs analytics",
    AggregateLogsSchema,
    async ({ body }) => {
      const b = { ...(body || {}) };
      b.filter = b.filter || { from: "now-15m" };
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v2/logs/analytics/aggregate",
        body: b,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // Metrics: submit series, query timeseries/scalars
  const SubmitSeriesSchema = z.object({
    body: z.record(z.any()).describe("See Datadog v2 series payload"),
  });
  server.tool(
    "metrics_submit_series",
    "Submit metrics (v2 series)",
    SubmitSeriesSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v2/series",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const QueryTimeseriesSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "metrics_query_timeseries",
    "Metrics: query timeseries",
    QueryTimeseriesSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v2/query/timeseries",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const QueryScalarsSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "metrics_query_scalars",
    "Metrics: query scalars",
    QueryScalarsSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v2/query/scalar",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // Incidents: list, get, create, update
  const ListIncidentsSchema = z.object({
    query: z.string().optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
    pageOffset: z.number().int().min(0).optional(),
  });
  server.tool(
    "incidents_list",
    "List incidents",
    ListIncidentsSchema,
    async ({ query, pageSize, pageOffset }) => {
      const q = {};
      if (query !== undefined) q["filter"] = query;
      if (pageSize !== undefined) q["page[size]"] = pageSize;
      if (pageOffset !== undefined) q["page[offset]"] = pageOffset;
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v2/incidents",
        query: q,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const GetIncidentSchema = z.object({ incident_id: z.string() });
  server.tool(
    "incidents_get",
    "Get incident by ID",
    GetIncidentSchema,
    async ({ incident_id }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v2/incidents/:incident_id",
        pathParams: { incident_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const CreateIncidentSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "incidents_create",
    "Create incident",
    CreateIncidentSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v2/incidents",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const UpdateIncidentSchema = z.object({
    incident_id: z.string(),
    body: z.record(z.any()),
  });
  server.tool(
    "incidents_update",
    "Update incident",
    UpdateIncidentSchema,
    async ({ incident_id, body }) => {
      const res = await datadogRequest({
        method: "PATCH",
        rawUrlTemplate: "{{baseUrl}}/api/v2/incidents/:incident_id",
        pathParams: { incident_id },
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // Downtimes: list, create, cancel
  const ListDowntimesSchema = z.object({
    current_only: z.boolean().optional(),
  });
  server.tool(
    "downtimes_list",
    "List downtimes",
    ListDowntimesSchema,
    async ({ current_only }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/downtime",
        query: { current_only },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const CreateDowntimeSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "downtimes_create",
    "Schedule downtime",
    CreateDowntimeSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v1/downtime",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const CancelDowntimeSchema = z.object({
    downtime_id: z.union([z.string(), z.number()]),
  });
  server.tool(
    "downtimes_cancel",
    "Cancel downtime",
    CancelDowntimeSchema,
    async ({ downtime_id }) => {
      const res = await datadogRequest({
        method: "DELETE",
        rawUrlTemplate: "{{baseUrl}}/api/v1/downtime/:downtime_id",
        pathParams: { downtime_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // Events: post and list
  const PostEventSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "events_post",
    "Post event",
    PostEventSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v1/events",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  const ListEventsSchema = z.object({
    start: z.number().int().optional(),
    end: z.number().int().optional(),
    priority: z.string().optional(),
    sources: z.string().optional(),
    tags: z.string().optional(),
    unaggregated: z.boolean().optional(),
  });
  server.tool("events_list", "List events", ListEventsSchema, async (args) => {
    const res = await datadogRequest({
      method: "GET",
      rawUrlTemplate: "{{baseUrl}}/api/v1/events",
      query: args,
    });
    return {
      is_error: !res.ok,
      content: [{ type: "text", text: JSON.stringify(res.data) }],
    };
  });

  // =============================
  // Notebooks: list/get/create/update/delete
  // =============================
  const NotebooksListSchema = z.object({
    start: z.number().int().optional(),
    count: z.number().int().optional(),
    sort_field: z.string().optional(),
    sort_dir: z.enum(["asc", "desc"]).optional(),
    query: z.string().optional(),
  });
  server.tool(
    "notebooks_list",
    "List notebooks",
    NotebooksListSchema,
    async (args) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/notebooks",
        query: args,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const NotebooksGetSchema = z.object({
    notebook_id: z.union([z.number(), z.string()]),
  });
  server.tool(
    "notebooks_get",
    "Get a notebook by ID",
    NotebooksGetSchema,
    async ({ notebook_id }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/notebooks/:notebook_id",
        pathParams: { notebook_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const NotebooksCreateSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "notebooks_create",
    "Create a notebook",
    NotebooksCreateSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v1/notebooks",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const NotebooksUpdateSchema = z.object({
    notebook_id: z.union([z.number(), z.string()]),
    body: z.record(z.any()),
  });
  server.tool(
    "notebooks_update",
    "Update a notebook",
    NotebooksUpdateSchema,
    async ({ notebook_id, body }) => {
      const res = await datadogRequest({
        method: "PUT",
        rawUrlTemplate: "{{baseUrl}}/api/v1/notebooks/:notebook_id",
        pathParams: { notebook_id },
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const NotebooksDeleteSchema = z.object({
    notebook_id: z.union([z.number(), z.string()]),
  });
  server.tool(
    "notebooks_delete",
    "Delete a notebook",
    NotebooksDeleteSchema,
    async ({ notebook_id }) => {
      const res = await datadogRequest({
        method: "DELETE",
        rawUrlTemplate: "{{baseUrl}}/api/v1/notebooks/:notebook_id",
        pathParams: { notebook_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // =============================
  // Synthetics: list/get/create/update/delete tests
  // =============================
  const SyntheticsListSchema = z.object({
    page: z.number().int().optional(),
    page_size: z.number().int().optional(),
  });
  server.tool(
    "synthetics_list_tests",
    "List Synthetics tests",
    SyntheticsListSchema,
    async (args) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/synthetics/tests",
        query: args,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const SyntheticsGetSchema = z.object({ public_id: z.string() });
  server.tool(
    "synthetics_get_test",
    "Get a Synthetics test",
    SyntheticsGetSchema,
    async ({ public_id }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/synthetics/tests/:public_id",
        pathParams: { public_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const SyntheticsCreateSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "synthetics_create_test",
    "Create a Synthetics test",
    SyntheticsCreateSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v1/synthetics/tests",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const SyntheticsUpdateSchema = z.object({
    public_id: z.string(),
    body: z.record(z.any()),
  });
  server.tool(
    "synthetics_update_test",
    "Update a Synthetics test",
    SyntheticsUpdateSchema,
    async ({ public_id, body }) => {
      const res = await datadogRequest({
        method: "PUT",
        rawUrlTemplate: "{{baseUrl}}/api/v1/synthetics/tests/:public_id",
        pathParams: { public_id },
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const SyntheticsDeleteSchema = z.object({ public_id: z.string() });
  server.tool(
    "synthetics_delete_test",
    "Delete a Synthetics test",
    SyntheticsDeleteSchema,
    async ({ public_id }) => {
      const res = await datadogRequest({
        method: "DELETE",
        rawUrlTemplate: "{{baseUrl}}/api/v1/synthetics/tests/:public_id",
        pathParams: { public_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // =============================
  // SLOs: list/get/create/update/delete (v1)
  // =============================
  const SlosListSchema = z.object({
    query: z.string().optional(),
    page: z.number().int().optional(),
    limit: z.number().int().optional(),
  });
  server.tool(
    "slos_list",
    "List Service Level Objectives",
    SlosListSchema,
    async (args) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/slo",
        query: args,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const SlosGetSchema = z.object({ slo_id: z.string() });
  server.tool(
    "slos_get",
    "Get SLO by ID",
    SlosGetSchema,
    async ({ slo_id }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v1/slo/:slo_id",
        pathParams: { slo_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const SlosCreateSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "slos_create",
    "Create SLO",
    SlosCreateSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v1/slo",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const SlosUpdateSchema = z.object({
    slo_id: z.string(),
    body: z.record(z.any()),
  });
  server.tool(
    "slos_update",
    "Update SLO",
    SlosUpdateSchema,
    async ({ slo_id, body }) => {
      const res = await datadogRequest({
        method: "PUT",
        rawUrlTemplate: "{{baseUrl}}/api/v1/slo/:slo_id",
        pathParams: { slo_id },
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const SlosDeleteSchema = z.object({ slo_id: z.string() });
  server.tool(
    "slos_delete",
    "Delete SLO",
    SlosDeleteSchema,
    async ({ slo_id }) => {
      const res = await datadogRequest({
        method: "DELETE",
        rawUrlTemplate: "{{baseUrl}}/api/v1/slo/:slo_id",
        pathParams: { slo_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // =============================
  // Users (v2): list/get/create/update
  // =============================
  const UsersListSchema = z.object({
    pageSize: z.number().int().optional(),
    pageNumber: z.number().int().optional(),
    filter: z.string().optional(),
  });
  server.tool(
    "users_list",
    "List users",
    UsersListSchema,
    async ({ pageSize, pageNumber, filter }) => {
      const q = {};
      if (pageSize !== undefined) q["page[size]"] = pageSize;
      if (pageNumber !== undefined) q["page[number]"] = pageNumber;
      if (filter !== undefined) q["filter"] = filter;
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v2/users",
        query: q,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const UsersGetSchema = z.object({ user_id: z.string() });
  server.tool(
    "users_get",
    "Get a user by ID",
    UsersGetSchema,
    async ({ user_id }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v2/users/:user_id",
        pathParams: { user_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const UsersCreateSchema = z.object({ body: z.record(z.any()) });
  server.tool(
    "users_create",
    "Create user",
    UsersCreateSchema,
    async ({ body }) => {
      const res = await datadogRequest({
        method: "POST",
        rawUrlTemplate: "{{baseUrl}}/api/v2/users",
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  const UsersUpdateSchema = z.object({
    user_id: z.string(),
    body: z.record(z.any()),
  });
  server.tool(
    "users_update",
    "Update user",
    UsersUpdateSchema,
    async ({ user_id, body }) => {
      const res = await datadogRequest({
        method: "PATCH",
        rawUrlTemplate: "{{baseUrl}}/api/v2/users/:user_id",
        pathParams: { user_id },
        body,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // =============================
  // Roles (v2): list/get
  // =============================
  server.tool(
    "roles_list",
    "List roles",
    z.object({
      pageSize: z.number().int().optional(),
      pageNumber: z.number().int().optional(),
    }),
    async ({ pageSize, pageNumber }) => {
      const q = {};
      if (pageSize !== undefined) q["page[size]"] = pageSize;
      if (pageNumber !== undefined) q["page[number]"] = pageNumber;
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v2/roles",
        query: q,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  server.tool(
    "roles_get",
    "Get role by ID",
    z.object({ role_id: z.string() }),
    async ({ role_id }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v2/roles/:role_id",
        pathParams: { role_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );

  // =============================
  // Teams (v2): list/get (if enabled)
  // =============================
  server.tool(
    "teams_list",
    "List teams",
    z.object({
      filter_keyword: z.string().optional(),
      pageSize: z.number().int().optional(),
      pageNumber: z.number().int().optional(),
    }),
    async ({ filter_keyword, pageSize, pageNumber }) => {
      const q = {};
      if (filter_keyword !== undefined) q["filter[keyword]"] = filter_keyword;
      if (pageSize !== undefined) q["page[size]"] = pageSize;
      if (pageNumber !== undefined) q["page[number]"] = pageNumber;
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v2/teams",
        query: q,
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
  server.tool(
    "teams_get",
    "Get team by ID",
    z.object({ team_id: z.string() }),
    async ({ team_id }) => {
      const res = await datadogRequest({
        method: "GET",
        rawUrlTemplate: "{{baseUrl}}/api/v2/teams/:team_id",
        pathParams: { team_id },
      });
      return {
        is_error: !res.ok,
        content: [{ type: "text", text: JSON.stringify(res.data) }],
      };
    }
  );
}
