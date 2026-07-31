import { request } from 'undici';

class DatadogHttpError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'DatadogHttpError';
    this.status = status;
    this.response = response;
  }
}

function buildUrl(baseUrl, rawUrlTemplate, pathParams = {}) {
  let url = rawUrlTemplate.replace('{{baseUrl}}', baseUrl).replace('{{site}}', baseUrl.split('.').slice(-2).join('.'));
  
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
    const url = buildUrl(this.baseUrl, rawUrlTemplate, pathParams) + buildQueryString(query);
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

        let delayMs = this.config.retryBaseMs * Math.pow(2, attempt);
        
        if (error.status === 429 && this.config.respectRetryAfter) {
          const retryAfter = error.response?.headers?.['retry-after'];
          if (retryAfter) {
            delayMs = parseInt(retryAfter, 10) * 1000;
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
