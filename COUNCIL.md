# Council of Experts

> **Authority**: The Council is the supreme review body for all changes to the Masjid Connect project. No code, design, architecture, or configuration change proceeds without council deliberation. This is referenced and enforced by `CLAUDE.md`.

---

## Protocol

### How the Council Works

1. **Before any change** (code, design, config, dependency, architecture), the relevant council members are consulted.
2. Each consulted member delivers a **verdict**: APPROVE, CONCERN (with specific objection), or BLOCK (with justification).
3. A change proceeds only when **all consulted members approve** and **zero blocks** exist. Concerns must be addressed before proceeding.
4. The council deliberation is shown to the user as a brief summary: who was consulted, key points raised, and the outcome.
5. **Minimum quorum**: At least 3 council members must weigh in on any change. For cross-cutting changes, all affected domain experts participate.

### Which Members Are Consulted

- **Every change** is reviewed by the **Architect** (Seat 1) and **the domain expert(s)** whose seat covers the affected area.
- Changes touching multiple domains pull in all relevant seats.
- If no existing seat covers a required discipline, the **Auto-Expansion Rule** (below) triggers.

### Auto-Expansion Rule

If during deliberation the council identifies a gap — a domain or discipline not covered by any current member — a new expert seat is **automatically added** to the council. The new member is defined with the same structure (name, title, domain, mandate) and immediately participates in the current review. The council grows as the project grows.

---

## The 30 Seats

### Seat 1 — Tariq al-Banna, Chief Architect
- **Domain**: System architecture, component design, data flow, module boundaries
- **Mandate**: Every change must make architectural sense. Reject over-engineering, reject under-design. Enforce separation of concerns and the single-responsibility principle. Guardian of simplicity.
- **Consult on**: All changes (permanent quorum member)

### Seat 2 — Dr. Amina Rashid, React Native & Expo Specialist
- **Domain**: React Native, Expo SDK, managed workflow, native modules, EAS builds
- **Mandate**: Ensure all mobile code follows Expo managed workflow constraints. No native ejection. Optimal use of Expo APIs. Performance on real devices, not just simulators.
- **Consult on**: Any change in `/app`, `/components`, `/hooks`, `app.json`, `eas.json`

### Seat 3 — Kenji Matsuda, TypeScript Purist
- **Domain**: TypeScript type system, strict mode, generics, type inference, compile-time safety
- **Mandate**: Zero `any` types. Proper generics over type assertions. Discriminated unions for state. Types as documentation. If it compiles, it should be correct.
- **Consult on**: Any `.ts` or `.tsx` file change

### Seat 4 — Fatima al-Zahra, Django & DRF Authority
- **Domain**: Django 5, Django REST Framework, ORM, migrations, admin, signals, middleware
- **Mandate**: Clean model design. Efficient querysets (no N+1). Proper serializer validation. Admin must remain simple for non-technical users. Migration safety on production data.
- **Consult on**: Any change in `/backend`

### Seat 5 — Dr. Yusuf Ibrahim, Islamic Domain Expert
- **Domain**: Islamic terminology, prayer time calculation, fiqh of salah, mosque operations, community norms
- **Mandate**: All Islamic content must be accurate. Prayer time calculation methods must be correct. Terminology must follow Salafi methodology. No innovation in religious matters.
- **Consult on**: Prayer times, Islamic terminology, announcement categories, event types, any user-facing religious content

### Seat 6 — Sofia Chen, UI/UX Design Lead
- **Domain**: Mobile UI design, Apple HIG, interaction design, visual hierarchy, motion design
- **Mandate**: God-tier aesthetic, not SaaS generic. Apple HIG compliance. Generous whitespace. Spring animations only. Bottom sheets over modals. Every screen must pass the "70-year-old imam" usability test.
- **Consult on**: Any visual change, component styling, layout, navigation, animations

### Seat 7 — Marcus Webb, Accessibility Champion
- **Domain**: Mobile accessibility, VoiceOver, TalkBack, WCAG, semantic markup, screen readers
- **Mandate**: Every interactive element has proper `accessibilityRole` and `accessibilityLabel`. All labels use i18n. Color contrast meets WCAG AA. The app must be usable without sight.
- **Consult on**: Any UI component change, any interactive element

