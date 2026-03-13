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
  priority: 'normal' | 'urgent';
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

export interface UserSubscription {
  id: string;
  user: string;
  mosque: string;
  notify_prayers: boolean;
  notify_announcements: boolean;
  notify_events: boolean;
  prayer_reminder_minutes: number;
}

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
  fajr_jamat: string;
  dhuhr_jamat: string;
  asr_jamat: string;
  maghrib_jamat: string;
  isha_jamat: string;
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
  time: Date;
  jamaahTime: Date | null;
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

export const EVENT_CATEGORY_COLORS: Record<EventCategory, string> = {
  lesson: '#1B4965',
  lecture: '#2D6A4F',
  quran_school: '#C8A951',
  youth: '#6A5ACD',
  sisters: '#C44536',
  community: '#2A6A8F',
};
