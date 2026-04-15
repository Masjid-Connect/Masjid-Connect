# Mobile App

React Native + Expo. File-based routing via Expo Router. TypeScript strict.

## Stack

- **Framework**: React Native + Expo (SDK 55, managed workflow)
- **Navigation**: Expo Router
- **Local Storage**: expo-sqlite (offline-first cache)
- **Animations**: react-native-reanimated (spring-based only, no linear easing)
- **SVG**: react-native-svg
- **Haptics**: expo-haptics (meaningful interactions only, e.g. prayer transitions)
- **Icons**: `@expo/vector-icons/Ionicons` (outline/filled pairs — no FontAwesome)
- **Date**: date-fns
- **i18n**: i18next + react-i18next (English only)
- **Fonts**: **EB Garamond** (classical serif, SIL OFL) as the display face — loaded via `@expo-google-fonts/eb-garamond`. Applied only to `prayerCountdown`, `prayerName`, `largeTitle`, `title1`, `title2`. System fonts elsewhere. See `DESIGN.md` § Typography.
- **Prayer Times**: Aladhan API (primary, online) + adhan-js (offline fallback only)
- **Push**: Expo Notifications + Expo Push Service
- **In-app Browser**: expo-web-browser (Stripe Hosted Checkout redirect)
- **Error tracking**: Sentry (`@sentry/react-native`)

## Structure

```
/app                    # Expo Router file-based routes
  /(tabs)/
    index.tsx           # Prayer Times (home)
    community.tsx       # Announcements + Events
    support.tsx         # Donations (Stripe hosted + bank transfer)
    settings.tsx        # Settings & preferences
  /_layout.tsx          # Root layout
/components
  /brand                # AnimatedSplash, GoldBadge, IslamicPattern
  /ui                   # BottomSheet, ErrorFallback
  /navigation           # AmbientTabIndicator (custom tab bar)
  /prayer               # Prayer time components
  /community            # AnnouncementsContent, EventsContent
  /support              # AmountSelector, BankDetailsSheet, DonationConfirmationSheet, TrustBadge
/lib                    # api.ts, prayer.ts, notifications.ts, storage.ts, i18n.ts
/hooks                  # Custom React hooks
/constants              # /locales/en.json (100+ keys)
/assets
  /fonts                # SpaceMono only (system fonts otherwise)
  /patterns             # Islamic geometric SVG patterns
/scripts
  bump-version.sh       # Bump semver in package.json + app.json
```

## Code Conventions

**General**
- TypeScript strict mode — no `any`.
- Functional components only. No classes.
- **Named exports**, not default.
- `const` arrow components: `export const PrayerCard = () => {}`.
- Colocate styles with `StyleSheet.create()`.
- All user-facing strings via `t()` — never hardcode display text.

**Naming**
- Components: PascalCase (`PrayerTimeCard.tsx`)
- Hooks: camelCase with `use` prefix (`usePrayerTimes.ts`)
- Utilities: camelCase (`formatPrayerTime.ts`)
- Constants: `SCREAMING_SNAKE_CASE`
- Files match primary export name.

**State Management**
- React Context for global state (theme, preferences, subscriptions).
- `useState` / `useReducer` for component state.
- **No Redux.**
- `expo-sqlite` for persistent offline cache.

**Error Handling**
- Validate at system boundaries only (API responses, user input).
- `try/catch` around API calls + notification scheduling — always log to Sentry with context.
- User-friendly error states — never raw errors.
- Tab navigator wrapped in `Sentry.ErrorBoundary` with `ErrorFallback` component.
- **No silent catches** — either log to Sentry or leave a comment justifying silence.

**Pagination**
- DRF `PageNumberPagination` (50/page).
- Client returns `{ items, totalItems, hasMore }` from paginated endpoints.
- Hooks expose `loadMore()` + `isLoadingMore` + `hasMore`.

**Accessibility**
- All `Pressable`/`TouchableOpacity` must have `accessibilityRole` + `accessibilityLabel`.
- Radio-style selectors use `accessibilityRole="radio"` + `accessibilityState={{ selected }}`.
- Toggle buttons include `accessibilityState={{ expanded }}` where applicable.
- FAB menu items use `accessibilityRole="menuitem"`.
- All accessibility labels via `t()` — never hardcode English.

