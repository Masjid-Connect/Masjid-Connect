# Mosque Connect — Audit Report Part 4/4
## Design Council: Auditors 5–7 (Components, Spiritual UX, Admin UX) + Cross-Council Priority Matrix

**Date:** 2026-03-21 | **Auditors:** 3 + Cross-Council | **Total Findings:** 42 + Priority Matrix

---

## Design Auditor 5 — Component & Pattern Consistency

### HIGH

**D5.1 Three Distinct Card Systems, No Shared Pattern**
- Announcements: custom rows with inline urgent backgrounds and margin-negative hacks.
- Events: FlatList with category badge colors.
- Prayer times: raw rows with gradient backgrounds, no card wrapper.
- **Fix:** Create unified `Card`, `ListRow`, `EventCard` component family.

### MEDIUM

**D5.2 Only 2 Button Variants**
- `components/ui/Button.tsx:17` — Only `primary | secondary`. Missing: ghost, destructive, loading with spinner.
- Bottom sheets use inline button styles instead of Button component.
- **Fix:** Add ghost, destructive, compact variants. Route all buttons through Button component.

**D5.3 Apple HIG Grouped Lists Inconsistent**
- Settings uses correct pattern (SettingsSection with borderRadius + elevation). Announcements/Events use custom layouts without card wrapping per section.
- **Fix:** Standardize all section lists with wrapped cards.

**D5.4 Spacing Grid Breaks**
- Button minHeight `52px` is not an 8pt multiple (should be 48 or 56).
- Screen insets vary: some use `spacing.lg` (16px), others `spacing['3xl']` (32px).

**D5.5 Separator Strategy Inconsistent**
- SettingsRow: CSS hairline. AnnouncementsContent: manual separator rendering. Some sections have no bottom separator on last row.

### LOW

**D5.6 Event Category Colors Outside Color System** — `types/index.ts:133-140` defined separately from Colors.ts.

---

## Design Auditor 6 — Emotional & Spiritual UX

### CRITICAL

**D6.1 No In-App Admin Panel — Janazah Blocked**
- Imam cannot post funeral announcement from phone. Must find a computer. Sacred timing lost.
- **Fix:** Create in-app "Quick Post" modal for authenticated admins.

### HIGH

**D6.2 Janazah Treated as Generic "Urgent"**
- `priority` field has only `normal | urgent`. No semantic distinction for funeral prayer.
- Urgent announcements use alert-circle icon (alarm-like, disrespectful for funeral).
- **Fix:** Add `janazah` priority. Use dignified icon (e.g., mosque-outline). Gold + "Janazah" label.

**D6.3 No Ramadan/Seasonal Adaptation**
- No Hijri calendar awareness for Ramadan mode. No iftar countdown, no special theming.
- Major spiritual opportunity missed for engagement.
- **Fix:** Detect Ramadan via Hijri date. Add iftar countdown, optional Ramadan theme, taraweeh event highlighting.

### MEDIUM

**D6.4 Prayer Transitions Lack Sacred Moment**
- Active prayer indicator is a small GlowDot. No animation, no haptic pulse, no atmospheric shift when prayer transitions.
- **Fix:** Add scale animation + gentle haptic on prayer change. Atmospheric gradient already shifts — add momentary gold pulse.

**D6.5 Qibla Is Just a Compass**
- Functional but not contemplative. No breathing animation, no meditative guidance, no haptic on alignment.
- **Fix:** Add breathing pulse when aligned. Gentle haptic confirmation. Optional "Bismillah" text overlay.

**D6.6 Welcome Screen Lacks Spiritual Warmth**
- `app/(auth)/welcome.tsx` — Logo + auth buttons. No mosque imagery, no community framing, no spiritual tone-setting.
- **Fix:** Add mosque photo background or Islamic pattern. Welcome text: "Welcome to your mosque community" in calligraphic style.

### LOW

**D6.7 Urgent Announcements Not Sticky** — Users scroll past critical notices. No persistent banner or top-pinning.

---

## Design Auditor 7 — Admin UX

### CRITICAL

**D7.1 No Mobile Admin — Can't Post from Phone**
- Django admin is web-only. Not responsive to touch. Imam must use computer.
- **Fix:** Create in-app admin tab with lightweight forms. MVP: "Quick Post Announcement" modal.

### HIGH

