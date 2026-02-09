import fs from 'fs';

const CORE_CATEGORIES = new Set([
  'Dashboards',
  'Monitors', 
  'Logs',
  'Metrics',
  'Events',
  'Incidents',
  'Downtimes',
  'Hosts',
  'Synthetics',
  'Service Level Objectives',
  'Users',
  'Teams',
  'Roles',
  'APM'
]);

function normalizeOperationName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function parseOperation(item, category) {
  if (!item.request) return null;
  
  const { request } = item;
  const method = request.method?.toUpperCase() || 'GET';
  const url = request.url?.raw || '';
  
  if (!url) return null;
  
  const name = normalizeOperationName(item.name || `${method}_${category}`);
  const description = item.description || request.description || `${method} ${url}`;
  
  const pathParams = {};
  const queryParams = {};
  
  if (request.url?.variable) {
    for (const variable of request.url.variable) {
      if (variable.key) {
        pathParams[variable.key] = {
          type: 'string',
          description: variable.description || `Path parameter: ${variable.key}`,
          example: variable.value,
        };
      }
    }
  }
  
  if (request.url?.query) {
    for (const query of request.url.query) {
      if (query.key) {
        queryParams[query.key] = {
          type: 'string',
          description: query.description || `Query parameter: ${query.key}`,
          required: !query.disabled,
          example: query.value,
        };
      }
    }
  }
  
  const bodySchema = method !== 'GET' && method !== 'HEAD' && method !== 'DELETE' ? {
    type: 'object',
    description: 'Request body',
  } : null;
  
  return {
    name,
    method,
    rawUrlTemplate: url,
    category,
    description,
    pathParams,
    queryParams,
    bodySchema,
    tags: item.tags || [],
  };
}

function isRelevantCategory(categoryName) {
  if (CORE_CATEGORIES.has(categoryName)) return true;
  
  const lowerName = categoryName.toLowerCase();
  return [
    'dashboard', 'monitor', 'log', 'metric', 'event', 'incident', 
    'downtime', 'host', 'synthetic', 'slo', 'user', 'team', 'role', 
    'apm', 'trace', 'service'
  ].some(keyword => lowerName.includes(keyword));
}

function extractOperations(schemaData, allowedFolders = null) {
  const operations = [];
  const categories = new Set();
  
  if (!schemaData.item || !Array.isArray(schemaData.item)) {
    return { operations, categories: Array.from(categories) };
  }
  
  for (const topLevelItem of schemaData.item) {
    const category = topLevelItem.name;
    
    if (!category || category === 'Get started') continue;
    
    const shouldInclude = allowedFolders 
      ? allowedFolders.includes(category)
      : isRelevantCategory(category);
      
    if (!shouldInclude) continue;
    
    categories.add(category);
    
    if (!topLevelItem.item || !Array.isArray(topLevelItem.item)) continue;
    
    for (const item of topLevelItem.item) {
      const operation = parseOperation(item, category);
      if (operation) {
        operations.push(operation);
      }
    }
  }
  
  return { operations, categories: Array.from(categories) };
}

export function parseSchema(schemaPath, allowedFolders = null) {
  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schemaData = JSON.parse(schemaContent);
    
    return extractOperations(schemaData, allowedFolders);
  } catch (error) {
    console.warn(`Failed to parse schema from ${schemaPath}:`, error.message);
    return { operations: [], categories: [] };
  }
}

