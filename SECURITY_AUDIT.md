# EXPERT SECURITY & ARCHITECTURE AUDIT — Council of 12

**Date:** 2026-03-23
**Scope:** Website (salafimasjid.app) + React Native Mobile App + Django Backend
**Assessed by:** Council of 12 World-Class Experts
**Previous internal score:** 72/100 (LAUNCH_READINESS_ASSESSMENT.md, 2026-03-14)

---

## 1. EXECUTIVE VERDICT

### Overall Maturity Levels

| Product | Maturity | Verdict |
|---------|----------|---------|
| **Website** (salafimasjid.app) | **Mid-stage MVP** | Clean, privacy-first static site. Missing analytics, cookie consent, and ICO registration. Donation flow well-architected with Stripe. No web error tracking. |
| **React Native App** | **Late MVP / Pre-launch** | Solid architecture with real security practices (SecureStore, HTTPS enforcement, token rotation). Blocked by placeholder EAS credentials, missing consent checkboxes, incomplete accessibility, and no mobile Sentry DSN. |
| **Django Backend** | **Production-capable** | The strongest layer. Proper rate limiting, UUID PKs, parameterized queries, timing-attack mitigation, Stripe webhook idempotency, HSTS, CSP. No critical vulnerabilities found. |

### Top 10 Most Dangerous Issues

| # | Issue | Severity | Layer |
|---|-------|----------|-------|
| 1 | **No mobile Sentry DSN configured** — app crashes invisible | Critical | Mobile |
| 2 | **No offsite backups** — all backups on same droplet as production | Critical | Infra |
| 3 | **EAS credentials are all placeholders** — cannot build for stores | Critical | Mobile |
| 4 | **No consent checkboxes on sign-up** — Apple/Google will reject | Critical | Mobile |
| 5 | **Account deletion button is a TODO stub** — GDPR/store violation | High | Mobile |
| 6 | **No centralized logging** — logs lost on container restart | High | Infra |
| 7 | **Cache race condition in useAnnouncements/useEvents** — stale data overwrites fresh | High | Mobile |
| 8 | **No staging environment** — all testing happens in production | High | Infra |
| 9 | **Privacy policy says "no crash reporting tools"** but Sentry SDK is installed | High | Legal |
| 10 | **No ICO registration mentioned** — UK GDPR requires it for data controllers | Medium | Legal |

### Is the system safe for real scale?

**No.** The backend could handle moderate traffic, but operational blind spots (no offsite backups, no centralized logging, no mobile error tracking) mean you wouldn't know when things break. A single DigitalOcean droplet failure would cause total data loss.

### Will the current trajectory create pain later?

**Yes.** Three vectors:
1. **Legal:** Privacy policy contradicts actual Sentry usage. No ICO registration. No consent checkboxes. These create regulatory exposure that grows with user count.
2. **Operational:** No observability means problems compound silently until users report them.
3. **Technical:** Cache race conditions will cause intermittent "my announcements disappeared" bug reports that are nearly impossible to reproduce.

### Three highest-priority areas to address first:
1. **Compliance & Legal** — consent checkboxes, privacy policy accuracy, account deletion
2. **Observability** — Sentry DSN, centralized logging, offsite backups
3. **Store readiness** — EAS credentials, accessibility, app store metadata

---

## 2. COUNCIL FINDINGS BY EXPERT

---

### EXPERT 1: Product Strategy Assassin

#### Diagnosis

The product has a clear, focused mission: mosque-to-community communication. The DOCTRINE.md enforces discipline ("No chat. No social feeds. No comments. No likes. No payments." — though donations were later added). This focus is a strength.

**However, the product positioning has a contradiction:** The DOCTRINE says "No payments" but the codebase has a full Stripe donation system with Gift Aid, recurring payments, and a donation admin dashboard. This is either doctrine drift or an intentional exception that should be formally documented.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **Doctrine contradiction on payments** | Medium | DOCTRINE.md §6 says "No payments" but `/api/v1/donate/checkout/` exists with full Stripe integration, Gift Aid XML exports, and donation receipts. Either update the doctrine or acknowledge the exception formally. This matters because contributors (including AI) will be confused about what's allowed. |
| **No monetisation strategy documented** | Low | The app is free, donations go to the mosque not the platform. If this is a single-mosque app (The Salafi Masjid), that's fine. If it's meant to be multi-mosque, there's no sustainability model. |
| **Onboarding bypass** | Medium | `hasCompletedOnboarding` is hardcoded to `true` in AuthContext. New users skip onboarding entirely. For a 70-year-old imam (the target user per DOCTRINE), skipping onboarding is the opposite of what they need. |
| **Feature scope creep risk** | Low | The donation system is already substantial (Gift Aid claims, HMRC XML, charity references, fee calculators). For a "mosque communicates with community" app, this is a second product embedded inside the first. Consider whether this complexity is justified or should be a separate admin tool. |