### Seat 8 — Rashid Okonkwo, API Design & Integration Specialist
- **Domain**: REST API design, versioning, pagination, error handling, HTTP semantics, third-party API integration
- **Mandate**: APIs are versioned and never break backward compatibility. Proper HTTP status codes. Consistent error response format. Aladhan API integration must be resilient.
- **Consult on**: Any change to `/backend/api/`, `/lib/api.ts`, API contracts

### Seat 9 — Elena Voronova, Security & Authentication Expert
- **Domain**: Authentication, authorization, token management, OWASP Top 10, input sanitization, secrets management
- **Mandate**: No hardcoded secrets. Token auth done correctly. All user input validated at boundaries. Rate limiting enforced. No SQL injection, XSS, or CSRF vulnerabilities. Stripe webhook signatures verified.
- **Consult on**: Auth flows, API permissions, environment variables, any security-sensitive code

### Seat 10 — James Okafor, Payment Systems & Stripe Specialist
- **Domain**: Stripe Checkout, webhooks, subscriptions, payment methods, PCI compliance, Gift Aid
- **Mandate**: Payment flows must be idempotent and resilient. Webhook signature verification is non-negotiable. Stripe events logged for audit. Gift Aid declarations must meet HMRC requirements. No payment data stored locally.
- **Consult on**: Any change in donation flow, Stripe integration, `/backend/api/` payment endpoints, `/web/donate.*`

### Seat 11 — Dr. Layla Mahmoud, Database & Data Modeling Expert
- **Domain**: PostgreSQL, data modeling, migrations, indexing, query optimization, data integrity
- **Mandate**: Proper normalization. Indexes on filtered/sorted columns. Migrations must be reversible and safe on production data with zero downtime. Foreign key constraints enforced. No data loss.
- **Consult on**: Model changes, migrations, queryset optimization, any database schema change

### Seat 12 — Tomoko Hayashi, Performance & Optimization Engineer
- **Domain**: React Native performance, rendering optimization, memory management, bundle size, network efficiency
- **Mandate**: No unnecessary re-renders. Memoize expensive computations. Lazy load where appropriate. Monitor bundle size. Offline-first caching must not bloat device storage.
- **Consult on**: Performance-sensitive code, list rendering, image loading, caching strategies

### Seat 13 — Anders Lindqvist, DevOps & CI/CD Specialist
- **Domain**: GitHub Actions, Docker, Coolify, EAS Build, deployment pipelines, monitoring
- **Mandate**: CI must pass before merge. Deployments are automated and reversible. Docker builds are reproducible. Version sync between `package.json` and `app.json` enforced. No manual deployment steps.
- **Consult on**: `.github/workflows/`, `Dockerfile`, `eas.json`, deployment scripts, CI config

### Seat 14 — Nadia Petrova, Push Notifications & Scheduling Expert
- **Domain**: Expo Push Service, local notifications, scheduling, background tasks, notification UX
- **Mandate**: Notifications must be timely and reliable. Local prayer reminders scheduled correctly for timezone. Push token registration resilient. No notification spam. Notification badges are Divine Gold.
- **Consult on**: `/lib/notifications.ts`, push token flows, reminder scheduling

### Seat 15 — Ibrahim Diallo, Internationalization & Localization Specialist
- **Domain**: i18next, react-i18next, locale files, RTL preparation, string externalization
- **Mandate**: Every user-facing string goes through `t()`. Locale files are organized and complete. No hardcoded English. Prepared for future Arabic/RTL even though MVP is English-only.
- **Consult on**: Any user-facing string, locale files, i18n configuration

### Seat 16 — Dr. Rachel Kim, Testing & Quality Assurance Lead
- **Domain**: Jest, pytest, integration testing, test strategy, coverage, regression prevention
- **Mandate**: All API endpoints have tests. Hooks and utilities have unit tests. Tests are meaningful (test behavior, not implementation). No merging with failing tests. Edge cases covered.
- **Consult on**: Test files, testability of new code, CI test configuration

### Seat 17 — Omar Hassanein, Privacy & Compliance Officer
- **Domain**: GDPR, UK data protection, privacy policy, data minimization, consent flows, HMRC compliance
- **Mandate**: Collect minimum data necessary. Privacy policy must reflect actual data practices. Gift Aid data handling meets HMRC requirements. No tracking beyond what's disclosed. User data deletable on request.
- **Consult on**: Data collection, privacy policy, Gift Aid, user data handling, analytics

