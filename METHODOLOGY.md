# Methodology — C9 Aim Trainer

## The problem (Category 3: Event Mini Game)

A Cloud9 booth at an event has a hard constraint most games ignore: the player
is a stranger who has **never seen the game before**, has **about two minutes**
before the queue behind them gets impatient, and will **walk away mid-flow**
without cleaning up. The game must therefore be:

1. **Instantly learnable** — no tutorial, no instructions wall, no keys to memorise.
2. **Fast** — a complete session well under 3 minutes.
3. **Booth-proof** — it must reset itself cleanly for the next player, keep working
   if the venue Wi-Fi dies, and survive hours of sustained use by hundreds of
   different hands.

## Our approach

**One mechanic, done well.** We picked the flick-shot / aim-trainer loop because
it is the most proven booth mechanic in the category brief itself (the brief
explicitly suggests "a creative aim-trainer, a flick-shot tester, or a
reaction-time drill"). One target appears at a time; you click it before it
fades. There is nothing to explain and nothing to get wrong.

**Scoring that rewards the skill the booth is about.** Points are not flat:
100 base per hit, up to +100 speed bonus (faster flicks pay more), and a combo
bonus (+5 per consecutive hit, capped at +100). A miss — clicking empty space
or letting a target fade — resets the combo. That makes every round a small
drama: protect the streak or lose it. Reaction time (spawn → click, in ms) is
tracked per hit and averaged, so the score screen tells a player something
real about their own skill, not just a number.

**Difficulty that ramps inside the round.** Targets shrink (~72px → ~44px) and
spawn faster (700ms → ~480ms) as the round progresses, and target lifetime
shortens slightly. A 30-second round feels snappy; a 90-second round tests
endurance. The default 60-second round is the booth sweet spot.

**The leaderboard is the retention mechanic.** The brief calls a local live
leaderboard "a massive plus" and specifically notes it should work without
Wi-Fi. Ours is a top-10 board stored in `localStorage` on the booth machine —
no server, no network, no accounts. A fan who scores #3 does not walk away;
they stay, watch the next player, and try again. That is the booth dynamic
Cloud9 wants: a crowd forming around a screen.

**Fairness is part of the leaderboard.** Since v1.1.1 only 60-second rounds
count toward the official board — 30s and 90s rounds are clearly labelled
practice modes with no save. Classic and Clutch Challenge have separate
boards (a 2× clutch multiplier would otherwise dominate the Classic board),
switchable with tabs above the board. Ties break by accuracy, then average
reaction time, and ranks are looked up by entry identity, so two identical
name+score entries still get distinct, correct ranks. A failed save is
reported honestly instead of showing "Saved ✓" — a private-mode browser
never silently eats a score.

**Booth mode, not just a reset button.** The end screen has Play Again and
Next Player buttons, and — the part that matters at a real booth — it resets
itself to the clean start screen after 60 seconds of no activity. Since
v1.1.1 every touch *restarts* that countdown instead of stopping it: saving
a score, typing a name, or tapping the screen gives the player a fresh 60
seconds, and a player who walks away mid-celebration never blocks the queue.
Kiosk Mode adds fullscreen, an attract screen after 90s idle on the start
screen (top-3 scores, "TOUCH TO PLAY"), and a hidden admin panel — the
prominent "Clear leaderboard" button is gone, and clearing a board needs a
3-second hold *and* typing `CLEAR`, so a bored stranger can never wipe the
board as a joke.

**Clutch Challenge Mode is the differentiation.** A plain flick-shot trainer
is the least differentiated reading of the brief — Cloud9 already built a
co-branded aim trainer with JetBrains in 2025. Clutch reuses the same engine
(one live target, same timer, same HUD) but the targets move and bounce, gold
★ targets pay +150, red ✕ targets cost −100 and break the combo, and the
final 15 seconds double every point. It is a mode a plain aim trainer does
not have, and it is the reason the game is worth a second look.

**The end screen is a souvenir.** Since v1.1.1 it shows a Performance Card
(score, accuracy, avg reaction, best streak, rank, S/A/B/C rating) and the
player's personal best per mode, with the exact "+Y" delta when a best is
beaten and the points needed to pass the rank above. After a successful save
a QR code appears — plain text, generated client-side from a vendored
encoder, no network, no tracking — so a player can snap their score home
with their phone. The QR never delays the 60-second reset; a player who
needs more time to scan simply taps the screen.

**Sound is optional by design.** Hit/miss/end cues are generated with WebAudio
(no audio files to load), with a mute toggle in the header. At a loud event
the game is fully playable silent; at a quiet booth the sounds add feedback.

## How it solves the category's problem

| Booth need | How C9 Aim Trainer answers it |
|---|---|
| Learn in seconds | Mouse-only, one verb (click the target), giant START button |
| Play in <3 min | 30/60/90s rounds; default 60s |
| Crowd + replayability | Speed + combo scoring, reaction-time stats, top-10 local leaderboard |
| No Wi-Fi at the venue | Zero network dependencies; leaderboard in `localStorage` |
| Next player, clean state | Next Player button + 60s idle auto-reset on the end screen |
| Repeated use for hours | No assets to load, no state that accumulates, no login |
| Original, no IP risk | Original "C9" blue theme; no Riot/VALORANT/LoL names, art or logos |
| Fair competition | 60s-only ranked board, practice modes labelled, separate Clutch board, accuracy/reaction tie-break |
| Booth-proof against strangers | Kiosk Mode, attract screen, hidden admin, hold + type-CLEAR board protection |
| A reason to come back | Clutch Challenge Mode, personal bests, Performance Card, score-to-phone QR |

## What we deliberately did not do

- No VALORANT/LoL data integration: Category 3 does not need GRID data, and
  faking esports data would have added scope without adding booth value.
- No accounts, no server, no analytics: the leaderboard is local on purpose.
- No keyboard controls: mouse-only keeps the interaction model to one input,
  which is what a booth queue needs.
- No copied assets: every visual is CSS + system fonts, so the game is
  self-contained and there is nothing to license.

## Verification

Playtested in a headless browser (see playtest notes in the submission report):
start → play → hits score and combo rises → miss resets combo → timer ends →
end screen shows score/accuracy/streak/avg reaction → save to leaderboard →
Play Again restarts cleanly, Next Player returns to the start screen, and the
idle auto-reset fires. No JavaScript errors observed.

**v1.1.1 verification (24 Nov 2026):** a 58-check automated suite
(`~/workspace/devpost/c9-video/test-v111.js`, puppeteer-core + headless
Chromium) ran green with 0 console/page errors. It verified, with exact
arithmetic where the rules are numeric: the double-click guard under
Pointer Events; save failure reporting and retry; tie-break with two
identical name+score entries (distinct ranks, "1 pts to #1"); all three
idle-reset triggers (untouched, touch-at-~55s, save-then-idle); practice
modes offering no save; a bonus hit adding exactly +150 and a penalty hit
deducting exactly −100 with combo reset; the clutch phase doubling points
exactly; both leaderboard boards and tab switching; the attract screen;
hold-3s + type-CLEAR clearing only the selected board; the QR payload
matching the saved entry exactly; personal-best deltas; and the name reset
on Next player. Every row of [QA_CHECKLIST.md](QA_CHECKLIST.md) is ticked
from that run, not by inspection.
