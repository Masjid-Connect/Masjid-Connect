/**
 * Django REST API client for Masjid Connect.
 * Wraps all REST endpoints with token auth.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Sentry } from '@/lib/sentry';
import type { Mosque, Announcement, MosqueEvent, MosqueAdminRole, AnnouncementCreatePayload, EventCreatePayload , MosquePrayerTimeResponse } from '@/types';

// ── Prayer Times ────────────────────────────────────────────────────


const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.salafimasjid.app/api/v1';

// Ensure HTTPS in production
if (__DEV__ === false && !API_URL.startsWith('https://')) {
  throw new Error('API_URL must use HTTPS in production');
}

const KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
};

/** Stored auth token for Authorization header */
let _token: string | null = null;
let _user: AuthUser | null = null;

interface AuthUser {
  id: string;
  email: string;
  name: string;
  date_joined: string;
}

// SecureStore is not available on web — fall back to AsyncStorage
const isSecureStoreAvailable = Platform.OS !== 'web';

async function secureGet(key: string): Promise<string | null> {
  if (isSecureStoreAvailable) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

async function loadToken() {
  if (_token) return;
  _token = await secureGet(KEYS.AUTH_TOKEN);
  const raw = await secureGet(KEYS.AUTH_USER);
  if (raw) {
    try {
      _user = JSON.parse(raw);
    } catch {
      // Corrupted user data — clear it so the app doesn't crash on every startup
      await secureDelete(KEYS.AUTH_USER);
      _user = null;
    }
  }
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = `Token ${_token}`;
  return h;
}

/** Default request timeout — 30 seconds */
const REQUEST_TIMEOUT_MS = 30_000;

/** Retry a fetch with exponential backoff on network failures */
async function fetchWithRetry(url: string, init: RequestInit, retries: number = 2): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...init,
        signal: init.signal ?? controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on network errors (TypeError from fetch), not on successful HTTP responses
      if (attempt < retries) {
        const baseDelay = Math.pow(2, attempt) * 1000; // 1s, 2s
        const delay = baseDelay * (0.5 + Math.random()); // jitter to avoid thundering herd
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  await loadToken();
  const url = `${API_URL}${path}`;
  const response = await fetchWithRetry(url, {
    ...options,
    headers: { ...headers(), ...(options.headers as Record<string, string>) },
  });

  // If we get 401, clear any stored token and retry without auth.
  // DRF rejects invalid tokens even on IsAuthenticatedOrReadOnly endpoints,
  // so retrying without the header allows read-only access to succeed.
  if (response.status === 401) {
    const hadToken = !!_token;
    _token = null;
    _user = null;
    await secureDelete(KEYS.AUTH_TOKEN);
    await secureDelete(KEYS.AUTH_USER);

    // Only retry read requests — write requests genuinely need auth
    const method = (options.method || 'GET').toUpperCase();
    if (hadToken && (method === 'GET' || method === 'HEAD')) {
      const retry = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json' },
      });
      if (!retry.ok) {
        const body = await retry.text();
        throw new Error(`API ${retry.status}: ${body}`);
      }
      if (retry.status === 204) return undefined as T;
      return retry.json();
    }
  }

  if (!response.ok) {
    // Parse error detail from API if available, but don't leak raw responses
    let detail = '';
    try {
      const body = await response.json();
      detail = body.detail || '';
    } catch {
      // Response wasn't JSON
    }
    // Sanitize: only pass through known safe detail strings for 400s.
    // Drop anything that looks like a stack trace, SQL, or internal path.
    const isSafeDetail = detail
      && detail.length < 200
      && !/traceback|exception|sql|\/home\//i.test(detail);
    const messages: Record<number, string> = {
      400: (isSafeDetail ? detail : '') || 'Invalid request',
      401: 'Please sign in again',
      403: 'You do not have permission',
      404: 'Not found',
      429: 'Too many requests. Please try again later',
      500: 'Something went wrong. Please try again later',
      502: 'Service temporarily unavailable',
      503: 'Service temporarily unavailable',
    };
    const errorMsg = messages[response.status] || `Request failed. Please try again later`;
    const apiError = new Error(errorMsg);
    // Report server errors (5xx) and unexpected failures to Sentry — include raw detail for debugging
    if (response.status >= 500) {
      Sentry.captureException(apiError, { extra: { url, status: response.status, detail } });
    }
    throw apiError;
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// ── Auth ──────────────────────────────────────────────────────────────

export const auth = {
  async login(email: string, password: string) {
    const data = await request<{ token: string; user: AuthUser }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    _token = data.token;
    _user = data.user;
    await secureSet(KEYS.AUTH_TOKEN, data.token);
    await secureSet(KEYS.AUTH_USER, JSON.stringify(data.user));
    return data;
  },

  async logout() {
    try {
      await request('/auth/logout/', { method: 'POST' });
    } catch {
      // Ignore — token may already be invalid
    }
    _token = null;
    _user = null;
    await secureDelete(KEYS.AUTH_TOKEN);
    await secureDelete(KEYS.AUTH_USER);
  },

  get isLoggedIn() {
    return _token !== null;
  },

  get user() {
    return _user;
  },

  /** Call once on app startup to hydrate from storage */
  async hydrate() {
    await loadToken();
  },

};

// ── Paginated response shape — matches backend AppPageNumberPagination
// (see backend/api/pagination.py). The custom class replaces DRF's default
// { count, next, previous, results } with { items, totalItems, hasMore }.
// Call sites below use `data.items`, `data.totalItems`, `data.hasMore`.
//
// If you find yourself reading `.results` or `.count` anywhere, the call
// is against the old shape and must be updated — the whole backend
// returns the new shape uniformly.

interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  hasMore: boolean;
}

