# Masjid-Connect — Gap Analysis & Fix Plan

## Current State Summary

The codebase is well-structured with fully implemented screens, API client, hooks, brand system, and Django backend. However, several gaps prevent a clean build and production readiness.

---

## Critical Gaps (Build Blockers)

### 1. Dependencies Not Installed
**Issue:** `node_modules/` is missing — `npm install` has never been run or was cleaned.
**Impact:** TypeScript compilation fails entirely (can't resolve any modules).
**Fix:** Run `npm install` to restore all dependencies.

### 2. Missing `app/modal.tsx` Route
**Issue:** `app/_layout.tsx:101` registers a `"modal"` screen route, but `app/modal.tsx` does not exist. Expo Router will crash or show a warning at runtime.
**Fix:** Create `app/modal.tsx` with an "About" screen (the layout sets `headerTitle: 'About'`). Include app name, version, data source attribution (Aladhan API), and the Convergent Arch brand mark.

---

## High-Priority Gaps (Functionality)

### 3. Missing Custom Fonts
**Issue:** CLAUDE.md specifies 4 font families (Reem Kufi, Noto Naskh Arabic, Playfair Display, Source Serif 4) but only `SpaceMono` is bundled. The typography system in `Theme.ts` defines scale levels without `fontFamily`, so everything falls back to system fonts.
**Fix:**
- Download and add the 4 Google Fonts to `assets/fonts/`
- Register them in `useFonts()` in `app/_layout.tsx`
- Update `Theme.ts` typography to reference the correct font families per CLAUDE.md (Arabic fonts for Arabic text, Playfair for English headings, Source Serif 4 for English body)

### 4. Missing npm Scripts (test, lint, typecheck)
**Issue:** `package.json` only has `start`, `android`, `ios`, `web` scripts. CLAUDE.md references `npm test`, `npm run lint`, `npm run typecheck` but none exist. No Jest, ESLint, or Prettier configs are present.
**Fix:**
- Add `jest`, `ts-jest`, `@testing-library/react-native` as dev dependencies
- Add `eslint`, `prettier`, `@expo/eslint-config` as dev dependencies
- Add `jest.config.js`, `.eslintrc.js`, `.prettierrc`
- Add scripts: `"test"`, `"lint"`, `"typecheck"` to `package.json`

### 5. Tab Bar Icon Implicit `any` Types
**Issue:** `app/(tabs)/_layout.tsx` has `tabBarIcon` callbacks with destructured `{ color }` and `{ color, focused }` parameters that lack type annotations, causing TS strict mode errors (`TS7031`).
**Fix:** Add explicit types: `({ color, focused }: { color: string; focused: boolean })`.

---

## Medium-Priority Gaps (Quality & Completeness)

### 6. No Tests (Frontend or Backend)
**Issue:** Zero test files exist in either the React Native app or the Django backend. CLAUDE.md documents test commands.
**Fix (Frontend):** Add initial test coverage:
- `hooks/__tests__/usePrayerTimes.test.ts` — mock API, test fallback logic
- `lib/__tests__/prayer.test.ts` — test time parsing, countdown calculation
- `lib/__tests__/storage.test.ts` — test AsyncStorage wrapper
- `components/brand/__tests__/ConvergentArch.test.tsx` — snapshot test

**Fix (Backend):** Add initial test coverage:
- `api/tests/test_auth.py` — register, login, logout, me
- `api/tests/test_mosques.py` — list, detail, nearby, filters
- `api/tests/test_announcements.py` — CRUD, expiration filtering
- `api/tests/test_events.py` — CRUD, category/date filtering

### 7. i18n Framework Missing
**Issue:** CLAUDE.md says "All user-facing strings should support i18n (English + Arabic at minimum)." Arabic prayer labels exist in `types/index.ts` but there's no translation framework — all UI strings are hardcoded English.
**Fix:**
- Add `i18next` + `react-i18next` + `expo-localization`
- Create `lib/i18n.ts` with English and Arabic translation files
- Extract hardcoded strings from screens into translation keys
- Use `useTranslation()` hook in components

### 8. RTL Layout Support
**Issue:** CLAUDE.md says "RTL-native from day one" but no explicit RTL handling exists. React Native has basic RTL support but it needs to be activated.
**Fix:**
- Add `I18nManager.allowRTL(true)` and `I18nManager.forceRTL()` based on locale
- Review layouts for RTL-sensitive styling (margins, padding, text alignment)
- Test with Arabic locale

---

## Low-Priority Gaps (Polish & DevOps)

### 9. Backend: No API Documentation
**Issue:** No Swagger/OpenAPI documentation configured.
**Fix:** Add `drf-spectacular` to generate OpenAPI schema and serve Swagger UI at `/api/docs/`.

### 10. Backend: No Rate Limiting
**Issue:** No DRF throttling configured — API is open to abuse.
**Fix:** Add throttle classes in DRF settings (anon: 100/hour, user: 1000/hour).

### 11. Backend: No Logging Configuration
**Issue:** No custom logging setup — errors go to stdout only.
**Fix:** Configure Django logging with structured JSON output and appropriate levels.

### 12. No CI/CD Pipeline
**Issue:** No GitHub Actions or deployment configuration.
**Fix:** Add `.github/workflows/ci.yml` with:
- TypeScript type checking
- ESLint
- Jest tests
- Backend Django tests
- EAS build (optional)

### 13. Missing `.env` File (Frontend)
**Issue:** `lib/api.ts` reads `process.env.EXPO_PUBLIC_API_URL` but no `.env` or `.env.example` exists at the frontend root.
**Fix:** Create `.env.example` with `EXPO_PUBLIC_API_URL=http://localhost:8000`.

---

## Recommended Execution Order

1. `npm install` (unblock everything)
2. Fix `app/modal.tsx` (build blocker)
3. Fix TypeScript errors in `_layout.tsx` (type annotations)
4. Add `.env.example` for frontend
5. Add npm scripts + lint/test config
6. Add custom fonts + update typography
7. Add initial tests (frontend + backend)
8. Add i18n framework
9. RTL support
10. Backend improvements (API docs, rate limiting, logging)
11. CI/CD pipeline