**D7.2 Recurring Event Setup Too Complex**
- Event model has `recurring = null | 'weekly' | 'monthly'` but no UI for patterns like "1st Friday" or "every other week."
- Admin sees 11 form fields at once (mosque, title, description, speaker, date, start_time, end_time, location, recurring, category, author).
- **Fix:** 3-step wizard: Basics → Date & Time → Details. Add recurrence pattern UI.

**D7.3 No Subscriber Metrics**
- Admin can't see how many people received or viewed their announcement.
- **Fix:** Add read-only counts: "Sent to X subscribers. Viewed by Y."

**D7.4 Expires At Field Confusing**
- Optional field with no explanation. Imam may set arbitrary date or leave blank unknowingly.
- **Fix:** Radio: "Keep forever" (default) vs "Expires on [date]" with help text.

### MEDIUM

**D7.5 Mosque Field Not Auto-Populated**
- Single-mosque admin must manually select their mosque on every announcement/event.
- **Fix:** Pre-populate from `MosqueAdmin.objects.filter(user=request.user)`.

**D7.6 No Draft/Schedule Workflow**
- Once saved, immediately published. Can't write now and send later.
- **Fix:** Add states: Draft → Scheduled → Published → Archived.

**D7.7 No Form Preview**
- Imam can't see how announcement looks as push notification before publishing.
- **Fix:** Add "Preview" button showing card + notification appearance.

**D7.8 Category Field Lacks Guidance**
- `lesson`, `lecture`, `quran_school`, `youth`, `sisters`, `community` — no descriptions. Imam doesn't know the difference.
- **Fix:** Add help_text per category.

**D7.9 Error Messages Technical**
- DRF returns `{"mosque": ["This field is required."]}`. Non-technical admin can't interpret.
- **Fix:** Custom error serializer with plain language.

### LOW

**D7.10 No "Save and Add Another"** — Standard Django feature not exposed. Tedious for batch event creation.

**D7.11 No Announcement Templates** — Weekly reminders retyped from scratch.

**D7.12 Title/Body No Length Guidance** — No character counter, no max_length hint, no push notification preview.

---

## Part 4 Summary (Design 5-7)

| Auditor | Critical | High | Medium | Low | Total |
|---------|----------|------|--------|-----|-------|
| D5. Components | 0 | 1 | 4 | 1 | 6 |
| D6. Spiritual UX | 1 | 2 | 3 | 1 | 7 |
| D7. Admin UX | 1 | 3 | 5 | 3 | 12 |
| **TOTAL** | **2** | **6** | **12** | **5** | **25** |

---

# CROSS-COUNCIL PRIORITY MATRIX

## Grand Total: All 19 Auditors

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| **Tech Council (1-6)** | 11 | 20 | 25 | 5 | 61 |
| **Tech Council (7-12)** | 19 | 29 | 27 | 9 | 84 |
| **Design Council (1-4)** | 3 | 8 | 18 | 5 | 34 |
| **Design Council (5-7)** | 2 | 6 | 12 | 5 | 25 |
| **GRAND TOTAL** | **35** | **63** | **82** | **24** | **204** |

---

## TOP 20 FINDINGS (Ruthless Priority Order)

### Tier 0 — Fix Before Production (Week 1)

| # | Finding | Auditor | Severity |
|---|---------|---------|----------|
| 1 | Remove `/debug/cors/` endpoint (leaks secrets) | Infra #10.1 | CRITICAL |
| 2 | Encrypt Gift Aid PII at rest | Privacy #11.1 | CRITICAL |
| 3 | Fix IDOR on Stripe session lookup (require auth) | Security #1.1 | CRITICAL |
| 4 | Disable Google JWT audience bypass when env vars missing | Security #1.3 | CRITICAL |
| 5 | Add donation consent screen before Stripe checkout | Privacy #11.2 | CRITICAL |
| 6 | Restrict user data export (rate limit + audit log) | Privacy #11.3 | CRITICAL |
| 7 | Health check must verify DB connectivity | Infra #10.2 | CRITICAL |

### Tier 1 — Fix This Sprint (Week 2-3)

| # | Finding | Auditor | Severity |
|---|---------|---------|----------|
| 8 | Handle iOS 64 notification limit | Notifications #5.1 | CRITICAL |
| 9 | Add timezone change detection for notifications | Notifications #5.2 | CRITICAL |
| 10 | Cache announcements/events for offline | Offline #4.1 | CRITICAL |
| 11 | Fix N+1 permission check (cache mosque admin IDs) | Database #3.1 | CRITICAL |
| 12 | Add `unique=True` to `stripe_payment_intent_id` | Database #3.2 | HIGH |
| 13 | Fix Stripe webhook idempotency (record before process) | API #2.4 | HIGH |
| 14 | Set Sentry DSN for frontend | Infra #10.3 | HIGH |
| 15 | Complete Python requirements.lock | Dependencies #12.1 | CRITICAL |

