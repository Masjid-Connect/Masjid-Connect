/**
 * Django REST API client for Masjid Connect.
 * Wraps all REST endpoints with token auth.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mosque, Announcement, MosqueEvent, UserSubscription } from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.mosqueconnect.app/api/v1';

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

async function loadToken() {
  if (_token) return;
  _token = await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
  const raw = await AsyncStorage.getItem(KEYS.AUTH_USER);
  if (raw) _user = JSON.parse(raw);
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = `Token ${_token}`;
  return h;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  await loadToken();
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...headers(), ...(options.headers as Record<string, string>) },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
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
    await AsyncStorage.setItem(KEYS.AUTH_TOKEN, data.token);
    await AsyncStorage.setItem(KEYS.AUTH_USER, JSON.stringify(data.user));
    return data;
  },

  async register(email: string, password: string, name: string) {
    const data = await request<{ token: string; user: AuthUser }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    _token = data.token;
    _user = data.user;
    await AsyncStorage.setItem(KEYS.AUTH_TOKEN, data.token);
    await AsyncStorage.setItem(KEYS.AUTH_USER, JSON.stringify(data.user));
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
    await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(KEYS.AUTH_USER);
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

// ── Paginated response shape from DRF ────────────────────────────────

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

// ── Mosques ──────────────────────────────────────────────────────────

/** Map API mosque → frontend Mosque type */
function mapMosque(raw: Record<string, unknown>): Mosque {
  return {
    id: raw.id as string,
    name: raw.name as string,
    address: raw.address as string,
    city: raw.city as string,
    state: raw.state as string,
    country: raw.country as string,
    latitude: raw.latitude as number,
    longitude: raw.longitude as number,
    calculation_method: String(raw.calculation_method),
    jumua_time: (raw.jumua_time as string) || null,
    contact_phone: (raw.contact_phone as string) || '',
    contact_email: (raw.contact_email as string) || '',
    website: (raw.website as string) || '',
    photo: (raw.photo as string) || '',
    created: raw.created as string,
    updated: raw.updated as string,
  };
}

export const mosques = {
  async list(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await request<PaginatedResponse<Record<string, unknown>>>(`/mosques/${params}`);
    return {
      items: data.results.map(mapMosque),
      totalItems: data.count,
    };
  },

  async getById(id: string) {
    const raw = await request<Record<string, unknown>>(`/mosques/${id}/`);
    return mapMosque(raw);
  },

  async nearby(latitude: number, longitude: number, radiusKm: number = 50) {
    const data = await request<Array<Record<string, unknown> & { distance: number }>>(
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
    priority: raw.priority as 'normal' | 'urgent',
    published_at: raw.published_at as string,
    expires_at: (raw.expires_at as string) || null,
    author: (raw.author as string) || '',
    expand: mosqueDetail
      ? { mosque: mapMosque(mosqueDetail) }
      : undefined,
  };
}

export const announcements = {
  async list(mosqueIds: string[]) {
    if (mosqueIds.length === 0) return { items: [], totalItems: 0 };
    const params = `?mosque_ids=${mosqueIds.join(',')}`;
    const data = await request<PaginatedResponse<Record<string, unknown>>>(`/announcements/${params}`);
    return {
      items: data.results.map(mapAnnouncement),
      totalItems: data.count,
    };
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
  async list(mosqueIds: string[], fromDate?: string) {
    if (mosqueIds.length === 0) return { items: [], totalItems: 0 };
    let params = `?mosque_ids=${mosqueIds.join(',')}`;
    if (fromDate) params += `&from_date=${fromDate}`;
    const data = await request<PaginatedResponse<Record<string, unknown>>>(`/events/${params}`);
    return {
      items: data.results.map(mapEvent),
      totalItems: data.count,
    };
  },

  async getById(id: string) {
    const raw = await request<Record<string, unknown>>(`/events/${id}/`);
    return mapEvent(raw);
  },
};

// ── Subscriptions ────────────────────────────────────────────────────

export const subscriptions = {
  async list(): Promise<UserSubscription[]> {
    if (!auth.isLoggedIn) return [];
    const data = await request<PaginatedResponse<UserSubscription>>('/subscriptions/');
    return data.results;
  },

  async subscribe(mosqueId: string) {
    if (!auth.isLoggedIn) throw new Error('Not authenticated');
    return request<UserSubscription>('/subscriptions/', {
      method: 'POST',
      body: JSON.stringify({
        mosque: mosqueId,
        notify_prayers: true,
        notify_announcements: true,
        notify_events: true,
        prayer_reminder_minutes: 15,
      }),
    });
  },

  async unsubscribe(subscriptionId: string) {
    return request<void>(`/subscriptions/${subscriptionId}/`, { method: 'DELETE' });
  },

  async updatePreferences(id: string, data: Partial<UserSubscription>) {
    return request<UserSubscription>(`/subscriptions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ── Push Tokens ──────────────────────────────────────────────────────

export const pushTokens = {
  async register(token: string, platform: 'ios' | 'android') {
    if (!auth.isLoggedIn) return;
    return request('/push-tokens/', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  },
};