// ── Mosques ──────────────────────────────────────────────────────────

/** Map API mosque → frontend Mosque type. Handles both full detail and list (subset) responses. */
function mapMosque(raw: Record<string, unknown>): Mosque {
  return {
    id: raw.id as string,
    name: raw.name as string,
    address: (raw.address as string) || '',
    city: (raw.city as string) || '',
    state: (raw.state as string) || '',
    country: (raw.country as string) || '',
    latitude: (raw.latitude as number) || 0,
    longitude: (raw.longitude as number) || 0,
    calculation_method: String(raw.calculation_method ?? ''),
    jumua_time: (raw.jumua_time as string) || null,
    contact_phone: (raw.contact_phone as string) || '',
    contact_email: (raw.contact_email as string) || '',
    website: (raw.website as string) || '',
    photo: (raw.photo as string) || '',
    created: (raw.created as string) || '',
    updated: (raw.updated as string) || '',
  };
}

export const mosques = {
  async list(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await request<PaginatedResponse<Record<string, unknown>>>(`/mosques/${params}`);
    return {
      items: data.items.map(mapMosque),
      totalItems: data.totalItems,
      hasMore: data.hasMore,
    };
  },

  async getById(id: string) {
    const raw = await request<Record<string, unknown>>(`/mosques/${id}/`);
    return mapMosque(raw);
  },

  async nearby(latitude: number, longitude: number, radiusKm: number = 50) {
    const data = await request<(Record<string, unknown> & { distance: number })[]>(
      `/mosques/nearby/?lat=${latitude}&lng=${longitude}&radius=${radiusKm}`
    );
    return data.map((m) => ({ ...mapMosque(m), distance: m.distance }));
  },
};

// ── Announcements ────────────────────────────────────────────────────

function mapAnnouncement(raw: Record<string, unknown>): Announcement {
  const mosqueDetail = raw.mosque_detail as Record<string, unknown> | undefined;
  return {
    id: raw.id as string,
    mosque: raw.mosque as string,
    title: raw.title as string,
    body: raw.body as string,
    priority: raw.priority as 'normal' | 'urgent' | 'janazah',
    published_at: raw.published_at as string,
    expires_at: (raw.expires_at as string) || null,
    author: (raw.author as string) || '',
    expand: mosqueDetail
      ? { mosque: mapMosque(mosqueDetail) }
      : undefined,
  };
}

