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

### EXPERT 5: Frontend Web Architecture and Performance Engineer

#### Diagnosis

The website is a **static HTML/CSS/JS site** hosted on Cloudflare Pages. No framework — vanilla JavaScript. This is a legitimate choice for a marketing/landing page that rarely changes. Performance is generally good thanks to CDN delivery, but there are gaps.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **No CSS/JS minification** | Medium | `styles.css` is 93KB unminified, `script.js` ~13KB, `donate.js` ~22KB. Total ~128KB of unminified assets. On 3G connections (common in some UK mosque communities), this adds 2-3 seconds to first paint. Cloudflare Pages doesn't auto-minify by default. **Fix:** Add a build step (`csso`, `terser`) or enable Cloudflare's auto-minify in dashboard settings (Speed → Optimization → Auto Minify). |
| **No build pipeline at all** | Medium | The `/web` directory is raw HTML/CSS/JS deployed directly. No bundling, no tree-shaking, no asset hashing for cache busting. Version strings (`?v=4`) are manually managed. **Fix:** At minimum, add a `build.sh` that minifies and copies to a `dist/` folder. Or accept the simplicity trade-off and enable Cloudflare auto-minify. |
| **View Transitions API browser support** | Low | `script.js` uses the View Transitions API for cross-page animations. This works in Chrome 111+ and Safari 18+ but not Firefox (as of March 2026). Users on Firefox see no transition — acceptable degradation, but worth noting. |
| **Donate page loads Stripe.js on every visit** | Low | `donate.html` loads `https://js.stripe.com/v3/` regardless of whether the user intends to donate. This is a ~40KB external script that blocks rendering. **Fix:** Lazy-load Stripe.js only when user clicks "Donate Now" button. |
| **No Content Security Policy on website** | Medium | The Django backend has CSP headers, but the static website on Cloudflare Pages does not. Any XSS via user-injected content (e.g., contact form reflection) would execute without restriction. **Fix:** Add CSP via Cloudflare Pages `_headers` file. |
| **Contact form Turnstile token not validated server-side** | Medium | The contact form sends a Cloudflare Turnstile token, but I see no server-side validation in the Django contact endpoint (`/api/v1/contact/`). If the backend doesn't verify the token with Cloudflare's API, the Turnstile widget is security theater. **Fix:** Add `requests.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', ...)` in the contact view. |
| **No error tracking on website** | Low | Zero analytics or error tracking. If the donation flow breaks in production, you won't know until users complain. **Fix:** Add lightweight error tracking (Sentry browser SDK or even a simple `window.onerror` handler that POSTs to your API). |

#### What appears acceptable but is fragile

The site looks fast because Cloudflare's CDN masks the unminified assets. But first-visit performance on slow connections (no CDN cache) will be noticeably worse. The `?v=4` cache-busting strategy also means a version bump invalidates all caches simultaneously.

#### Recommended fix order
1. Verify Turnstile token server-side in contact endpoint
2. Add CSP headers via Cloudflare Pages `_headers` file
3. Enable Cloudflare auto-minify or add build step
4. Lazy-load Stripe.js on donate page

---

### EXPERT 6: Backend, API, and Systems Reliability Architect

#### Diagnosis

The backend is the **strongest layer** of the entire ecosystem. It demonstrates production-grade security practices that are uncommon in early-stage projects: timing-attack mitigation on login, Stripe webhook idempotency with atomic transactions, UUID primary keys, parameterized SQL, comprehensive rate limiting, and proper CORS configuration.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **No token expiration by default** | Medium | DRF tokens live forever until explicit logout. The custom `ExpiringTokenAuthentication` class has a 30-day TTL, which is good, but `TOKEN_TTL` is not explicitly set in `settings.py` — it relies on `getattr(settings, 'TOKEN_TTL', timedelta(days=30))`. If someone removes the authentication class or overrides settings, tokens become immortal. **Fix:** Add `TOKEN_TTL = timedelta(days=30)` explicitly in settings.py. |
| **Charity reference race condition** | Low | `GiftAidDeclaration.charity_reference` generation uses `order_by("-charity_reference").first()` to find the next sequence number. Under concurrent requests, two declarations could get the same reference. **Fix:** Use `SELECT MAX(charity_reference) FOR UPDATE` with row-level locking, or generate UUIDs instead of sequential references. |
| **No health check depth** | Medium | `/health/` returns `{"status": "ok"}` without checking database connectivity, Redis (N/A per doctrine), or external service availability. A "healthy" response while the database is down would prevent Traefik from routing away. **Fix:** Add a database ping to the health check: `connection.ensure_connection()`. |
| **No request correlation IDs** | Medium | No trace ID is generated per request. When debugging a user-reported issue, there's no way to trace a request through Django logs, Gunicorn access logs, and Sentry events. **Fix:** Add middleware that generates `X-Request-ID` and attaches it to all log entries. |
| **Exponential backoff without jitter in API client** | Low | `lib/api.ts` uses `Math.pow(2, attempt) * 1000` for retry delays. Without jitter, if 100 clients fail simultaneously (e.g., after a deployment), all 100 retry at exactly 1s, then 2s, causing thundering herd. **Fix:** Add random jitter: `delay * (0.5 + Math.random())`. |
| **Scraper workflow modifies production directly** | Medium | The `scrape-timetables.yml` GitHub Actions workflow runs `python manage.py scrape_all_timetables` against the production database without approval gates or dry-run mode. A malformed PDF or scraper bug could corrupt prayer time data for all users. **Fix:** Add `--dry-run` flag that logs changes without writing, or scrape to staging first. |
| **No API versioning strategy beyond v1** | Low | All endpoints are under `/api/v1/`. No documentation on what triggers a v2 or how v1 would be deprecated. For current scale this is fine, but worth planning. |

