# Plan: Scraped Prayer Times as Primary Source (Frontend Integration)

## Goal
Make scraped jama'ah times from the backend the **primary** source for mosques that have them, with Aladhan API as fallback. The app should show both **start times** (when prayer begins) and **jama'ah times** (when congregation starts) when available.

## Architecture

```
User opens app
    ↓
usePrayerTimes() hook
    ↓
1. Check cache (existing behavior)
2. If user is subscribed to a mosque (or guest-selected mosque):
   → Try backend API: GET /api/v1/mosques/{id}/prayer-times/?date=YYYY-MM-DD
   → If data exists → use scraped times (start + jama'ah)
   → If no data → fall back to Aladhan API (start times only, no jama'ah)
3. If no mosque selected:
   → Use Aladhan API as before (coordinate-based calculation)
```

## Changes Required

### 1. Types (`types/index.ts`)
- Add `JamaahTimes` interface: `{ fajr, dhuhr, asr, maghrib, isha }` (all `Date | null`)
- Extend `PrayerTimeEntry` with optional `jamaahTime: Date | null` field
- Add `MosquePrayerTimeResponse` interface matching the API response

### 2. API Client (`lib/api.ts`)
- Add `mosques.getPrayerTimes(mosqueId, date)` method
- Returns `MosquePrayerTimeResponse | null`

### 3. Prayer Service (`lib/prayer.ts`)
- Add `fetchMosquePrayerTimes(mosqueId, date)` — calls backend API
- Add `parseMosquePrayerTimesResponse()` — converts API response to `PrayerTimesData` + `JamaahTimes`
- Modify `buildPrayerEntries()` to accept optional jama'ah times
- When jama'ah times present, each `PrayerTimeEntry` gets both `time` (start) and `jamaahTime`

### 4. Hook (`hooks/usePrayerTimes.ts`)
- Add `jamaahAvailable` state boolean
- In `loadPrayerTimes()`:
  1. Get selected mosque ID from storage
  2. If mosque ID exists → try `fetchMosquePrayerTimes()` first
  3. If backend returns data → use scraped start times + jama'ah times, set `source: 'mosque'`
  4. If backend returns nothing → fall back to existing Aladhan flow
  5. If no mosque → existing Aladhan flow unchanged
- Pass jama'ah times to `buildPrayerEntries()`
- Expose `jamaahAvailable` to the screen

### 5. Storage (`lib/storage.ts`)
- Extend prayer time cache to include optional jama'ah times
- Same daily invalidation logic

### 6. Home Screen (`app/(tabs)/index.tsx`)
- When `jamaahAvailable` is true:
  - Show jama'ah time as the **primary displayed time** (this is what people need — when to show up)
  - Show start time as a secondary label (smaller, muted text below)
  - Source badge shows mosque name instead of "api"/"cached"
- When jama'ah not available:
  - Existing display unchanged (start times only from Aladhan)

### 7. Notifications (`lib/notifications.ts`)
- When jama'ah times available, schedule reminders relative to **jama'ah time** (not start time)
- "15 minutes before jama'ah" is more useful than "15 minutes before athan"

## Files to Modify
1. `types/index.ts` — new interfaces
2. `lib/api.ts` — new endpoint method
3. `lib/prayer.ts` — fetchMosquePrayerTimes + buildPrayerEntries update
4. `hooks/usePrayerTimes.ts` — mosque-first fetch logic
5. `lib/storage.ts` — cache jama'ah times
6. `app/(tabs)/index.tsx` — dual-time display
7. `lib/notifications.ts` — jama'ah-based reminders

## What We're NOT Changing
- Aladhan API integration (stays as-is, just becomes fallback)
- Offline adhan-js calculation (stays as tertiary fallback)
- Settings screen (no new settings needed)
- Countdown logic (counts down to next jama'ah when available, else next start time)
