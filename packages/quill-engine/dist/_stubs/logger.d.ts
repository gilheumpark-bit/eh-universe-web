/**
 * packages/quill-engine/src/_stubs/logger.ts
 *
 * Local logger interface — engine code originally imported
 * @/lib/logger from the renderer. Engine should be host-agnostic,
 * so this stub provides a console-backed implementation that
 * works in any environment.
 *
 * Hosts (main, cli) can replace this by passing their own logger
 * to engine functions in a future refactor.
 */
export interface Logger {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}
export declare const logger: Logger;
export default logger;
