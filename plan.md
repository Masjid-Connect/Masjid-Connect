# Audit Report — Remaining Items Fix Plan

## Already Fixed (confirmed)
S1, S3, S4, S5, S6, S7, S8, S9, S12, S13, S14, S18, Q2, Q5, Q6, Q8, Q9, Q11, Q13, Q14, Q15, Q16, Q17, Q18, Q19, Q20, Q23, Q24, Q25, Q26, Q28, R1, R2, R3, R4, R5, R6, R7, R8, R11, R12, R13, R14, R15, R16, R19, R20, D1, D5, D6, D7, D8, D9, D11, D16, D17, D21, D23

## Remaining: 22 items across 4 chunks

### Chunk 1: Backend Security & Data Integrity (6 items)
- **S2**: Remove `unsafe-inline` from CSP in `backend/config/middleware.py`
- **Q1**: Wrap user registration in `transaction.atomic()` in views.py
- **Q3**: Add `@transaction.atomic` to `GiftAidClaim.recalculate_totals()`
- **Q21**: Validate `expires_at` not in past in `AnnouncementSerializer`
- **Q22**: Validate event category filter against choices
- **S19**: Replace magic number 4 with `IntegerChoices` enum

### Chunk 2: Backend Infrastructure (5 items)
- **S11**: Add security options to Dockerfile (read-only, no-new-privileges)
- **S10**: Add secrets scanning to CI workflow
- **S17**: Add structured JSON logging for production
- **R18**: Add image validation/resize on mosque photo upload
- **Q10**: Add pagination to `gift_aid_summary` endpoint

### Chunk 3: Frontend Data & Cache (3 items)
- **S16**: Add cache size limits with eviction in `lib/storage.ts`
- **Q7**: Invalidate caches after mutations in `lib/api.ts`
- **Q4**: Add version metadata to `lib/staticTimetable.ts`

### Chunk 4: Frontend UX & Design (8 items)
- **D3**: Wire profile card to show account info sheet
- **D4**: Add guest "sign in for reminders" CTA on prayer screen
- **D10**: Add badge and menuLabel typography variants
- **D12**: Live theme preview in ThemePreviewSheet
- **D13**: Donation success confirmation after Stripe return
- **D14**: Add clear button to TextInput
- **D15**: Add selected state to ListRow
- **D18**: Add animated badge entrance to tab indicator
