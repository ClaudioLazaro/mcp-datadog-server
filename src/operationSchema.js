import { z } from "zod";

export function createOperationInputSchema(op) {
  return z
    .object({
      path: z
        .record(z.any())
        .optional()
        .describe(
          op.pathVariables?.length
            ? `Path params: ${op.pathVariables.join(", ")}`
            : "Optional map of path params"
        ),
      query: z
        .record(z.any())
        .optional()
        .describe("Optional querystring parameters"),
      body: z
        .any()
        .optional()
        .describe("Optional request body (object, array, or raw JSON string)"),
      headers: z
        .record(z.any())
        .optional()
        .describe("Optional extra headers to include"),
      site: z
        .string()
        .optional()
        .describe("Datadog site (default from DD_SITE, e.g. datadoghq.com)"),
      subdomain: z
        .string()
        .optional()
        .describe("Subdomain for baseUrl (default 'api')"),
    })
    .passthrough();
}
