import winston from "winston";
import path from "path";
import { ENV } from "./env.js";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Define log levels (optional, defaults are npm levels: error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6)

export const logger = winston.createLogger({
  level: ENV.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  defaultMeta: { service: "backend" },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (ENV.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(
          ({ level, message, timestamp, stack, ...meta }) => {
            if (stack) {
              return `${timestamp} ${level}: ${message}\n${stack}`;
            }
            const metaStr = Object.keys(meta).length
              ? JSON.stringify(meta)
              : "";
            return `${timestamp} ${level}: ${message} ${metaStr}`;
          },
        ),
      ),
    }),
  );
}
