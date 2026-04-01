/* ============================================================
   Go Kart Lap Tracker — App Logic
   ============================================================ */

'use strict';

// ── Storage helpers ──────────────────────────────────────────
const STORAGE_KEY = 'gokart_sessions_v1';

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// ── Time formatting ──────────────────────────────────────────
function formatTime(ms) {
  if (ms == null || ms < 0) return '—';
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  if (m > 0) {
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }
  return `${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

function formatTimeMs(ms) {
  if (ms == null || ms < 0) return '—';
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const ms3 = ms % 1000;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms3).padStart(3,'0')}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDatetime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function deltaMsStr(ms) {
  const sign = ms >= 0 ? '+' : '-';
  const abs = Math.abs(ms);
  const s  = Math.floor(abs / 1000);
  const cs = Math.floor((abs % 1000) / 10);
  return `${sign}${s}.${String(cs).padStart(2,'0')}`;
}

// ── Stopwatch state ──────────────────────────────────────────
let swRunning     = false;
let swStarted     = 0;   // performance.now() when last started
let swElapsed     = 0;   // accumulated ms before last pause
let swRafId       = null;

// current laps in live session [ { lapNum, lapMs, elapsedMs } ]
let currentLaps   = [];
let lastLapElapsed = 0;  // elapsed at last lap (for computing lap time)

// ── Current session meta ─────────────────────────────────────
let currentSession = null;  // null when idle

// ── DOM refs ─────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const stopwatchEl        = $('stopwatch');
const startStopBtn       = $('start-stop-btn');
const lapBtn             = $('lap-btn');
const resetBtn           = $('reset-btn');
const lapTbody           = $('lap-tbody');
const emptyLapsEl        = $('empty-laps');
const lapTableEl         = $('lap-table');
const summaryLapCount    = $('summary-lap-count');
const summaryBest        = $('summary-best');
const summaryAvg         = $('summary-avg');
const summaryLast        = $('summary-last');
const sessionSetupEl     = $('session-setup');
const activeSessionEl    = $('active-session');
const displayDriver      = $('display-driver');
const displayTrack       = $('display-track');
const displayKart        = $('display-kart');
const startSessionBtn    = $('start-session-btn');
const endSessionBtn      = $('end-session-btn');
const sessionsList       = $('sessions-list');
const emptySessionsEl    = $('empty-sessions');
const clearAllBtn        = $('clear-all-btn');
const modalOverlay       = $('modal-overlay');
const modalClose         = $('modal-close');
const modalTitle         = $('modal-title');
const modalBody          = $('modal-body');

// ── Stopwatch RAF loop ───────────────────────────────────────
function rafLoop() {
  if (!swRunning) return;
  const now = performance.now();
  const total = swElapsed + (now - swStarted);
  stopwatchEl.textContent = formatTimeMs(total);
  swRafId = requestAnimationFrame(rafLoop);
}

function swStart() {
  swStarted = performance.now();
  swRunning = true;
  swRafId = requestAnimationFrame(rafLoop);

  startStopBtn.querySelector('.icon-play').classList.add('hidden');
  startStopBtn.querySelector('.icon-pause').classList.remove('hidden');
  startStopBtn.querySelector('.btn-label').textContent = 'Pause';
  lapBtn.disabled = false;
}

function swPause() {
  swElapsed += performance.now() - swStarted;
  swRunning = false;
  cancelAnimationFrame(swRafId);

  startStopBtn.querySelector('.icon-play').classList.remove('hidden');
  startStopBtn.querySelector('.icon-pause').classList.add('hidden');
  startStopBtn.querySelector('.btn-label').textContent = 'Resume';
}

function swReset() {
  swElapsed = 0;
  swRunning = false;
  cancelAnimationFrame(swRafId);
  stopwatchEl.textContent = '00:00.000';
  lastLapElapsed = 0;
  currentLaps = [];

  startStopBtn.querySelector('.icon-play').classList.remove('hidden');
  startStopBtn.querySelector('.icon-pause').classList.add('hidden');
  startStopBtn.querySelector('.btn-label').textContent = 'Start';
  lapBtn.disabled = true;

  renderLapTable();
  updateSummary();
}

function currentElapsed() {
  if (!swRunning) return swElapsed;
  return swElapsed + (performance.now() - swStarted);
}

// ── Lap logic ────────────────────────────────────────────────
function recordLap() {
  const elapsed = currentElapsed();
  const lapMs = elapsed - lastLapElapsed;
  lastLapElapsed = elapsed;
  const lapNum = currentLaps.length + 1;
  currentLaps.push({ lapNum, lapMs, elapsedMs: elapsed });

  // Flash green
  stopwatchEl.classList.add('lap-flash');
  setTimeout(() => stopwatchEl.classList.remove('lap-flash'), 300);

  renderLapTable();
  updateSummary();
}

function deleteLap(index) {
  currentLaps.splice(index, 1);
  // Renumber
  currentLaps.forEach((l, i) => {
    l.lapNum = i + 1;
  });
  renderLapTable();
  updateSummary();
}

function bestLapMs() {
  if (!currentLaps.length) return null;
  return Math.min(...currentLaps.map(l => l.lapMs));
}

function avgLapMs() {
  if (!currentLaps.length) return null;
  return currentLaps.reduce((a, b) => a + b.lapMs, 0) / currentLaps.length;
}

// ── Render lap table ─────────────────────────────────────────
function renderLapTable() {
  lapTbody.innerHTML = '';
  const best = bestLapMs();

  if (!currentLaps.length) {
    lapTableEl.classList.add('hidden');
    emptyLapsEl.classList.remove('hidden');
    return;
  }
  lapTableEl.classList.remove('hidden');
  emptyLapsEl.classList.add('hidden');

  // Render newest first
  [...currentLaps].reverse().forEach((lap, revIdx) => {
    const origIdx = currentLaps.length - 1 - revIdx;
    const isBest  = lap.lapMs === best;
    const delta   = lap.lapMs - best;

    const tr = document.createElement('tr');

    // Lap #
    const tdNum = document.createElement('td');
    tdNum.innerHTML = `<span class="lap-num">LAP ${lap.lapNum}</span>${isBest ? '<span class="badge-best">Best</span>' : ''}`;
    tr.appendChild(tdNum);

    // Lap time
    const tdTime = document.createElement('td');
    tdTime.innerHTML = `<span class="lap-time">${formatTimeMs(lap.lapMs)}</span>`;
    tr.appendChild(tdTime);

    // Delta
    const tdDelta = document.createElement('td');
    if (isBest) {
      tdDelta.innerHTML = `<span class="lap-delta zero">—</span>`;
    } else {
      tdDelta.innerHTML = `<span class="lap-delta positive">${deltaMsStr(delta)}</span>`;
    }
    tr.appendChild(tdDelta);

    // Elapsed
    const tdElapsed = document.createElement('td');
    tdElapsed.innerHTML = `<span style="color:var(--text3);font-family:var(--font-display);font-size:.85rem">${formatTimeMs(lap.elapsedMs)}</span>`;
    tr.appendChild(tdElapsed);

    // Delete
    const tdDel = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-lap-btn';
    delBtn.title = 'Remove lap';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', e => { e.stopPropagation(); deleteLap(origIdx); });
    tdDel.appendChild(delBtn);
    tr.appendChild(tdDel);

    lapTbody.appendChild(tr);
  });
}

function updateSummary() {
  const n = currentLaps.length;
  summaryLapCount.textContent = n;
  summaryBest.textContent     = n ? formatTimeMs(bestLapMs()) : '—';
  summaryAvg.textContent      = n ? formatTimeMs(Math.round(avgLapMs())) : '—';
  summaryLast.textContent     = n ? formatTimeMs(currentLaps[n - 1].lapMs) : '—';
}

// ── Session management ───────────────────────────────────────
function startNewSession() {
  const driver = $('driver-name').value.trim() || 'Driver';
  const track  = $('track-name').value.trim()  || 'Unknown Track';
  const kart   = $('kart-number').value.trim() || '?';

  currentSession = { driver, track, kart, startedAt: new Date().toISOString() };

  displayDriver.textContent = driver;
  displayTrack.textContent  = track;
  displayKart.textContent   = `Kart ${kart}`;

  sessionSetupEl.classList.add('hidden');
  activeSessionEl.classList.remove('hidden');

  swReset();
}

function endSession() {
  if (!currentLaps.length) {
    if (!confirm('No laps recorded. Discard this session?')) return;
    cancelSession();
    return;
  }

  // Pause if running
  if (swRunning) swPause();

  const sessions = loadSessions();
  const session = {
    id: Date.now(),
    ...currentSession,
    endedAt: new Date().toISOString(),
    laps: currentLaps.map(l => ({ ...l })),
    bestLapMs: bestLapMs(),
    avgLapMs: Math.round(avgLapMs()),
    totalLaps: currentLaps.length,
  };
  sessions.unshift(session);
  saveSessions(sessions);

  cancelSession();
  renderSessionsList();
  renderStats();
}

function cancelSession() {
  currentSession = null;
  swReset();
  activeSessionEl.classList.add('hidden');
  sessionSetupEl.classList.remove('hidden');
}

// ── Sessions list ────────────────────────────────────────────
function renderSessionsList() {
  const sessions = loadSessions();
  sessionsList.innerHTML = '';

  if (!sessions.length) {
    emptySessionsEl.classList.remove('hidden');
    clearAllBtn.classList.add('hidden');
    return;
  }
  emptySessionsEl.classList.add('hidden');
  clearAllBtn.classList.remove('hidden');

  sessions.forEach(s => {
    const card = document.createElement('div');
    card.className = 'session-card';
    card.innerHTML = `
      <div class="session-card-left">
        <div class="session-card-driver">${escHtml(s.driver)}</div>
        <div class="session-card-meta">
          <span>📍 ${escHtml(s.track)}</span>
          <span>🏎️ Kart ${escHtml(s.kart)}</span>
          <span>📅 ${formatDate(s.startedAt)}</span>
        </div>
      </div>
      <div class="session-card-stats">
        <div class="session-mini-stat">
          <div class="session-mini-label">Laps</div>
          <div class="session-mini-value">${s.totalLaps}</div>
        </div>
        <div class="session-mini-stat">
          <div class="session-mini-label">Best Lap</div>
          <div class="session-mini-value best-highlight">${formatTimeMs(s.bestLapMs)}</div>
        </div>
        <div class="session-mini-stat">
          <div class="session-mini-label">Avg Lap</div>
          <div class="session-mini-value">${formatTimeMs(s.avgLapMs)}</div>
        </div>
      </div>
      <div class="session-card-actions">
        <button class="btn btn-outline btn-sm view-btn">View</button>
        <button class="btn btn-danger btn-sm delete-btn">Delete</button>
      </div>
    `;

    card.querySelector('.view-btn').addEventListener('click', e => {
      e.stopPropagation();
      openSessionModal(s);
    });
    card.querySelector('.delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      deleteSession(s.id);
    });
    card.addEventListener('click', () => openSessionModal(s));

    sessionsList.appendChild(card);
  });
}

function deleteSession(id) {
  if (!confirm('Delete this session?')) return;
  const sessions = loadSessions().filter(s => s.id !== id);
  saveSessions(sessions);
  renderSessionsList();
  renderStats();
}

function openSessionModal(s) {
  const best = s.bestLapMs;
  modalTitle.textContent = `${s.driver} — ${s.track}`;

  let lapsHtml = '';
  [...s.laps].reverse().forEach(lap => {
    const isBest = lap.lapMs === best;
    const delta = lap.lapMs - best;
    lapsHtml += `
      <tr>
        <td><span class="lap-num">LAP ${lap.lapNum}</span>${isBest ? '<span class="badge-best">Best</span>' : ''}</td>
        <td><span class="lap-time">${formatTimeMs(lap.lapMs)}</span></td>
        <td>${isBest
          ? '<span class="lap-delta zero">—</span>'
          : `<span class="lap-delta positive">${deltaMsStr(delta)}</span>`}</td>
        <td><span style="color:var(--text3);font-family:var(--font-display);font-size:.85rem">${formatTimeMs(lap.elapsedMs)}</span></td>
      </tr>`;
  });

  modalBody.innerHTML = `
    <div class="modal-meta-row">
      <span class="modal-meta-chip">📍 ${escHtml(s.track)}</span>
      <span class="modal-meta-chip">🏎️ Kart ${escHtml(s.kart)}</span>
      <span class="modal-meta-chip">📅 ${formatDatetime(s.startedAt)}</span>
    </div>
    <div class="modal-stats-row">
      <div class="modal-stat">
        <div class="modal-stat-value">${s.totalLaps}</div>
        <div class="modal-stat-label">Laps</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-value gold">${formatTimeMs(s.bestLapMs)}</div>
        <div class="modal-stat-label">Best Lap</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-value">${formatTimeMs(s.avgLapMs)}</div>
        <div class="modal-stat-label">Avg Lap</div>
      </div>
    </div>
    <div class="lap-table-wrap" style="max-height:320px;overflow-y:auto">
      <table class="lap-table">
        <thead>
          <tr><th>Lap</th><th>Lap Time</th><th>+/- Best</th><th>Elapsed</th></tr>
        </thead>
        <tbody>${lapsHtml}</tbody>
      </table>
    </div>
  `;

  modalOverlay.classList.remove('hidden');
}

// ── Stats ────────────────────────────────────────────────────
function renderStats() {
  const sessions = loadSessions();
  const emptyEl  = $('empty-stats');

  if (!sessions.length) {
    emptyEl.classList.remove('hidden');
    $('stat-total-sessions').textContent = 0;
    $('stat-total-laps').textContent = 0;
    $('stat-all-time-best').textContent = '—';
    $('stat-all-time-best-track').textContent = '—';
    $('stat-overall-avg').textContent = '—';
    $('stat-top-driver').textContent = '—';
    $('per-track-stats').innerHTML = '';
    return;
  }
  emptyEl.classList.add('hidden');

  const totalLaps = sessions.reduce((a, s) => a + s.totalLaps, 0);

  // All-time best
  let bestSession = sessions.reduce((b, s) => (s.bestLapMs < b.bestLapMs ? s : b));

  // Overall avg
  const allLapMs = sessions.flatMap(s => s.laps.map(l => l.lapMs));
  const overallAvg = allLapMs.reduce((a, b) => a + b, 0) / allLapMs.length;

  // Top driver (most sessions)
  const driverCounts = {};
  sessions.forEach(s => { driverCounts[s.driver] = (driverCounts[s.driver] || 0) + 1; });
  const topDriver = Object.entries(driverCounts).sort((a,b) => b[1]-a[1])[0][0];

  $('stat-total-sessions').textContent = sessions.length;
  $('stat-total-laps').textContent     = totalLaps;
  $('stat-all-time-best').textContent  = formatTimeMs(bestSession.bestLapMs);
  $('stat-all-time-best-track').textContent = bestSession.track;
  $('stat-overall-avg').textContent    = formatTimeMs(Math.round(overallAvg));
  $('stat-top-driver').textContent     = topDriver;

  // Per-track best
  const trackMap = {};
  sessions.forEach(s => {
    if (!trackMap[s.track] || s.bestLapMs < trackMap[s.track].best) {
      trackMap[s.track] = {
        best: s.bestLapMs,
        driver: s.driver,
        sessions: 0,
        laps: 0,
      };
    }
    trackMap[s.track].sessions++;
    trackMap[s.track].laps += s.totalLaps;
  });

  const perTrackEl = $('per-track-stats');
  perTrackEl.innerHTML = '';
  Object.entries(trackMap)
    .sort((a,b) => a[1].best - b[1].best)
    .forEach(([track, data]) => {
      const item = document.createElement('div');
      item.className = 'per-track-item';
      item.innerHTML = `
        <div>
          <div class="per-track-name">📍 ${escHtml(track)}</div>
          <div class="per-track-meta">${data.sessions} session${data.sessions!==1?'s':''} · ${data.laps} lap${data.laps!==1?'s':''}</div>
        </div>
        <div>
          <div class="per-track-best">${formatTimeMs(data.best)}</div>
          <div class="per-track-meta" style="text-align:right">by ${escHtml(data.driver)}</div>
        </div>
      `;
      perTrackEl.appendChild(item);
    });
}

// ── Tabs ─────────────────────────────────────────────────────
function switchTab(tab) {
  $$('.nav-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  $$('.tab-content').forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));

  if (tab === 'sessions') renderSessionsList();
  if (tab === 'stats') renderStats();
}

// ── Utility ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event listeners ──────────────────────────────────────────
startStopBtn.addEventListener('click', () => {
  if (!swRunning) swStart(); else swPause();
});

lapBtn.addEventListener('click', () => {
  if (swRunning) recordLap();
});

resetBtn.addEventListener('click', () => {
  if (swRunning) swPause();
  if (currentLaps.length && !confirm('Clear all laps?')) return;
  swReset();
});

startSessionBtn.addEventListener('click', startNewSession);
endSessionBtn.addEventListener('click', endSession);

clearAllBtn.addEventListener('click', () => {
  if (!confirm('Delete ALL sessions? This cannot be undone.')) return;
  saveSessions([]);
  renderSessionsList();
  renderStats();
});

modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
});

$$('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    if (activeSessionEl.classList.contains('hidden')) return;
    if (!swRunning) swStart(); else swPause();
  }
  if (e.key === 'l' || e.key === 'L') {
    if (swRunning) recordLap();
  }
  if (e.key === 'Escape') {
    modalOverlay.classList.add('hidden');
  }
});

// ── Init ─────────────────────────────────────────────────────
(function init() {
  renderSessionsList();
  renderStats();
  updateSummary();
  renderLapTable();
})();