#### What is genuinely excellent

- Timing-attack mitigation on login (dummy PBKDF2 check for non-existent users)
- Stripe webhook idempotency with `get_or_create` on `stripe_event_id` inside `transaction.atomic()`
- Token rotation on every login (old tokens deleted)
- HTML stripping on all text input via `strip_tags()`
- UUID primary keys throughout (no enumeration attacks)
- Rate limiting at 6 different granularities
- Image validation (5MB max, JPEG/PNG/WebP only)
- `IsMosqueAdminOrReadOnly` permission class with proper object-level checks

#### Recommended fix order
1. Add database connectivity check to `/health/`
2. Add request correlation ID middleware
3. Explicitly set `TOKEN_TTL` in settings.py
4. Add `--dry-run` to scraper workflow
5. Add jitter to API client retry logic

---

### EXPERT 7: Security, Privacy, and Abuse Prevention Auditor

#### Diagnosis

The security posture is **above average for a project at this stage**. The developer has clearly thought about auth security, input validation, and rate limiting. However, there are gaps in abuse prevention, token lifecycle, and data leakage vectors.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **Auth tokens potentially leaked to Sentry** | High | `lib/sentry.ts` scrubs `user.email` and `user.ip_address`, but does NOT scrub auth tokens from request breadcrumbs. If an API call fails and Sentry captures the request context (headers, body), the `Authorization: Token xxx` header is sent to Sentry's servers. **Fix:** Add `beforeBreadcrumb` handler that strips Authorization headers. Also scrub tokens from error message strings. |
| **Privacy policy contradicts Sentry usage** | High | `privacy.html` section 6 states: "We do not use any social media SDKs, **crash reporting tools**, or analytics platforms." But `@sentry/react-native` is installed and initialized. This is a legal liability — users are told no crash reporting exists when it does. **Fix:** Either (a) add Sentry to the third-party services list in the privacy policy, or (b) remove Sentry. Option (a) is correct. |
| **Offline cache is unencrypted** | Medium | AsyncStorage (used for cache) stores prayer times, announcements, and events in plaintext on device. While this data is mostly public, subscription preferences and mosque affiliations could be considered sensitive (religious affiliation data under UK GDPR Article 9 — special category). **Fix:** Consider whether cached subscription data constitutes special category data. If so, encrypt at rest or avoid caching subscription details. |
| **No brute-force protection on admin login** | Medium | Django admin at `/admin/` has no `django-axes` or similar failed login tracking. An attacker can brute-force admin credentials without lockout. The 5/min rate limit applies to API auth endpoints, not Django admin. **Fix:** Install `django-axes` for admin login protection with progressive lockout. |
| **No CSRF on Stripe webhook** | Low | Stripe webhooks are `@csrf_exempt` with signature verification instead. This is correct — Stripe signs webhooks with `stripe-signature` header and the endpoint verifies it. Not a real issue, just noting it's intentional. |
| **Contact form abuse vector** | Medium | `/api/v1/contact/` is rate-limited at 5/hour but has no CAPTCHA verification server-side (Turnstile token is sent but likely not validated). An attacker could bypass the client-side Turnstile and spam the contact endpoint directly via curl. **Fix:** Validate Turnstile token server-side. |
| **Push token registration has no device attestation** | Low | `/api/v1/push-tokens/` accepts any token string matching the regex pattern. A malicious user could register fake push tokens to fill the database. Rate limiting (user-level) mitigates this, but no device attestation confirms the token is real. **Fix:** Validate tokens against Expo Push API before storing, or accept the risk given the auth requirement. |
| **No CSP on website** | Medium | The Django backend has CSP headers, but the Cloudflare Pages static site does not. If any page reflects user input (e.g., search params in URL displayed on page), XSS is possible. **Fix:** Add `_headers` file to `/web/` directory with CSP headers. |
| **Social login token validation is robust** | — | Apple: JWT verification with fetched public keys, bundle ID audience check. Google: JWT verification with fetched public keys, client ID audience check, `email_verified` validation. Both wrapped in `transaction.atomic()`. This is well-implemented. |

#### Abuse scenarios to watch