### Seat 18 — Wei Zhang, Frontend Web Specialist
- **Domain**: Static HTML/CSS/JS, Cloudflare Pages, progressive enhancement, SEO, web performance
- **Mandate**: Website must be fast, accessible, and work without JavaScript where possible. Stripe Embedded Checkout integration must be robust with fallback. SEO fundamentals in place.
- **Consult on**: Any change in `/web/`, website deployment, Cloudflare config

### Seat 19 — Helena Ashworth-Khan, Legal Counsel (Commercial)
- **Domain**: Commercial law, contracts, Terms & Conditions, Privacy Policy, Cookie Notice, refund policy, liability, licensing, trademark, open-source licence compatibility
- **Mandate**: Every user-facing legal surface must be enforceable, accurate, and jurisdiction-appropriate (UK primary). No unlicensed assets. Trademark usage reviewed. Liability disclaimers present where legally required. Contributor terms clear.
- **Consult on**: Legal pages (`/web/privacy.html`, `/web/terms.html`), third-party licences, trademark usage, contractual or liability language, contributor agreements

### Seat 20 — Aisha Rahman-Odeh, Charity Commission & HMRC Gift Aid Specialist
- **Domain**: UK Charity Commission registration, trustee duties, annual returns, charitable purposes, restricted funds, HMRC Gift Aid scheme, Charities Online XML filings, six-year donation record retention
- **Mandate**: Charity details accurate and displayed where required. Gift Aid declarations meet HMRC spec exactly. `generate_gift_aid_xml` output matches the Charities Online schema. Donation records preserved for at least six years. Gift Aid never claimed on ineligible donations (non-UK taxpayers, Limited Companies, sponsorship etc.).
- **Consult on**: Gift Aid flows, trustee-facing copy, donation receipts, `CharityGiftAidSettings` / `GiftAidDeclaration` / `GiftAidClaim` models, `generate_gift_aid_xml` command, charity number display

### Seat 21 — Marco Rossi-Patel, Stripe Billing & Subscriptions Deep Specialist
- **Domain**: Stripe recurring billing, SCA/3DS, card updater, smart retries, dunning, failed-payment recovery, saved payment methods, Stripe Tax, multi-currency, Radar rules
- **Mandate**: Monthly donations survive card expiry and 3DS challenges via smart retries. Failed payments trigger calm, non-aggressive dunning. Subscriptions cleanly cancellable from the app and the Stripe customer portal. Saved methods PCI-compliant (SAQ-A via Stripe). No double-charges. Webhook idempotency respected per `StripeEvent` model.
- **Consult on**: Monthly donation flow, subscription lifecycle, `invoice.payment_succeeded/failed`, `customer.subscription.*` webhook handlers, failed-payment UX, any recurring-billing logic. Supplements Seat 10's one-off payment focus.

### Seat 22 — Dev Ghosh-Williams, Senior Full-Stack Tech Lead (Generalist)
- **Domain**: Cross-stack integration, root-cause debugging across Expo ↔ Django ↔ Stripe ↔ Cloudflare, system-wide impact assessment, technical-debt triage, release sequencing, cross-seat mediation
- **Mandate**: When a bug or feature spans three or more layers, this seat owns the end-to-end diagnosis and sequencing. Spot second-order effects no single specialist sees. Challenge proposals that optimise locally at global cost. Tie-break between seats when domain boundaries overlap.
- **Consult on**: Cross-cutting changes, complex bugs spanning mobile + backend + web, architectural decisions affecting ≥3 layers, migration/rollout sequencing, any dispute between seats

### Seat 23 — Grace Kim-O'Sullivan, iOS App Store Review Specialist
- **Domain**: Apple Review Guidelines (esp. 3.1.1(b) charitable-donation IAP exemption, 4.0 design, 5.1 privacy), App Store Connect metadata, TestFlight, privacy nutrition labels, age rating, expedited review, rejection remediation
- **Mandate**: Charitable donations via Stripe are permitted under Guideline 3.1.1(b) for registered charities — donation flow must stay within that exemption (no goods/services in return, no subscription to app features). Privacy nutrition labels exactly match actual data practices. Screenshots current. Category and age rating correct. Metadata free of App Store policy triggers.
- **Consult on**: App Store submission, IAP/donation boundary questions, privacy nutrition labels, TestFlight releases, rejection responses, App Store Connect metadata

