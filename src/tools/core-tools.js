import { z } from 'zod';

function formatToolName(name) {
  return name
    .split(/[_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createToolResponse(data, error = null, meta = {}) {
  if (error) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `Error: ${error.message || error}`
      }],
      structuredContent: {
        error: error.message || error,
        meta: { ok: false, ...meta },
      },
    };
  }

  const content = typeof data === 'string'
    ? data
    : JSON.stringify(data, null, 2);

  return {
    isError: false,
    content: [{ type: 'text', text: content }],
    structuredContent: {
      data,
      meta: { ok: true, ...meta },
    },
  };
}

function createProgressResponse(progressInfo, data = null) {
  const { step, total, current, message, estimatedTimeRemaining } = progressInfo;

  const progressText = data
    ? `${message || 'Operation completed'}\n\nResults:\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`
    : `${message || 'Processing...'} (${current || step}/${total})${estimatedTimeRemaining ? ` - ETA: ${estimatedTimeRemaining}s` : ''}`;

  return {
    isError: false,
    content: [{ type: 'text', text: progressText }],
    structuredContent: {
      progress: {
        step: step || current || 0,
        total: total || 100,
        percentage: total > 0 ? Math.round(((step || current || 0) / total) * 100) : 0,
        message: message || 'Processing...',
        completed: step === total || current === total || Boolean(data),
        estimatedTimeRemaining,
      },
      data: data || null,
      meta: {
        ok: true,
        hasProgress: true,
        timestamp: new Date().toISOString(),
      },
    },
  };
}

async function executeWithProgress(operation, client, args, progressCallback) {
  const isLongRunningOperation = (operation, args) => {
    // Detect long-running operations based on category and parameters
    const longRunningCategories = ['Logs', 'Metrics', 'Spans Metrics', 'Events'];
    const largeBatchCategories = ['Dashboards', 'Monitors', 'Synthetics'];

    if (longRunningCategories.includes(operation.category)) return true;
    if (largeBatchCategories.includes(operation.category) && args.count > 100) return true;
    if (operation.method === 'POST' && operation.category.includes('Bulk')) return true;

    return false;
  };

  const shouldShowProgress = isLongRunningOperation(operation, args);
  let startTime = Date.now();

  if (shouldShowProgress && progressCallback) {
    progressCallback(createProgressResponse({
      step: 0,
      total: 100,
      message: 'Initiating request to Datadog API...',
    }));
  }

  const { path: pathParams, query, body, headers, ...rest } = args;
  const mergedQuery = { ...query, ...rest };

  // Simulate progress for long operations
  if (shouldShowProgress && progressCallback) {
    progressCallback(createProgressResponse({
      step: 25,
      total: 100,
      message: 'Sending request...',
      estimatedTimeRemaining: Math.round((Date.now() - startTime) * 3 / 1000),
    }));
  }

  const response = await client.request({
    method: operation.method,
    rawUrlTemplate: operation.rawUrlTemplate,
    pathParams,
    query: mergedQuery,
    body,
    headers,
  });

  if (shouldShowProgress && progressCallback) {
    progressCallback(createProgressResponse({
      step: 75,
      total: 100,
      message: 'Processing response data...',
      estimatedTimeRemaining: Math.round((Date.now() - startTime) / 4000),
    }));
  }

  return response;
}

export function createCoreTool(operation, client) {
  return {
    name: operation.name,
    description: operation.description,
    category: operation.category,

    async execute(args = {}, progressCallback = null) {
      try {
        const response = await executeWithProgress(operation, client, args, progressCallback);

        // Final progress update with completion
        if (progressCallback) {
          progressCallback(createProgressResponse({
            step: 100,
            total: 100,
            message: 'Operation completed successfully',
          }, response.data));
        }

        return createToolResponse(response.data, null, {
          status: response.status,
          url: response.url,
          method: response.method,
          hasProgress: Boolean(progressCallback),
        });

      } catch (error) {
        if (progressCallback) {
          progressCallback(createProgressResponse({
            step: 0,
            total: 100,
            message: `Operation failed: ${error.message}`,
          }));
        }

        return createToolResponse(null, error, {
          operation: operation.name,
          category: operation.category,
        });
      }
    },
  };
}

export { formatToolName, createToolResponse, createProgressResponse };
