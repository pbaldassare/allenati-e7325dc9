/**
 * Centralized logger.
 * In production only `error` level is forwarded to the console.
 * In development everything is shown.
 *
 * This wrapper keeps the codebase ready for future integration with
 * Sentry / Logflare / OneSignal logs without touching call sites.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const isProd = import.meta.env.PROD;

function emit(level: Level, args: unknown[]) {
  if (isProd && level !== 'error' && level !== 'warn') return;
  // eslint-disable-next-line no-console
  (console[level] ?? console.log).apply(console, args as never);
}

export const logger = {
  debug: (...args: unknown[]) => emit('debug', args),
  info: (...args: unknown[]) => emit('info', args),
  warn: (...args: unknown[]) => emit('warn', args),
  error: (...args: unknown[]) => emit('error', args),
};

export default logger;
