# Future Implementation Plans

Parked proposals — approved in principle but not scheduled. Each entry is a ready-to-execute brief: next session can pick any of these up directly.

Format: title → verdict date → council summary → phases → open questions → acceptance criteria.

---

## Connect Mixlr live broadcasts to Events

**Parked**: 2026-04-16 (council approved, then explicitly deferred by user).

### Current state (relevant to this plan)

- `lib/mixlr.ts` — fetches Mixlr API status.
- `hooks/useLiveLesson.ts` — polls every 30s.
- `components/community/LiveLessonBanner.tsx` — appears in Community tab when ANY broadcast is live.
- `app/live-lesson.tsx` — full-screen Mixlr embed player.
- Backend `MixlrStatus` model (per-mosque), updated by `poll_mixlr` management command.
- **Gap**: live broadcasts are detached from specific events. User sees "something is live" but doesn't know which scheduled event.

### Goal

A user opening the Events tab sees at-a-glance which event is being broadcast live right now, and can tap through to listen. Optionally a push notification when an event they're interested in goes live.

### Council verdict (15 seats polled)

APPROVED — execute in three phases. Highlights:

- **Seat 1 (Architect)**: use admin flag + time-window matching. Don't over-engineer with manual broadcast-to-event linking.
- **Seat 4 (Fatima, Django)**: compute `is_live_now` per request, don't store it — no data drift.
- **Seat 5 (Dr. Yusuf)**: default `is_broadcast_live` to FALSE. Not every event is streamed.
- **Seat 14 (Nadia, Push)**: one push per broadcast transition, deduped. No "you missed it" follow-ups.
- **Seat 24 (Tova)**: quiet notification copy. "Tafseer al-Sa'di is live now. Tap to listen." Not "Don't miss it!"
- **Seat 30 (Fadwa, Psychology)**: honour existing `eventReminders` opt-in. Reject any engagement metrics on religious listening (badge counts, streaks).
- **Seat 9 (Security)**: Mixlr CSP already in place. No new attack surface.

### Phase 1 — Backend model + API (~2 hours)

- Add `is_broadcast_live: bool, default False` to `Event` model.
- Admin field help text: *"Tick if this event will be streamed on Mixlr."*
- Django migration (additive, prod-safe).
- `EventSerializer`: add `is_broadcast_live` and a computed `is_live_now` = (`event.is_broadcast_live` AND `MixlrStatus.is_live` AND `now()` ∈ [`start_time - 5min`, `end_time + 15min`]).
- Register the checkbox on the Django admin Event form.

### Phase 2 — Mobile event list + tap-through (~1–2 hours)

- `components/community/EventsContent.tsx`: render a gold `LIVE` pill on any event row where `is_live_now === true`. Styling consistent with `LiveLessonBanner` after the red→gold fix (`components/community/LiveLessonBanner.tsx`, commit `4b80b06`).
- On tap when live: navigate to `/live-lesson` with event context in route params (title, speaker).
- `app/live-lesson.tsx`: read event params and render them above the Mixlr embed header ("Now broadcasting: Tafseer al-Sa'di — Sh. Abu Khadijah").
- Fallback: if entered via push before next poll, force one `fetchMixlrStatus()` on player mount to confirm live.

### Phase 3 — Live-now push notification (~2–3 hours)

- In `poll_mixlr` management command, on `is_live = false → true` transition:
  - Find all `Event` rows where `is_broadcast_live = true`, mosque = current, and `now()` ∈ [start - 5min, end + 15min].
  - For each such event, send Expo Push to users who subscribe to that mosque with `event_reminders` enabled.
  - Dedupe via cache key: `mixlr_broadcast_{broadcast_id}_event_{event_id}` — don't resend if the same broadcast is still live.
- Copy (Tova's voice): `"{event.title} is live now. Tap to listen."`
- Deep link: `/live-lesson?eventId={uuid}`.
- Mobile deep-link handler already exists in `app/_layout.tsx`; extend it to parse the `eventId` param.

### Deferred within this plan (Phase 4, not scoped yet)

- **Archived recordings**: if Mixlr retains past broadcasts, expose them on completed events. Separate feature.
- **Listen analytics**: explicitly REJECTED by Seat 30. No engagement metrics on religious content.

### Open questions (user action required before Phase 1 starts)

1. **Is Mixlr actually used for events today?** Which ones — Weekly Tafseer, Friday Khutbah, Aqeedah lessons? Need a concrete list to size rollout.
2. **Default for `is_broadcast_live`**: FALSE per council, confirmed? (If most events are broadcast, TRUE makes more sense.)
3. **Notification opt-in scope**: should the live-now push respect the existing `eventReminders` setting (council recommendation), or a separate preference toggle?

### Acceptance criteria

- An admin creates a "Weekly Tafseer" event for tonight at 19:00, ticks *"will be broadcast live"*.
- When Mixlr goes live at 18:58, the Events list in the mobile app shows a gold `LIVE` pill on that event row within 30 seconds (polling interval).
- Users with `eventReminders` on receive a push: *"Weekly Tafseer is live now. Tap to listen."*
- Tapping the push or the pill opens the `live-lesson` player with the event name in the header.
- When Mixlr goes offline, pill disappears on next poll. No "you missed it" follow-up.

### Why deferred

User wanted to pause the rollout to focus on current-sprint work. Plan is complete and executable; pick up when bandwidth allows.

### Rollback

- Phase 1: single migration, reversible via `migrate core <prior_number>`.
- Phase 2: OTA-deliverable, revert by shipping an OTA without the Phase 2 commit.
- Phase 3: server-side change, revert by removing the push-send block from `poll_mixlr`.

### Estimated cost

5–7 hours of focused work, split across 3 commits. Can be done in a single session if uninterrupted.
