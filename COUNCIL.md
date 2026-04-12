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

## The 18 Seats

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
| — | — | — | (no expansions yet) |