**Offline-First**
- Prayer times: Aladhan API primary online; adhan-js **offline-only fallback** — never the primary.
- Cache prayer times, announcements, events in AsyncStorage.
- Queue actions (subscription changes) offline; sync when back online.
- Show stale data with "last updated" indicator rather than empty screens.
- Stale cache capped at 7 days (`allowStale` mode in `getCachedData()` enforces `MAX_STALE_AGE_MS`).
- Stale cache race condition prevented with `hasFreshDataRef` pattern in hooks.

## Prayer Times

**The masjid's committee-set jama'ah times are the source of truth.** The app does not use any calculation method for prayer times — no Aladhan, no adhan-js.

- **Primary**: `constants/static-timetable.json` — bundled with the app, read via `lib/staticTimetable.ts`. Covers **2023-01-01 → 2027-12-31** (1,739 days). Originally scraped from the masjid website by the backend `scrape_timetables` command and exported by `export_timetable_json`.
- **Overlay (optional)**: Backend API `GET /api/v1/mosques/{id}/prayer-times/{date}` — if reachable, replaces the static entry for that date. Handles ad-hoc schedule edits (e.g. Ramadan changes) entered by an admin between JSON regenerations. Silent no-op on failure.
- **No calculation fallback.** If both static and backend return nothing (should not happen given coverage), the UI shows an error rather than fabricate times the masjid doesn't use.
- **DST + leap-year** are handled inside `getStaticPrayerTimes`: DST transition days use the next day's entry; missing dates fall back to the same calendar day ±1 from the previous year.
- All times respect user's local timezone and 12h/24h device locale.
- **Never hardcode prayer times.** **Never add calculation-based sources.**

### Hijri date

Aladhan is used in **one place only**: converting Gregorian → Hijri for the prayer-screen header and for Ramadan / Dhul-Hijjah seasonal theming. See `lib/hijri.ts`. Hijri conversion is astronomical, not jurisprudential — acceptable to use a third-party endpoint. Cached per Gregorian day to minimise network calls.

### Freshness pipeline

`.github/workflows/scrape-timetables.yml` runs weekly (Sundays 02:00 UTC + month-turn dates):

1. Scrapes `wright_street` via `python manage.py scrape_timetables` → backend DB.
2. Regenerates `constants/static-timetable.json` via `python manage.py export_timetable_json`.
3. Auto-commits the JSON to `main` if changed.
4. Triggers an EAS OTA update → installed apps receive the fresh JSON.

## Commands

**Development**
```bash
npx expo start                    # Dev server
npx expo start --clear            # With cache clear
npx expo run:ios                  # iOS simulator
npx expo run:android              # Android emulator
```

**Testing / Quality**
```bash
npm test
npm run test:watch
npm run lint                      # ESLint + Prettier
npm run typecheck
```

**Building**
```bash
eas build --platform ios
eas build --platform android
eas build --platform all
```

**Submission — TestFlight / Google Play**
```bash
# Android internal testing
eas build --platform android --profile production
eas submit --platform android --profile internal

# iOS TestFlight
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

**Google Play testing tracks** (in `eas.json` submit profiles):
- Internal (up to 100 testers, no review, instant)
- Closed (invite-only, brief review)
- Open (full review, public link)
- Production (public)

**Android internal testing workflow**
1. `eas build --platform android --profile production`
2. `eas submit --platform android --profile internal` (or upload `.aab` manually in Play Console)
3. Play Console → Testing > Internal testing > Testers → add emails
4. Share opt-in link with testers
5. Promote to Closed/Open/Production when ready

## Version Management

```bash
./scripts/bump-version.sh patch       # 1.0.0 → 1.0.1
./scripts/bump-version.sh minor       # 1.0.0 → 1.1.0
./scripts/bump-version.sh major       # 1.0.0 → 2.0.0
./scripts/bump-version.sh 2.3.1       # Explicit
./scripts/bump-version.sh             # Show current
# Or: npm run version:bump -- patch
```

**Versioning rules**
- `package.json` and `app.json` versions must always match (CI enforces on PRs).
- EAS auto-increments build numbers for production (`eas.json` → `autoIncrement: true`).
- OTA updates use `runtimeVersion: { policy: "fingerprint" }` — no manual bump needed.
- Store submissions require a semver bump; OTA-only updates do not.
- `.github/workflows/check-version.yml` validates version sync, format, non-regression on PRs.
