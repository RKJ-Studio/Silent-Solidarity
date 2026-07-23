import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const baseOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
};

// Only attempt to enable pino-pretty when explicitly running in non-production
// (local development). Do NOT reference or require pino-pretty in production so
// that it can be listed as a devDependency and omitted from production installs.
if (!isProduction) {
  try {
    // resolve the installed path to pino-pretty; if it's not installed this
    // will throw and we'll fall back to the default JSON logger.
    // We use require.resolve so the bundler/node runtime can locate the module
    // only when needed in development.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const prettyPath = typeof require === "function" ? require.resolve("pino-pretty") : undefined;

    if (prettyPath) {
      // pino accepts a transport option with a target path. Using the resolved
      // path avoids the error where pino can't determine the transport target
      // for "pino-pretty" in production builds where it's not installed.
      // @ts-ignore - pino types for transport shape are loose across versions
      (baseOptions as any).transport = {
        target: prettyPath,
        options: { colorize: true },
      };
    }
  } catch (err) {
    // pino-pretty not available — silently continue with JSON logger.
  }
}

export const logger = pino(baseOptions);
