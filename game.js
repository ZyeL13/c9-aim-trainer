/* C9 Aim Trainer — Category 3 Event Mini Game
 * Plain vanilla JS, no build step, no network needed.
 * Loop: START -> targets spawn one at a time -> click to hit -> END screen
 * with stats + offline local leaderboard -> clean reset for the next player.
 */
(function () {
  'use strict';

  var LEADERBOARD_KEY = 'c9-aim-trainer-leaderboard-v1';
  var MAX_BOARD = 10;
  var IDLE_RESET_SECONDS = 60;

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
  var clearBoardBtn = document.getElementById('clearBoardBtn');
  var leaderboardEl = document.getElementById('leaderboard');
  var leaderboardEmpty = document.getElementById('leaderboardEmpty');
  var idleNote = document.getElementById('idleNote');

  var timeValue = document.getElementById('timeValue');
  var scoreValue = document.getElementById('scoreValue');
  var comboValue = document.getElementById('comboValue');
  var hitsValue = document.getElementById('hitsValue');
  var missesValue = document.getElementById('missesValue');
  var accuracyValue = document.getElementById('accuracyValue');

  var state = 'idle'; // 'idle' | 'playing' | 'ended'
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
  function hitSound() { beep(880, 90, 'sine', 0.14); beep(1320, 70, 'sine', 0.08); }
  function missSound() { beep(180, 140, 'sawtooth', 0.06); }
  function endSound() { beep(523, 120, 'sine', 0.12); setTimeout(function () { beep(784, 180, 'sine', 0.12); }, 130); }

  /* ---------- leaderboard (localStorage, offline) ---------- */
  function loadBoard() {
    try {
      var raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  function saveBoard(board) {
    try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board)); } catch (e) { /* private mode etc. */ }
  }
  function renderBoard() {
    var board = loadBoard();
    leaderboardEl.innerHTML = '';
    leaderboardEmpty.style.display = board.length ? 'none' : 'block';
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
  }

  /* ---------- targets ---------- */
  function clearTarget() {
    if (currentTarget && currentTarget.parentNode) currentTarget.parentNode.removeChild(currentTarget);
    currentTarget = null;
    if (expireId) { clearTimeout(expireId); expireId = null; }
  }
  function spawnDelay() {
    // Faster as the round progresses: 700ms -> ~480ms.
    var progress = 1 - remaining / duration;
    return Math.round(700 - 220 * progress);
  }
  function targetSize() {
    // Smaller as the round progresses: ~72px -> ~44px.
    var progress = 1 - remaining / duration;
    return Math.round(72 - 28 * progress + Math.random() * 8 - 4);
  }
  function spawnTarget() {
    if (state !== 'playing') return;
    clearTarget();
    var size = targetSize();
    var rect = arena.getBoundingClientRect();
    var maxX = Math.max(0, rect.width - size - 8);
    var maxY = Math.max(0, rect.height - size - 8);
    var x = 4 + Math.random() * maxX;
    var y = 4 + Math.random() * maxY;

    var el = document.createElement('div');
    el.className = 'target';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    // Lifetime shrinks slightly late in the round so the pace rises.
    var lifetime = Math.round(1000 - 150 * (1 - remaining / duration));
    el.style.animationDuration = '0.12s, ' + lifetime + 'ms';
    el.dataset.spawnedAt = String(performance.now());
    arena.appendChild(el);
    currentTarget = el;

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

  function floatScore(x, y, text) {
    var el = document.createElement('div');
    el.className = 'float-score';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.textContent = text;
    arena.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 750);
  }

  function registerHit(targetEl, clientX, clientY) {
    // Already-hit guard: the popped target stays in the DOM for 140ms,
    // so a second click on it during the pop animation must not score again.
    if (targetEl.dataset.hit) return;
    targetEl.dataset.hit = '1';
    var spawnedAt = parseFloat(targetEl.dataset.spawnedAt || '0');
    var reaction = Math.max(0, Math.round(performance.now() - spawnedAt));
    reactionTimes.push(reaction);
    hits += 1;
    combo += 1;
    if (combo > bestStreak) bestStreak = combo;

    var speedBonus = Math.max(0, Math.min(100, Math.round(100 - reaction / 8)));
    var comboBonus = Math.min(combo * 5, 100);
    var points = 100 + speedBonus + comboBonus;
    score += points;

    var rect = arena.getBoundingClientRect();
    floatScore(clientX - rect.left, clientY - rect.top, '+' + points);
    targetEl.classList.add('pop');
    var dead = targetEl;
    setTimeout(function () { if (dead.parentNode) dead.parentNode.removeChild(dead); }, 140);
    if (currentTarget === targetEl) currentTarget = null;
    if (expireId) { clearTimeout(expireId); expireId = null; }

    hitSound();
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
  function resetRound() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (spawnId) { clearTimeout(spawnId); spawnId = null; }
    stopIdleCountdown();
    clearTarget();
    // Remove any floating score labels left over.
    Array.prototype.slice.call(arena.querySelectorAll('.float-score')).forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    state = 'idle';
    score = 0; hits = 0; misses = 0; combo = 0; bestStreak = 0;
    reactionTimes = [];
    remaining = duration;
    scoreSaved = false;
    saveNote.textContent = '';
    saveScoreBtn.disabled = false;
    saveScoreBtn.textContent = 'Save score';
    updateHud();
    showOverlay('start');
  }

  function startRound() {
    resetRound();
    state = 'playing';
    endTime = performance.now() + duration * 1000;
    showOverlay(null);
    beep(660, 90, 'sine', 0.12);
    timerId = setInterval(function () {
      remaining = Math.max(0, (endTime - performance.now()) / 1000);
      updateHud();
      if (remaining <= 0) endRound();
    }, 100);
    scheduleSpawn(250);
  }

  function endRound() {
    if (state !== 'playing') return;
    state = 'ended';
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (spawnId) { clearTimeout(spawnId); spawnId = null; }
    clearTarget();
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
    showOverlay('end');
    startIdleCountdown();
  }

  /* Booth mode: end screen resets itself after 60s idle so the next
   * player always finds a clean start screen. Any interaction cancels it. */
  function startIdleCountdown() {
    stopIdleCountdown();
    idleRemaining = IDLE_RESET_SECONDS;
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
  function cancelIdleOnActivity() {
    if (state === 'ended') stopIdleCountdown();
  }

  function saveScore() {
    if (state !== 'ended' || scoreSaved) return;
    var name = (playerNameInput.value || 'PLAYER').trim().toUpperCase().slice(0, 12) || 'PLAYER';
    var acc = accuracy();
    var avg = avgReaction();
    var board = loadBoard();
    board.push({
      name: name,
      score: score,
      accuracy: acc === null ? 0 : acc,
      avgReaction: avg === null ? 0 : avg,
      duration: duration,
      date: new Date().toISOString().slice(0, 10)
    });
    board.sort(function (a, b) { return b.score - a.score; });
    board = board.slice(0, MAX_BOARD);
    saveBoard(board);
    var rank = board.findIndex(function (e) { return e.score === score && e.name === name; }) + 1;
    scoreSaved = true;
    saveScoreBtn.disabled = true;
    saveScoreBtn.textContent = 'Saved ✓';
    saveNote.textContent = rank > 0 ? 'Saved! You are #' + rank + ' on the booth board.' : 'Saved to the booth board.';
    renderBoard();
    cancelIdleOnActivity();
  }

  /* ---------- events ---------- */
  arena.addEventListener('click', function (e) {
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

  clearBoardBtn.addEventListener('click', function () {
    if (window.confirm('Clear the whole booth leaderboard?')) {
      saveBoard([]);
      renderBoard();
    }
  });

  document.querySelectorAll('.duration-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (state === 'playing') return;
      duration = parseInt(btn.dataset.duration, 10) || 60;
      document.querySelectorAll('.duration-btn').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      resetRound();
    });
  });

  endOverlay.addEventListener('click', cancelIdleOnActivity);
  playerNameInput.addEventListener('input', cancelIdleOnActivity);
  playerNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); saveScore(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && state === 'idle' && document.activeElement === document.body) startRound();
  });

  /* ---------- init ---------- */
  updateHud();
  renderBoard();
  showOverlay('start');

  // Small hook for automated playtesting (does not affect gameplay).
  window.C9AimTrainer = {
    getState: function () {
      return {
        state: state, score: score, hits: hits, misses: misses,
        combo: combo, bestStreak: bestStreak, duration: duration,
        remaining: remaining, boardSize: loadBoard().length
      };
    },
    start: startRound,
    reset: resetRound
  };
})();
