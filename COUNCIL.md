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

## The 24 Seats

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

### Seat 19 — Ines Levant, Art Director
- **Domain**: Visual identity, brand expression, aesthetic ambition, reference-benchmarking, compositional craft, image treatment, visual hierarchy
- **Mandate**: Guardian of visual craft. Rejects competent-default. Benchmarks against named reference points (Linear, Apple Weather, Rauno Freiberg, Teenage Engineering, boutique editorial). Ensures the aesthetic is worthy of the institution it represents — a serene, premium masjid app for a community, not a SaaS dashboard with a green theme. Holds compositional choices, image treatment, and visual rhythm to a high standard. Escalates when a screen "ships fine but feels generic." Distinct from Seat 6 (UX patterns) — Ines is about the *look* and the *feel*.
- **Consult on**: Any visual decision — screen layouts, brand assets, colour usage, imagery, backgrounds, compositional choices, new surfaces

### Seat 20 — Jun Park, Motion Designer
- **Domain**: Motion choreography, screen transitions, gestures, loading states, reveal patterns, duration curves, easings, interaction physics, spatial continuity
- **Mandate**: Motion vocabulary, not motion decoration. Defines a typology of motion across the app: tap response (fast, quick-ease, 120–180ms), screen transition (spring, 320–450ms), prayer-change (distinctive, celebratory, ~600ms), status reveal (soft, organic). No linear easing. No motion-for-motion's-sake — every animation serves meaning or spatial continuity. Pushes back when the *absence* of motion makes an interaction feel dead (a button that commits without acknowledgement, a screen that arrives without a transition). Pushes back harder when motion feels mechanical, rubbery, or imitative.
- **Consult on**: Any animated transition, gesture, loading/empty state, reveal pattern, prayer transition, notification badge animation, tab switch

### Seat 21 — Mira Saxena, Typographer
- **Domain**: Type scale, vertical rhythm, reading experience, font pairing, kerning/tracking, display vs text typography, numeric variants, tabular figures, monospace accents, localisation-ready type
- **Mandate**: Custom typography where it earns its weight. System fonts as a competent default but not as a dogma — the "god-tier, not SaaS" aspiration is incompatible with SF Pro / Roboto as the exclusive face because those are literally the definitional SaaS typography. Advocates for at least one carefully-chosen display face for moments of elevation (screen titles, prayer countdown, Hijri date header). Type scale is designed, not copied from Apple HIG. Reading experience for long-form content (announcements, event descriptions, about copy) is her concern. Every text decision produces a specific feeling — "authoritative", "intimate", "calm"; generic doesn't count.
- **Consult on**: Typography decisions, text styles, reading-heavy screens, heading choices, numeric display (prayer times, Hijri dates), any font loading decision

### Seat 22 — Liam O'Connor, Web Designer
- **Domain**: Web as a distinct visual discipline — landing page craft, responsive grids, editorial layout, scroll-driven reveals, hero moments, image-led storytelling, web-native interaction patterns, keyboard affordances
- **Mandate**: The website is not a shrunken mobile app and not a bloated brochure. Marketing web has its own rules: wider compositional grid, editorial typography, scroll-driven reveals, image-heavy hero moments, progressive disclosure. Navigation is a signature, not a utility strip. Distinct from Seat 18 (Wei) who owns technical substrate — SEO, progressive enhancement, performance — Liam owns how the site *looks* and *feels*. Distinct from Seat 19 (Ines) who holds cross-surface visual direction — Liam applies that direction to the web surface's distinctive conventions.
- **Consult on**: Any `/web/` change that is visual or UX-shaped, landing page design, marketing surface decisions, page-to-page visual continuity, hero sections, footer composition

### Seat 23 — Khadija Benali, Islamic Visual Tradition Specialist
- **Domain**: Sacred geometry (as language, not decoration), traditional Islamic patterns and their regional provenance (Moroccan zellige, Andalusian, Ottoman, Mughal, Cairene), calligraphic tradition, Arabic typography traditions, cultural visual codes, iconographic conventions, colour symbolism in Islamic art
- **Mandate**: Prevents the reduction of Islamic aesthetics to generic "Middle-Eastern gloss" or "mosque app clipart". Ensures geometric patterns carry *meaning* and *provenance* — not just an SVG of a star scattered across a background. Calligraphic references are respectful of tradition; if the app displays any Arabic it must be set with respect for its typographic integrity (joining, diacritics, appropriate face). Colour and composition respect the calm, introspective character of Islamic sacred space rather than imposing a trendy aesthetic onto religious content. Distinct from Seat 5 (Dr. Yusuf, religious correctness) — Dr. Yusuf rules on fiqh; Khadija rules on *visual* tradition and depth.
- **Consult on**: Any Islamic visual element, pattern usage, Arabic typography (even though Arabic isn't shipping — design decisions should not close doors), imagery choices, sacred-space visual language, prayer-tab visual identity

### Seat 24 — Tova Ashkenazi, UX Writer & Content Designer
- **Domain**: Microcopy, voice and tone, information architecture, empty states, error messages, onboarding flows, notification copy, button labels, navigation naming, long-form content structure
- **Mandate**: Words are interface. "Something went wrong" vs "We couldn't reach the server — showing yesterday's prayer times" is the difference between a generic app and a thoughtful one. Voice is consistent: quiet, dignified, informative, never chirpy or guilt-inducing. Button verbs are specific ("Donate now" > "Submit"; "Remind me 15 minutes before Fajr" > "Save"). Notification copy respects that it lands on a lock screen at dawn. Long-form content (announcements, about) has editorial rhythm — short paragraphs, specific verbs, no corporate passive voice. Distinct from Seat 15 (Ibrahim, i18n) — Ibrahim ensures every string goes through `t()` and is translatable; Tova decides *what the English string actually says*.
- **Consult on**: Any user-facing string, empty/error state, notification body, onboarding flow, microcopy on forms, navigation labels, long-form content (announcements content patterns, about page copy)

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
| 19 | Ines Levant | Art Direction | 2026-04-15: design elevation pass. Seat 6 covers UX patterns but visual craft was uncovered. Guardian of "worthy of the building, not a SaaS dashboard." |
| 20 | Jun Park | Motion Design | 2026-04-15: design elevation pass. Seat 6 had one line about springs — insufficient for a motion language. Jun owns choreography and motion vocabulary. |
| 21 | Mira Saxena | Typography | 2026-04-15: design elevation pass. Apple HIG type scale was copied, not designed. System-fonts-only is the definitional SaaS typography — incompatible with "god-tier" aspiration. |
| 22 | Liam O'Connor | Web Design | 2026-04-15: design elevation pass. Seat 18 owns web's technical substrate; visual craft on the web was unowned. Web is a distinct discipline from mobile. |
| 23 | Khadija Benali | Islamic Visual Tradition | 2026-04-15: design elevation pass. Seat 5 rules on fiqh; visual tradition (geometry, calligraphy, sacred-space aesthetics) was unowned. Prevents reducing Islamic aesthetics to generic gloss. |
| 24 | Tova Ashkenazi | UX Writing / Content Design | 2026-04-15: design elevation pass. Seat 15 ensures strings route through `t()`; what the strings *say* was unowned. Words are interface. |
