import { z } from 'zod';

const DATADOG_SITES = [
  'datadoghq.com',
  'datadoghq.eu', 
  'us3.datadoghq.com',
  'us5.datadoghq.com',
  'ap1.datadoghq.com',
  'ddog-gov.com'
];

const API_KEY_PATTERN = /^[a-f0-9]{32}$/;
const APP_KEY_PATTERN = /^[a-f0-9]{40}$/;

export function validateApiKey(apiKey) {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }
  
  if (typeof apiKey !== 'string') {
    return { valid: false, error: 'API key must be a string' };
  }
  
  if (!API_KEY_PATTERN.test(apiKey)) {
    return { valid: false, error: 'API key must be a 32-character hexadecimal string' };
  }
  
  return { valid: true };
}

export function validateAppKey(appKey) {
  if (!appKey) {
    return { valid: false, error: 'Application key is required' };
  }
  
  if (typeof appKey !== 'string') {
    return { valid: false, error: 'Application key must be a string' };
  }
  
  if (!APP_KEY_PATTERN.test(appKey)) {
    return { valid: false, error: 'Application key must be a 40-character hexadecimal string' };
  }
  
  return { valid: true };
}

export function validateSite(site) {
  if (!site) {
    return { valid: false, error: 'Site is required' };
  }
  
  if (!DATADOG_SITES.includes(site)) {
    return { 
      valid: false, 
      error: `Invalid site. Must be one of: ${DATADOG_SITES.join(', ')}` 
    };
  }
  
  return { valid: true };
}

export function validateTimeout(timeoutMs) {
  if (typeof timeoutMs !== 'number' || timeoutMs < 1000 || timeoutMs > 300000) {
    return {
      valid: false,
      error: 'Timeout must be between 1000ms (1s) and 300000ms (5min)'
    };
  }
  
  return { valid: true };
}

export function validateRetries(maxRetries) {
  if (typeof maxRetries !== 'number' || maxRetries < 0 || maxRetries > 10) {
    return {
      valid: false,
      error: 'Max retries must be between 0 and 10'
    };
  }
  
  return { valid: true };
}

export function validateQueryParams(params) {
  const errors = [];
  
  if (params && typeof params !== 'object') {
    return { valid: false, errors: ['Query parameters must be an object'] };
  }
  
  for (const [key, value] of Object.entries(params || {})) {
    if (key.includes(' ')) {
      errors.push(`Query parameter key '${key}' cannot contain spaces`);
    }
    
    if (value !== null && value !== undefined && 
        typeof value !== 'string' && 
        typeof value !== 'number' && 
        typeof value !== 'boolean') {
      errors.push(`Query parameter '${key}' must be string, number, boolean, null, or undefined`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function validatePathParams(params, requiredParams = []) {
  const errors = [];
  
  if (params && typeof params !== 'object') {
    return { valid: false, errors: ['Path parameters must be an object'] };
  }
  
  const providedParams = Object.keys(params || {});
  
  for (const required of requiredParams) {
    if (!providedParams.includes(required)) {
      errors.push(`Required path parameter '${required}' is missing`);
    }
  }
  
  for (const [key, value] of Object.entries(params || {})) {
    if (value === null || value === undefined || value === '') {
      errors.push(`Path parameter '${key}' cannot be empty`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateRequestBody(body, method) {
  if (['GET', 'HEAD', 'DELETE'].includes(method.toUpperCase()) && body) {
    return {
      valid: false,
      error: `${method} requests should not have a body`
    };
  }
  
  if (body && typeof body !== 'object' && typeof body !== 'string') {
    return {
      valid: false,
      error: 'Request body must be an object or string'
    };
  }
  
  return { valid: true };
}

export const ConfigSchema = z.object({
  schemaPath: z.string().min(1),
  allowedFolders: z.array(z.string()).nullable(),
  site: z.string().refine(site => DATADOG_SITES.includes(site), {
    message: `Site must be one of: ${DATADOG_SITES.join(', ')}`
  }),
  subdomain: z.string().min(1),
  maxRetries: z.number().int().min(0).max(10),
  retryBaseMs: z.number().int().min(100).max(10000),
  respectRetryAfter: z.boolean(),
  userAgent: z.string().min(1),
  timeoutMs: z.number().int().min(1000).max(300000),
  credentials: z.object({
    apiKey: z.string().regex(API_KEY_PATTERN, 'Invalid API key format'),
    appKey: z.string().regex(APP_KEY_PATTERN, 'Invalid application key format'),
  }),
});

export function validateConfigWithSchema(config) {
  try {
    ConfigSchema.parse(config);
    return { valid: true, errors: [], warnings: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { valid: false, errors, warnings: [] };
    }
    return { valid: false, errors: [error.message], warnings: [] };
  }
}
