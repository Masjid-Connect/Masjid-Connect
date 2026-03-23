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

### EXPERT 9: DevOps, Infrastructure, and Scalability Engineer

#### Diagnosis

The infrastructure is **well-designed for a single-developer, single-service project**. Docker containerisation, Traefik reverse proxy, automated deployment with rollback, and structured logging are all present. But the operational maturity has critical gaps that would turn a bad day into a catastrophe.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **No offsite backups** | Critical | `backup.sh` stores all backups in `/home/mosque/backups/` on the same DigitalOcean droplet. If the droplet's disk fails, you lose the database AND all backups simultaneously. Multi-tier retention (30 daily, 12 weekly, 12 monthly) is meaningless if they're all on the same disk. **Fix:** Add S3-compatible backup sync (DigitalOcean Spaces, Backblaze B2, or AWS S3) as a post-backup step. Cost: ~$1/month. |
| **No centralized logging** | High | Docker logs use `json-file` driver with 100MB rotation. Logs are lost on container restart and inaccessible remotely without SSH. No alerting on error patterns. You cannot answer "what happened at 3am when the API went down?" after the fact. **Fix:** Add Loki + Grafana (free, self-hosted) or Betterstack (free tier). |
| **Deploy health check grace period too short** | Medium | `deploy.sh` waits 10 seconds before health-checking. A cold-start Django app with migrations can take 15-20 seconds. If the health check fails, rollback triggers unnecessarily. **Fix:** Increase to 30 seconds with retry: `for i in 1 2 3; do sleep 10; curl -sf localhost:8000/health/ && break; done`. |
| **No staging environment** | High | There is no staging or preview deployment. All testing happens in production. Database migrations are run directly against production data. If a migration fails, the only recovery is `restore.sh` (manual SSH required). **Fix:** Add a staging compose file that uses a separate database. Or use Coolify's preview deployment feature. |
| **Production secrets stored as plaintext files** | Medium | `.env.prod` sits on the server filesystem unencrypted. Anyone with SSH access to the droplet can read all secrets. **Fix:** Use DigitalOcean's environment variable injection, or at minimum, restrict file permissions: `chmod 600 .env.prod && chown root:root .env.prod`. |
| **GitHub Actions SSH key for deployment** | Medium | CI/CD uses `appleboy/ssh-action` with an SSH private key stored as a GitHub Secret. If the GitHub org is compromised, the attacker gets shell access to the production server. **Fix:** Migrate to OIDC-based authentication or use a deployment-specific user with restricted sudo. |
| **No CPU limits on containers** | Low | `docker-compose.prod.yml` sets memory limits (384MB web, 200MB db) but no CPU limits. A runaway process could starve the other container. **Fix:** Add `cpus: "0.8"` for web and `cpus: "0.5"` for db. |
| **Coolify as single point of failure** | Medium | Traefik is managed by Coolify. If the Coolify daemon crashes, Traefik stops, and the app becomes unreachable. No documented fallback procedure. **Fix:** Document manual Traefik restart procedure: `docker restart coolify-proxy`. |
| **No automated backup validation** | Medium | Backups are gzipped SQL dumps. No automated restore test validates they're not corrupted. A backup could silently fail for weeks. **Fix:** Weekly cron job that restores the latest backup to a test database and verifies row counts. |
| **Rollback can fail if cleanup ran** | Low | `deploy.sh` cleans up old Docker images after 24 hours. If a deployment fails after the previous image was cleaned, rollback has nothing to roll back to. **Fix:** Keep the last 2 tagged images regardless of age: `docker tag app:latest app:rollback-1 && docker tag app:rollback app:rollback-2`. |

#### What will break first under scale

The single DigitalOcean droplet. At ~500 concurrent users, 2 Gunicorn workers with 2 threads each (4 total concurrent requests) will saturate. Response times will spike, and with no autoscaling, the only fix is manual intervention.

#### Recommended fix order
1. Implement offsite backup sync (S3/Spaces) — hours of work, prevents disaster
2. Add centralized logging — Betterstack free tier takes 30 minutes
3. Increase deploy health check to 30 seconds
4. Add staging environment
5. Restrict `.env.prod` file permissions

---

### EXPERT 10: Analytics, Tracking, and Experimentation Specialist

#### Diagnosis

