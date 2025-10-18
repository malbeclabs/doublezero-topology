/**
 * Simple Logger Utility
 *
 * Provides structured logging for API routes in production.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context } = entry;
  const levelUpper = level.toUpperCase().padEnd(5);
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${levelUpper} ${message}${contextStr}`;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(formatted);
      }
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
};