1. **Account enumeration via registration:** Mitigated — error message is generic "Unable to complete registration"
2. **Email bombing via password reset:** No password reset endpoint found — passwords are set at registration only (social login sets unusable password). This means users who forget their password have no recovery path. This is a UX gap but not a security issue.
3. **Donation fraud:** Stripe handles this. Backend only receives webhook confirmations. No fraud vector via the app itself.
4. **Content spam by compromised mosque admin:** Rate limited at 30/hour. Announcements are tied to mosque via FK. Impact limited to one mosque's feed.

#### Recommended fix order
1. Fix privacy policy to disclose Sentry usage
2. Add auth token scrubbing to Sentry
3. Validate Turnstile token server-side
4. Install `django-axes` for admin brute-force protection
5. Evaluate whether religious affiliation data needs encryption at rest

---

### EXPERT 8: Data Protection, Compliance, and Liability Counsel

#### Diagnosis

The privacy posture is **intentionally privacy-first** (no analytics, no tracking SDKs, no ad networks), which is commendable and unusual. However, there are compliance gaps that create real legal exposure, particularly under UK GDPR.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **Privacy policy falsely claims no crash reporting** | High | Section 6 of `privacy.html` states: "We do not use any social media SDKs, crash reporting tools, or analytics platforms." `@sentry/react-native` is a crash reporting tool. Even though PII is scrubbed, the SDK sends device info, OS version, and error stack traces to Sentry's US-based servers. This is a material misrepresentation. **Fix:** Add Sentry to the third-party services list with explanation of what data is sent and what is scrubbed. |
| **No ICO registration mentioned** | Medium | The Salafi Masjid operates in Birmingham, UK. Under UK GDPR, any organisation processing personal data must register with the Information Commissioner's Office (ICO) unless exempt. Mosques processing membership/subscription data are likely not exempt. **Fix:** Register with ICO (£40/year for small organisations) and add registration number to privacy policy. |
| **No consent checkboxes on sign-up** | Critical | Apple and Google require explicit consent to privacy policy and terms of service during registration. The sign-up screen has no checkboxes. This is a **hard store rejection risk**. **Fix:** Add "I agree to the Privacy Policy and Terms of Service" checkbox with links, required before account creation. |
| **No cookie consent on website** | Medium | The website uses `localStorage` for dark mode and language preferences. Under UK PECR (Privacy and Electronic Communications Regulations), localStorage is treated the same as cookies for consent purposes. Strictly necessary storage (like language preference) may be exempt, but dark mode preference is debatable. **Fix:** Add a minimal cookie/storage consent banner, or document why these are "strictly necessary." |
| **No Data Protection Officer (DPO) designated** | Low | UK GDPR requires a DPO for organisations processing special category data at scale. Religious affiliation is special category under Article 9. A small mosque app may not meet the "large scale" threshold, but it's worth documenting the decision not to appoint a DPO. |
| **Data retention for donations not specified** | Medium | Privacy policy covers account data (retained while active, deleted within 30 days) and contact forms (12 months). But donation records (Stripe payment intents, Gift Aid declarations) have no retention period specified. Gift Aid records must be kept for 6 years per HMRC requirements. **Fix:** Add donation data retention clause to privacy policy specifying HMRC 6-year requirement. |
| **No data processing agreement with Sentry** | Medium | If Sentry processes any personal data (even scrubbed device info), a Data Processing Agreement (DPA) is required under UK GDPR. Sentry offers a standard DPA. **Fix:** Sign Sentry's DPA and reference it in privacy policy. |
| **Account deletion "within 30 days" is too slow** | Low | Privacy policy says data deleted "within 30 days." UK GDPR Article 17 requires erasure "without undue delay" and within one month (so 30 days is technically compliant). But the actual deletion endpoint appears to delete immediately (`user.delete()` in views.py), which is better than the policy states. Update policy to reflect reality. |
| **No data export implementation** | Medium | The GDPR export endpoint (`/api/v1/auth/export-data/`) exists and is rate-limited at 3/day, which is good. But the app settings screen has no button to trigger it. Users cannot exercise their data portability right from the app. **Fix:** Add "Export My Data" button in settings that calls the export endpoint. |
| **Cross-border data transfer** | Low | Server is on DigitalOcean (likely US or EU data centre). Sentry is US-based. If the DO data centre is US-based, personal data is being transferred outside the UK without documented adequate safeguards. **Fix:** Either (a) confirm DO data centre is in London/EU, or (b) document UK-US data transfer mechanism (Standard Contractual Clauses or UK Adequacy Regulations). |

#### What creates the most legal liability

The privacy policy contradiction about crash reporting. If a regulator (ICO) or a user files a complaint, the misrepresentation is clear and documented. This undermines the trust-first positioning the app is built on.

#### Recommended fix order
1. Fix privacy policy to disclose Sentry (immediate — legal exposure)
2. Add consent checkboxes on sign-up (immediate — store blocker)
3. Add donation data retention clause (HMRC compliance)
4. Register with ICO
5. Sign Sentry DPA
6. Add "Export My Data" button in settings
7. Document cross-border data transfer mechanism

---

*Batch 3 (Experts 9-12) follows in next commit.*
