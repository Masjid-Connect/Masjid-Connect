import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/**
 * Initialize Sentry error tracking.
 * Does nothing if no DSN is configured (safe for local dev).
 */
export function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    // Send 100% of errors, sample 10% of performance traces
    tracesSampleRate: 0.1,
    // Tag with environment
    environment: __DEV__ ? 'development' : 'production',
    // App version for release tracking
    release: Constants.expoConfig?.version ?? '1.0.0',
    // Scrub PII — never send user emails or tokens
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      // Scrub auth tokens from request data attached to error events
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.authorization;
      }
      return event;
    },
    // Strip auth tokens from breadcrumbs (e.g. HTTP request breadcrumbs)
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http' || breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data) {
          delete breadcrumb.data['Authorization'];
          delete breadcrumb.data['authorization'];
          // Strip from request headers if present
          if (breadcrumb.data['request_headers']) {
            delete breadcrumb.data['request_headers']['Authorization'];
            delete breadcrumb.data['request_headers']['authorization'];
          }
          if (breadcrumb.data.headers) {
            delete breadcrumb.data.headers.Authorization;
            delete breadcrumb.data.headers.authorization;
          }
          // Scrub tokens from URL query strings if present
          if (typeof breadcrumb.data.url === 'string') {
            breadcrumb.data.url = breadcrumb.data.url.replace(
              /token=[^&]+/gi,
              'token=[REDACTED]',
            );
          }
        }
      }
      return breadcrumb;
    },
  });
}

export { Sentry };
