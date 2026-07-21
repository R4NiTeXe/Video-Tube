import client from "prom-client";
import logger from "./logger.js";

export const register = new client.Registry();

client.collectDefaultMetrics({ register, prefix: "videotube_" });

const httpRequestDuration = new client.Histogram({
  name: "videotube_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

const httpRequestsTotal = new client.Counter({
  name: "videotube_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});
register.registerMetric(httpRequestsTotal);

const activeConnections = new client.Gauge({
  name: "videotube_active_connections",
  help: "Number of active connections",
});
register.registerMetric(activeConnections);

const cacheHitsTotal = new client.Counter({
  name: "videotube_cache_hits_total",
  help: "Total number of cache hits/misses",
  labelNames: ["result"],
});
register.registerMetric(cacheHitsTotal);

const dbQueryDuration = new client.Histogram({
  name: "videotube_db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "collection"],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
});
register.registerMetric(dbQueryDuration);

export const trackRequest = (method, route, status, durationMs) => {
  httpRequestsTotal.inc({ method, route, status: String(status) });
  httpRequestDuration.observe({ method, route, status: String(status) }, durationMs / 1000);
};

export const trackDbQuery = (operation, collection, durationMs) => {
  dbQueryDuration.observe({ operation, collection }, durationMs / 1000);
};

export const trackCacheHit = (hit) => {
  cacheHitsTotal.inc({ result: hit ? "hit" : "miss" });
};

export const incrementConnections = () => activeConnections.inc();
export const decrementConnections = () => activeConnections.dec();
export { activeConnections, httpRequestDuration, httpRequestsTotal, dbQueryDuration, cacheHitsTotal };

export const metricsHandler = async (req, res) => {
  const metrics = await register.metrics();
  res.setHeader("Content-Type", register.contentType);
  res.setHeader("Content-Length", Buffer.byteLength(metrics));
  res.end(metrics);
};

export const initMetrics = () => {
  logger.info("Prometheus metrics initialized on GET /metrics");
};
