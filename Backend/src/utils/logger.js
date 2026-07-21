import { AsyncLocalStorage } from "async_hooks";
import crypto from "crypto";

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || "info"] ?? 2;
const isProduction = process.env.NODE_ENV === "production";

const timestamp = () => new Date().toISOString();

const generateCorrelationId = () => crypto.randomUUID();

const correlationIdStorage = new AsyncLocalStorage();

const format = (level, message, meta, correlationId) => {
  if (isProduction) {
    return JSON.stringify({
      timestamp: timestamp(),
      level: level.toUpperCase(),
      correlationId: correlationId || undefined,
      message,
      ...(Object.keys(meta).length ? { meta } : {}),
    });
  }
  const base = `[${timestamp()}] [${level.toUpperCase()}]${correlationId ? ` [${correlationId}]` : ""}: ${message}`;
  return Object.keys(meta).length ? `${base} ${JSON.stringify(meta)}` : base;
};

export const runWithCorrelationId = (correlationId, fn) => {
  correlationIdStorage.run({ correlationId }, fn);
};

export const getCorrelationId = () => {
  const store = correlationIdStorage.getStore();
  return store?.correlationId || generateCorrelationId();
};

const logMethod = (level, levelName, message, meta) => {
  if (currentLevel < level) return;
  const correlationId = getCorrelationId();
  const line = format(levelName, message, meta || {}, correlationId);
  if (levelName === "error") console.error(line);
  else if (levelName === "warn") console.warn(line);
  else console.log(line);
};

const logger = {
  error: (message, meta = {}) => logMethod(LOG_LEVELS.error, "error", message, meta),
  warn: (message, meta = {}) => logMethod(LOG_LEVELS.warn, "warn", message, meta),
  info: (message, meta = {}) => logMethod(LOG_LEVELS.info, "info", message, meta),
  debug: (message, meta = {}) => logMethod(LOG_LEVELS.debug, "debug", message, meta),
  child: (context) => ({
    error: (message, meta = {}) => logger.error(message, { ...meta, ...context }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, ...context }),
    info: (message, meta = {}) => logger.info(message, { ...meta, ...context }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, ...context }),
  }),
};

export default logger;