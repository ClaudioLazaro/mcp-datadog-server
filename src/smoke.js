import { datadogRequest } from "./http.js";

function mergeRequest(defaults, overrides) {
  const merged = { ...(defaults || {}), ...(overrides || {}) };
  if (defaults?.headers || overrides?.headers) {
    merged.headers = { ...(defaults?.headers || {}), ...(overrides?.headers || {}) };
  }
  if (defaults?.query && overrides?.query) {
    merged.query = { ...(defaults.query || {}), ...(overrides.query || {}) };
  }
  return merged;
}

export async function runSmokeTests(config, { requestOverrides } = {}) {
  const defaults = mergeRequest(
    {
      site: config.site,
      subdomain: config.subdomain,
      maxRetries: config.maxRetries,
      retryBaseMs: config.retryBaseMs,
      respectRetryAfter: config.respectRetryAfter,
      userAgent: config.userAgent,
    },
    requestOverrides
  );

  const call = (overrides) => datadogRequest(mergeRequest(defaults, overrides));

  const tasks = [
    {
      name: "validate_api_key",
      description: "Validate API credentials with /api/v1/validate",
      run: async () => {
        const res = await call({
          method: "GET",
          rawUrlTemplate: "{{baseUrl}}/api/v1/validate",
        });
        if (!res.ok || !res.data?.valid) {
          throw new Error(
            `Validation failed: HTTP ${res.status} ${JSON.stringify(res.data)}`
          );
        }
        return { status: res.status, valid: res.data.valid };
      },
    },
    {
      name: "list_monitors",
      description: "Fetch first monitor page",
      run: async () => {
        const res = await call({
          method: "GET",
          rawUrlTemplate: "{{baseUrl}}/api/v1/monitor",
          query: { page_size: 1 },
        });
        if (!res.ok) {
          throw new Error(
            `List monitors failed: HTTP ${res.status} ${JSON.stringify(res.data)}`
          );
        }
        return { status: res.status, count: Array.isArray(res.data) ? res.data.length : 0 };
      },
    },
    {
      name: "list_events",
      description: "Fetch events for the last 10 minutes",
      run: async () => {
        const now = Math.floor(Date.now() / 1000);
        const res = await call({
          method: "GET",
          rawUrlTemplate: "{{baseUrl}}/api/v1/events",
          query: {
            start: now - 600,
            end: now,
            priority: "normal",
            page_size: 1,
          },
        });
        if (!res.ok) {
          throw new Error(
            `List events failed: HTTP ${res.status} ${JSON.stringify(res.data)}`
          );
        }
        return {
          status: res.status,
          events: Array.isArray(res.data?.events) ? res.data.events.length : 0,
        };
      },
    },
  ];

  const results = [];
  let ok = true;

  for (const task of tasks) {
    try {
      const data = await task.run();
      results.push({ name: task.name, description: task.description, ok: true, data });
    } catch (error) {
      ok = false;
      results.push({
        name: task.name,
        description: task.description,
        ok: false,
        error: error?.message || String(error),
      });
    }
  }

  return { ok, results };
}