This is the **biggest blind spot** in the entire ecosystem. There is literally zero analytics anywhere — no web analytics, no mobile analytics, no funnel tracking, no event tracking, no conversion measurement. The privacy-first philosophy has been taken to an extreme that prevents the team from understanding their own product.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **Zero analytics on website** | High | No Google Analytics, Plausible, Fathom, or any other analytics tool. You cannot answer: How many people visit the site? Which pages are popular? Where do visitors come from? What's the bounce rate? What % of visitors download the app? **Fix:** Install Plausible or Fathom (privacy-friendly, no cookies, GDPR-compliant without consent banner). Cost: ~$9/month. |
| **Zero analytics in mobile app** | High | No event tracking whatsoever. You cannot answer: How many users open the app daily? Which tab is most used? Do users scroll past 3 announcements? How many people enable notifications? What's the retention curve? **Fix:** Implement lightweight, privacy-respecting event tracking. Options: (a) Self-hosted Posthog, (b) Expo's built-in analytics, (c) Custom events to your own API endpoint. |
| **No donation funnel tracking** | High | The donate page has a well-designed flow (amount → frequency → checkout) but no tracking. You can't answer: How many people start the flow? Where do they drop off? What's the average donation? How many use Gift Aid? Stripe Dashboard shows completed donations but not abandonment. **Fix:** Add basic funnel events: `donate_page_viewed`, `amount_selected`, `checkout_started`, `checkout_completed`. |
| **No download attribution** | Medium | App Store and Google Play links exist but no UTM parameters or attribution tracking. You can't answer: Do downloads come from the website, social media, or word of mouth? **Fix:** Add UTM parameters to store links and use App Store Connect / Google Play Console attribution data. |
| **No error tracking on website** | Medium | Backend has Sentry. Mobile app has Sentry (DSN unconfigured). Website has nothing. A broken donation flow would be invisible. **Fix:** Add Sentry browser SDK to the website. |
| **No A/B testing infrastructure** | Low | No experimentation framework. For current stage this is fine, but when optimizing donation conversion, you'll need it. Not urgent. |

#### The paradox

The privacy policy proudly states "no analytics or tracking SDKs" as a feature. But this creates a different problem: **you're building a product blind**. Privacy-respecting analytics (Plausible, Fathom, self-hosted Posthog) exist precisely for this use case — they provide aggregate insights without tracking individuals.

#### Recommended fix order
1. Install Plausible on website (30 minutes, $9/month, no cookies needed)
2. Configure mobile Sentry DSN (15 minutes)
3. Add basic donation funnel events on website (2 hours)
4. Add UTM parameters to store links (30 minutes)
5. Plan mobile analytics strategy (self-hosted for privacy compliance)

---

### EXPERT 11: Growth, Conversion, and Trust Optimisation Strategist

#### Diagnosis