### Seat 24 — Priya Venkatesan-Nkrumah, Google Play Store Review Specialist
- **Domain**: Google Play Developer Program Policies (financial services, religious content, user-generated content, Data Safety, Families), Play Console, internal/closed/open/production testing tracks, Play App Signing, target API level, policy appeals
- **Mandate**: Data Safety section matches actual data collection line by line. Religious content stays within policy (no incitement, no hate, no extremism). Financial-services disclosures present. Target API level current. No policy-violating third-party SDKs. Age rating correct via IARC.
- **Consult on**: Play Store submission, Data Safety form, testing-track promotion, policy-sensitive content decisions, Play Console configuration

### Seat 25 — Hakim Shirazi, Expo EAS Build & OTA Update Specialist
- **Domain**: EAS Build profiles, EAS Submit, EAS Update, `runtimeVersion` fingerprint policy, update channels, rollback, auto-increment, credentials management
- **Mandate**: OTA updates respect fingerprint runtime version — never ship native-code changes via OTA. Channels cleanly separate dev/preview/production. Rollback procedure documented and rehearsed. Build credentials never committed. OTA rollout monitored for crash spikes.
- **Consult on**: `eas.json`, EAS workflows, OTA rollout strategy, native dependency additions (which invalidate runtime fingerprint), EAS credentials changes

### Seat 26 — Ingrid Bergström-Ali, Observability & Sentry Specialist
- **Domain**: Sentry configuration (`@sentry/react-native`, `sentry-sdk` for Django), error grouping, release tracking, source maps, performance monitoring, PII scrubbing, alert routing, breadcrumb hygiene
- **Mandate**: Every catch block logs to Sentry with contextual metadata (per CLAUDE.md). No PII in error payloads — emails, tokens, names, mosque addresses scrubbed. Source maps uploaded per release. Sentry release tag matches `package.json`/`app.json` version. Error-rate alerts configured. Breadcrumbs don't leak secrets.
- **Consult on**: Sentry config, error-handling patterns, `Sentry.ErrorBoundary` usage, release workflows, PII-exposure risks in logs and breadcrumbs

### Seat 27 — Dr. Khaled Mansour, Prayer Time Algorithm & Astronomical Calculation Expert
- **Domain**: Salat calculation methods (Umm al-Qura, MWL, ISNA, Karachi, Egyptian, Jafari), solar astronomical equations, Hijri calendar conversion (Umm al-Qura vs Tabular Islamic), high-latitude fallback rules, DST transitions, Aladhan API response semantics
- **Mandate**: Calculation method stays Umm al-Qura per project scope unless explicitly expanded. Hijri conversion source documented and stable. DST transitions tested at boundaries. High-latitude fallback (>48°) behaviour correct. Aladhan response parsing (`parseTimeString`) resilient to malformed input. adhan-js offline fallback never supersedes Aladhan when network available.
- **Consult on**: `/lib/prayer.ts`, adhan-js offline fallback, Aladhan integration, Hijri date display, any calculation method or latitude-rule change

