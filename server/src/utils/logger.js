const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || "info"] ?? 1;

export const logger = {
  debug: (...args) => currentLevel <= 0 && console.debug("[DEBUG]", ...args),
  info: (...args) => currentLevel <= 1 && console.log("[INFO]", ...args),
  warn: (...args) => currentLevel <= 2 && console.warn("[WARN]", ...args),
  error: (...args) => currentLevel <= 3 && console.error("[ERROR]", ...args),
};
