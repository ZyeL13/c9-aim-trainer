# QA Checklist — C9 Aim Trainer v1.1.1

Every row was ticked by a real headless run of the automated suite
(`~/workspace/devpost/c9-video/test-v111.js`, puppeteer-core + headless
Chromium, 1280×720), **58/58 checks passed, 0 console/page errors**,
24 Nov 2026. "Ticked" means the suite asserted it, not that someone read
the code and nodded. The QR phone-scan step is the one manual item — the
automated suite asserts the canvas is non-blank and the payload string
equals the saved entry exactly; the physical scan is a manual playtest
pass by the human.

| # | Check | Steps | Expected result | Pass |
|---|---|---|---|---|
| 1 | Start | Load page, click START | Round starts, timer counts down, first target spawns | [x] |
| 2 | Hit | Click a target | Score rises, combo +1, float `+pts` appears | [x] |
| 3 | Miss (empty space) | Click empty arena | Misses +1, combo resets to 0 | [x] |
| 4 | Miss (expiry) | Let a target fade | Misses +1, combo resets to 0 | [x] |
| 5 | Timer end | Shorten round via test hook, wait | End screen appears with score/accuracy/streak/avg reaction | [x] |
| 6 | Save (success) | 60s round, type name, Save score | "Saved ✓", "You are #N", entry on the board, button disabled | [x] |
| 7 | Save (failure) | Stub `setItem` to throw, Save score | "Couldn't save — storage unavailable…", button stays enabled, no "Saved ✓" anywhere | [x] |
| 8 | Save (retry) | Restore storage, Save score again | Save succeeds, rank shown | [x] |
| 9 | Reset (Play again) | End screen → Play again | New round starts immediately, HUD back to zero | [x] |
| 10 | Reset (Next player) | End screen → Next player | Clean start screen, player name back to PLAYER | [x] |
| 11 | Leaderboard (Classic) | Save a 60s Classic round | Entry appears on the Classic board, tab switches to Classic | [x] |
| 12 | Leaderboard (Clutch) | Save a Clutch round | Entry appears on the Clutch board only, tab switches to Clutch | [x] |
| 13 | Leaderboard tabs | Click Classic / Clutch tabs | Each tab shows only its own board | [x] |
| 14 | Double-click guard | Two rapid clicks on the same target (pointerdown) | Exactly 1 hit | [x] |
| 15 | Idle reset (untouched) | End a round, touch nothing (3s test idle) | Start screen returns | [x] |
| 16 | Idle reset (touch at ~55s) | End a round, wait ~5s, tap the end screen | Countdown restarts at 60s (idle note shows 60 again) | [x] |
| 17 | Idle reset (save, walk away) | End a round, save, touch nothing (3s test idle) | Start screen returns 3s after the save | [x] |
| 18 | Practice-mode no-save | 30s round → end screen | "Practice mode — scores don't count…" note, no save row, no QR | [x] |
| 19 | Tie-break | Seed board with an entry identical (name/score/accuracy/reaction) to the round just played, then save | Two distinct ranks (#1, #2); "1 pts to #1"; note rank matches the row | [x] |
| 20 | Penalty target | Clutch, force a red ✕ target, click it | Exactly −100 points, combo reset to 0, misses unchanged, glyph ✕ | [x] |
| 21 | Bonus target | Clutch, force a gold ★ target, click it | Exactly +150 on top of the standard formula, glyph ★ | [x] |
| 22 | Clutch phase | Clutch round, 15s remaining | CLUTCH banner appears, arena border pulses, a hit scores exactly double | [x] |
| 23 | Clutch movement | Clutch round, sample one target's position twice | Position changes (target drifts and bounces) | [x] |
| 24 | Clutch legend + mode chip | Select Clutch Challenge | Legend visible, HUD chip shows CLUTCH, 30s/90s buttons disabled | [x] |
| 25 | Kiosk toggle | Click "Kiosk mode" / open with `?kiosk=1` | Kiosk chrome applies; toggle exits cleanly | [x] |
| 26 | Attract screen | 90s idle on start (2s test idle), seeded top-3 | Attract overlay appears with top-3; first touch dismisses it | [x] |
| 27 | Admin panel | Long-press ◎ brand mark for 3s | Admin panel opens | [x] |
| 28 | Kiosk clear (single click) | Admin panel → single click on a clear button | Nothing happens: no confirmation, board intact | [x] |
| 29 | Kiosk clear (hold + CLEAR) | Hold clear 3s, type CLEAR, confirm | Only the selected board is wiped; the other board is untouched | [x] |
| 30 | Pointer Events | All arena hits via pointerdown (mouse clicks in the suite) | Hits register once, no double-fire | [x] |
| 31 | Player-name reset | Type a name, Next player | Name input back to PLAYER | [x] |
| 32 | Version footer | Load page | Footer shows v1.1.1 | [x] |
| 33 | QR code (renders) | Save a 60s round | QR canvas renders (dark + light modules present), shown only after a successful save | [x] |
| 34 | QR code (payload) | Save a 60s round, read payload via test hook | Payload equals the saved entry exactly (name, score, mode, accuracy, reaction) | [x] |
| 35 | QR code (phone scan) | Save a round, scan the on-screen QR with a phone | Phone shows exactly the saved entry | [ ] manual |
| 36 | Personal best | Save a round, then a higher round | First save: "New personal best"; second: "you beat your best by +Y" with the exact delta | [x] |
| 37 | Rank context | Save a round | "Rank #N" line; "Z pts to #N−1" (or "Top of the board!" at #1) | [x] |
| 38 | Performance Card | End a round | Card shows score/accuracy/avg reaction/best streak/rank and an S/A/B/C rating matching the numbers | [x] |
| 39 | Target feedback | Play, watch targets and the arena | Lifetime ring depletes; PERFECT/FAST verdicts for the right reaction bands; arena classes switch at combo 5/10/15 and clear on miss | [x] |
| 40 | No console errors | Full suite run | 0 console errors, 0 page errors across all groups | [x] |
