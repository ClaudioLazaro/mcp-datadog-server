import { fetch } from "undici";

function substitutePathVariables(template, pathVars = {}) {
  let path = template;
  // Replace Postman-style path variables like :connection_id
  for (const [key, value] of Object.entries(pathVars)) {
    path = path.replace(new RegExp(`:${key}(?=/|$)`, "g"), encodeURIComponent(String(value)));
    // Also support {{var}} placeholders in case paths contain them
    path = path.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), encodeURIComponent(String(value)));
  }
  return path;
}

function resolveUrl(raw, { site, subdomain }) {
  // Collection uses variables like {{baseUrl}} and {{site}} and {{subdomain}}
  const s = site || process.env.DD_SITE || process.env.DATADOG_SITE || "datadoghq.com";
  const sub = subdomain || process.env.DD_SUBDOMAIN || "api";

  let url = raw;
  url = url.replace(/\{\{\s*site\s*\}\}/g, s);
  url = url.replace(/\{\{\s*subdomain\s*\}\}/g, sub);
  url = url.replace(/\{\{\s*baseUrl\s*\}\}/g, `https://${sub}.${s}`);
  return url;
}

export async function datadogRequest({
  method,
  rawUrlTemplate,
  pathParams,
  query,
  body,
  headers,
  site,
  subdomain,
  timeoutMs = 60000,
}) {
  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY || process.env.DD_APPLICATION_KEY;

  if (!apiKey || !appKey) {
    throw new Error("Missing Datadog credentials: set DD_API_KEY and DD_APP_KEY env vars.");
  }

  const resolved = resolveUrl(rawUrlTemplate, { site, subdomain });
  const urlObj = new URL(substitutePathVariables(resolved, pathParams));

  if (query && typeof query === "object") {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        v.forEach((vv) => urlObj.searchParams.append(k, String(vv)));
      } else {
        urlObj.searchParams.set(k, String(v));
      }
    }
  }

  const reqHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "DD-API-KEY": apiKey,
    "DD-APPLICATION-KEY": appKey,
    ...headers,
  };

  // Some endpoints use intake subdomains and may require different auth headers.
  // Datadog supports both header names above for v1/v2 APIs and intake endpoints.

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(urlObj.toString(), {
      method,
      headers: reqHeaders,
      body: body !== undefined && body !== null && method !== "GET" && method !== "HEAD" ?
        (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await res.json().catch(() => ({ error: "Invalid JSON" }));
    } else {
      data = await res.text();
    }

    return {
      status: res.status,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
      data,
      url: urlObj.toString(),
      method,
    };
  } finally {
    clearTimeout(timer);
  }
}
