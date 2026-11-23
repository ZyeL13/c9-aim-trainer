/* C9 Aim Trainer v1.1.1 — Category 3 Event Mini Game
 * Plain vanilla JS, no build step, no network needed at runtime.
 * Loop: START -> targets spawn one at a time -> click to hit -> END screen
 * with stats + offline local leaderboard -> clean reset for the next player.
 *
 * v1.1.1 adds: Clutch Challenge Mode, Kiosk Mode (fullscreen + attract
 * screen + hidden admin), 60s-only ranked leaderboard, personal best,
 * Performance Card, score-to-phone QR (vendored Nayuki qrcodegen, MIT,
 * client-side only). See upgrade spec v1.1.1.
 *
 * Authorship note (honest): v1.0 was built by an AI agent (Muse) and the
 * .idea/ files were hand-written to WebStorm format — see README. This
 * v1.1.1 round was likewise built by the agent (Muse) per spec v1.1.1;
 * a real WebStorm/Junie pass follows later as a separate, dated addendum.
 * Nothing here claims a WebStorm GUI session that did not happen.
 */
(function () {
  'use strict';

  var VERSION = '1.1.1';
  var LEADERBOARD_KEY = 'c9-aim-trainer-leaderboard-v2';
  var LEADERBOARD_KEY_CLUTCH = 'c9-aim-trainer-leaderboard-v2-clutch';
  var PB_KEY = 'c9-aim-trainer-pb-v1';
  var MAX_BOARD = 10;
  var IDLE_RESET_SECONDS = 60;
  var ATTRACT_IDLE_SECONDS = 90;
  var ADMIN_HOLD_MS = 3000;
  var ADMIN_CLOSE_SECONDS = 30;
  var DEMO_URL = 'https://cloud9-aim-trainer.vercel.app/';

  var arena = document.getElementById('arena');
  var startOverlay = document.getElementById('startOverlay');
  var endOverlay = document.getElementById('endOverlay');
  var startBtn = document.getElementById('startBtn');
  var playAgainBtn = document.getElementById('playAgainBtn');
  var nextPlayerBtn = document.getElementById('nextPlayerBtn');
  var resetBtn = document.getElementById('resetBtn');
  var soundToggle = document.getElementById('soundToggle');
  var saveScoreBtn = document.getElementById('saveScoreBtn');
  var playerNameInput = document.getElementById('playerName');
  var saveNote = document.getElementById('saveNote');
  var saveRow = document.getElementById('saveRow');
  var practiceNote = document.getElementById('practiceNote');
  var leaderboardEl = document.getElementById('leaderboard');
  var leaderboardEmpty = document.getElementById('leaderboardEmpty');
  var idleNote = document.getElementById('idleNote');
  var modeChip = document.getElementById('modeChip');
  var clutchBanner = document.getElementById('clutchBanner');
  var modeClassicBtn = document.getElementById('modeClassicBtn');
  var modeClutchBtn = document.getElementById('modeClutchBtn');
  var clutchLegend = document.getElementById('clutchLegend');
  var boardTabClassic = document.getElementById('boardTabClassic');
  var boardTabClutch = document.getElementById('boardTabClutch');
  var pbLine = document.getElementById('pbLine');
  var rankLine = document.getElementById('rankLine');
  var perfScore = document.getElementById('perfScore');
  var perfAccuracy = document.getElementById('perfAccuracy');
  var perfReaction = document.getElementById('perfReaction');
  var perfStreak = document.getElementById('perfStreak');
  var perfRank = document.getElementById('perfRank');
  var perfRating = document.getElementById('perfRating');
  var qrWrap = document.getElementById('qrWrap');
  var qrCanvas = document.getElementById('qrCanvas');
  var attractOverlay = document.getElementById('attractOverlay');
  var attractTop3 = document.getElementById('attractTop3');
  var adminPanel = document.getElementById('adminPanel');
  var adminClearClassicBtn = document.getElementById('adminClearClassicBtn');
  var adminClearClutchBtn = document.getElementById('adminClearClutchBtn');
  var adminClearConfirmWrap = document.getElementById('adminClearConfirmWrap');
  var adminClearLabel = document.getElementById('adminClearLabel');
  var adminClearInput = document.getElementById('adminClearInput');
  var adminClearConfirmBtn = document.getElementById('adminClearConfirmBtn');
  var adminClearError = document.getElementById('adminClearError');
  var adminExitKioskBtn = document.getElementById('adminExitKioskBtn');
  var adminSoundBtn = document.getElementById('adminSoundBtn');
  var adminCloseBtn = document.getElementById('adminCloseBtn');
  var kioskBtn = document.getElementById('kioskBtn');
  var brandMark = document.getElementById('brandMark');
  var versionEl = document.getElementById('versionEl');

  var timeValue = document.getElementById('timeValue');
  var scoreValue = document.getElementById('scoreValue');
  var comboValue = document.getElementById('comboValue');
  var hitsValue = document.getElementById('hitsValue');
  var missesValue = document.getElementById('missesValue');
  var accuracyValue = document.getElementById('accuracyValue');

  var state = 'idle'; // 'idle' | 'playing' | 'ended'
  var mode = 'classic'; // 'classic' | 'clutch'
  var boardTab = 'classic'; // leaderboard tab shown
  var duration = 60;
  var score = 0;
  var hits = 0;
  var misses = 0;
  var combo = 0;
  var bestStreak = 0;
  var reactionTimes = [];
  var remaining = 60;
  var endTime = 0;
  var timerId = null;
  var spawnId = null;
  var expireId = null;
  var idleId = null;
  var idleRemaining = IDLE_RESET_SECONDS;
  var currentTarget = null;
  var soundOn = true;
  var audioCtx = null;
  var scoreSaved = false;
  var savedEntry = null;
  var kiosk = false;
  var clutchPhase = false;
  var attractVisible = false;
  var lastActivity = Date.now();
  var adminCloseId = null;
  var pendingClearBoard = null;
  var lastQrPayload = null;
  var forcedKind = null; // test hook: force the next Clutch spawn kind
  var testIdleSeconds = 0; // test hook: shorten the idle countdown
  var testAttractSeconds = 0; // test hook: shorten the attract delay
  var motion = { raf: 0, x: 0, y: 0, vx: 0, vy: 0, last: 0 };

  /* ---------- sound (WebAudio, no files) ---------- */
  function beep(freq, ms, type, gain) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      g.gain.value = gain || 0.12;
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
      osc.stop(audioCtx.currentTime + ms / 1000);
    } catch (e) {
      /* Audio is optional; never break the game for it. */
    }
  }
  function hitSound() {
    // Pitch rises with the combo so spectators hear a streak building.
    var base = 880 * (1 + Math.min(combo, 15) * 0.04);
    beep(base, 90, 'sine', 0.14);
    beep(base * 1.5, 70, 'sine', 0.08);
  }
  function penaltySound() { beep(140, 160, 'sawtooth', 0.08); }
  function missSound() { beep(180, 140, 'sawtooth', 0.06); }
  function endSound() { beep(523, 120, 'sine', 0.12); setTimeout(function () { beep(784, 180, 'sine', 0.12); }, 130); }

  /* ---------- leaderboard (localStorage, offline) ---------- */
  function boardKeyFor(m) { return m === 'clutch' ? LEADERBOARD_KEY_CLUTCH : LEADERBOARD_KEY; }
  function loadBoard(key) {
    try {
      var raw = localStorage.getItem(key || LEADERBOARD_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  // Returns true on success, false when the write failed (private mode, quota).
  function saveBoard(key, board) {
    try {
      localStorage.setItem(key, JSON.stringify(board));
      return true;
    } catch (e) {
      return false;
    }
  }
  function sortBoard(board) {
    board.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (a.avgReaction !== b.avgReaction) return a.avgReaction - b.avgReaction;
      return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
    });
  }
  function renderBoard() {
    var board = loadBoard(boardKeyFor(boardTab));
    leaderboardEl.innerHTML = '';
    leaderboardEmpty.style.display = board.length ? 'none' : 'block';
    boardTabClassic.classList.toggle('is-active', boardTab === 'classic');
    boardTabClutch.classList.toggle('is-active', boardTab === 'clutch');
    board.forEach(function (entry, i) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.className = 'lb-name';
      name.textContent = (i + 1) + '. ' + entry.name;
      var meta = document.createElement('span');
      meta.className = 'lb-meta';
      meta.textContent = entry.accuracy + '% · ' + entry.avgReaction + 'ms';
      var scoreSpan = document.createElement('span');
      scoreSpan.className = 'lb-score';
      scoreSpan.textContent = entry.score;
      li.appendChild(name);
      li.appendChild(meta);
      li.appendChild(scoreSpan);
      leaderboardEl.appendChild(li);
    });
  }

  /* ---------- personal best (per mode) ---------- */
  function loadPb() {
    try {
      var parsed = JSON.parse(localStorage.getItem(PB_KEY) || '{}');
      return { classic: parsed.classic || 0, clutch: parsed.clutch || 0 };
    } catch (e) {
      return { classic: 0, clutch: 0 };
    }
  }
  function savePb(pb) {
    try { localStorage.setItem(PB_KEY, JSON.stringify(pb)); return true; } catch (e) { return false; }
  }

  /* ---------- HUD ---------- */
  function accuracy() {
    var total = hits + misses;
    return total === 0 ? null : Math.round((hits / total) * 100);
  }
  function avgReaction() {
    if (!reactionTimes.length) return null;
    var sum = reactionTimes.reduce(function (a, b) { return a + b; }, 0);
    return Math.round(sum / reactionTimes.length);
  }
  function updateHud() {
    timeValue.textContent = String(Math.max(0, Math.ceil(remaining)));
    scoreValue.textContent = String(score);
    comboValue.textContent = '×' + combo;
    comboValue.classList.toggle('hot', combo >= 5);
    hitsValue.textContent = String(hits);
    missesValue.textContent = String(misses);
    var acc = accuracy();
    accuracyValue.textContent = acc === null ? '—' : acc + '%';
    // Arena colour follows the combo so spectators see a streak building.
    arena.classList.toggle('combo-5', combo >= 5 && combo < 10);
    arena.classList.toggle('combo-10', combo >= 10 && combo < 15);
    arena.classList.toggle('combo-15', combo >= 15);
  }

  /* ---------- targets ---------- */
  function clearTarget() {
    stopMotion();
    if (currentTarget && currentTarget.parentNode) currentTarget.parentNode.removeChild(currentTarget);
    currentTarget = null;
    if (expireId) { clearTimeout(expireId); expireId = null; }
  }
  function spawnDelay() {
    // Faster as the round progresses: 700ms -> ~480ms.
    var progress = 1 - remaining / duration;
    var delay = Math.round(700 - 220 * progress);
    if (mode === 'clutch' && clutchPhase) delay = Math.round(delay * 0.6);
    return delay;
  }
  function targetSize() {
    // Smaller as the round progresses: ~72px -> ~44px.
    var progress = 1 - remaining / duration;
    return Math.round(72 - 28 * progress + Math.random() * 8 - 4);
  }
  function targetLifetime(kind) {
    // Lifetime shrinks slightly late in the round so the pace rises.
    var lifetime = Math.round(1000 - 150 * (1 - remaining / duration));
    if (kind === 'bonus') lifetime = 700;
    if (mode === 'clutch') {
      // Every 10 hits: lifetime -5% (floor 500ms), on top of the ramp above.
      lifetime = Math.max(500, Math.round(lifetime * Math.pow(0.95, Math.floor(hits / 10))));
    }
    return lifetime;
  }
  function stopMotion() {
    if (motion.raf) { cancelAnimationFrame(motion.raf); motion.raf = 0; }
  }
  function startMotion(el) {
    stopMotion();
    var speedMul = Math.pow(1.10, Math.floor(hits / 10)); // +10% per 10 hits
    var speed = (40 + Math.random() * 50) * speedMul; // 40-90 px/s
    var ang = Math.random() * Math.PI * 2;
    motion = {
      x: parseFloat(el.style.left) || 4,
      y: parseFloat(el.style.top) || 4,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      last: performance.now(),
      raf: 0
    };
    motion.raf = requestAnimationFrame(moveTick);
  }
  function moveTick(ts) {
    if (!motion.raf) return;
    var el = currentTarget;
    if (state !== 'playing' || !el || el.dataset.hit) { stopMotion(); return; }
    var dt = Math.min(0.05, (ts - motion.last) / 1000);
    motion.last = ts;
    motion.x += motion.vx * dt;
    motion.y += motion.vy * dt;
    var size = parseFloat(el.style.width) || 60;
    var maxX = Math.max(0, arena.clientWidth - size - 8);
    var maxY = Math.max(0, arena.clientHeight - size - 8);
    if (motion.x < 4) { motion.x = 4; motion.vx = Math.abs(motion.vx); }
    if (motion.x > maxX) { motion.x = maxX; motion.vx = -Math.abs(motion.vx); }
    if (motion.y < 4) { motion.y = 4; motion.vy = Math.abs(motion.vy); }
    if (motion.y > maxY) { motion.y = maxY; motion.vy = -Math.abs(motion.vy); }
    el.style.left = motion.x + 'px';
    el.style.top = motion.y + 'px';
    motion.raf = requestAnimationFrame(moveTick);
  }
  function spawnTarget() {
    if (state !== 'playing') return;
    clearTarget();
    var kind = 'normal';
    if (mode === 'clutch') {
      if (forcedKind) { kind = forcedKind; forcedKind = null; }
      else {
        var r = Math.random();
        if (r < 0.125) kind = 'bonus'; // ~1 in 8
        else if (r < 0.225) kind = 'penalty'; // ~1 in 10
      }
    }
    var size = targetSize();
    if (mode === 'clutch' && clutchPhase) size = Math.round(size * 0.8);
    if (kind === 'bonus') size = Math.round(size * 0.75);
    var rect = arena.getBoundingClientRect();
    var maxX = Math.max(0, rect.width - size - 8);
    var maxY = Math.max(0, rect.height - size - 8);
    var x = 4 + Math.random() * maxX;
    var y = 4 + Math.random() * maxY;

    var el = document.createElement('div');
    el.className = 'target' + (kind !== 'normal' ? ' kind-' + kind : '');
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    var lifetime = targetLifetime(kind);
    el.style.animationDuration = '0.12s, ' + lifetime + 'ms';
    el.dataset.spawnedAt = String(performance.now());
    el.dataset.kind = kind;

    // Lifetime ring: an SVG circle whose stroke depletes over the lifetime.
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'ring');
    var R = size / 2 + 4;
    var C = 2 * Math.PI * R;
    svg.setAttribute('width', size + 10);
    svg.setAttribute('height', size + 10);
    svg.setAttribute('viewBox', '0 0 ' + (size + 10) + ' ' + (size + 10));
    var circ = document.createElementNS(svgNS, 'circle');
    circ.setAttribute('cx', (size + 10) / 2);
    circ.setAttribute('cy', (size + 10) / 2);
    circ.setAttribute('r', R);
    circ.style.strokeDasharray = String(C);
    circ.style.strokeDashoffset = '0';
    svg.appendChild(circ);
    el.appendChild(svg);
    if (typeof circ.animate === 'function') {
      circ.animate(
        [{ strokeDashoffset: 0 }, { strokeDashoffset: C }],
        { duration: lifetime, fill: 'forwards', easing: 'linear' }
      );
    }
    if (kind !== 'normal') {
      var g = document.createElement('span');
      g.className = 'glyph';
      g.textContent = kind === 'bonus' ? '★' : '✕';
      el.appendChild(g);
    }

    arena.appendChild(el);
    currentTarget = el;
    if (mode === 'clutch') startMotion(el);

    expireId = setTimeout(function () {
      if (state !== 'playing' || currentTarget !== el) return;
      registerMiss(true);
      scheduleSpawn(120);
    }, lifetime);
  }
  function scheduleSpawn(delay) {
    if (spawnId) clearTimeout(spawnId);
    spawnId = setTimeout(spawnTarget, delay == null ? spawnDelay() : delay);
  }

  function floatScore(x, y, text, extraClass) {
    var el = document.createElement('div');
    el.className = 'float-score' + (extraClass ? ' ' + extraClass : '');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.textContent = text;
    arena.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 750);
  }
  function verdictFor(reaction) {
    if (reaction < 150) return 'PERFECT';
    if (reaction < 300) return 'FAST';
    return null;
  }

  function registerHit(targetEl, clientX, clientY) {
    // Already-hit guard: the popped target stays in the DOM for 140ms,
    // so a second click on it during the pop animation must not score again.
    if (targetEl.dataset.hit) return;
    targetEl.dataset.hit = '1';
    stopMotion();
    var kind = targetEl.dataset.kind || 'normal';
    var isPenalty = kind === 'penalty';
    var spawnedAt = parseFloat(targetEl.dataset.spawnedAt || '0');
    var reaction = Math.max(0, Math.round(performance.now() - spawnedAt));
    reactionTimes.push(reaction);
    hits += 1;

    var points;
    var rect = arena.getBoundingClientRect();
    if (isPenalty) {
      // Deliberate trap: -100 points and the combo is gone. Not a miss.
      combo = 0;
      points = -100;
      score = Math.max(0, score + points);
      floatScore(clientX - rect.left, clientY - rect.top, '−100', 'float-penalty');
      penaltySound();
    } else {
      combo += 1;
      if (combo > bestStreak) bestStreak = combo;
      var speedBonus = Math.max(0, Math.min(100, Math.round(100 - reaction / 8)));
      var comboBonus = Math.min(combo * 5, 100);
      points = 100 + speedBonus + comboBonus;
      if (kind === 'bonus') points += 150;
      if (mode === 'clutch' && clutchPhase) points *= 2;
      score += points;
      var verdict = verdictFor(reaction);
      floatScore(clientX - rect.left, clientY - rect.top,
        verdict ? verdict + ' +' + points : '+' + points);
      hitSound();
    }

    targetEl.classList.add('pop');
    var dead = targetEl;
    setTimeout(function () { if (dead.parentNode) dead.parentNode.removeChild(dead); }, 140);
    if (currentTarget === targetEl) currentTarget = null;
    if (expireId) { clearTimeout(expireId); expireId = null; }

    updateHud();
    scheduleSpawn(90);
  }

  function registerMiss(expired) {
    misses += 1;
    combo = 0;
    if (!expired) missSound();
    updateHud();
    if (expired) clearTarget();
  }

  /* ---------- round flow ---------- */
  function showOverlay(which) {
    startOverlay.classList.toggle('hidden', which !== 'start');
    endOverlay.classList.toggle('hidden', which !== 'end');
  }
  function isRankedRound() {
    // Clutch is 60s-only, so always ranked. Classic 30s/90s are practice.
    return mode === 'clutch' || duration === 60;
  }
  function resetRound() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (spawnId) { clearTimeout(spawnId); spawnId = null; }
    stopIdleCountdown();
    hideAttract();
    clearTarget();
    clutchPhase = false;
    clutchBanner.classList.add('hidden');
    arena.classList.remove('clutch-phase');
    // Remove any floating score labels left over.
    Array.prototype.slice.call(arena.querySelectorAll('.float-score')).forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    state = 'idle';
    score = 0; hits = 0; misses = 0; combo = 0; bestStreak = 0;
    reactionTimes = [];
    remaining = duration;
    scoreSaved = false;
    savedEntry = null;
    lastQrPayload = null;
    qrWrap.classList.add('hidden');
    saveNote.textContent = '';
    saveNote.classList.remove('error');
    saveScoreBtn.disabled = false;
    saveScoreBtn.textContent = 'Save score';
    playerNameInput.value = 'PLAYER';
    pbLine.textContent = '';
    rankLine.textContent = '';
    lastActivity = Date.now();
    updateHud();
    showOverlay('start');
  }

  function startRound() {
    hideAttract();
    resetRound();
    state = 'playing';
    modeChip.textContent = mode === 'clutch' ? 'CLUTCH' : 'CLASSIC';
    modeChip.classList.toggle('clutch', mode === 'clutch');
    endTime = performance.now() + duration * 1000;
    showOverlay(null);
    beep(660, 90, 'sine', 0.12);
    timerId = setInterval(function () {
      remaining = Math.max(0, (endTime - performance.now()) / 1000);
      if (mode === 'clutch' && !clutchPhase && remaining <= 15 && remaining > 0) enterClutchPhase();
      updateHud();
      if (remaining <= 0) endRound();
    }, 100);
    scheduleSpawn(250);
  }
  function enterClutchPhase() {
    clutchPhase = true;
    clutchBanner.classList.remove('hidden');
    arena.classList.add('clutch-phase');
  }

  function performanceRating(acc, avg) {
    if (acc === null || avg === null) return 'C';
    if (acc >= 90 && avg <= 220) return 'S';
    if (acc >= 80 && avg <= 300) return 'A';
    if (acc >= 65 && avg <= 450) return 'B';
    return 'C';
  }
  function fillPerfCard(rank) {
    perfScore.textContent = String(score);
    var acc = accuracy();
    perfAccuracy.textContent = acc === null ? '—' : acc + '%';
    var avg = avgReaction();
    perfReaction.textContent = avg === null ? '—' : avg + ' ms';
    perfStreak.textContent = String(bestStreak);
    perfRank.textContent = rank > 0 ? '#' + rank : '—';
    perfRating.textContent = performanceRating(acc, avg);
  }
  function updatePbLine(pbValue, beat, delta, isFirst) {
    if (!beat) {
      pbLine.textContent = 'Personal best: ' + (pbValue > 0 ? pbValue : '—');
      return;
    }
    pbLine.textContent = isFirst
      ? 'New personal best: ' + pbValue + '!'
      : 'Personal best: ' + pbValue + ' — you beat your best by +' + delta + '!';
  }
  function updateRankLine(rank, board) {
    if (rank <= 0) {
      rankLine.textContent = '';
      return;
    }
    var label = 'Rank #' + rank + ' on the ' + (mode === 'clutch' ? 'Clutch' : 'Classic') + ' board';
    if (rank > 1) {
      var above = board[rank - 2];
      label += ' · ' + (above.score - score + 1) + ' pts to #' + (rank - 1);
    } else {
      label += ' · Top of the board!';
    }
    rankLine.textContent = label;
  }

  function endRound() {
    if (state !== 'playing') return;
    state = 'ended';
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (spawnId) { clearTimeout(spawnId); spawnId = null; }
    clearTarget();
    clutchPhase = false;
    clutchBanner.classList.add('hidden');
    arena.classList.remove('clutch-phase');
    remaining = 0;
    updateHud();
    endSound();

    document.getElementById('finalScore').textContent = String(score);
    var acc = accuracy();
    document.getElementById('finalAccuracy').textContent = acc === null ? '—' : acc + '%';
    document.getElementById('finalStreak').textContent = String(bestStreak);
    var avg = avgReaction();
    document.getElementById('finalReaction').textContent = avg === null ? '—' : avg + ' ms';
    document.getElementById('finalHits').textContent = hits + ' / ' + misses;
    fillPerfCard(0);
    var pb = loadPb()[mode];
    updatePbLine(pb, false, 0, false);
    rankLine.textContent = '';
    if (isRankedRound()) {
      saveRow.classList.remove('hidden');
      practiceNote.classList.add('hidden');
    } else {
      saveRow.classList.add('hidden');
      practiceNote.classList.remove('hidden');
    }
    showOverlay('end');
    startIdleCountdown();
  }

  /* Booth mode: end screen resets itself after 60s idle so the next
   * player always finds a clean start screen. Every interaction RESETS
   * the countdown to a fresh 60s — it is never stopped by mere touching.
   * Only leaving the end screen (Play Again / Next Player / reset) stops it. */
  function startIdleCountdown() {
    stopIdleCountdown();
    idleRemaining = testIdleSeconds || IDLE_RESET_SECONDS;
    updateIdleNote();
    idleId = setInterval(function () {
      idleRemaining -= 1;
      if (idleRemaining <= 0) {
        resetRound();
        return;
      }
      updateIdleNote();
    }, 1000);
  }
  function stopIdleCountdown() {
    if (idleId) { clearInterval(idleId); idleId = null; }
  }
  function updateIdleNote() {
    idleNote.textContent = 'Booth mode: this screen resets automatically in ' + idleRemaining + 's of no activity.';
  }
  function resetIdleCountdown() {
    if (state === 'ended') startIdleCountdown();
  }

  /* ---------- score-to-phone QR (client-side only) ---------- */
  function buildQrPayload(entry) {
    return [
      'C9 Aim Trainer',
      'Player: ' + entry.name,
      'Score: ' + entry.score + ' (' + (entry.mode === 'clutch' ? 'Clutch' : 'Classic') + ', 60s)',
      'Accuracy: ' + entry.accuracy + '% · Avg reaction: ' + entry.avgReaction + 'ms',
      'Play: ' + DEMO_URL
    ].join('\n');
  }
  function drawQrFor(entry) {
    var payload = buildQrPayload(entry);
    lastQrPayload = payload;
    if (typeof qrcodegen === 'undefined') { qrWrap.classList.add('hidden'); return; }
    try {
      var qr = qrcodegen.QrCode.encodeText(payload, qrcodegen.QrCode.Ecc.MEDIUM);
      var scale = 5, border = 2, size = qr.size;
      qrCanvas.width = (size + border * 2) * scale;
      qrCanvas.height = (size + border * 2) * scale;
      var ctx = qrCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
      ctx.fillStyle = '#0b1e33';
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          if (qr.getModule(x, y)) ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
        }
      }
      qrWrap.classList.remove('hidden');
    } catch (e) {
      qrWrap.classList.add('hidden');
    }
  }

  function saveScore() {
    if (state !== 'ended' || scoreSaved) return;
    if (!isRankedRound()) return; // practice rounds have no save at all
    var name = (playerNameInput.value || 'PLAYER').trim().toUpperCase().slice(0, 12) || 'PLAYER';
    var acc = accuracy();
    var avg = avgReaction();
    var key = boardKeyFor(mode);
    var board = loadBoard(key);
    var entry = {
      name: name,
      score: score,
      accuracy: acc === null ? 0 : acc,
      avgReaction: avg === null ? 0 : avg,
      duration: duration,
      date: new Date().toISOString().slice(0, 10),
      mode: mode
    };
    board.push(entry);
    sortBoard(board);
    board = board.slice(0, MAX_BOARD);
    var ok = saveBoard(key, board);
    // Rank by object identity in the sorted board (never name+score match).
    // rank is 0 when the entry was cut by the top-10 slice — the write still
    // succeeded, the score just did not make the board.
    var rank = board.indexOf(entry) + 1;
    // Verify by re-reading: the stored board must contain an entry with
    // the exact fields just written. Never claim success on a failed write.
    var verified = false;
    if (ok && rank > 0) {
      var re = loadBoard(key);
      for (var i = 0; i < re.length; i++) {
        var e = re[i];
        if (e.name === entry.name && e.score === entry.score &&
            e.accuracy === entry.accuracy && e.avgReaction === entry.avgReaction &&
            e.date === entry.date) { verified = true; break; }
      }
    }
    if (!ok || (rank > 0 && !verified)) {
      saveNote.textContent = "Couldn't save — storage unavailable on this device. Your score was not recorded. Try again.";
      saveNote.classList.add('error');
      return; // button stays enabled, scoreSaved stays false, retry allowed
    }
    scoreSaved = true;
    savedEntry = entry;
    saveScoreBtn.disabled = true;
    saveScoreBtn.textContent = 'Saved ✓';
    saveNote.classList.remove('error');
    saveNote.textContent = rank > 0
      ? 'Saved! You are #' + rank + ' on the booth board.'
      : "Saved, but it didn't make the top 10 on this board.";
    // Personal best: compare against the best BEFORE this round.
    var pb = loadPb();
    var before = pb[mode] || 0;
    var beat = score > before;
    var delta = beat ? score - before : 0;
    var isFirst = beat && before === 0;
    if (beat) { pb[mode] = score; savePb(pb); }
    updatePbLine(pb[mode], beat, delta, isFirst);
    updateRankLine(rank, board);
    fillPerfCard(rank);
    boardTab = mode;
    renderBoard();
    drawQrFor(entry);
    resetIdleCountdown();
  }

  /* ---------- attract screen (kiosk idle) ---------- */
  function showAttract() {
    if (state !== 'idle' || attractVisible) return;
    var board = loadBoard(LEADERBOARD_KEY);
    attractTop3.innerHTML = '';
    board.slice(0, 3).forEach(function (e, i) {
      var li = document.createElement('li');
      li.textContent = (i + 1) + '. ' + e.name + ' — ' + e.score;
      attractTop3.appendChild(li);
    });
    attractOverlay.classList.remove('hidden');
    attractVisible = true;
  }
  function hideAttract() {
    attractOverlay.classList.add('hidden');
    attractVisible = false;
    lastActivity = Date.now();
  }

  /* ---------- kiosk mode ---------- */
  function setKiosk(on) {
    kiosk = !!on;
    document.body.classList.toggle('kiosk', kiosk);
    kioskBtn.textContent = kiosk ? 'Exit kiosk' : 'Kiosk mode';
    kioskBtn.setAttribute('aria-pressed', String(kiosk));
    if (kiosk) {
      try {
        var p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(function () { /* fullscreen needs a gesture; kiosk chrome still applies */ });
      } catch (e) { /* headless / no gesture: kiosk chrome still applies */ }
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
      } catch (e) { /* ignore */ }
    }
  }

  /* ---------- hidden admin panel ---------- */
  function openAdmin() {
    if (state === 'playing') return;
    adminPanel.classList.remove('hidden');
    resetAdminCloseTimer();
  }
  function closeAdmin() {
    adminPanel.classList.add('hidden');
    hideClearConfirm();
    if (adminCloseId) { clearTimeout(adminCloseId); adminCloseId = null; }
  }
  function resetAdminCloseTimer() {
    if (adminCloseId) clearTimeout(adminCloseId);
    adminCloseId = setTimeout(closeAdmin, ADMIN_CLOSE_SECONDS * 1000);
  }
  function hideClearConfirm() {
    adminClearConfirmWrap.classList.add('hidden');
    adminClearError.textContent = '';
    pendingClearBoard = null;
  }
  function showClearConfirm(boardKey, label) {
    pendingClearBoard = boardKey;
    adminClearLabel.textContent = 'Type CLEAR to wipe the ' + label + ' board. This cannot be undone.';
    adminClearInput.value = '';
    adminClearError.textContent = '';
    adminClearConfirmWrap.classList.remove('hidden');
    adminClearInput.focus();
  }
  // Press-and-hold for 3s with a visible progress fill; any release cancels.
  function armHoldClear(btn, boardKey, label) {
    btn.addEventListener('pointerdown', function () {
      resetAdminCloseTimer();
      var fill = btn.querySelector('.hold-fill');
      var start = performance.now();
      var raf = 0;
      var done = false;
      function cancel() {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (fill) fill.style.width = '0%';
        btn.removeEventListener('pointerup', cancel);
        btn.removeEventListener('pointerleave', cancel);
        btn.removeEventListener('pointercancel', cancel);
      }
      function tick(ts) {
        var p = Math.min(1, (ts - start) / ADMIN_HOLD_MS);
        if (fill) fill.style.width = Math.round(p * 100) + '%';
        if (p >= 1) {
          done = true;
          cancel();
          showClearConfirm(boardKey, label);
        } else {
          raf = requestAnimationFrame(tick);
        }
      }
      raf = requestAnimationFrame(tick);
      btn.addEventListener('pointerup', cancel);
      btn.addEventListener('pointerleave', cancel);
      btn.addEventListener('pointercancel', cancel);
    });
  }

  /* ---------- mode + duration ---------- */
  function setDurationButtons() {
    document.querySelectorAll('.duration-btn').forEach(function (b) {
      var d = parseInt(b.dataset.duration, 10) || 60;
      b.classList.toggle('is-active', d === duration);
      b.disabled = (mode === 'clutch' && d !== 60);
    });
  }
  function setMode(m) {
    if (state === 'playing') return;
    mode = m;
    modeClassicBtn.classList.toggle('is-active', m === 'classic');
    modeClutchBtn.classList.toggle('is-active', m === 'clutch');
    clutchLegend.classList.toggle('hidden', m !== 'clutch');
    if (m === 'clutch') duration = 60; // Clutch is 60s only
    setDurationButtons();
    modeChip.textContent = m === 'clutch' ? 'CLUTCH' : 'CLASSIC';
    modeChip.classList.toggle('clutch', m === 'clutch');
    updateHud();
    resetRound();
  }

  /* ---------- events ---------- */
  // Pointer Events unify mouse + touch. One handler only — no double-fire.
  arena.addEventListener('pointerdown', function (e) {
    if (state !== 'playing') return;
    if (e.target.closest('.overlay')) return;
    var targetEl = e.target.closest ? e.target.closest('.target') : null;
    if (targetEl && arena.contains(targetEl)) {
      registerHit(targetEl, e.clientX, e.clientY);
    } else {
      registerMiss(false);
    }
  });

  // Prevent text selection / drag interfering with rapid clicking.
  arena.addEventListener('mousedown', function (e) { if (state === 'playing') e.preventDefault(); });

  startBtn.addEventListener('click', startRound);
  playAgainBtn.addEventListener('click', function () { startRound(); });
  nextPlayerBtn.addEventListener('click', function () { resetRound(); });
  resetBtn.addEventListener('click', function () { resetRound(); });
  saveScoreBtn.addEventListener('click', saveScore);

  soundToggle.addEventListener('click', function () {
    soundOn = !soundOn;
    soundToggle.textContent = soundOn ? 'Sound: On' : 'Sound: Off';
    soundToggle.setAttribute('aria-pressed', String(soundOn));
    if (soundOn) beep(660, 80, 'sine', 0.1);
  });

  modeClassicBtn.addEventListener('click', function () { setMode('classic'); });
  modeClutchBtn.addEventListener('click', function () { setMode('clutch'); });

  boardTabClassic.addEventListener('click', function () { boardTab = 'classic'; renderBoard(); });
  boardTabClutch.addEventListener('click', function () { boardTab = 'clutch'; renderBoard(); });

  document.querySelectorAll('.duration-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (state === 'playing') return;
      if (mode === 'clutch') return; // Clutch is 60s only
      duration = parseInt(btn.dataset.duration, 10) || 60;
      setDurationButtons();
      resetRound();
    });
  });

  // Every end-screen interaction RESETS the idle countdown (never stops it).
  endOverlay.addEventListener('pointerdown', resetIdleCountdown);
  playerNameInput.addEventListener('input', resetIdleCountdown);
  playerNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); saveScore(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && state === 'idle' && document.activeElement === document.body) {
      if (attractVisible) { hideAttract(); return; }
      startRound();
    }
  });

  // Activity tracking for the attract screen (start screen only).
  document.addEventListener('pointerdown', function () { lastActivity = Date.now(); }, true);
  document.addEventListener('keydown', function () { lastActivity = Date.now(); }, true);
  attractOverlay.addEventListener('pointerdown', function (e) {
    e.preventDefault(); // suppress the click-through to START underneath
    e.stopPropagation();
    hideAttract();
  });
  setInterval(function () {
    if (state === 'idle' && !attractVisible &&
        Date.now() - lastActivity >= (testAttractSeconds || ATTRACT_IDLE_SECONDS) * 1000) {
      showAttract();
    }
  }, 1000);

  // Kiosk mode.
  kioskBtn.addEventListener('click', function () { setKiosk(!kiosk); });
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && kiosk) {
      kiosk = false;
      document.body.classList.remove('kiosk');
      kioskBtn.textContent = 'Kiosk mode';
      kioskBtn.setAttribute('aria-pressed', 'false');
    }
  });

  // Admin: long-press (3s) the brand mark. Not during a round.
  var brandPressTimer = null;
  brandMark.addEventListener('pointerdown', function () {
    brandPressTimer = setTimeout(function () { brandPressTimer = null; openAdmin(); }, ADMIN_HOLD_MS);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
    brandMark.addEventListener(ev, function () {
      if (brandPressTimer) { clearTimeout(brandPressTimer); brandPressTimer = null; }
    });
  });
  adminPanel.addEventListener('pointerdown', resetAdminCloseTimer);
  adminPanel.addEventListener('keydown', resetAdminCloseTimer);
  adminCloseBtn.addEventListener('click', closeAdmin);
  adminExitKioskBtn.addEventListener('click', function () { setKiosk(false); closeAdmin(); });
  adminSoundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundToggle.textContent = soundOn ? 'Sound: On' : 'Sound: Off';
    soundToggle.setAttribute('aria-pressed', String(soundOn));
    adminSoundBtn.textContent = soundOn ? 'Sound: On' : 'Sound: Off';
  });
  armHoldClear(adminClearClassicBtn, LEADERBOARD_KEY, 'Classic');
  armHoldClear(adminClearClutchBtn, LEADERBOARD_KEY_CLUTCH, 'Clutch');
  adminClearConfirmBtn.addEventListener('click', function () {
    if (adminClearInput.value !== 'CLEAR') {
      adminClearError.textContent = 'Type CLEAR exactly to confirm.';
      return;
    }
    if (!saveBoard(pendingClearBoard, [])) {
      adminClearError.textContent = "Couldn't clear — storage unavailable on this device.";
      return;
    }
    renderBoard();
    hideClearConfirm();
    closeAdmin();
  });

  /* ---------- init ---------- */
  versionEl.textContent = 'v' + VERSION;
  modeChip.textContent = 'CLASSIC';
  setDurationButtons();
  updateHud();
  renderBoard();
  showOverlay('start');
  if (new URLSearchParams(window.location.search).get('kiosk') === '1') setKiosk(true);

  // Hooks for automated playtesting (do not affect gameplay).
  window.C9AimTrainer = {
    getState: function () {
      return {
        state: state, mode: mode, boardTab: boardTab, clutchPhase: clutchPhase,
        score: score, hits: hits, misses: misses,
        combo: combo, bestStreak: bestStreak, duration: duration,
        remaining: remaining,
        boardSize: loadBoard(LEADERBOARD_KEY).length,
        clutchBoardSize: loadBoard(LEADERBOARD_KEY_CLUTCH).length,
        pb: loadPb()
      };
    },
    start: startRound,
    reset: resetRound,
    // Test-only hooks (timing/kind overrides for the automated suite).
    debug: {
      setIdleSeconds: function (s) { testIdleSeconds = s; },
      setAttractSeconds: function (s) { testAttractSeconds = s; },
      forceKind: function (k) { forcedKind = k; },
      // Only ever shortens a round, never extends it.
      setRemaining: function (s) {
        if (state === 'playing' && s < remaining) { endTime = performance.now() + s * 1000; remaining = s; }
      },
      getBoard: function (key) { return loadBoard(key); },
      getQrPayload: function () { return lastQrPayload; },
      getPb: function () { return loadPb(); }
    }
  };
})();
