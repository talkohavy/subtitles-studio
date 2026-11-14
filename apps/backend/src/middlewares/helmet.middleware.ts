import {
  contentSecurityPolicy,
  crossOriginEmbedderPolicy,
  crossOriginOpenerPolicy,
  crossOriginResourcePolicy,
  originAgentCluster,
  referrerPolicy,
  strictTransportSecurity,
  xContentTypeOptions,
  xDnsPrefetchControl,
  xDownloadOptions,
  xFrameOptions,
  xPermittedCrossDomainPolicies,
  xXssProtection,
} from 'helmet';
import type { Application } from 'express';

/**
 * @express
 *
 * The CSP matters when this server also serves the built frontend: the editor plays the dropped video from a
 * `blob:` URL, draws its frames into canvases, and exports through `blob:` downloads.
 */
export function registerHelmetMiddleware(app: Application) {
  app.use(
    contentSecurityPolicy({
      directives: {
        'img-src': ["'self'", 'data:', 'blob:'],
        'media-src': ["'self'", 'blob:'],
        'worker-src': ["'self'", 'blob:'],
        'connect-src': ["'self'", 'blob:'],
        'font-src': ["'self'", 'data:'],
        'script-src': ["'self'", "'wasm-unsafe-eval'"],
        // The app can be self-hosted over plain http (e.g. on a LAN), where upgrading would break every request.
        'upgrade-insecure-requests': null,
      },
    }),
  );
  app.use(crossOriginEmbedderPolicy({ policy: 'require-corp' }));
  app.use(crossOriginOpenerPolicy({ policy: 'same-origin' }));
  app.use(crossOriginResourcePolicy({ policy: 'same-origin' }));
  app.use(originAgentCluster());
  app.use(referrerPolicy({ policy: 'no-referrer' }));
  app.use(strictTransportSecurity());
  app.use(xContentTypeOptions());
  app.use(xDnsPrefetchControl({ allow: false }));
  app.use(xDownloadOptions());
  app.use(xFrameOptions({ action: 'sameorigin' }));
  app.use(xPermittedCrossDomainPolicies({ permittedPolicies: 'none' }));
  app.use(xXssProtection());
}
