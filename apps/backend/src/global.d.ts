import type { OptimizedApp } from './common/types';

declare module 'express' {
  export interface Request {
    query: any;
    /**
     * Only exists after applying the `joiQueryMiddleware`.
     */
    queryParsed?: any;
    /**
     * Only exists after applying the `joiBodyMiddleware`.
     */
    bodyParsed?: any;
  }

  export interface Application extends OptimizedApp {
    no_keys: never;
  }
}
