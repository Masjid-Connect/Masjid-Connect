# Django Admin User Guide & Donation Receipt — Implementation Plan

## Summary
Build an in-admin user guide for mosque admins (non-technical imams, board members, volunteers) and HMRC-compliant donation receipts (HTML + PDF) — all branded with Sapphire Blue/Divine Gold/Stone colors and the Masjid logo.

---

## Part 1: Admin User Guide (Inside Django Admin)

### Architecture
- Custom Django admin views using Unfold's `@register_view` decorator pattern
- HTML templates extending Unfold's base admin template
- Integrated into Unfold sidebar navigation under a "Help & Guides" section
- Static CSS file for guide-specific styling (app color scheme)
- Logo displayed on guide pages

### Pages/Sections to Build

#### 1. **Welcome / Getting Started** (`/admin/guide/`)
- Welcome message with logo
- "What is this admin panel?" — plain-English explanation
- Quick links to each section
- "Your role" — what mosque admins can do

#### 2. **Managing Announcements** (`/admin/guide/announcements/`)
- Step-by-step: How to create an announcement
- Choosing priority (Normal vs Urgent — when to use Urgent)
- Setting expiry dates
- Screenshots/diagrams showing the form
- Tips: keep it short, use clear titles

#### 3. **Managing Events & Lessons** (`/admin/guide/events/`)
- Step-by-step: Creating an event
- Categories explained (Lesson, Lecture, Quran Circle, Youth, Sisters, Community)
- Setting up recurring events (Weekly/Monthly)
- Adding speaker info
- Tips: always include start AND end times

#### 4. **Managing Prayer Times** (`/admin/guide/prayer-times/`)
- What jama'ah times are and why they matter
- How to update daily prayer times
- Date ranges and bulk updates

#### 5. **Managing Donations & Gift Aid** (`/admin/guide/donations/`)
- Viewing donation records
- Understanding Gift Aid declarations
- Exporting Gift Aid claims (CSV for HMRC R68i, XML for Charities Online)
- Charity Gift Aid Settings — what to fill in
- Generating donation receipts

#### 6. **Managing Users & Subscriptions** (`/admin/guide/users/`)
- Viewing subscriber list
- Understanding notification preferences
- Push token management (what it means, no action needed)

#### 7. **FAQs** (`/admin/guide/faqs/`)
- "How do I add a new mosque admin?"
- "I accidentally deleted an announcement — can I get it back?"
- "What's the difference between Admin and Super Admin?"
- "How do donors receive receipts?"
- "How do I submit a Gift Aid claim to HMRC?"
- "Why can't I see the donations section?"
- "How do I change the mosque photo?"
- "What does 'calculation method' mean?"
- "How often should I update prayer times?"
- "Can I schedule announcements for the future?"

#### 8. **Troubleshooting** (`/admin/guide/troubleshooting/`)
- "I can't log in" — password reset steps
- "Changes aren't showing in the app" — cache/timing explanation
- "I see an error when saving" — common validation issues
- "The page looks broken" — browser compatibility
- "I need to contact technical support" — escalation path

### Design/Styling
- **Background**: Stone-100 (#F9F7F2)
- **Headers**: Sapphire-700 (#0F2D52)
- **Accent/highlights**: Divine Gold (#D4AF37)
- **Text**: Onyx-900 (#121216) primary, Onyx-600 (#6B6B70) secondary
- **Cards**: White with subtle shadow, rounded corners
- **Steps**: Numbered circles in Sapphire with Gold active state
- **Tips**: Gold-bordered callout boxes
- **Warnings**: Crimson-bordered callout boxes
- **Logo**: Masjid_Logo.png at top of each page
- **Typography**: System fonts, clean hierarchy

### Files to Create/Modify

**New files:**
- `backend/core/templates/admin/guide/base_guide.html` — base template extending Unfold
- `backend/core/templates/admin/guide/index.html` — Welcome/Getting Started
- `backend/core/templates/admin/guide/announcements.html`
- `backend/core/templates/admin/guide/events.html`
- `backend/core/templates/admin/guide/prayer_times.html`
- `backend/core/templates/admin/guide/donations.html`
- `backend/core/templates/admin/guide/users.html`
- `backend/core/templates/admin/guide/faqs.html`
- `backend/core/templates/admin/guide/troubleshooting.html`
- `backend/core/static/admin/guide/guide.css` — branded styles
- `backend/core/views.py` — admin guide views (or add to existing)

**Modified files:**
- `backend/config/settings.py` — Add "Help & Guides" to Unfold SIDEBAR navigation
- `backend/config/urls.py` — Add guide URL patterns
- `backend/requirements.txt` — Add weasyprint for PDF generation

---

## Part 2: Donation Receipts (HTML + PDF)

### Architecture
- HTML template styled for both screen viewing and print
- PDF generation via WeasyPrint (HTML → PDF)
- Admin action: "Generate receipt" button on Donation list/detail
- Downloadable from admin + viewable as HTML

### Receipt Design

#### Standard Donation Receipt
- **Header**: Masjid logo + charity name + HMRC reference
- **Receipt number**: Based on donation ID
- **Donor details**: Name, email, address (if available)
- **Donation details**: Amount, date, frequency, payment method
- **Gift Aid section** (if eligible):
  - Gift Aid declaration text (HMRC-mandated wording)
  - Charity reference number
  - Declaration date
  - Gift Aid amount reclaimable (25% of donation)
- **Footer**: Charity registration details, contact info
- **Styling**: Sapphire/Gold/Stone color scheme, professional layout

#### Gift Aid Declaration Receipt
- Separate template for Gift Aid-specific documentation
- Full HMRC-compliant declaration text
- Donor address (required for Gift Aid)
- Charity details from CharityGiftAidSettings singleton

### Files to Create/Modify

**New files:**
- `backend/core/templates/admin/receipts/donation_receipt.html` — HTML receipt template
- `backend/core/templates/admin/receipts/gift_aid_receipt.html` — Gift Aid receipt
- `backend/core/static/admin/receipts/receipt.css` — receipt styles (print-optimized)
- `backend/core/receipt_views.py` — receipt generation views (HTML + PDF)

**Modified files:**
- `backend/core/admin.py` — Add "Generate Receipt" action to DonationAdmin
- `backend/config/urls.py` — Add receipt URL patterns
- `backend/requirements.txt` — weasyprint dependency

---

## Implementation Order

1. **Guide CSS + base template** — establish the branded look
2. **Guide pages** — Welcome, then each section
3. **Unfold sidebar integration** — wire up navigation
4. **URL routing** — connect all guide views
5. **Receipt HTML template** — design the donation receipt
6. **Gift Aid receipt template** — HMRC-compliant version
7. **PDF generation** — WeasyPrint integration
8. **Admin actions** — "Generate Receipt" button on Donation admin
9. **Test everything** — verify all pages render, PDF generates, sidebar works
10. **Copy the logo** — ensure Masjid_Logo.png is in static files

---

## Key Principles (from CLAUDE.md)

- **Zero jargon** — "Add an announcement" not "Create a record"
- **Guided flows** — step-by-step with numbered instructions
- **Visual feedback** — clear screenshots/diagrams where helpful
- **Mobile-first** — guide pages must be readable on phones
- **60-second test** — a new volunteer should understand any task within 60 seconds