### Tier 2 — Next Sprint (Week 4-5)

| # | Finding | Auditor | Severity |
|---|---------|---------|----------|
| 16 | Add accessibilityLabel to all interactive icons (20+) | A11y #8.1 | CRITICAL |
| 17 | Fix color contrast (Gold on Stone, Onyx-600) | A11y #8.3 | CRITICAL |
| 18 | Increase touch targets to 48×48pt | A11y #8.2 | CRITICAL |
| 19 | Create in-app admin "Quick Post" for imams | Admin #D7.1 | CRITICAL |
| 20 | Wrap hardcoded strings in t() calls | i18n #9.1 | CRITICAL |

### Tier 3 — Month 2

- Add Dynamic Type support (A11y #8.5)
- Implement offline queue for subscription changes (Offline #4.2)
- Add network state detection (Offline #4.4)
- Expand Arabic typography scale (Typography #D4.2)
- Fix Hijri month language detection (i18n #9.2)
- Add data retention schedules (Privacy #11.4)
- Add audit logging for donations (Privacy #11.5)
- Implement token expiry/rotation (Security #1.4)
- Write API client tests (Testing #7.2)
- Add prayer time DST edge case tests (Testing #7.3)
- Fix nearby endpoint response format (API #2.1)
- Resolve GPL license contamination (Dependencies #12.2)
- Create Janazah priority type (Spiritual UX #D6.2)

### Tier 4 — Month 3+

- Implement Ramadan mode (Spiritual UX #D6.3)
- Add skeleton loaders (Motion #D3.3)
- Bottom sheet pan-to-dismiss gesture (Motion #D3.1)
- Unify card patterns (Components #D5.1)
- Recurring event wizard (Admin #D7.2)
- Draft/schedule workflow for announcements (Admin #D7.6)
- Subscriber metrics dashboard (Admin #D7.3)
- E2E test suite (Testing #7.5)
- Reduced motion support completion (A11y #8.9)
- Haptic preference toggle (A11y #8.8)

---

## POSITIVE FINDINGS (What's Done Well)

**Architecture:**
- Expo managed workflow is clean; file-based routing well-organized
- Django REST Framework is well-structured with proper serializers
- Token auth implementation is standard (just needs expiry)
- Backend test coverage is reasonable (78+ cases across 10 files)

**Design:**
- Spring animation parameters are premium-grade
- Atmospheric gradients beautifully encode prayer time data
- Empty/error states are thoughtfully designed
- Haptic feedback is intentional and hierarchical
- Color palette is cohesive ("Timeless Sanctuary" philosophy)
- Apple HIG type scale alignment is strong

**Security (Done Right):**
- Security headers properly configured (HSTS, SSL, X-Frame-Options)
- Sentry backend has PII scrubbing
- Docker uses non-root user, minimal image
- Backup scripts have daily/weekly/monthly retention
- Password validation exists (10 char minimum)

**Infrastructure:**
- Docker multi-stage build is efficient
- WhiteNoise for static files
- Resource limits in Docker compose
- CI pipeline runs TypeScript, ESLint, Jest, Django tests

---

## OVERALL VERDICT

**Production Readiness: NOT READY**

The app has a strong foundation architecturally but contains **35 critical findings** across security, privacy, accessibility, and reliability that must be resolved before production deployment.

**Top 3 Blockers:**
1. **Security** — Debug endpoint leaks secrets, IDOR on donations, JWT bypass possible
2. **Privacy/GDPR** — Gift Aid PII unencrypted, no consent flow, no retention policy
3. **Accessibility** — Elderly target audience can't use app (contrast failures, small targets, no screen reader labels)

**Estimated Remediation:**
- Tier 0 (blockers): ~40 hours
- Tier 1 (critical): ~60 hours
- Tier 2 (high): ~80 hours
- Tier 3 (medium): ~120 hours
- Tier 4 (polish): ~80 hours

**The "god-tier, not SaaS" promise is 70% achieved.** The visual design and animation work are genuinely premium. The gaps are in security hardening, accessibility compliance, offline reliability, and admin UX — all fixable without architectural changes.
