import { request } from 'undici';

class DatadogHttpError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'DatadogHttpError';
    this.status = status;
    this.response = response;
  }
}

function buildUrl(baseUrl, rawUrlTemplate, pathParams = {}, site) {
  // The collection templates embed placeholder query strings (e.g.
  // `?from=36993837&group_by=consectetur`). Those are Postman example values,
  // and the same params are already exposed as tool arguments — keeping them
  // would append a second `?` and send the junk defaults to Datadog.
  const [template] = rawUrlTemplate.split('?');

  let url = template
    .replace('{{baseUrl}}', baseUrl)
    // Use the configured site verbatim; deriving it from baseUrl would collapse
    // regional hosts like us3.datadoghq.com down to datadoghq.com.
    .replace('{{site}}', site ?? baseUrl.replace(/^https?:\/\//, ''));

  for (const [key, value] of Object.entries(pathParams)) {
    const encoded = encodeURIComponent(String(value));
    url = url.replaceAll(`:${key}`, encoded).replaceAll(`{${key}}`, encoded);
  }

  return url;
}

function buildQueryString(params) {
  if (!params || Object.keys(params).length === 0) return '';
  
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') return {};
  const forbiddenHeaders = new Set(['dd-api-key', 'dd-application-key', 'user-agent']);
  return Object.fromEntries(
    Object.entries(headers).filter(([key, value]) => {
      if (value === undefined || value === null) return false;
      return !forbiddenHeaders.has(String(key).toLowerCase());
    })
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Methods that can be safely replayed after a 5xx or network failure.
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);

export class DatadogClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = `https://${config.subdomain}.${config.site}`;
  }

  async request({
    method,
    rawUrlTemplate,
    pathParams = {},
    query = {},
    body,
    headers = {},
    timeoutMs,
  }) {
    const url = buildUrl(this.baseUrl, rawUrlTemplate, pathParams, this.config.site) + buildQueryString(query);
    const safeHeaders = sanitizeHeaders(headers);
    const requestHeaders = {
      'DD-API-KEY': this.config.credentials.apiKey,
      'DD-APPLICATION-KEY': this.config.credentials.appKey,
      'User-Agent': this.config.userAgent,
      'Accept': 'application/json',
      ...safeHeaders,
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      if (typeof body === 'object') {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }

    const requestOptions = {
      method,
      headers: requestHeaders,
      bodyTimeout: timeoutMs || this.config.timeoutMs,
      headersTimeout: (timeoutMs || this.config.timeoutMs) / 2,
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    let lastError;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await request(url, requestOptions);
        const responseText = await response.body.text();
        
        let data;
        try {
          data = responseText ? JSON.parse(responseText) : null;
        } catch {
          data = responseText;
        }

        const result = {
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          statusText: response.statusMessage || '',
          url,
          method,
          data,
          headers: Object.fromEntries(Object.entries(response.headers)),
        };

        if (!result.ok && response.statusCode >= 400) {
          let message = `HTTP ${response.statusCode}: ${responseText || response.statusMessage}`;

          if (response.statusCode === 401 || response.statusCode === 403) {
            message += ` — Check that DD_API_KEY and DD_APP_KEY are valid for site "${this.config.site}". `
              + 'Keys from one Datadog site (e.g. datadoghq.com) do not work on another (e.g. us3.datadoghq.com).';
          }

          throw new DatadogHttpError(message, response.statusCode, result);
        }

        return result;

      } catch (error) {
        lastError = error;
        
        if (attempt === this.config.maxRetries) break;
        
        if (error.status && error.status < 500 && error.status !== 429) {
          break;
        }

        // Retrying a failed POST/PATCH can duplicate a resource Datadog already
        // created, so only replay methods that are safe to repeat.
        if (!IDEMPOTENT_METHODS.has(method) && error.status !== 429) {
          break;
        }

        let delayMs = this.config.retryBaseMs * Math.pow(2, attempt);

        if (error.status === 429 && this.config.respectRetryAfter) {
          const retryAfter = error.response?.headers?.['retry-after'];
          if (retryAfter) {
            // Retry-After is either delta-seconds or an HTTP-date. Parsing a
            // date with parseInt yields NaN, which setTimeout treats as 0 and
            // burns every retry instantly.
            const seconds = Number(retryAfter);
            if (Number.isFinite(seconds)) {
              delayMs = seconds * 1000;
            } else {
              const until = Date.parse(retryAfter);
              if (!Number.isNaN(until)) {
                delayMs = Math.max(0, until - Date.now());
              }
            }
          }
        }
        
        delayMs = Math.min(delayMs, 30000);
        
        await sleep(delayMs);
      }
    }

    throw lastError;
  }
}

export { DatadogHttpError };