export const announcements = {
  async list(mosqueIds: string[], page?: number) {
    const parts: string[] = [];
    if (mosqueIds.length > 0) parts.push(`mosque_ids=${mosqueIds.join(',')}`);
    if (page && page > 1) parts.push(`page=${page}`);
    const params = parts.length > 0 ? `?${parts.join('&')}` : '';
    const data = await request<PaginatedResponse<Record<string, unknown>>>(`/announcements/${params}`);
    return {
      items: data.items.map(mapAnnouncement),
      totalItems: data.totalItems,
      hasMore: data.hasMore,
    };
  },

  async create(payload: AnnouncementCreatePayload) {
    return request<Record<string, unknown>>('/announcements/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(mapAnnouncement);
  },

  async update(id: string, payload: Partial<AnnouncementCreatePayload>) {
    return request<Record<string, unknown>>(`/announcements/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }).then(mapAnnouncement);
  },

  async delete(id: string) {
    return request<void>(`/announcements/${id}/`, { method: 'DELETE' });
  },

  // Realtime not supported in Django REST — use polling via refresh
  subscribe(_mosqueIds: string[], _callback: (data: Announcement) => void) {
    // No-op: Django doesn't support realtime subscriptions out of the box.
    // The app uses pull-to-refresh instead.
  },

  unsubscribe() {
    // No-op
  },
};

// ── Events ───────────────────────────────────────────────────────────

function mapEvent(raw: Record<string, unknown>): MosqueEvent {
  const mosqueDetail = raw.mosque_detail as Record<string, unknown> | undefined;
  return {
    id: raw.id as string,
    mosque: raw.mosque as string,
    title: raw.title as string,
    description: (raw.description as string) || '',
    speaker: (raw.speaker as string) || '',
    event_date: raw.event_date as string,
    start_time: raw.start_time as string,
    end_time: (raw.end_time as string) || null,
    location: (raw.location as string) || '',
    recurring: (raw.recurring as null | 'weekly' | 'monthly') || null,
    category: raw.category as MosqueEvent['category'],
    author: (raw.author as string) || '',
    expand: mosqueDetail
      ? { mosque: mapMosque(mosqueDetail) }
      : undefined,
  };
}

export const events = {
  async list(mosqueIds: string[], fromDate?: string, category?: string, page?: number) {
    const parts: string[] = [];
    if (mosqueIds.length > 0) parts.push(`mosque_ids=${mosqueIds.join(',')}`);
    if (fromDate) parts.push(`from_date=${fromDate}`);
    if (category) parts.push(`category=${encodeURIComponent(category)}`);
    if (page && page > 1) parts.push(`page=${page}`);
    const params = parts.length > 0 ? `?${parts.join('&')}` : '';
    const data = await request<PaginatedResponse<Record<string, unknown>>>(`/events/${params}`);
    return {
      items: data.items.map(mapEvent),
      totalItems: data.totalItems,
      hasMore: data.hasMore,
    };
  },

  async getById(id: string) {
    const raw = await request<Record<string, unknown>>(`/events/${id}/`);
    return mapEvent(raw);
  },

  async create(payload: EventCreatePayload) {
    return request<Record<string, unknown>>('/events/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(mapEvent);
  },

  async update(id: string, payload: Partial<EventCreatePayload>) {
    return request<Record<string, unknown>>(`/events/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }).then(mapEvent);
  },

  async delete(id: string) {
    return request<void>(`/events/${id}/`, { method: 'DELETE' });
  },
};

// ── Push Tokens ──────────────────────────────────────────────────────

// ── Feedback ────────────────────────────────────────────────────────

interface FeedbackPayload {
  type: 'bug_report' | 'feature_request';
  category: string;
  description: string;
  device_info: Record<string, string>;
}