#### What will break first under scale

If this expands to multiple mosques, the single-mosque assumption in the scraper workflow (scraping The Salafi Masjid's PDF timetable) becomes a bottleneck. Each mosque would need its own prayer time source.

#### Recommended fix order
1. Update DOCTRINE.md to acknowledge the donation feature exception
2. Implement real onboarding flow (mosque selection, notification preferences)
3. Document whether this is a single-mosque or multi-mosque product

---

### EXPERT 2: UX and User Journey Critic

#### Diagnosis

The design philosophy ("god-tier, not SaaS") is ambitious and partially delivered. The visual quality is high, but the user journey has structural gaps that would frustrate real users.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **No onboarding flow** | High | Users land directly in the tab navigator. No mosque selection, no notification setup, no explanation of features. A first-time user sees prayer times for... what mosque? What location? The app doesn't explain. |
| **Auth is optional but subscribe requires auth** | Medium | DOCTRINE says "Login is optional (for subscriptions and push notifications)." This is correct, but the UX doesn't guide unauthenticated users toward creating accounts when they try to subscribe. They hit an auth gate with no context about why. |
| **Language switch requires app restart** | Medium | RTL direction change (`I18nManager.forceRTL()`) requires restart. Users switching to Arabic mid-session get a broken layout until restart. No warning is shown. |
| **Account deletion is a dead button** | Critical | Settings screen has a "Delete Account" button whose `onPress` is `() => { // TODO }`. A user trying to exercise GDPR rights gets zero feedback. This is a store rejection risk and a legal liability. |
| **No empty states for announcements/events** | Medium | If a mosque has no announcements, what does the user see? An empty screen with no guidance. Should show "No announcements yet" with context about the feature. |
| **Settings doesn't link to Terms of Service** | Low | Links to Privacy Policy but not Terms. Both are required for store compliance. |
| **No pull-to-refresh feedback on prayer times** | Low | Community tab likely has pull-to-refresh, but the prayer times home tab silently refreshes on interval without user control. |

#### What appears acceptable but is fragile

The tab-based navigation looks clean, but rapid tab switching during loading states can trigger parallel API calls. No debouncing or request cancellation on tab switch.

#### Recommended fix order
1. Implement account deletion (Critical — store blocker)
2. Build onboarding flow (High — first impressions)
3. Add empty states for all list screens
4. Show RTL restart warning on language change
5. Link Terms of Service in Settings

---

### EXPERT 3: Visual Design and Brand Systems Director

#### Diagnosis

The design system is **genuinely well-crafted**. The "Timeless Sanctuary" palette with jewel-and-stone taxonomy is cohesive, the typography scale follows Apple HIG, and the dark mode implementation is thoughtful (not pure black, lighter sapphire tint). The Divine Gold notification badge is a distinctive brand choice.

The website is also well-executed for a static HTML site — the iOS Settings sheet-style mobile menu is a nice touch, and the scroll reveal animations respect `prefers-reduced-motion`.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **93KB CSS file for static site** | Medium | `styles.css` is ~2400 lines. No minification pipeline mentioned for Cloudflare Pages deployment. While CDN caching helps, first-load performance suffers, especially on 3G connections common in target demographics. |
| **Disabled button accessibility** | Medium | Disabled buttons use `opacity: 0.5` only — no color change. Fails WCAG 2.1 contrast requirements for color-blind users. Should add a distinct visual treatment (greyed-out background, strikethrough, or icon change). |
| **No favicon in SVG format** | Low | Uses PNG and ICO favicons. Modern browsers prefer SVG for favicon (scalable, supports dark mode). Minor but affects perceived quality. |
| **Brand consistency gap** | Low | Website uses `Masjid_Logo.png` and app uses the same, but the Django admin uses Unfold's "Sacred Blue" branding. Admin panel looks like a different product. |
| **Font variant `tabular-nums` not tested cross-platform** | Low | Prayer time display relies on `tabular-nums` for alignment. Not all Android fonts support this variant. On unsupported devices, prayer times will appear misaligned. |

#### What is genuinely excellent

- The color palette is production-grade with semantic token mapping
- Dark mode is careful (near-OLED, not pure black)
- Spring animation constants are defined centrally (`springs.gentle/snappy/bouncy`)
- Typography scale is comprehensive with 14 named styles
- The website's mobile menu is delightful

#### Recommended fix order
1. Add CSS minification to Cloudflare Pages build
2. Fix disabled button contrast for accessibility
3. Test `tabular-nums` on budget Android devices

---

### EXPERT 4: React Native Architecture and Mobile Performance Engineer

#### Diagnosis

The architecture is competent — functional components, TypeScript strict mode, Expo managed workflow, file-based routing. The separation of concerns (api.ts, prayer.ts, storage.ts, notifications.ts) is clean. But there are race conditions, memory management gaps, and a testing strategy that provides false confidence.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **Cache race condition in useAnnouncements/useEvents** | High | `hasFreshDataRef.current` is reset at the start of `refresh()` and set after API response. Two rapid refresh calls cause the second to reset the ref before the first completes, allowing stale cached data to overwrite fresh API data. This is a real bug that will cause intermittent "data disappeared" reports. **Fix:** Use an AbortController per request or a monotonic request counter (only accept response if its counter matches current). |
| **Token hydration race condition** | Medium | `loadToken()` checks `if (_token) return` but multiple concurrent calls can pass this check simultaneously before either sets `_token`. **Fix:** Store the Promise and return it for concurrent callers: `let _loadPromise: Promise<void> | null = null;` |
| **Global mutable state for auth** | Medium | `_token` and `_user` are module-level variables in `api.ts`, not managed through React Context. This means the React tree doesn't re-render when auth state changes externally. If a token expires server-side, the app continues using stale auth state until a 401 triggers cleanup. **Fix:** Move auth state into AuthContext and pass token to API functions. |
| **No list virtualization** | Medium | Announcements and events use pagination (50/page) but append to state arrays. After 4 `loadMore()` calls, 200 items render simultaneously in a ScrollView. On mid-range Android (target demographic for UK mosque communities), this causes frame drops. **Fix:** Use FlatList with `getItemLayout` for fixed-height items. |
| **Countdown rebuilds prayer array every 30 seconds** | Low | `usePrayerTimes` reconstructs the prayer list on every interval tick. Should memoize with `useMemo` keyed on prayer data props. Impact is minimal (small array) but violates React performance principles. |
| **Two desynchronized intervals in usePrayerTimes** | Medium | Countdown (30s interval) and next-prayer detection (60s interval) are separate `useEffect` hooks. They can drift, showing a countdown to a prayer that has already passed according to the next-prayer check. **Fix:** Merge into single interval with both calculations. |
| **Sentry token scrubbing gap** | Medium | `lib/sentry.ts` scrubs `user.email` and `user.ip_address` in `beforeSend`, but does NOT scrub auth tokens from request headers in breadcrumbs or error contexts. If an API error includes the request headers, the auth token leaks to Sentry. **Fix:** Add header scrubbing: `beforeBreadcrumb(breadcrumb) { if (breadcrumb.data?.headers) delete breadcrumb.data.headers.Authorization; }` |
| **ensurePM() can corrupt Fajr time** | Medium | `lib/prayer.ts` adds 12 hours to AM times to "ensure PM." But Fajr is legitimately AM (e.g., "04:30"). If the logic receives Fajr as "4:30", it converts to "16:30" — completely wrong. **Fix:** Only apply ensurePM to prayers that should be PM (Dhuhr, Asr, Maghrib, Isha), never to Fajr or Sunrise. |
| **Test coverage thresholds at 40%** | Medium | `jest.config.js` requires 40% statement coverage. This is dangerously low — it provides the illusion of testing without catching real bugs. The cache race condition above would be caught at 70%+ coverage with integration tests. |
| **No React Native performance monitoring** | Low | No frame rate tracking, no startup time measurement, no interaction traces. You won't know if the Skia gradient animation is dropping frames on older devices until users complain. |

#### What will break first under scale

The cache race condition. As more users pull-to-refresh rapidly (which increases with more content), stale data will replace fresh data more frequently. Users will see old announcements, refresh, see the correct ones, then see old ones again on the next refresh.

#### Recommended fix order
1. Fix `hasFreshDataRef` race condition (use request counter pattern)
2. Fix `ensurePM()` to be prayer-name-aware
3. Fix token hydration race (Promise deduplication)
4. Merge usePrayerTimes intervals
5. Add FlatList virtualization for announcements/events
6. Add auth token scrubbing to Sentry beforeBreadcrumb
7. Increase test coverage to 60% minimum

---

*Batch 2 (Experts 5-8) follows in next commit.*
