# Buyer profiles — manual QA checklist

Automated tests cover the backend logic (schema, auth, badge/rating math —
see `backend/test/`, run with `npm test`). The frontend wiring below hasn't
been exercised in a real browser, so click through this before shipping.

Needs: the updated backend running with `API_BASE` pointed at it from
`app.html` (check how `API_BASE` is set for local dev — likely a
`window.API_BASE` constant or `.env`-driven value at the top of the file).

## 1. Setting up your own buyer profile
- [ ] Open the marketplace tab, click **My profile**. Sign in with an email (OTP or password, whichever this env is configured for).
- [ ] The panel shows **Display name**, **Profile photo**, and **Delivery contact** sections stacked in that order.
- [ ] Type a display name (2–40 chars) and click **Save**. A "Saved." message appears with a **View your public profile →** link.
- [ ] Type a 1-character name and Save — should show an inline error, not save.
- [ ] Type a 41+ character name and Save — should show an inline error.
- [ ] Click **Upload photo**, pick a JPEG/PNG. Preview updates to a circular avatar; a **Remove photo** link appears.
- [ ] Click **Remove photo** — preview reverts to the "No photo" placeholder box, remove link disappears.
- [ ] Reload the page, reopen **My profile** — display name and avatar should still be there (persisted, not just local state).

## 2. Viewing your own public profile
- [ ] Click **View your public profile →**. Panel switches to show avatar, display name, "N orders completed on Amana," member-since date.
- [ ] If you have zero completed (`arrived`) orders, no "Verified buyer" badge should show.
- [ ] Click **← Back** — returns to **My profile**, not somewhere else.

## 3. Verified badge and stats (needs seeded/test data)
- [ ] Using a buyer account with 5+ orders in `arrived` status, view that profile — **Verified buyer** badge should appear.
- [ ] A buyer with 4 or fewer arrived orders should NOT show the badge.
- [ ] Orders in `pending`/`shipped`/other non-arrived statuses should NOT count toward the number shown.

## 4. Seller viewing a buyer + rating them
- [ ] Sign in as a seller with at least one sale, open **Your sales**.
- [ ] Each sale card shows a **View buyer profile →** link. Click it — opens the buyer's public profile (avatar, stats, reviews from sellers).
- [ ] Click **← Back** from here — returns to **Your sales**, not **My profile** (this is the `returnTo` behavior — worth double-checking specifically, since it's the one part of the wiring most likely to have a bug).
- [ ] For an order with status **arrived**, a star-rating dropdown + optional comment field + **Rate this buyer** button appears.
- [ ] For an order NOT yet arrived (pending/shipped), no rating form should appear.
- [ ] Pick a star rating, optionally add a comment, click **Rate this buyer**. Button should show "Saving…" then "Rated ✓".
- [ ] Refresh the seller's sales list — the rating form for that same order: does it re-show as available? (Currently the frontend doesn't hide it after rating — clicking again should surface the backend's "already been reviewed" error in the small text below the form. Confirm that error displays legibly rather than breaking layout.)
- [ ] View that buyer's public profile — the new review (stars + comment) should appear under "Reviews from sellers," and the average rating / review count should update.

## 5. Error / edge states
- [ ] View a buyer profile for an email that has never ordered anything and has no saved profile — should show a clean "not found" message, not a broken/blank panel.
- [ ] With the backend stopped (or `API_BASE` empty), all of the above should fail gracefully with an inline error message rather than a silent freeze or console-only error.
- [ ] Try uploading a non-image file as an avatar — should show an inline error (backend rejects non-image mimetypes with a 400).
- [ ] Try uploading a very large image (>8MB) — should show an inline error, not hang.

## Known gap worth fixing next
The "Rate this buyer" form doesn't disappear or switch to a "you already
rated this" state after a successful rating — it just shows "Rated ✓" on
the button until the list is reloaded. If you want that hidden/replaced
immediately, that's a small frontend follow-up, not a backend change.
