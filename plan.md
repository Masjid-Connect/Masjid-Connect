# Plan: Salafi Masjid Only — Single Mosque Mode

## Philosophy

The app becomes a **single-mosque app** exclusively for The Salafi Masjid (Wright Street), Birmingham. The backend stays multi-mosque capable (for future expansion), but the **frontend hardcodes everything** to The Salafi Masjid. No mosque selection, no subscriptions UI, no search — just one mosque, always.

---

## Changes Overview

### 1. New: `constants/mosque.ts` — Single Source of Truth

Create a central config with The Salafi Masjid's hardcoded details:
- Name: `"The Salafi Masjid (Wright Street)"`
- Coordinates: `{ latitude: 52.4694, longitude: -1.8712 }`
- City: `"Birmingham"`
- Calculation method: `4` (Umm Al-Qura)
- A `getMosqueId()` function that fetches the mosque ID from the backend API on first launch, caches it in AsyncStorage, and returns it on subsequent calls. This avoids hardcoding a UUID that could differ between environments.

### 2. Simplify `lib/storage.ts`

**Remove:**
- `getSubscribedMosqueIds()` / `setSubscribedMosqueIds()`
- `getSelectedMosqueId()` / `setSelectedMosqueId()`
- `ensureDefaultMosque()` (replaced by `constants/mosque.ts` → `getMosqueId()`)
- `DEFAULT_MOSQUE_SEARCH`
- Related storage keys: `SUBSCRIBED_MOSQUES`, `SELECTED_MOSQUE`, `DEFAULT_MOSQUE_BOOTSTRAPPED`

**Keep:**
- Prayer times cache, jamaah times cache
- `DEFAULT_LOCATION` (stays as The Salafi Masjid coordinates)
- `getUserLocation()` / `setUserLocation()` (still useful for Aladhan fallback)
- Reminder minutes, 24h format, theme preference, calculation method

### 3. Simplify `hooks/usePrayerTimes.ts`

**Before:** Checks selected mosque → subscribed mosques → falls back to Aladhan
**After:** Calls `getMosqueId()` → fetches mosque prayer times → falls back to Aladhan using hardcoded Salafi Masjid coordinates

Remove all multi-mosque selection logic. The flow becomes:
1. Get The Salafi Masjid's ID (from `constants/mosque.ts`)
2. Fetch mosque-specific scraped times (primary)
3. Fall back to Aladhan with Salafi Masjid coordinates
4. Fall back to adhan-js offline

### 4. Simplify `hooks/useAnnouncements.ts`

**Before:** Looks up subscribed mosque IDs → selected mosque ID → fetches
**After:** Calls `getMosqueId()` → fetches announcements for that single ID

### 5. Simplify `hooks/useEvents.ts`

Same pattern as announcements — always use The Salafi Masjid's ID.

### 6. Remove `hooks/useMosqueSearch.ts`

No longer needed. Delete the file.

### 7. Remove `app/mosque-search.tsx`

Mosque search screen is no longer needed. Delete the file.

### 8. Remove `components/mosque/MosqueCard.tsx`

No mosque cards to display. Delete the file (and its directory if empty).

### 9. Simplify `app/(tabs)/settings.tsx`

**Remove:**
- "My Mosques" section (subscribe/unsubscribe, city search, nearby search)
- All mosque search state/handlers (`subscribedMosques`, `searchCity`, `searchResults`, `handleSubscribe`, `handleUnsubscribe`, `handleSearchByCity`, `handleNearby`, etc.)
- Location detection section (coordinates are hardcoded)
- Calculation method display section (fixed, no user action)

**Keep:**
- Account section (sign in/out, guest hint)
- Prayer reminders (0, 5, 10, 15, 30 min)
- Appearance (theme light/dark/system, 24h toggle)
- App info footer

### 10. Keep `lib/api.ts` intact

The API client functions all still work. We just always call them with The Salafi Masjid's ID. The `mosques` namespace, `announcements`, `events` endpoints are all valid. The `subscriptions` namespace can stay for backend sync but won't be exposed in UI.

### 11. Backend — No changes needed

The Django backend already supports The Salafi Masjid. It stays multi-mosque capable for future expansion. No model or API changes required.

### 12. Update i18n keys

Remove translation keys related to mosque search/selection that are no longer used (`settings.myMosques`, `settings.noMosques`, `settings.addMosque`, `settings.cityName`, `settings.search`, `settings.nearby`, `settings.results`, `settings.remove`, `settings.add`).

---

## Files Changed

| File | Action |
|------|--------|
| `constants/mosque.ts` | **Create** — hardcoded Salafi Masjid config + `getMosqueId()` |
| `lib/storage.ts` | **Edit** — remove multi-mosque storage functions |
| `hooks/usePrayerTimes.ts` | **Edit** — use `getMosqueId()` directly |
| `hooks/useAnnouncements.ts` | **Edit** — use `getMosqueId()` directly |
| `hooks/useEvents.ts` | **Edit** — use `getMosqueId()` directly |
| `hooks/useMosqueSearch.ts` | **Delete** |
| `app/mosque-search.tsx` | **Delete** |
| `components/mosque/MosqueCard.tsx` | **Delete** |
| `app/(tabs)/settings.tsx` | **Edit** — remove mosque management sections |
| `constants/locales/en.json` | **Edit** — remove unused mosque keys |
| `constants/locales/ar.json` | **Edit** — remove unused mosque keys |

## What Stays the Same

- **Backend** — all models, APIs, admin panel untouched
- **Prayer times logic** (`lib/prayer.ts`) — same Aladhan + adhan-js + mosque scraper flow
- **Notifications** (`lib/notifications.ts`) — same scheduling logic
- **Auth flow** — login, register, guest mode all unchanged
- **Tab navigation** — same 4 tabs (prayer times, announcements, events, settings)
- **Design system** — colors, typography, animations all unchanged
- **Brand identity** — same Salafi Masjid logo, same aesthetic
