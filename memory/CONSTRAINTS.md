# Constraints

Hard boundaries on what Claude will and will not do in this repo.

## Locked Stack (from DOCTRINE)

Do not replace, add alternatives, or introduce competing frameworks:

- Mobile: React Native + Expo (managed workflow)
- Backend: Django 5 + DRF
- Database: PostgreSQL
- Admin: Django Unfold
- Push: Expo Push Service
- Deployment: Docker + Coolify on Digital Ocean

**No Flutter, no Next.js, no Firebase, no Redis, no Celery, no microservices.**

## Dependency Rules (from DOCTRINE)

- No new dependency without written justification.
- Every dependency must be actively maintained (commit within last 6 months).
- Pin all versions. No floating ranges.
- If a dependency can be replaced by 20 lines of code, write the code instead.

## Never

- Never hardcode secrets. All config lives in env vars.
- Never break `/api/v1/` — it is versioned. Deprecate with a new version.
- Never hardcode prayer times.
- **Prayer times come from `constants/static-timetable.json`** (masjid's committee-set jama'ah times). The backend API is an optional overlay; both are authored from the same upstream masjid timetable. **Never add calculation-based sources** (Aladhan, adhan-js, Umm Al-Qura, ISNA, etc.) to the prayer-times path — they will diverge from the masjid's printed timetable.
- Aladhan is permitted **only** for Gregorian→Hijri date conversion, in `lib/hijri.ts`.
- **English is the only shipping language.** `lib/i18n.ts` locks `lng: 'en'`. `SUPPORTED_LANGUAGES = ['en'] as const`. Do NOT add: additional locale files, device-locale detection, stored language preferences, `changeLanguage` calls, `I18nManager.forceRTL`, or a language-picker UI. A bilingual release must be council-deliberated and update `DOCTRINE.md` before any code lands.
- `useTranslation()` + `t()` usage remains mandatory for every user-facing string — the single-language lock does not permit hardcoded English.
- Never skip the council.

## To populate as patterns emerge

Record other hard limits the user has set.
