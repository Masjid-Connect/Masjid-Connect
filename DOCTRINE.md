# Masjid Connect — Governing Doctrine

This document defines the non-negotiable rules that govern this project.
Every contributor, including AI assistants, must follow these rules.
If a proposed change conflicts with this doctrine, the change is rejected.

---

## 1. Mission

This application exists to help masjids communicate with their communities.
If a feature does not directly serve that mission, it does not get added.

## 2. Stack Rules

| Layer | Technology | Status |
|-------|-----------|--------|
| Mobile | React Native + Expo (managed workflow) | **Locked** |
| Backend | Django 5 + Django REST Framework | **Locked** |
| Database | PostgreSQL | **Locked** |
| Admin | Django Unfold | **Locked** |
| Push | Expo Push Service | **Locked** |
| Deployment | Docker + Coolify on Digital Ocean | **Locked** |

**Locked** means: do not replace, do not add alternatives, do not introduce competing frameworks.
No Flutter, no Next.js, no Firebase, no Redis, no Celery, no microservices.

## 3. Dependency Rules

- No new dependency without written justification in the PR description.
- Every dependency must be actively maintained (commit within last 6 months).
- Pin all versions. No floating ranges.
- If a dependency can be replaced by 20 lines of code, write the code instead.

## 4. API Rules

- All configuration lives in environment variables. No hardcoded secrets.
- API is versioned (`/api/v1/`). Do not break existing endpoints.
- All list endpoints return paginated responses (DRF `PageNumberPagination`).
- All function-based views have explicit `@permission_classes` decorators.
- Auth endpoints are rate-limited at 5 requests/minute for anonymous users.
- Write operations on content (announcements, events) require mosque admin permission.

## 5. Data Rules

- PostgreSQL is the single source of truth.
- Mosque data isolation is enforced at the query level (filter by mosque_id).
- Mobile caches data in AsyncStorage for offline use but never treats it as authoritative.
- Prayer times are calculated client-side (Aladhan API primary, adhan-js offline fallback). The backend does not calculate prayer times.

## 6. Feature Rules

- If it doesn't serve "mosque communicates with community", reject it.
- No chat. No social feeds. No comments. No likes.
- **Exception:** Donations are permitted via Stripe (one-time and monthly), including Gift Aid support for UK tax relief. No other payment flows.
- No user-generated content beyond admin-posted announcements and events.
- Community members browse anonymously. Login is optional (for subscriptions and push notifications).
- Admin experience must require zero technical knowledge. Target: 60 seconds from opening admin panel to posting an announcement.

## 7. Code Rules

- TypeScript strict mode. No `any` types.
- Functional components only. Named exports.
- All user-facing strings via i18n `t()` calls (English + Arabic).
- Colocate styles with components using `StyleSheet.create()`.
- No Redux. Use React Context for global state, `useState`/`useReducer` for local state.
- Spring-based animations only (Reanimated). No linear easing.
- Ionicons for all icons. No FontAwesome.

## 8. Design Rules

- Apple HIG influence: system fonts, grouped lists, checkmarks over radio buttons.
- Notification badges are Divine Gold, never red.
- Bottom sheets replace centered modals.
- Masjid logo (PNG with transparent background) on welcome and auth screens.

## 9. Infrastructure Rules

- Single Django service. Single PostgreSQL database. Single deployment.
- No background task queues unless the app serves 10,000+ concurrent users.
- No Redis unless caching becomes a measured bottleneck.
- Deployment is fully automated: git push to main triggers Coolify build and deploy.
- No manual deployment steps.

## 10. Testing Rules

- Backend: pytest tests for all API endpoints.
- Frontend: Jest tests for hooks and utility functions.
- CI/CD pipeline (GitHub Actions) must pass before merge to main.
- No code merges with failing tests.

---

## Enforcement

When in doubt, ask: "Does this make the app simpler for a 70-year-old volunteer imam to use?"
If the answer is no, reconsider.

This doctrine is referenced from `CLAUDE.md` and applies to all development on this project.
