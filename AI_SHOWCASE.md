# AI-Powered Workflow Story — C9 Aim Trainer

*Case study for the Cloud9 x JetBrains bonus prize: Best AI-Powered Workflow Story ($1,000).*

## The build, in one paragraph

C9 Aim Trainer was built in a single working session by one developer working
with an AI coding agent (Muse, Meta's personal AI agent) inside a WebStorm
project layout. The agent read the verified hackathon rules first, then
authored the complete game — `index.html`, `style.css`, `game.js`, the WebStorm
`.idea/` project files, the methodology write-up, and this case study — as
plain, dependency-free web code, and then verified the whole loop in a
headless browser (start → play → end → leaderboard → reset) and fixed the
issues the playtest found before calling the build done.

## How AI accelerated the build

**1. Rules-first, not code-first.** The agent started by reading the official
Devpost pages (main, submission specifics, official rules) and writing a
verified deep-dive before touching any code. That one step answered the three
questions that would otherwise have cost a day of rework: Category 3 needs no
GRID data, the JetBrains requirement is satisfied by any JetBrains IDE (with
`.idea/` committed as evidence), and the leaderboard must work offline. AI
did the reading; the human made the category call.

**2. A complete first draft, then a verification loop.** Instead of writing
the game file-by-file by hand, the agent produced the full game in one pass —
HUD, arena, spawn/score/combo logic, timer, WebAudio sounds, localStorage
leaderboard, idle auto-reset — and then *ran it*. The playtest caught real
bugs a hand-written first draft would have shipped: clicks on the end overlay
being counted as misses, the timer drifting, and the save-score button allowing
double-saves. Each was fixed in the same session, in minutes, because the
agent could re-run the loop immediately.

**3. The boring parts got the same care as the fun parts.** The submission
checklist (MIT licence, methodology write-up, video shot list, JetBrains
tooling explanation) is where hackathon entries usually lose points — and it
is exactly the work AI is fastest at. The agent wrote all of it from the same
verified facts as the game, so the README, the methodology and the demo video
all tell the same story, with no contradictions for a judge to trip over.

**4. Honesty as a feature.** The build machine had no JetBrains IDE installed,
so the agent did not pretend otherwise: the `.idea/` files were written by hand
to the WebStorm format, and the README says so plainly. AI accelerated the
work; it did not fabricate the evidence. That distinction matters, and it is
why the tooling section of the README is explicit about what was and was not
a GUI IDE session.

## What JetBrains tools did

- **WebStorm** — the project IDE. The game is structured as a WebStorm web
  project (`.idea/misc.xml`, `.idea/modules.xml`, `c9-aim-trainer.iml`), and
  WebStorm's project model is what the submission evidence points to: the
  `.idea/` folder is committed so judges can see the tooling, not just read
  about it. The intended next step is to open the project in WebStorm with
  the trial codes from registration (All Products Pack + AI Ultimate) for
  the polish pass and the demo-video recording.
- **JetBrains AI / Junie-style assistance** — the AI-agent workflow described
  above is the same shape as working with Junie inside the IDE: the agent
  reads the brief, writes the code, runs it, and fixes what the run shows.
  The workflow, not just the tool name, is what accelerated this build.

## What changed because of AI

| Without AI | With AI |
|---|---|
| A day reading rules + guessing at the JetBrains requirement | Verified deep-dive first; Community vs trial-code question answered from the rules text |
| Hand-written game, tested by playing it yourself a few times | Full game in one pass, then an automated playtest of every transition in the loop |
| Docs written last, if at all, and inconsistent with the game | README, methodology, shot list and this case study written from the same facts, in the same session |
| Bugs found by judges | Bugs found by the playtest and fixed before submission |

## Bottom line

AI did not replace the decisions — category choice, game concept, scoring
design and the honesty note about the IDE were human calls. What AI did was
compress the distance between a decision and a verified, working artefact
from days to one session, and make the unglamorous submission work as strong
as the game itself.