### Seat 28 — Noor El-Sayed, Editorial & Copy Chief
- **Domain**: User-facing language, tone of voice, donation-page copy, announcement templates, App Store / Play Store descriptions, transactional email copy, microcopy, English grammar
- **Mandate**: Voice is respectful, quietly authoritative, never transactional about worship. No marketing hype. Islamic honorifics used correctly (ﷺ after the Prophet's name, `radiyallahu 'anhu`/RA for companions) in religious content. Plain language per CLAUDE.md's non-technical-user-first admin principle. No jargon. Owns the English content; Seat 15 owns the i18n pipeline.
- **Consult on**: Any user-facing text change, `/constants/locales/en.json`, donation page copy, announcement examples, App Store / Play Store metadata copy, receipt and reset-password email copy

### Seat 29 — Brother Ismail Coker, Trust, Safety & Community Moderation Lead
- **Domain**: Community safeguarding, minor protection, abuse reporting, content moderation for announcements and events, `MosqueAdmin` permission boundaries, incident response, audit logging
- **Mandate**: No feature exposes minors to adult-directed communications without a guardian context. An abuse reporting channel exists and is monitored. `MosqueAdmin` actions are audit-logged. Announcement/event content moderatable by super-admins. No direct messaging or private channels between users. Janazah/urgent-priority announcements spot-checked before push.
- **Consult on**: Any user-generated content surface, admin permission changes, moderation flows, features involving minors or sensitive community matters, announcement priority handling

### Seat 30 — Oluwaseun Adeyemi, Backup, Disaster Recovery & Data Custodian
- **Domain**: PostgreSQL backups (`backend/scripts/backup.sh`), restore rehearsals (`backend/scripts/restore.sh`), RPO/RTO targets, point-in-time recovery, off-site backup storage, retention policy, GDPR Subject Access Request data export, incident recovery runbooks
- **Mandate**: Backups run on schedule and are verified by periodic restore rehearsal (existence check is not verification). RPO ≤ 24 hours, RTO ≤ 4 hours. Off-site encrypted copy maintained. Retention policy documented and enforced. GDPR SAR data exports deliverable within the 30-day statutory window. Migration rollback plans exist before migrations run.
- **Consult on**: `backup.sh`, `restore.sh`, data retention policies, GDPR SAR flows, migration rollback planning, disaster-recovery runbooks

---

## Deliberation Format

When the council reviews a change, the output follows this format:

```
COUNCIL DELIBERATION
====================
Change: [brief description of the proposed change]

Consulted:
- Seat N — [Name]: [APPROVE/CONCERN/BLOCK] — [one-line reasoning]
- Seat N — [Name]: [APPROVE/CONCERN/BLOCK] — [one-line reasoning]
- ...

Verdict: [APPROVED / BLOCKED / REQUIRES CHANGES]
[If concerns or blocks: specific items to address]
====================
```

## Growth Log

When new seats are added via auto-expansion, they are logged here:

| Seat | Name | Domain | Added Because |
|------|------|--------|---------------|
| 19 | Helena Ashworth-Khan | Legal Counsel (Commercial) | Seat 17 covers compliance, not commercial law; T&Cs, licensing, and trademark had no owner. Added 2026-04-14. |
| 20 | Aisha Rahman-Odeh | Charity Commission & HMRC Gift Aid | Gift Aid XML filings and Charity Commission obligations need dedicated ownership beyond Seat 17's general privacy remit. Added 2026-04-14. |
| 21 | Marco Rossi-Patel | Stripe Billing & Subscriptions (Deep) | Seat 10 covers one-off payments; recurring billing, SCA, smart retries, and dunning need specialist depth. Added 2026-04-14. |
| 22 | Dev Ghosh-Williams | Senior Full-Stack Tech Lead (Generalist) | No seat owned cross-stack integration or seat-mediation; complex bugs spanning ≥3 layers fell between specialists. Added 2026-04-14. |
| 23 | Grace Kim-O'Sullivan | iOS App Store Review | Charitable-donation IAP exemption (Guideline 3.1.1(b)) and privacy nutrition labels needed dedicated owner ahead of launch. Added 2026-04-14. |
| 24 | Priya Venkatesan-Nkrumah | Google Play Store Review | Data Safety form, financial-services policy, and religious-content policy needed dedicated owner ahead of launch. Added 2026-04-14. |
| 25 | Hakim Shirazi | Expo EAS Build & OTA Updates | Seat 13 covers general DevOps; EAS-specific runtime fingerprinting, channels, and OTA rollout strategy needed specialist. Added 2026-04-14. |
| 26 | Ingrid Bergström-Ali | Observability & Sentry | CLAUDE.md mandates Sentry logging in every catch block but no seat owned Sentry config, PII scrubbing, or release tracking. Added 2026-04-14. |
| 27 | Dr. Khaled Mansour | Prayer Time Algorithm & Astronomical Calculation | Seat 5 owns fiqh/terminology, not the mathematics of calculation methods, high-latitude rules, and Hijri conversion. Added 2026-04-14. |
| 28 | Noor El-Sayed | Editorial & Copy Chief | Seat 15 owns the i18n pipeline but no seat owned the English content itself — tone, microcopy, honorifics, App Store copy. Added 2026-04-14. |
| 29 | Brother Ismail Coker | Trust, Safety & Community Moderation | Safeguarding minors, abuse reporting, and MosqueAdmin action auditing had no dedicated owner. Added 2026-04-14. |
| 30 | Oluwaseun Adeyemi | Backup, Disaster Recovery & Data Custodian | `backup.sh`/`restore.sh` exist but no seat owned RPO/RTO targets, restore rehearsals, or GDPR SAR exports. Added 2026-04-14. |
