import fs from "fs";

function slugify(str, { max = 64 } = {}) {
  const s = (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max);
  return s || "unnamed";
}

function singularize(word) {
  if (!word) return word;
  if (/ies$/.test(word)) return word.replace(/ies$/, "y");
  if (/sses$/.test(word)) return word; // classes -> classes (avoid dropping s)
  if (/s$/.test(word) && !/ss$/.test(word)) return word.replace(/s$/, "");
  return word;
}

function pluralize(word) {
  if (!word) return word;
  if (/s$/.test(word)) return word; // already plural-ish
  if (/[^aeiou]y$/.test(word)) return word.replace(/y$/, "ies");
  return `${word}s`;
}

function collectRequests(items, trail = []) {
  const out = [];
  for (const it of items || []) {
    const name = it?.name || "";
    if (it.request) {
      out.push({
        trail,
        name,
        request: it.request,
        description: it.description || it.request.description || "",
      });
    }
    if (it.item && Array.isArray(it.item)) {
      out.push(...collectRequests(it.item, [...trail, name]));
    }
  }
  return out;
}

function isVarSegment(seg) {
  return /^[:{].*[}]?$/.test(seg);
}

function normalizePath(raw) {
  const urlPath = raw
    .replace(/\?.*$/, "")
    .replace(/\{\{\s*baseUrl\s*\}\}/g, "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return urlPath;
}

function getOverrideName({ raw, method }) {
  const m = (method || "GET").toUpperCase();
  const p = normalizePath(raw);
  const overrides = [
    // Monitors
    { m: "POST", re: /^api\/v1\/monitor$/, name: "create_monitor" },
    { m: "POST", re: /^api\/v1\/monitor\/validate$/, name: "validate_monitor" },
    { m: "GET", re: /^api\/v1\/monitor$/, name: "get_monitors" },
    { m: "GET", re: /^api\/v1\/monitor\/search$/, name: "search_monitors" },
    {
      m: "GET",
      re: /^api\/v1\/monitor\/groups\/search$/,
      name: "search_monitor_groups",
    },
    {
      m: "POST",
      re: /^api\/v1\/monitor\/:monitor_id\/mute$/,
      name: "mute_monitor",
    },
    {
      m: "POST",
      re: /^api\/v1\/monitor\/:monitor_id\/unmute$/,
      name: "unmute_monitor",
    },
    { m: "PUT", re: /^api\/v1\/monitor\/:monitor_id$/, name: "update_monitor" },
    {
      m: "DELETE",
      re: /^api\/v1\/monitor\/:monitor_id$/,
      name: "delete_monitor",
    },
    { m: "GET", re: /^api\/v1\/monitor\/:monitor_id$/, name: "get_monitor" },
    {
      m: "GET",
      re: /^api\/v1\/monitor\/can_delete$/,
      name: "can_delete_monitors",
    },
    // Metrics common submit endpoints
    { m: "POST", re: /^api\/v2\/series$/, name: "submit_series" },
    {
      m: "POST",
      re: /^api\/v1\/distribution_points$/,
      name: "submit_distribution_points",
    },
  ];
  for (const o of overrides) {
    if (o.m === m && o.re.test(p)) return o.name;
  }
  return null;
}

function friendlyNameFromPath({ raw, method }) {
  const lowerMethod = (method || "GET").toUpperCase();
  const urlPath = normalizePath(raw);

  const segs = urlPath
    .split("/")
    .filter(Boolean)
    .filter((s) => !/^v\d+$/i.test(s) && s !== "api");

  const ACTIONS = new Set([
    "search",
    "aggregate",
    "query",
    "mute",
    "unmute",
    "validate",
    "can_delete",
    "estimate",
  ]);

  // Special case: Logs intake
  if (
    /http-intake\.logs/i.test(raw) &&
    /^api\/v\d+\/logs\/?$/.test(urlPath) &&
    lowerMethod === "POST"
  ) {
    return "send_logs";
  }

  // Named overrides first
  const override = getOverrideName({ raw, method });
  if (override) return override;

  // Identify where variables appear
  const varIdx = segs.findIndex((s) => isVarSegment(s));
  const hasId = varIdx !== -1;

  // Action detection
  let action = null;
  const last = segs[segs.length - 1] || "";
  if (ACTIONS.has(last)) action = last;
  else if (segs.some((s) => ACTIONS.has(s)))
    action = segs.filter((s) => ACTIONS.has(s)).slice(-1)[0];

  // Resource parts = segments until first var or action
  let stopAt = segs.length;
  if (varIdx !== -1) stopAt = Math.min(stopAt, varIdx);
  const actIdx = segs.findIndex((s) => ACTIONS.has(s));
  if (actIdx !== -1) stopAt = Math.min(stopAt, actIdx);
  let resourceParts = segs.slice(0, Math.max(0, stopAt));

  // Suffix parts: after variable or after resource until end, excluding action word (if action exists)
  let suffixParts = [];
  const startAfter = varIdx !== -1 ? varIdx + 1 : stopAt;
  suffixParts = segs
    .slice(startAfter)
    .filter((s) => !ACTIONS.has(s) && !isVarSegment(s));

  // Determine action based on method if not explicitly present
  if (!action) {
    action =
      {
        GET: "get",
        POST: "create",
        PUT: "update",
        PATCH: "update",
        DELETE: "delete",
      }[lowerMethod] || lowerMethod.toLowerCase();
    // If GET on a collection provide 'get' not 'list' per user request
  }

  // Build resource name
  const baseResource = resourceParts.length
    ? resourceParts.join("_")
    : suffixParts[0] || "resource";
  const tokens = baseResource.split("_").filter(Boolean);
  if (tokens.length) {
    const lastToken = tokens[tokens.length - 1];
    tokens[tokens.length - 1] = hasId
      ? singularize(lastToken)
      : pluralize(lastToken);
  }
  let resourceName = tokens.join("_");

  // Append suffix (e.g., tags, group_states) when meaningful
  if (suffixParts.length && (!action || !ACTIONS.has(action))) {
    resourceName = [resourceName, ...suffixParts].filter(Boolean).join("_");
  } else if (
    suffixParts.length &&
    action &&
    ["get", "update", "delete"].includes(action)
  ) {
    resourceName = [resourceName, ...suffixParts].filter(Boolean).join("_");
  }

  // Normalize: replace hyphens and stray chars
  const name = `${action}_${resourceName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return name || "call_api";
}

function toolNameFromRequest(req, _category) {
  const method = req.method || "GET";
  const raw = req.url?.raw || "";
  return slugify(friendlyNameFromPath({ raw, method }), { max: 96 });
}

export function loadPostmanCollection(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);
  return json;
}

export function buildToolsFromPostman(collection, options = {}) {
  const items = collection?.item || [];
  const topLevel = items.map((i) => i.name);
  const allowed = (
    process.env.MCP_DD_FOLDERS ||
    options.allowedFolders ||
    "Logs,Monitors,Metrics,Incidents,Dashboards"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const requests = collectRequests(items);

  const operations = [];

  for (const r of requests) {
    const category = r.trail[0] || "api";
    if (allowed.length && !allowed.includes(category)) continue;
    const req = r.request;
    const method = req.method || "GET";
    // Drop any baked-in example querystring from the Postman raw URL.
    // Queries should be provided at call time via args.query.
    let rawUrlTemplate = req.url?.raw || "";
    if (rawUrlTemplate.includes("?")) {
      rawUrlTemplate = rawUrlTemplate.replace(/\?.*$/, "");
    }
    if (!rawUrlTemplate) continue;

    // Determine path variables from url.variable, if present
    const pathVariables = (req.url?.variable || []).map((v) => v.key);

    const name = toolNameFromRequest(req, category);
    const description = r.description || `${method} ${rawUrlTemplate}`;

    operations.push({
      name,
      category,
      description,
      method,
      rawUrlTemplate,
      pathVariables,
    });
  }

  // Disambiguate duplicates by appending version suffix if available, else index
  const grouped = new Map();
  for (const op of operations) {
    if (!grouped.has(op.name)) grouped.set(op.name, []);
    grouped.get(op.name).push(op);
  }
  for (const [baseName, ops] of grouped.entries()) {
    if (ops.length <= 1) continue;
    for (const op of ops) {
      const vMatch =
        op.rawUrlTemplate.match(/\/api\/(v\d+)/i) ||
        op.rawUrlTemplate.match(/(^|\/)v(\d+)(\/|$)/i);
      const vs = vMatch ? vMatch[1] || `v${vMatch[2]}` : null;
      if (vs && !op.name.endsWith(`_${vs.toLowerCase()}`)) {
        op.name = `${op.name}_${vs.toLowerCase()}`;
      }
    }
  }
  // After version disambiguation, ensure uniqueness with numeric suffix
  const nameCount = new Map();
  for (const op of operations) {
    const count = (nameCount.get(op.name) || 0) + 1;
    nameCount.set(op.name, count);
    if (count > 1) op.name = `${op.name}_${count}`;
  }

  const tools = operations.map((op) => ({
    name: op.name,
    description:
      op.description?.slice(0, 500) || `${op.method} ${op.rawUrlTemplate}`,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        path: {
          type: "object",
          description: op.pathVariables?.length
            ? `Path params: ${op.pathVariables.join(", ")}`
            : "Optional map of path params",
          additionalProperties: true,
        },
        query: {
          type: "object",
          description: "Optional querystring parameters",
          additionalProperties: true,
        },
        body: {
          description:
            "Optional request body (object, array, or raw JSON string)",
          oneOf: [
            { type: "object" },
            { type: "array" },
            { type: "string" },
            { type: "null" },
          ],
        },
        headers: {
          type: "object",
          description: "Optional extra headers to include",
          additionalProperties: true,
        },
        site: {
          type: "string",
          description:
            "Datadog site (default from DD_SITE, e.g. datadoghq.com)",
        },
        subdomain: {
          type: "string",
          description: "Subdomain for baseUrl (default 'api')",
        },
      },
    },
  }));

  const operationsByName = new Map(operations.map((o) => [o.name, o]));
  return { tools, operationsByName, topLevelFolders: topLevel };
}
