const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || "info"] ?? 2;

const timestamp = () => new Date().toISOString();

const format = (level, message, meta) => {
  const base = `[${timestamp()}] ${level.toUpperCase()}: ${message}`;
  return meta ? `${base} ${JSON.stringify(meta)}` : base;
};

const logger = {
  error: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.error) console.error(format("error", message, meta));
  },
  warn: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.warn) console.warn(format("warn", message, meta));
  },
  info: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.info) console.log(format("info", message, meta));
  },
  debug: (message, meta) => {
    if (currentLevel >= LOG_LEVELS.debug) console.log(format("debug", message, meta));
  },
};

export default logger;