export const feedback = {
  async submit(data: FeedbackPayload) {
    return request<{ id: string; type: string; category: string; status: string }>(
      '/feedback/',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },
};

// ── Push Tokens ──────────────────────────────────────────────────────

// ── Donations ──────────────────────────────────────────────────────

export const donations = {
  /**
   * Create a Stripe Checkout Session and return the hosted checkout URL.
   *
   * The backend responds with a 303 redirect to Stripe's hosted page.
   * We fetch with redirect: 'manual' to capture the Location header,
   * then return the URL for the caller to open in a browser.
   */
  async createCheckoutUrl(
    amountPence: number,
    currency: string,
    frequency: 'one-time' | 'monthly',
    options?: { giftAid?: boolean; coverFees?: boolean },
  ): Promise<string | null> {
    const returnUrl = 'https://salafimasjid.app/donate';
    const url = `${API_URL}/donate/checkout/`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPence,
          currency,
          frequency,
          return_url: returnUrl,
          gift_aid: options?.giftAid ? 'yes' : 'no',
          cover_fees: options?.coverFees ? 'yes' : 'no',
          ui_mode: 'url',
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const error = err instanceof Error ? err : new Error(String(err));
      Sentry.captureException(error, { extra: { url } });
      throw new Error('Unable to connect to payment service. Please try again.');
    }
    clearTimeout(timeoutId);

    // If backend returned JSON with checkout_url (ui_mode=url supported)
    const contentType = response.headers.get('Content-Type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const body = await response.json();
      if (body.checkout_url) return body.checkout_url;
    }

    // Fallback: fetch auto-followed the 303 redirect to Stripe's hosted page.
    // response.url contains the final destination URL after redirect.
    if (response.url && response.url.includes('checkout.stripe.com')) {
      return response.url;
    }

    // Error response
    if (!response.ok) {
      let detail = '';
      try {
        if (contentType.includes('application/json')) {
          const body = await response.json();
          detail = body.detail || '';
        }
      } catch {
        // Not JSON
      }
      throw new Error(detail || 'Payment request failed');
    }

    return null;
  },

  /** Check the status of a completed Stripe checkout session. */
  async getSessionStatus(sessionId: string) {
    return request<{
      status: string;
    }>(`/donate/session-status/?session_id=${encodeURIComponent(sessionId)}`);
  },
};

// ── Admin Roles ─────────────────────────────────────────────────────

export const adminRoles = {
  /** Fetch mosques the current user administers via dedicated endpoint. */
  async list(): Promise<MosqueAdminRole[]> {
    if (!auth.isLoggedIn) return [];
    try {
      const data = await request<{ id: string; mosque: string; user: string; role: string; created: string }[]>('/auth/admin-roles/');
      return data.map((r) => ({
        id: r.id,
        mosque: r.mosque,
        user: r.user,
        role: r.role as 'admin' | 'super_admin',
        created: r.created,
      }));
    } catch {
      return [];
    }
  },
};

export const prayerTimes = {
  /**
   * Fetch jama'ah times for a mosque on a specific date.
   * Returns null if no data is available (404 or empty results).
   */
  async getByDate(mosqueId: string, date: string): Promise<MosquePrayerTimeResponse | null> {
    try {
      const data = await request<PaginatedResponse<MosquePrayerTimeResponse>>(
        `/mosques/${mosqueId}/prayer-times/?date=${date}`,
      );
      return data.items.length > 0 ? data.items[0] : null;
    } catch (err) {
      Sentry.captureException(err, { extra: { mosqueId, date, context: 'prayer times fetch' } });
      return null;
    }
  },

  /**
   * Fetch jama'ah times for a date range.
   */
  async getRange(mosqueId: string, fromDate: string, toDate: string): Promise<MosquePrayerTimeResponse[]> {
    const data = await request<PaginatedResponse<MosquePrayerTimeResponse>>(
      `/mosques/${mosqueId}/prayer-times/?from_date=${fromDate}&to_date=${toDate}`,
    );
    return data.items;
  },
};

// ── Push Tokens ──────────────────────────────────────────────────────

export const pushTokens = {
  async register(token: string, platform: 'ios' | 'android') {
    return request('/push-tokens/', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  },
};
