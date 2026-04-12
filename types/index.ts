/** Core types for Mosque Connect */

export interface Mosque {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  calculation_method: string;
  jumua_time: string | null;
  contact_phone: string;
  contact_email: string;
  website: string;
  photo: string;
  created: string;
  updated: string;
}

export interface Announcement {
  id: string;
  mosque: string;
  title: string;
  body: string;
  priority: 'normal' | 'urgent' | 'janazah';
  published_at: string;
  expires_at: string | null;
  author: string;
  expand?: {
    mosque?: Mosque;
  };
}

export interface MosqueEvent {
  id: string;
  mosque: string;
  title: string;
  description: string;
  speaker: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location: string;
  recurring: null | 'weekly' | 'monthly';
  category: EventCategory;
  author: string;
  expand?: {
    mosque?: Mosque;
  };
}

export type EventCategory =
  | 'lesson'
  | 'lecture'
  | 'quran_school'
  | 'youth'
  | 'sisters'
  | 'community';

export interface PrayerTimesData {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

/** Jama'ah (congregation) times from mosque timetable — sunrise excluded */
export interface JamaahTimesData {
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

/** Raw API response from GET /api/v1/mosques/{id}/prayer-times/ */
export interface MosquePrayerTimeResponse {
  id: string;
  mosque: string;
  date: string;
  fajr_jamat: string | null;
  dhuhr_jamat: string | null;
  asr_jamat: string | null;
  maghrib_jamat: string | null;
  isha_jamat: string | null;
  fajr_start: string | null;
  sunrise: string | null;
  dhuhr_start: string | null;
  asr_start: string | null;
  isha_start: string | null;
}

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerTimeEntry {
  name: PrayerName;
  label: string;
  /** The primary display time — jama'ah time from masjid timetable (or calculated as last resort) */
  time: Date;
  /** Optional prayer start/begins time from masjid timetable (NOT from Aladhan) */
  startTime: Date | null;
}

export const PRAYER_LABELS: Record<PrayerName, { en: string; ar: string }> = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  sunrise: { en: 'Sunrise', ar: 'الشروق' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' },
};

export const CALCULATION_METHODS: Record<string, { label: string; code: number }> = {
  ISNA: { label: 'ISNA (North America)', code: 2 },
  MWL: { label: 'Muslim World League', code: 3 },
  UmmAlQura: { label: 'Umm Al-Qura (Saudi)', code: 4 },
  Egyptian: { label: 'Egyptian General Authority', code: 5 },
  Karachi: { label: 'University of Karachi', code: 1 },
};

export interface MosqueAdminRole {
  id: string;
  mosque: string;
  user: string;
  role: 'admin' | 'super_admin';
  created: string;
  mosque_detail?: {
    id: string;
    name: string;
    city: string;
    country: string;
  };
}

export interface AnnouncementCreatePayload {
  mosque: string;
  title: string;
  body: string;
  priority: 'normal' | 'urgent' | 'janazah';
  expires_at?: string | null;
}

export interface EventCreatePayload {
  mosque: string;
  title: string;
  description: string;
  speaker: string;
  event_date: string;
  start_time: string;
  end_time?: string | null;
  location: string;
  recurring: null | 'weekly' | 'monthly';
  category: EventCategory;
}

export const EVENT_CATEGORY_COLORS: Record<EventCategory, string> = {
  lesson: '#0F2D52',     // sapphire — primary brand
  lecture: '#1A3F6B',    // sapphire-600 — interactive
  quran_school: '#2D6A4F', // sage — Quran study (was gold, reserved for prayer)
  youth: '#6A5ACD',     // violet — youthful energy
  sisters: '#B91C1C',   // crimson
  community: '#64748B', // slate — neutral
};

/** Dark mode variants — lighter shades for visibility on dark surfaces */
export const EVENT_CATEGORY_COLORS_DARK: Record<EventCategory, string> = {
  lesson: '#6BABE5',     // sapphire-400
  lecture: '#8CC0ED',    // lighter sapphire
  quran_school: '#6BCB9B', // sage-400
  youth: '#9B8FE8',     // lighter violet
  sisters: '#F87171',   // crimson-400
  community: '#94A3B8', // slate-400
};
