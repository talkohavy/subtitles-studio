import { ForbiddenError } from '@src/core/errors';

/**
 * @description
 * Usage:
 * When an origin IS ALLOWED, the callback should be called like so:
 * callback(null, true)
 *
 * When an origin is NOT allowed, the callback should be called like so:
 * callback(new ForbiddenError(...))
 */
export function handleCors(allowedOrigins: Array<string>): any {
  return (origin: string, callback: (err: Error | null, origin?: any) => void) => {
    const isAllowed = origin === undefined || allowedOrigins.includes(origin);

    if (isAllowed) return void callback(null, true);

    callback(new ForbiddenError("This origin isn't allowed to call this server."), false);
  };
}
