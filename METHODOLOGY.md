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

**Booth mode, not just a reset button.** The end screen has Play Again and
Next Player buttons, and — the part that matters at a real booth — it resets
itself to the clean start screen after 60 seconds of no activity. A player who
walks away mid-celebration never blocks the queue.

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
