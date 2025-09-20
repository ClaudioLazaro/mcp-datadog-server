# Datadog Tools

This file is auto-generated. Do not edit manually.

### 
create_dashboards


Create a dashboard using the specified options. When defining queries in your widgets, take note of which queries should have the `as_count()` or `as_rate()` modifiers appended.
Refer to the following [documentation](https://docs.datadoghq.com/developers/metrics/type_modifiers/?tab=count#in-application-modifiers) for more information on these modifiers.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_dashboard


Get a dashboard using the specified ID.

**Parameters:**
* 
path
: 
Path params: dashboard_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_dashboards


Get all dashboards.

**Note**: This query will only return custom created or cloned dashboards.
This query will not return preset dashboards.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
update_dashboard


Update a dashboard using the specified ID.

**Parameters:**
* 
path
: 
Path params: dashboard_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
delete_dashboard


Delete a dashboard using the specified ID.

**Parameters:**
* 
path
: 
Path params: dashboard_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
delete_dashboards


Delete dashboards using the specified IDs. If there are any failures, no dashboards will be deleted (partial success is not allowed).

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
update_dashboards


Restore dashboards using the specified IDs. If there are any failures, no dashboards will be restored (partial success is not allowed).

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
create_dashboard_publics


Share a specified private dashboard, generating a URL at which it can be publicly viewed.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_dashboard_public


Fetch an existing shared dashboard's sharing metadata associated with the specified token.

**Parameters:**
* 
path
: 
Path params: token
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
update_dashboard_public


Update a shared dashboard associated with the specified token.

**Parameters:**
* 
path
: 
Path params: token
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
create_dashboard_public_invitation


Send emails to specified email addresses containing links to access a given authenticated shared dashboard. Email addresses must already belong to the authenticated shared dashboard's share_list.

**Parameters:**
* 
path
: 
Path params: token
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_dashboard_public_invitation


Describe the invitations that exist for the given shared dashboard (paginated).

**Parameters:**
* 
path
: 
Path params: token
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
delete_dashboard_public


Revoke the public URL for a dashboard (rendering it private) associated with the specified token.

**Parameters:**
* 
path
: 
Path params: token
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
delete_dashboard_public_invitation


Revoke previously sent invitation emails and active sessions used to access a given shared dashboard for specific email addresses.

**Parameters:**
* 
path
: 
Path params: token
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
send_logs


Send your logs to your Datadog platform over HTTP. Limits per HTTP request are:

- Maximum content size per payload (uncompressed): 5MB
- Maximum size for a single log: 1MB
- Maximum array size if sending multiple logs in an array: 1000 entries

Any log exceeding 1MB is accepted and truncated by Datadog:
- For a single log request, the API truncates the log at 1MB and returns a 2xx.
- For a multi-logs request, the API processes all logs, truncates only logs larger than 1MB, and returns a 2xx.

D

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
aggregate_logs_analytics


The API endpoint to aggregate events into buckets and compute metrics and timeseries.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
search_logs_events


List endpoint returns logs that match a log search query.
[Results are paginated][1].

Use this endpoint to build complex logs filtering and search.

**If you are considering archiving logs for your organization,
consider use of the Datadog archive capabilities instead of the log list API.
See [Datadog Logs Archive documentation][2].**

[1]: /logs/guide/collect-multiple-logs-with-pagination
[2]: https://docs.datadoghq.com/logs/archives

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_logs_events


List endpoint returns logs that match a log search query.
[Results are paginated][1].

Use this endpoint to see your latest logs.

**If you are considering archiving logs for your organization,
consider use of the Datadog archive capabilities instead of the log list API.
See [Datadog Logs Archive documentation][2].**

[1]: /logs/guide/collect-multiple-logs-with-pagination
[2]: https://docs.datadoghq.com/logs/archives

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
create_metric_tags


Create and define a list of queryable tag keys for an existing count/gauge/rate/distribution metric.
Optionally, include percentile aggregations on any distribution metric. By setting `exclude_tags_mode`
to true, the behavior is changed from an allow-list to a deny-list, and tags in the defined list are
not queryable. Can only be used with application keys of users with the `Manage Tags for Metrics`
permission.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_metrics_v1


Get the list of actively reporting metrics from a given time until now.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
query_timeseries


Query timeseries data across various data sources and
process the data by applying formulas and functions.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
submit_distribution_points


The distribution points end-point allows you to post distribution data that can be graphed on Datadog’s dashboards.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
submit_series


The metrics end-point allows you to post time-series data that can be graphed on Datadog’s dashboards.
The maximum payload size is 500 kilobytes (512000 bytes). Compressed payloads must have a decompressed size of less than 5 megabytes (5242880 bytes).

If you’re submitting metrics directly to the Datadog API without using DogStatsD, expect:

- 64 bits for the timestamp
- 64 bits for the value
- 20 bytes for the metric names
- 50 bytes for the timeseries
- The full payload is approximately 100 b

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_metric


Get metadata about a specific metric.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_metric_tags


Returns the tag configuration for the given metric name.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
query_scalars


Query scalar values (as seen on Query Value, Table, and Toplist widgets).
Multiple data sources are supported with the ability to
process the data using formulas and functions.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
update_metric


Edit metadata of a specific metric. Find out more about [supported types](https://docs.datadoghq.com/developers/metrics).

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
update_metric_tags


Update the tag configuration of a metric or percentile aggregations of a distribution metric or custom aggregations
of a count, rate, or gauge metric. By setting `exclude_tags_mode` to true the behavior is changed
from an allow-list to a deny-list, and tags in the defined list will not be queryable.
Can only be used with application keys from users with the `Manage Tags for Metrics` permission. This endpoint requires
a tag configuration to be created first.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
delete_metric_tags


Deletes a metric's tag configuration. Can only be used with application
keys from users with the `Manage Tags for Metrics` permission.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
search_resources


Search for metrics from the last 24 hours in Datadog.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_metrics_v2


Returns all metrics that can be configured in the Metrics Summary page or with Metrics without Limits™ (matching additional filters if specified).
Optionally, paginate by using the `page[cursor]` and/or `page[size]` query parameters.
To fetch the first page, pass in a query parameter with either a valid `page[size]` or an empty cursor like `page[cursor]=`. To fetch the next page, pass in the `next_cursor` value from the response as the new `page[cursor]` value.
Once the `meta.pagination.next_cur

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
query_resources


Query timeseries points.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_metric_all_tags


View indexed tag key-value pairs for a given metric name over the previous hour.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_metric_active_configurations


List tags and aggregations that are actively queried on dashboards, notebooks, monitors, the Metrics Explorer, and using the API for a given metric name.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_metric_volumes


View distinct metrics volumes for the given metric name.

Custom metrics generated in-app from other products will return `null` for ingested volumes.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
create_metrics_config_bulk_tags


Create and define a list of queryable tag keys for a set of existing count, gauge, rate, and distribution metrics.
Metrics are selected by passing a metric name prefix. Use the Delete method of this API path to remove tag configurations.
Results can be sent to a set of account email addresses, just like the same operation in the Datadog web app.
If multiple calls include the same metric, the last configuration applied (not by submit order) is used, do not
expect deterministic ordering of concurr

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
delete_metrics_config_bulk_tags


Delete all custom lists of queryable tag keys for a set of existing count, gauge, rate, and distribution metrics.
Metrics are selected by passing a metric name prefix.
Results can be sent to a set of account email addresses, just like the same operation in the Datadog web app.
Can only be used with application keys of users with the `Manage Tags for Metrics` permission.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
estimate_metric


Returns the estimated cardinality for a metric with a given tag, percentile and number of aggregations configuration using Metrics without Limits&trade;.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_metric_assets


Returns dashboards, monitors, notebooks, and SLOs that a metric is stored in, if any.  Updated every 24 hours.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_metric_tag_cardinalities


Returns the cardinality details of tags for a specific metric.

**Parameters:**
* 
path
: 
Path params: metric_name
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
create_monitor


Create a monitor using the specified options.

#### Monitor Types

The type of monitor chosen from:

- anomaly: `query alert`
- APM: `query alert` or `trace-analytics alert`
- composite: `composite`
- custom: `service check`
- forecast: `query alert`
- host: `service check`
- integration: `query alert` or `service check`
- live process: `process alert`
- logs: `log alert`
- metric: `query alert`
- network: `service check`
- outlier: `query alert`
- process: `service check`
- rum: `rum alert`
- S

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
search_monitors


Search and filter your monitors details.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
unmute_monitor


Unmute the specified monitor.

**Parameters:**
* 
path
: 
Path params: monitor_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_monitors


Get all monitors from your organization.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
search_monitor_groups


Search and filter your monitor groups details.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
mute_monitor


Mute the specified monitor.

**Parameters:**
* 
path
: 
Path params: monitor_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
update_monitor


Edit the specified monitor.

**Parameters:**
* 
path
: 
Path params: monitor_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_monitor


Get details about the specified monitor from your organization.

**Parameters:**
* 
path
: 
Path params: monitor_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
delete_monitor


Delete the specified monitor

**Parameters:**
* 
path
: 
Path params: monitor_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
can_delete_monitors


Check if the given monitors can be deleted.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
validate_monitor_v1


Validate the monitor provided in the request.

**Note**: Log monitors require an unscoped App Key.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
validate_monitor_v1_2


Validate the monitor provided in the request.

**Parameters:**
* 
path
: 
Path params: monitor_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_monitor_policy


Get a monitor configuration policy by `policy_id`.

**Parameters:**
* 
path
: 
Path params: policy_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_monitor_policies


Get all monitor configuration policies.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
create_monitor_policies


Create a monitor configuration policy.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
update_monitor_policy


Edit a monitor configuration policy.

**Parameters:**
* 
path
: 
Path params: policy_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
delete_monitor_policy


Delete a monitor configuration policy.

**Parameters:**
* 
path
: 
Path params: policy_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_monitor_notification_rules


Returns a list of all monitor notification rules.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
get_monitor_notification_rule


Returns a monitor notification rule by `rule_id`.

**Parameters:**
* 
path
: 
Path params: rule_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
create_monitor_notification_rules


Creates a monitor notification rule.

**Parameters:**
* 
path
: 
Optional map of path params
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
update_monitor_notification_rule


Updates a monitor notification rule by `rule_id`.

**Parameters:**
* 
path
: 
Path params: rule_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')

---
### 
delete_monitor_notification_rule


Deletes a monitor notification rule by `rule_id`.

**Parameters:**
* 
path
: 
Path params: rule_id
* 
query
: 
Optional querystring parameters
* 
body
: 
Optional request body (object, array, or raw JSON string)
* 
headers
: 
Optional extra headers to include
* 
site
: 
Datadog site (default from DD_SITE, e.g. datadoghq.com)
* 
subdomain
: 
Subdomain for baseUrl (default 'api')
