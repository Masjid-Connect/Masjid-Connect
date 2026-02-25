import PocketBase from 'pocketbase';
import type { Mosque, Announcement, MosqueEvent, UserSubscription } from '@/types';

// PocketBase instance — configure URL in environment
const POCKETBASE_URL = process.env.EXPO_PUBLIC_POCKETBASE_URL || 'https://pb.mosqueconnect.app';

export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation for realtime compatibility
pb.autoCancellation(false);

/** Auth helpers */
export const auth = {
  async login(email: string, password: string) {
    return pb.collection('users').authWithPassword(email, password);
  },

  async register(email: string, password: string, name: string) {
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name,
    });
    await pb.collection('users').authWithPassword(email, password);
    return user;
  },

  logout() {
    pb.authStore.clear();
  },

  get isLoggedIn() {
    return pb.authStore.isValid;
  },

  get user() {
    return pb.authStore.record;
  },
};

/** Mosque queries */
export const mosques = {
  async list(city?: string) {
    const filter = city ? `city ~ "${city}"` : '';
    return pb.collection('mosques').getList<Mosque>(1, 50, { filter, sort: 'name' });
  },

  async getById(id: string) {
    return pb.collection('mosques').getOne<Mosque>(id);
  },

  async nearby(latitude: number, longitude: number, radiusKm: number = 50) {
    // PocketBase doesn't support geo queries natively,
    // so we fetch all and filter client-side for MVP
    const all = await pb.collection('mosques').getFullList<Mosque>();
    return all
      .map((m) => ({
        ...m,
        distance: haversineKm(latitude, longitude, m.latitude, m.longitude),
      }))
      .filter((m) => m.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  },
};

/** Announcement queries */
export const announcements = {
  async list(mosqueIds: string[]) {
    if (mosqueIds.length === 0) return { items: [], totalItems: 0 };
    const filter = mosqueIds.map((id) => `mosque="${id}"`).join(' || ');
    return pb.collection('announcements').getList<Announcement>(1, 50, {
      filter: `(${filter}) && (expires_at = "" || expires_at > @now)`,
      sort: '-published_at',
      expand: 'mosque',
    });
  },

  subscribe(mosqueIds: string[], callback: (data: Announcement) => void) {
    return pb.collection('announcements').subscribe<Announcement>('*', (e) => {
      if (mosqueIds.includes(e.record.mosque)) {
        callback(e.record);
      }
    });
  },

  unsubscribe() {
    return pb.collection('announcements').unsubscribe('*');
  },
};

/** Event queries */
export const events = {
  async list(mosqueIds: string[], fromDate?: string) {
    if (mosqueIds.length === 0) return { items: [], totalItems: 0 };
    const mosqueFilter = mosqueIds.map((id) => `mosque="${id}"`).join(' || ');
    const dateFilter = fromDate ? ` && event_date >= "${fromDate}"` : '';
    return pb.collection('events').getList<MosqueEvent>(1, 100, {
      filter: `(${mosqueFilter})${dateFilter}`,
      sort: 'event_date,start_time',
      expand: 'mosque',
    });
  },

  async getById(id: string) {
    return pb.collection('events').getOne<MosqueEvent>(id, { expand: 'mosque' });
  },
};

/** Subscription management */
export const subscriptions = {
  async list() {
    if (!auth.user) return [];
    return pb.collection('user_subscriptions').getFullList<UserSubscription>({
      filter: `user="${auth.user.id}"`,
    });
  },

  async subscribe(mosqueId: string) {
    if (!auth.user) throw new Error('Not authenticated');
    return pb.collection('user_subscriptions').create<UserSubscription>({
      user: auth.user.id,
      mosque: mosqueId,
      notify_prayers: true,
      notify_announcements: true,
      notify_events: true,
      prayer_reminder_minutes: 15,
    });
  },

  async unsubscribe(subscriptionId: string) {
    return pb.collection('user_subscriptions').delete(subscriptionId);
  },

  async updatePreferences(id: string, data: Partial<UserSubscription>) {
    return pb.collection('user_subscriptions').update<UserSubscription>(id, data);
  },
};

/** Push token registration */
export const pushTokens = {
  async register(token: string, platform: 'ios' | 'android') {
    if (!auth.user) return;
    try {
      // Try to find existing token
      const existing = await pb.collection('push_tokens').getFirstListItem(
        `user="${auth.user.id}" && token="${token}"`
      );
      // Update if exists
      return pb.collection('push_tokens').update(existing.id, { token, platform });
    } catch {
      // Create new
      return pb.collection('push_tokens').create({
        user: auth.user.id,
        token,
        platform,
      });
    }
  },
};

/** Haversine distance calculation */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
