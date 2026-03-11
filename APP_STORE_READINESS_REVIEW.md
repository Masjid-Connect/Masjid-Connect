# Mosque Connect — App Store Readiness Review

**Date:** 2026-03-11
**Verdict:** ~75% Complete — Functionally done, store logistics remaining

---

## Status Summary

| Area | Status | Notes |
|------|--------|-------|
| Frontend screens | COMPLETE | All 4 tabs + auth + onboarding |
| Backend API | COMPLETE | All endpoints, Docker, CI/CD |
| Design system | COMPLETE | Brand, animations, dark mode |
| i18n (EN + AR) | COMPLETE | 100+ keys, RTL-ready |
| Offline-first | COMPLETE | Cache + fallback strategy |
| Notifications | COMPLETE | Push + local scheduling |
| Privacy Policy | MISSING | Mandatory for both stores |
| Terms of Service | MISSING | Required (app uses auth) |
| Store credentials | MISSING | EAS placeholders unfilled |
| Store metadata | MISSING | Screenshots, descriptions |
| Security headers | MISSING | HSTS, SSL redirect needed |
| Email backend | MISSING | No password reset flow |

---

## Blockers for Submission

### 1. Legal (CRITICAL)
- [ ] Write and host Privacy Policy at `https://salafimasjid.app/privacy`
- [ ] Write and host Terms of Service
- [ ] Add privacy policy URL to app.json
- [ ] Complete COPPA/age rating declaration

### 2. Store Accounts (CRITICAL)
- [ ] Enroll in Apple Developer Program ($99/yr)
- [ ] Create Google Play Console account ($25)
- [ ] Fill `eas.json` with real Apple credentials (appleId, ascAppId, appleTeamId)
- [ ] Create Google service account JSON for Play Store uploads
- [ ] Set `extra.eas.projectId` in app.json

### 3. Store Metadata (CRITICAL)
- [ ] App Store screenshots (6.7", 6.5", 5.5" sizes)
- [ ] Play Store screenshots (phone + tablet)
- [ ] Short description (80 chars)
- [ ] Long description (4000 chars)
- [ ] Keywords and category selection
- [ ] Support URL / contact email
- [ ] Marketing URL

### 4. Production Hardening (HIGH)
- [ ] Add Django HTTPS security headers (HSTS, SSL redirect, secure cookies)
- [ ] Configure email backend (password reset)
- [ ] Add token expiration to DRF auth
- [ ] Integrate crash reporting (Sentry)
- [ ] Remove duplicate `splash-logo.png.png` from assets
- [ ] Fix Apple audience verification string (matches bundle ID)

### 5. Apple-Specific (HIGH)
- [ ] Test Apple Sign-In on real device
- [ ] Fill out App Privacy nutrition labels in App Store Connect
- [ ] Declare export compliance (HTTPS encryption)
- [ ] Configure apple-app-site-association for universal links

### 6. Google-Specific (HIGH)
- [ ] Complete Data Safety section in Play Console
- [ ] Verify target API level compliance (Android 14+)
- [ ] Complete content rating questionnaire
- [ ] Configure digital asset links

---

## What's Built and Working

### Frontend
- Prayer Times (Aladhan API + adhan-js offline fallback, Hijri dates, countdown)
- Announcements (priority filtering, multi-mosque, bottom sheet detail)
- Events (calendar view, 6 category filters, Google Calendar integration)
- Settings (mosque management, reminders, theme, time format)
- Auth (Apple, Google, email, guest mode)
- Mosque onboarding (city search + GPS nearby)
- Animated splash screen with haptic feedback
- Kozo paper texture, Convergent Arch brand mark
- Spring-based animations (react-native-reanimated)
- TypeScript strict mode, ESLint, Prettier, Jest

### Backend
- Django 5 + DRF with all CRUD endpoints
- Token auth + social auth (Apple/Google JWT)
- Rate limiting (5/min auth, 100/hr anon, 1000/hr user)
- PostgreSQL + Docker deployment
- CI/CD (GitHub Actions → auto-deploy)
- Backup scripts (daily/weekly/monthly)
- Admin panel (Unfold theme)

---

## Estimated Timeline to Submission

| Phase | Duration |
|-------|----------|
| Legal docs + accounts | 1-2 days |
| Store metadata + screenshots | 2-3 days |
| Production hardening | 1-2 days |
| Device testing + bug fixes | 2-3 days |
| Store review process | 1-7 days |
| **Total** | **~2-3 weeks** |

---

## Risk Areas for Rejection

1. **Missing privacy policy** — instant rejection on both stores
2. **Apple Sign-In** — must work perfectly; Apple tests this
3. **Data collection labels** — must accurately reflect what data you collect
4. **Location permission** — must justify why location is needed (mosque search)
5. **Push notification permission** — must handle denial gracefully