The website and app have a **trust-first design** that aligns with the mosque community audience. The "no tracking" stance builds credibility. But conversion paths are weak, and the growth strategy relies entirely on word-of-mouth with no way to measure or optimise it.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **Download page has no urgency or social proof** | Medium | `download.html` shows App Store and Google Play badges but no download counts, user testimonials, or community size. Mosque communities are trust-driven — "500 families already use this app" would dramatically increase conversion. **Fix:** Add a simple counter or testimonial section. Even "Serving the community since 2026" adds credibility. |
| **No app onboarding drives early churn** | High | Users download the app, see prayer times for an unknown location, have no mosque selected, and no context. First-session experience is confusing. **Fix:** Build a 3-step onboarding: (1) Select your mosque, (2) Enable notifications, (3) See your prayer times. This is the single highest-leverage growth fix. |
| **Donation page is well-designed but buried** | Medium | The donate page is accessible from the navbar but not promoted within the app. No in-app donation prompt, no "Support your masjid" card on the home screen. **Fix:** Add a tasteful donation card in the app (not intrusive — aligned with the serene design philosophy). |
| **No referral or sharing mechanism** | Low | No way for users to share the app with other community members. No "Invite a friend" flow, no shareable prayer time cards for WhatsApp (the dominant messaging app in UK mosque communities). **Fix:** Add "Share Prayer Times" button that generates a formatted image/text for WhatsApp sharing. |
| **Contact form has no auto-response** | Low | Users submit the contact form and see a success message, but receive no email confirmation. They don't know if their message was received. **Fix:** Send an auto-acknowledgment email via Resend when a contact form submission is created. |
| **No password reset flow** | Medium | There is no "Forgot password" functionality anywhere. Users who forget their password cannot recover their account. They must create a new account, losing all subscriptions. **Fix:** Implement password reset via email (Django's built-in `PasswordResetView` + Resend for email delivery). |

#### What will create trust issues

The missing password reset flow. When a user can't log in and there's no recovery option, they lose trust in the app. This is especially problematic for the target demographic (older community members who frequently forget passwords).

#### Recommended fix order
1. Build onboarding flow (highest growth leverage)
2. Implement password reset
3. Add social proof to download page
4. Add in-app donation prompt
5. Add WhatsApp sharing for prayer times

---

### EXPERT 12: QA, Edge Cases, and Failure Testing Lead

#### Diagnosis

The testing infrastructure exists but provides **false confidence**. 40% coverage thresholds, no integration tests, no end-to-end tests, and several confirmed race conditions that unit tests cannot catch.

#### Findings

| Issue | Severity | Details |
|-------|----------|--------|
| **Account deletion is a TODO stub** | Critical | `settings.tsx` has a "Delete Account" button with `onPress: () => { // TODO: Implement account deletion API call }`. This is a **functional bug** that violates GDPR and will cause app store rejection. The backend endpoint exists (`DELETE /api/v1/auth/delete-account/`) but the frontend never calls it. **Fix:** Wire the button to `api.deleteAccount()` with confirmation dialog and password verification. |
| **Cache race condition produces intermittent bugs** | High | `useAnnouncements` and `useEvents` hooks have a race condition where `hasFreshDataRef` can be reset by concurrent refresh calls. This produces an intermittent bug where old data replaces new data. Unit tests won't catch this because they don't test concurrent execution. **Fix:** Use monotonic request counter or AbortController. Write a concurrent execution test. |
| **ensurePM() corrupts Fajr time** | High | If Aladhan API returns Fajr as "4:30" (without AM/PM suffix), `ensurePM()` converts it to "16:30". Users would see Fajr at 4:30 PM. The bug only triggers with certain Aladhan response formats, making it hard to catch in testing. **Fix:** Make ensurePM prayer-name-aware. Add test case with known Aladhan response formats. |
| **No end-to-end tests** | Medium | No Detox, Maestro, or Appium tests. The entire UI is validated only by manual testing (which hasn't happened on real devices per LAUNCH_READINESS). **Fix:** Add Maestro (simplest for Expo) with 5 critical flows: launch, sign-up, view prayer times, view announcements, change settings. |
| **Empty states not tested** | Medium | What happens when a mosque has zero announcements? Zero events? When the API returns an empty paginated list? When the user has no subscriptions? These states are likely untested and may show blank screens or broken layouts. **Fix:** Add test fixtures for empty API responses and verify UI renders empty state components. |
| **Network failure states not tested** | Medium | What happens when the API is unreachable? When it returns 500? When a request times out? The retry logic exists in `fetchWithRetry()` but its interaction with the UI hooks is untested. **Fix:** Add Jest tests with `msw` (Mock Service Worker) simulating network failures, 500s, and timeouts. |
| **Timezone edge cases** | Medium | Prayer times assume device timezone matches the user's location. A user who travels (e.g., visiting a UK mosque from a US timezone device) will see incorrect prayer times. No warning is shown. **Fix:** Detect timezone mismatch between device and mosque location. Show warning: "Your device timezone doesn't match this mosque's location." |
| **DST transition not tested** | Medium | The UK moves to BST (British Summer Time) on the last Sunday of March. Prayer times that cross this boundary (e.g., cached times from Saturday rendered on Sunday) will be off by 1 hour. **Fix:** Add test case for DST transition dates. Ensure prayer times are always calculated fresh on DST change days. |
| **Notification scheduling across midnight** | Low | If a user opens the app at 11:55 PM, prayer reminders scheduled for the next day's Fajr may not fire if the scheduling logic assumes "today." **Fix:** Always schedule next 24 hours of reminders regardless of current time. |
| **Test coverage is security theater** | Medium | 40% statement / 30% branch coverage means 60-70% of code paths are untested. The most dangerous bugs (race conditions, timezone handling, DST transitions) are in the untested portion. **Fix:** Increase thresholds to 60% statements / 50% branches as a start. Target 80% within 3 months. |

#### What will break first in production

The account deletion TODO. A user will try to delete their account, nothing will happen, they'll file an app store complaint or ICO complaint, and you'll have a compliance incident.

#### Recommended fix order
1. Wire account deletion button to API (Critical — hours of work)
2. Fix ensurePM() Fajr corruption
3. Fix cache race condition
4. Add empty state tests
5. Add network failure tests
6. Add Maestro e2e tests for 5 critical flows
7. Increase coverage thresholds

---

## 3. COMPOUND RISKS — Problems That Amplify Each Other

### Compound Risk 1: Privacy Policy Contradiction + Sentry Token Leakage
**Interaction:** The privacy policy says "no crash reporting tools" (Expert 8), but Sentry is installed and auth tokens may leak to Sentry (Expert 7).
**Consequence:** If a user or regulator discovers tokens are being sent to a US-based crash reporting service that the privacy policy explicitly denies exists, the credibility damage is compounded. It's not just "you forgot to update the policy" — it's "you lied about privacy AND leaked auth tokens."
**Fix both together:** Update privacy policy AND add token scrubbing in one commit.

### Compound Risk 2: No Observability + No Offsite Backups
**Interaction:** No centralized logging (Expert 9) + no offsite backups (Expert 9) + no mobile Sentry (Expert 4).
**Consequence:** If the droplet fails at 3am, you lose: (a) the database, (b) all backups, (c) all logs of what happened. You won't even know it happened until users complain, because mobile Sentry isn't configured. By the time you investigate, there's nothing to investigate.
**This is the highest-consequence compound risk in the system.**

### Compound Risk 3: Account Deletion TODO + GDPR Export Missing in App
**Interaction:** Account deletion is a dead button (Expert 12) + no "Export My Data" button in app (Expert 8).
**Consequence:** A user who wants to exercise GDPR rights (deletion + portability) has zero working options in the app. Both rights are required under UK GDPR. A single ICO complaint from a frustrated user creates regulatory exposure disproportionate to the fix effort (a few hours of work).

### Compound Risk 4: No Analytics + No Onboarding + No Password Reset
**Interaction:** Zero analytics (Expert 10) + no onboarding (Expert 11) + no password reset (Expert 11).
**Consequence:** Users download the app, get confused (no onboarding), forget their password (no reset), create a new account, and you have no data showing this pattern (no analytics). You'll see growing user registrations and think the app is succeeding, while actual retention is near zero. Growth metrics become misleading.

### Compound Risk 5: Cache Race Condition + No E2E Tests + Low Coverage
**Interaction:** `hasFreshDataRef` race (Expert 4) + no end-to-end tests (Expert 12) + 40% coverage (Expert 12).
**Consequence:** The race condition exists in production, no test catches it, and the coverage threshold is too low to force anyone to write the test. The bug will manifest as intermittent "my announcements disappeared" reports that cannot be reproduced in development because single-threaded test execution doesn't trigger the race.

### Compound Risk 6: ensurePM() Bug + No Timezone Validation + No DST Testing
**Interaction:** Fajr time corruption (Expert 4) + device timezone assumption (Expert 12) + no DST test (Expert 12).
**Consequence:** During DST transitions, Aladhan API responses may use different time formats. If `ensurePM()` receives an ambiguous time during a DST boundary, it could silently corrupt prayer times for millions of daily prayer calculations. For a religious app, **showing wrong prayer times is the single most trust-destroying bug possible.**

### Compound Risk 7: Good Security Posture + No Admin Brute-Force Protection
**Interaction:** Strong API security (Expert 6) + no `django-axes` on admin login (Expert 7).
**Consequence:** The API is well-protected, but the Django admin at `/admin/` (which has full database access) can be brute-forced. An attacker who fails to breach the API could pivot to the admin panel. The strong API security creates a false sense of overall security.

---

## 4. RED FLAG REGISTER — Things That Could Turn Into Disasters

| # | Red Flag | Likelihood | Impact | Urgency | Owner |
|---|----------|------------|--------|---------|-------|
| 1 | **Droplet failure causes total data loss** (no offsite backups) | Medium (disk failures happen) | Catastrophic — all user data, all mosques, all subscriptions gone | **Immediate** | DevOps / Founder |
| 2 | **App store rejection** (no consent checkboxes, placeholder EAS credentials, account deletion TODO) | High (Apple/Google enforce these) | High — blocks entire launch | **Immediate** | Mobile Dev |
| 3 | **ICO complaint from privacy policy contradiction** (claims no crash reporting, Sentry installed) | Low-Medium (requires motivated complainant) | High — regulatory investigation, fine up to £8.7M or 2% revenue | **This week** | Legal / Founder |
| 4 | **Wrong prayer times displayed** (ensurePM bug + DST + timezone assumptions) | Medium (edge case but real) | Catastrophic for trust — prayer times are the core feature | **Before launch** | Mobile Dev |
| 5 | **Invisible app crashes** (no Sentry DSN configured) | Certain (crashes will happen) | Medium — users churn silently, bugs compound | **This week** | Mobile Dev |
| 6 | **Auth token leaked to Sentry** (no header scrubbing) | Medium (requires Sentry error with request context) | High — token compromise enables account takeover | **This week** | Security / Mobile Dev |
| 7 | **Production database corrupted by scraper** (no dry-run mode, no staging) | Low (scraper is tested, but PDFs change) | High — corrupted prayer times for all users | **Before launch** | Backend Dev |
| 8 | **Admin panel brute-forced** (no django-axes, no 2FA) | Low (requires targeted attack) | Catastrophic — full database access, can post fake announcements | **This month** | Backend Dev |
| 9 | **Donation flow breaks silently** (no web error tracking, no analytics) | Medium (Stripe SDK updates, browser changes) | Medium — lost donations with no visibility | **This month** | Web Dev |
| 10 | **Scale beyond 4 concurrent requests** (2 workers × 2 threads) | Depends on growth | High — response timeouts, cascading failures | **Monitor quarterly** | DevOps |

---

## 5. FIX PLAN IN MANAGEABLE CHUNKS

---

### Chunk 1: Immediate Risk Containment (1-2 days)

**Objective:** Eliminate the issues that could cause data loss, legal exposure, or store rejection today.

| # | Task | Difficulty | Dependencies |
|---|------|------------|--------------|
| 1.1 | Set up offsite backup sync to DigitalOcean Spaces or Backblaze B2. Modify `backup.sh` to upload after local backup. | Easy (2 hrs) | DO Spaces account |
| 1.2 | Configure mobile Sentry DSN — generate DSN, set `EXPO_PUBLIC_SENTRY_DSN` in `.env`, verify errors appear in Sentry dashboard. | Easy (30 min) | Sentry account |
| 1.3 | Fix privacy policy — add Sentry to third-party services list with honest description of what data is sent and what is scrubbed. | Easy (30 min) | None |
| 1.4 | Wire account deletion button in `settings.tsx` to `api.deleteAccount()` with confirmation dialog and password input. | Easy (2 hrs) | None |
| 1.5 | Add explicit `TOKEN_TTL = timedelta(days=30)` to Django `settings.py`. | Trivial (5 min) | None |

**Who should lead:** Founder / sole developer
**What success looks like:** Backups sync offsite hourly. Sentry captures mobile errors. Privacy policy is accurate. Account deletion works.
**What must not be skipped:** 1.1 (offsite backups) — this is the single highest-ROI fix in the entire audit.

---

### Chunk 2: Security and Privacy Hardening (2-3 days)

**Objective:** Close the security gaps that could be exploited by a motivated attacker or flagged by a regulator.

| # | Task | Difficulty | Dependencies |
|---|------|------------|--------------|
| 2.1 | Add Sentry `beforeBreadcrumb` handler to scrub `Authorization` headers from request breadcrumbs. | Easy (30 min) | None |
| 2.2 | Validate Cloudflare Turnstile token server-side in the contact form endpoint. Add `requests.post()` to Turnstile verify API. | Medium (1 hr) | Turnstile secret key in env |
| 2.3 | Install `django-axes` for Django admin brute-force protection. Configure 5 failed attempts → 30 min lockout. | Easy (1 hr) | None |
| 2.4 | Add CSP headers to website via Cloudflare Pages `_headers` file. | Easy (30 min) | None |
| 2.5 | Add consent checkboxes on sign-up screen — "I agree to Privacy Policy and Terms of Service" with links, required before registration. | Medium (2 hrs) | None |
| 2.6 | Add database connectivity check to `/health/` endpoint. | Easy (15 min) | None |
| 2.7 | Add request correlation ID middleware (generate UUID, attach to all log entries). | Medium (1 hr) | None |
| 2.8 | Register with ICO (UK data protection registration, £40/year). | Easy (admin task) | Organisation details |

**Who should lead:** Backend developer + founder for ICO registration
**What success looks like:** Admin login is protected, auth tokens don't leak to Sentry, contact form is spam-resistant, app store consent requirements met.

---

### Chunk 3: Product and UX Friction Removal (3-5 days)

**Objective:** Fix the user journey gaps that cause confusion, churn, and compliance failures.

| # | Task | Difficulty | Dependencies |
|---|------|------------|--------------|
| 3.1 | Build 3-step onboarding flow: mosque selection → notification setup → prayer times preview. | Hard (2-3 days) | Mosque list API |
| 3.2 | Implement password reset via email — Django `PasswordResetView` + Resend for delivery. Add "Forgot password?" link on sign-in screen. | Medium (4 hrs) | Resend API key |
| 3.3 | Add empty states for announcements, events, and subscriptions screens. | Easy (2 hrs) | None |
| 3.4 | Add "Export My Data" button in settings that calls `/api/v1/auth/export-data/`. | Easy (1 hr) | None |
| 3.5 | Link Terms of Service in settings screen. | Trivial (15 min) | None |
| 3.6 | Show warning when language change requires app restart. | Easy (30 min) | None |
| 3.7 | Add donation data retention clause to privacy policy (HMRC 6-year requirement). | Easy (15 min) | None |

**Who should lead:** Mobile developer
**What success looks like:** New users understand the app within 60 seconds. GDPR rights are exercisable from the app. No dead-end screens.

---

### Chunk 4: Architecture and Performance Stabilisation (2-3 days)

**Objective:** Fix the race conditions and performance issues that cause intermittent bugs.

| # | Task | Difficulty | Dependencies |
|---|------|------------|--------------|
| 4.1 | Fix `hasFreshDataRef` race condition in `useAnnouncements` and `useEvents` — implement monotonic request counter pattern. | Medium (2 hrs) | None |
| 4.2 | Fix `ensurePM()` to be prayer-name-aware — only apply to Dhuhr/Asr/Maghrib/Isha, never Fajr/Sunrise. | Easy (1 hr) | None |
| 4.3 | Fix token hydration race — use Promise deduplication for concurrent `loadToken()` calls. | Easy (30 min) | None |
| 4.4 | Merge dual intervals in `usePrayerTimes` into single interval with both calculations. | Easy (1 hr) | None |
| 4.5 | Add FlatList virtualization for announcements and events lists. | Medium (2 hrs) | None |
| 4.6 | Add jitter to API client exponential backoff: `delay * (0.5 + Math.random())`. | Trivial (10 min) | None |
| 4.7 | Add `--dry-run` flag to scraper management command. Update GitHub Actions workflow to use it for validation. | Medium (2 hrs) | None |

**Who should lead:** Mobile developer
**What success looks like:** No more intermittent "data disappeared" bugs. Prayer times are always correct. Lists scroll smoothly with 200+ items.

---

### Chunk 5: Observability, Analytics, and QA (3-5 days)

**Objective:** Stop flying blind. Know what's happening in production.

| # | Task | Difficulty | Dependencies |
|---|------|------------|--------------|
| 5.1 | Add centralized logging — Betterstack (free tier) or self-hosted Loki. | Medium (2 hrs) | Account setup |
| 5.2 | Install Plausible analytics on website ($9/month, no cookies). | Easy (30 min) | Plausible account |
| 5.3 | Add basic donation funnel events on website: page viewed, amount selected, checkout started, completed. | Medium (2 hrs) | Analytics tool |
| 5.4 | Add Sentry browser SDK to website for error tracking. | Easy (30 min) | Sentry account |
| 5.5 | Increase test coverage thresholds to 60% statements / 50% branches. Write tests to meet new thresholds. | Hard (2-3 days) | None |
| 5.6 | Add network failure tests with Mock Service Worker (msw). | Medium (3 hrs) | None |
| 5.7 | Add empty state test fixtures. | Easy (1 hr) | None |
| 5.8 | Add DST transition test case for prayer times. | Medium (1 hr) | None |

**Who should lead:** Full-stack developer
**What success looks like:** You can see website traffic, mobile crashes, donation funnel, and production errors in dashboards. Test suite catches real bugs.

---

### Chunk 6: Scalability and Operational Readiness (2-3 days)

**Objective:** Prepare infrastructure for growth beyond the first 100 users.

| # | Task | Difficulty | Dependencies |
|---|------|------------|--------------|
| 6.1 | Add staging environment — separate docker-compose with its own database. | Medium (3 hrs) | Coolify or second droplet |
| 6.2 | Increase deploy health check grace period to 30 seconds with 3 retries. | Easy (15 min) | None |
| 6.3 | Restrict `.env.prod` file permissions (`chmod 600`). | Trivial (5 min) | SSH access |
| 6.4 | Add CPU limits to docker-compose.prod.yml containers. | Easy (15 min) | None |
| 6.5 | Document Coolify manual restart procedure for Traefik failure. | Easy (30 min) | None |
| 6.6 | Add automated backup validation (weekly restore test to staging DB). | Medium (2 hrs) | 6.1 (staging) |
| 6.7 | Keep last 2 Docker images for rollback safety in deploy.sh. | Easy (30 min) | None |
| 6.8 | Enable GitHub branch protection: require 1 approval + passing CI before merge. | Easy (15 min) | GitHub admin |

**Who should lead:** DevOps / founder
**What success looks like:** Deployments are tested in staging first. Backups are validated weekly. Infrastructure can survive a Coolify failure.

---

### Chunk 7: Polish, Trust, and Conversion Improvement (ongoing)

**Objective:** Maximise the product's ability to acquire and retain users.

| # | Task | Difficulty | Dependencies |
|---|------|------------|--------------|
| 7.1 | Add social proof to download page (user count, testimonials). | Easy (1 hr) | User data |
| 7.2 | Add CSS minification to web build pipeline. | Easy (1 hr) | None |
| 7.3 | Fix disabled button contrast for WCAG accessibility. | Easy (30 min) | None |
| 7.4 | Add WhatsApp sharing for prayer times. | Medium (3 hrs) | None |
| 7.5 | Add in-app donation prompt (tasteful, non-intrusive). | Medium (2 hrs) | None |
| 7.6 | Test `tabular-nums` font variant on budget Android devices. | Easy (1 hr) | Physical device |
| 7.7 | Add Maestro e2e tests for 5 critical flows. | Hard (2 days) | Maestro setup |
| 7.8 | Update DOCTRINE.md to acknowledge donation feature exception. | Trivial (15 min) | None |
| 7.9 | Sign Sentry DPA and reference in privacy policy. | Easy (admin task) | Sentry account |

**Who should lead:** Product / design lead
**What success looks like:** Website converts visitors to downloads. App retains users. Accessibility is WCAG 2.1 compliant.

---

## 6. PRIORITY MATRIX

### Do Now (This Week)

| Issue | Why now |
|-------|---------|
| Offsite backup sync | Single point of failure for all data |
| Configure mobile Sentry DSN | Flying blind on app crashes |
| Fix privacy policy (Sentry disclosure) | Active legal misrepresentation |
| Wire account deletion button | GDPR violation + store rejection |
| Add consent checkboxes on sign-up | Hard store rejection blocker |
| Add Sentry token scrubbing | Active token leakage vector |

### Do Next (This Month)

| Issue | Why next |
|-------|----------|
| Build onboarding flow | Highest-leverage growth fix |
| Fix ensurePM() Fajr corruption | Core feature correctness |
| Fix cache race condition | Intermittent data bugs |
| Validate Turnstile server-side | Contact form abuse vector |
| Install django-axes | Admin brute-force protection |
| Add centralized logging | Operational blind spot |
| Implement password reset | User retention blocker |
| Add website CSP headers | XSS prevention |
| Real EAS credentials + app store metadata | Launch blocker |

### Do Later (Next Quarter)

| Issue | Why later |
|-------|----------|
| Staging environment | Important but not blocking |
| Increase test coverage to 60% | Ongoing improvement |
| Add Plausible analytics | Growth optimization |
| Maestro e2e tests | Quality assurance maturity |
| FlatList virtualization | Performance at scale |
| ICO registration | Compliance (low enforcement risk short-term) |
| Sentry DPA | Compliance completeness |
| Donation funnel tracking | Revenue optimization |

### Watch Carefully

| Issue | Why watch |
|-------|-----------|
| Gunicorn worker saturation (4 concurrent requests max) | Monitor response times; upgrade when p99 > 2s |
| DST transitions affecting prayer times | Test manually on last Sunday of March and October |
| Docker image cleanup vs rollback safety | Monitor that rollback images exist after cleanup |
| Coolify stability | Document manual restart procedure; test quarterly |
| Stripe SDK breaking changes | Monitor Stripe changelog monthly |

---

## 7. IF I HAD TO FIX ONLY 5 THINGS

These five fixes were chosen for **maximum leverage** — each one either prevents a catastrophe, unblocks a launch, or fixes a class of problems rather than a single instance.

### 1. Implement offsite backups (2 hours)
**Why:** Prevents the single highest-consequence failure in the system. Without this, a disk failure destroys everything with no recovery. Every other fix is meaningless if the data can disappear.

### 2. Fix privacy policy + add Sentry disclosure + consent checkboxes (3 hours)
**Why:** Fixes three compliance issues in one session: legal misrepresentation (Sentry), store rejection (consent), and regulatory exposure (ICO). These compound into a single trust-destroying scenario if any one triggers scrutiny.

### 3. Wire account deletion + add Sentry DSN (2 hours)
**Why:** Account deletion is a GDPR hard requirement and app store requirement. Sentry DSN gives you visibility into every other bug. Together, they make the app legally compliant and observable.

### 4. Fix ensurePM() + cache race condition (3 hours)
**Why:** These are the two bugs that will generate the most user-facing issues. Wrong prayer times destroy trust in a prayer app. Disappearing announcements destroy trust in a communications app. Both are the app's core value proposition.

### 5. Build onboarding flow (2-3 days)
**Why:** Every other fix is pointless if users download the app, get confused, and never return. Onboarding is the gateway to all other features. Without it, you're optimizing a product that users abandon on first launch.

**Total estimated effort: ~4-5 days for all 5.**

---

## 8. RELEASE READINESS VERDICT

### Website: **Conditionally Ready**

The website is functional, well-designed, and privacy-respecting. It can serve users today.

**Conditions for Production-Ready:**
- [ ] Fix privacy policy to disclose Sentry usage
- [ ] Add CSP headers via Cloudflare Pages `_headers` file
- [ ] Validate Turnstile token server-side in contact endpoint
- [ ] Add basic error tracking (Sentry browser SDK)
- [ ] Add donation data retention clause to privacy policy
- [ ] Enable CSS/JS minification

### React Native App: **Not Ready**

Multiple hard blockers prevent store submission.

**What must be true for Conditionally Ready:**
- [ ] Replace all placeholder EAS credentials with real values
- [ ] Add consent checkboxes on sign-up screen
- [ ] Wire account deletion button to API
- [ ] Configure Sentry DSN
- [ ] Fix ensurePM() Fajr time corruption
- [ ] Test on real iOS and Android devices
- [ ] Add app store metadata (description, keywords, screenshots, age rating)

**What must be true for Production-Ready (beyond Conditionally Ready):**
- [ ] Build onboarding flow
- [ ] Implement password reset
- [ ] Fix cache race condition in useAnnouncements/useEvents
- [ ] Add empty states for all list screens
- [ ] Increase test coverage to 60%
- [ ] Test DST transition handling
- [ ] Add accessibility roles to prayer times and settings screens
- [ ] Achieve 5 Maestro e2e tests passing

### Django Backend: **Conditionally Ready**

The backend is the strongest layer and could serve production traffic today.

**Conditions for Production-Ready:**
- [ ] Offsite backup sync implemented
- [ ] Centralized logging operational
- [ ] Sentry DSN configured for frontend
- [ ] `django-axes` installed for admin protection
- [ ] Health check includes database connectivity
- [ ] Request correlation IDs in place
- [ ] Staging environment operational
- [ ] Turnstile validation on contact endpoint

---

## CLOSING STATEMENT

This is a well-intentioned project with genuine security awareness that is uncommon at this stage. The backend is production-grade. The design system is thoughtful. The privacy-first stance is admirable.

But the system is **not ready for real users** due to a cluster of compliance, observability, and UX gaps that interact dangerously. The good news: none of these are architectural — they're all fixable in days, not months.

The single most important action is **getting offsite backups working today**. Everything else can be sequenced. Data loss cannot be undone.

---

*End of Council of 12 Expert Audit — 2026-03-23*
