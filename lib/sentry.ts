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
      return event;
    },
    // Strip auth tokens from HTTP breadcrumbs to prevent leaking to Sentry
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
        }
      }
      return breadcrumb;
    },
  });
}

export { Sentry };
