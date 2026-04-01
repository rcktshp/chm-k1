/* ============================================================
   KartLap — Go Kart Lap Times Tracker
   ============================================================ */

(function () {
  "use strict";

  // ── Storage ──────────────────────────────────────────────
  const STORAGE_KEY = "kartlap_sessions";

  function loadSessions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveSessions(sessions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  let sessions = loadSessions();

  // ── Time Formatting ──────────────────────────────────────
  function formatTime(ms) {
    if (ms == null || ms < 0) return "--:--.---";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0") +
      "." +
      String(millis).padStart(3, "0")
    );
  }

  function parseTimeToMs(minutes, seconds, millis) {
    const m = parseInt(minutes, 10) || 0;
    const s = parseInt(seconds, 10) || 0;
    const ms = parseInt(millis, 10) || 0;
    return m * 60000 + s * 1000 + ms;
  }

  // ── Helpers ──────────────────────────────────────────────
  function bestLap(laps) {
    if (!laps.length) return null;
    return Math.min(...laps);
  }

  function avgLap(laps) {
    if (!laps.length) return null;
    return Math.round(laps.reduce((a, b) => a + b, 0) / laps.length);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function uuid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  // ── DOM refs ─────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const sidebar = $("#sidebar");
  const hamburger = $("#hamburger");
  const sidebarClose = $("#sidebar-close");
  const pageTitle = $("#page-title");

  // ── Navigation ───────────────────────────────────────────
  const viewNames = {
    dashboard: "Dashboard",
    "new-session": "New Session",
    sessions: "Sessions",
    stats: "Statistics",
    "session-detail": "Session Detail",
  };

  let currentView = "dashboard";

  function switchView(name) {
    $$(".view").forEach((v) => v.classList.remove("active"));
    const target = $(`#view-${name}`);
    if (target) target.classList.add("active");

    $$(".nav-link").forEach((l) => l.classList.remove("active"));
    const activeLink = $(`.nav-link[data-view="${name}"]`);
    if (activeLink) activeLink.classList.add("active");

    pageTitle.textContent = viewNames[name] || "KartLap";
    currentView = name;
    sidebar.classList.remove("open");

    if (name === "dashboard") renderDashboard();
    if (name === "sessions") renderSessions();
    if (name === "stats") renderStats();
    if (name === "new-session") resetSessionSetup();
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (link) {
      e.preventDefault();
      switchView(link.dataset.view);
    }
  });

  hamburger.addEventListener("click", () => sidebar.classList.add("open"));
  sidebarClose.addEventListener("click", () =>
    sidebar.classList.remove("open")
  );

  // ── Toast ────────────────────────────────────────────────
  function showToast(message, type = "info") {
    const container = $("#toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ── Modal ────────────────────────────────────────────────
  function showModal(title, message) {
    return new Promise((resolve) => {
      $("#modal-title").textContent = title;
      $("#modal-message").textContent = message;
      $("#modal-overlay").classList.remove("hidden");

      function cleanup(result) {
        $("#modal-overlay").classList.add("hidden");
        $("#modal-confirm").removeEventListener("click", onConfirm);
        $("#modal-cancel").removeEventListener("click", onCancel);
        resolve(result);
      }

      function onConfirm() { cleanup(true); }
      function onCancel() { cleanup(false); }

      $("#modal-confirm").addEventListener("click", onConfirm);
      $("#modal-cancel").addEventListener("click", onCancel);
    });
  }

  // ── Dashboard ────────────────────────────────────────────
  function renderDashboard() {
    const allLaps = sessions.flatMap((s) => s.laps);
    const best = bestLap(allLaps);
    const avg = avgLap(allLaps);

    $("#stat-best-lap").textContent = formatTime(best);
    $("#stat-avg-lap").textContent = formatTime(avg);
    $("#stat-total-sessions").textContent = sessions.length;
    $("#stat-total-laps").textContent = allLaps.length;

    const recentContainer = $("#recent-sessions");
    if (!sessions.length) {
      recentContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          <p>No sessions yet. Start your first session!</p>
          <a href="#" class="btn btn-primary btn-sm" data-view="new-session">New Session</a>
        </div>`;
      return;
    }

    const sorted = [...sessions].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    const recent = sorted.slice(0, 5);

    recentContainer.innerHTML = recent
      .map(
        (s) => `
      <div class="session-card" data-session-id="${s.id}">
        <div class="session-card-left">
          <div class="session-card-track">${escapeHtml(s.trackName)}</div>
          <div class="session-card-meta">
            <span>${formatDate(s.date)}</span>
            <span class="badge badge-${s.type}">${s.type}</span>
            <span>${s.laps.length} laps</span>
          </div>
        </div>
        <div class="session-card-right">
          <div class="session-card-best">
            <div class="label">Best</div>
            <div class="value">${formatTime(bestLap(s.laps))}</div>
          </div>
        </div>
      </div>`
      )
      .join("");

    recentContainer.querySelectorAll(".session-card").forEach((card) => {
      card.addEventListener("click", () =>
        openSessionDetail(card.dataset.sessionId)
      );
    });

    renderTrendChart();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Trend Chart (Dashboard) ──────────────────────────────
  let trendChart = null;

  function renderTrendChart() {
    const canvas = $("#trend-chart");
    const emptyEl = $("#trend-empty");

    if (sessions.length < 2) {
      canvas.style.display = "none";
      emptyEl.classList.remove("hidden");
      if (trendChart) { trendChart.destroy(); trendChart = null; }
      return;
    }

    canvas.style.display = "block";
    emptyEl.classList.add("hidden");

    const sorted = [...sessions].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const labels = sorted.map((s) => formatDate(s.date));
    const bestData = sorted.map((s) => bestLap(s.laps));
    const avgData = sorted.map((s) => avgLap(s.laps));

    if (trendChart) trendChart.destroy();

    trendChart = new MiniChart(canvas, {
      labels,
      datasets: [
        { label: "Best Lap", data: bestData, color: "#22c55e" },
        { label: "Avg Lap", data: avgData, color: "#6366f1" },
      ],
      formatY: formatTime,
    });
  }

  // ── New Session ──────────────────────────────────────────
  let currentLaps = [];
  let stopwatchInterval = null;
  let stopwatchRunning = false;
  let stopwatchStart = 0;
  let stopwatchElapsed = 0;
  let lastLapTimestamp = 0;

  function resetSessionSetup() {
    $("#session-setup").classList.remove("hidden");
    $("#session-active").classList.add("hidden");
    $("#session-date").value = new Date().toISOString().split("T")[0];
  }

  $("#session-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const trackName = $("#track-name").value.trim();
    const date = $("#session-date").value;
    if (!trackName || !date) return;

    currentLaps = [];
    stopwatchElapsed = 0;
    stopwatchRunning = false;
    lastLapTimestamp = 0;
    updateStopwatchDisplay(0);
    resetStopwatchUI();

    $("#active-session-title").textContent = trackName;
    $("#active-session-badge").textContent = $("#session-type").value;
    $("#active-session-badge").className = `session-badge badge badge-${$("#session-type").value}`;

    $("#session-setup").classList.add("hidden");
    $("#session-active").classList.remove("hidden");

    renderActiveLaps();
  });

  // Stopwatch
  const btnStartStop = $("#btn-start-stop");
  const btnLap = $("#btn-lap");
  const btnReset = $("#btn-reset");

  function updateStopwatchDisplay(elapsed) {
    $("#stopwatch-display").textContent = formatTime(elapsed);
  }

  function startStopwatch() {
    stopwatchRunning = true;
    stopwatchStart = performance.now() - stopwatchElapsed;
    lastLapTimestamp = lastLapTimestamp || stopwatchStart;
    stopwatchInterval = setInterval(() => {
      stopwatchElapsed = Math.floor(performance.now() - stopwatchStart);
      updateStopwatchDisplay(stopwatchElapsed);
    }, 37);

    btnStartStop.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      Stop`;
    btnStartStop.classList.remove("btn-success");
    btnStartStop.classList.add("btn-danger");
    btnLap.disabled = false;
    btnReset.disabled = true;
  }

  function stopStopwatch() {
    stopwatchRunning = false;
    clearInterval(stopwatchInterval);
    stopwatchElapsed = Math.floor(performance.now() - stopwatchStart);
    updateStopwatchDisplay(stopwatchElapsed);

    btnStartStop.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Start`;
    btnStartStop.classList.remove("btn-danger");
    btnStartStop.classList.add("btn-success");
    btnLap.disabled = true;
    btnReset.disabled = false;
  }

  function resetStopwatchUI() {
    stopStopwatch();
    stopwatchElapsed = 0;
    lastLapTimestamp = 0;
    updateStopwatchDisplay(0);
    btnReset.disabled = true;
    btnLap.disabled = true;
  }

  btnStartStop.addEventListener("click", () => {
    if (stopwatchRunning) stopStopwatch();
    else startStopwatch();
  });

  btnLap.addEventListener("click", () => {
    if (!stopwatchRunning) return;
    const now = performance.now();
    const lapTime = Math.floor(now - lastLapTimestamp);
    lastLapTimestamp = now;
    if (lapTime > 0) {
      currentLaps.push(lapTime);
      renderActiveLaps();
    }
  });

  btnReset.addEventListener("click", () => {
    resetStopwatchUI();
  });

  // Manual entry
  $("#btn-add-manual").addEventListener("click", () => {
    const m = $("#manual-minutes").value;
    const s = $("#manual-seconds").value;
    const ms = $("#manual-millis").value;
    const time = parseTimeToMs(m, s, ms);
    if (time <= 0) {
      showToast("Enter a valid lap time.", "error");
      return;
    }
    currentLaps.push(time);
    $("#manual-minutes").value = "";
    $("#manual-seconds").value = "";
    $("#manual-millis").value = "";
    renderActiveLaps();
    showToast("Lap added!", "success");
  });

  function renderActiveLaps() {
    const tbody = $("#lap-table-body");
    const emptyEl = $("#laps-empty");
    const summaryBar = $("#session-summary-bar");
    const saveBtn = $("#btn-save-session");

    if (!currentLaps.length) {
      tbody.innerHTML = "";
      emptyEl.classList.remove("hidden");
      summaryBar.classList.add("hidden");
      saveBtn.disabled = true;
      return;
    }

    emptyEl.classList.add("hidden");
    summaryBar.classList.remove("hidden");
    saveBtn.disabled = false;

    const best = bestLap(currentLaps);
    const avg = avgLap(currentLaps);
    $("#summary-best").textContent = formatTime(best);
    $("#summary-avg").textContent = formatTime(avg);
    $("#summary-count").textContent = currentLaps.length;

    tbody.innerHTML = currentLaps
      .map((lap, i) => {
        const delta = i === 0 ? 0 : lap - currentLaps[i - 1];
        const deltaClass =
          delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
        const deltaStr =
          i === 0
            ? '<span class="delta neutral">—</span>'
            : `<span class="delta ${deltaClass}">${delta > 0 ? "+" : ""}${formatTime(Math.abs(delta))}</span>`;
        const isBest = lap === best;
        return `
          <tr>
            <td class="lap-num">${i + 1}</td>
            <td class="lap-time${isBest ? " is-best" : ""}">${formatTime(lap)}</td>
            <td>${deltaStr}</td>
            <td>
              <button class="btn-delete-lap" data-index="${i}" title="Delete lap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </td>
          </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".btn-delete-lap").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        currentLaps.splice(idx, 1);
        renderActiveLaps();
      });
    });
  }

  // Save session
  $("#btn-save-session").addEventListener("click", () => {
    if (!currentLaps.length) return;

    const session = {
      id: uuid(),
      trackName: $("#track-name").value.trim(),
      date: $("#session-date").value,
      kartNumber: $("#kart-number").value.trim(),
      type: $("#session-type").value,
      notes: $("#session-notes").value.trim(),
      laps: [...currentLaps],
      createdAt: new Date().toISOString(),
    };

    sessions.push(session);
    saveSessions(sessions);

    currentLaps = [];
    resetStopwatchUI();
    renderActiveLaps();

    showToast("Session saved!", "success");
    switchView("sessions");
  });

  // Discard session
  $("#btn-discard-session").addEventListener("click", async () => {
    if (currentLaps.length) {
      const ok = await showModal(
        "Discard Session",
        "You have unsaved laps. Are you sure you want to discard this session?"
      );
      if (!ok) return;
    }
    currentLaps = [];
    resetStopwatchUI();
    resetSessionSetup();
  });

  // ── Sessions List ────────────────────────────────────────
  function renderSessions() {
    const search = $("#search-sessions").value.toLowerCase();
    const typeFilter = $("#filter-type").value;
    const sort = $("#sort-sessions").value;

    let filtered = sessions.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (search && !s.trackName.toLowerCase().includes(search)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      switch (sort) {
        case "date-asc":
          return new Date(a.date) - new Date(b.date);
        case "date-desc":
          return new Date(b.date) - new Date(a.date);
        case "best-asc":
          return (bestLap(a.laps) || Infinity) - (bestLap(b.laps) || Infinity);
        case "best-desc":
          return (bestLap(b.laps) || 0) - (bestLap(a.laps) || 0);
        default:
          return 0;
      }
    });

    const container = $("#sessions-list");
    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>No sessions found.</p>
          <a href="#" class="btn btn-primary btn-sm" data-view="new-session">Create Your First Session</a>
        </div>`;
      return;
    }

    container.innerHTML = filtered
      .map(
        (s) => `
      <div class="session-card" data-session-id="${s.id}">
        <div class="session-card-left">
          <div class="session-card-track">${escapeHtml(s.trackName)}</div>
          <div class="session-card-meta">
            <span>${formatDate(s.date)}</span>
            <span class="badge badge-${s.type}">${s.type}</span>
            <span>${s.laps.length} laps</span>
            ${s.kartNumber ? `<span>Kart #${escapeHtml(s.kartNumber)}</span>` : ""}
          </div>
        </div>
        <div class="session-card-right">
          <div class="session-card-best">
            <div class="label">Best</div>
            <div class="value">${formatTime(bestLap(s.laps))}</div>
          </div>
          <div class="session-card-actions">
            <button class="btn btn-outline btn-sm btn-delete-session" data-id="${s.id}" title="Delete session">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll(".session-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-delete-session")) return;
        openSessionDetail(card.dataset.sessionId);
      });
    });

    container.querySelectorAll(".btn-delete-session").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const ok = await showModal(
          "Delete Session",
          "This session and all its laps will be permanently deleted."
        );
        if (!ok) return;
        sessions = sessions.filter((s) => s.id !== btn.dataset.id);
        saveSessions(sessions);
        renderSessions();
        showToast("Session deleted.", "info");
      });
    });
  }

  $("#search-sessions").addEventListener("input", renderSessions);
  $("#filter-type").addEventListener("change", renderSessions);
  $("#sort-sessions").addEventListener("change", renderSessions);

  // ── Session Detail ───────────────────────────────────────
  let sessionChart = null;

  function openSessionDetail(id) {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    switchView("session-detail");

    const best = bestLap(session.laps);
    const avg = avgLap(session.laps);

    $("#detail-header").innerHTML = `
      <div class="detail-title">${escapeHtml(session.trackName)}</div>
      <div class="detail-meta">
        <span class="detail-meta-item">${formatDate(session.date)}</span>
        <span class="badge badge-${session.type}">${session.type}</span>
        ${session.kartNumber ? `<span class="detail-meta-item">Kart #${escapeHtml(session.kartNumber)}</span>` : ""}
        <span class="detail-meta-item">${session.laps.length} laps</span>
      </div>
      <div class="detail-stats-row">
        <div class="detail-stat">
          <span class="label">Best Lap</span>
          <span class="value" style="color:var(--green)">${formatTime(best)}</span>
        </div>
        <div class="detail-stat">
          <span class="label">Average</span>
          <span class="value">${formatTime(avg)}</span>
        </div>
        <div class="detail-stat">
          <span class="label">Worst</span>
          <span class="value" style="color:var(--red)">${formatTime(session.laps.length ? Math.max(...session.laps) : null)}</span>
        </div>
        <div class="detail-stat">
          <span class="label">Consistency</span>
          <span class="value">${session.laps.length > 1 ? formatTime(Math.round(standardDeviation(session.laps))) : "—"}</span>
        </div>
      </div>
      ${session.notes ? `<div class="detail-notes">${escapeHtml(session.notes)}</div>` : ""}
    `;

    const tbody = $("#detail-laps-body");
    tbody.innerHTML = session.laps
      .map((lap, i) => {
        const delta = lap - best;
        const deltaClass =
          delta === 0 ? "neutral" : delta > 0 ? "positive" : "negative";
        const isBest = lap === best;
        return `
          <tr>
            <td class="lap-num">${i + 1}</td>
            <td class="lap-time${isBest ? " is-best" : ""}">${formatTime(lap)}</td>
            <td><span class="delta ${deltaClass}">${delta === 0 ? "BEST" : `+${formatTime(delta)}`}</span></td>
          </tr>`;
      })
      .join("");

    renderSessionChart(session);
  }

  function standardDeviation(arr) {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
  }

  function renderSessionChart(session) {
    const canvas = $("#session-chart");
    if (sessionChart) sessionChart.destroy();

    if (session.laps.length < 2) return;

    sessionChart = new MiniChart(canvas, {
      labels: session.laps.map((_, i) => `Lap ${i + 1}`),
      datasets: [
        { label: "Lap Time", data: session.laps, color: "#6366f1" },
      ],
      formatY: formatTime,
      showBestLine: bestLap(session.laps),
    });
  }

  $("#back-to-sessions").addEventListener("click", () =>
    switchView("sessions")
  );

  // ── Statistics ───────────────────────────────────────────
  let progressChart = null;

  function renderStats() {
    const allLaps = sessions.flatMap((s) => s.laps);

    // Personal Records
    const recordsEl = $("#personal-records");
    if (!sessions.length) {
      recordsEl.innerHTML =
        '<div class="empty-state"><p>Complete sessions to see records.</p></div>';
    } else {
      const overallBest = bestLap(allLaps);
      const overallAvg = avgLap(allLaps);
      const worst = Math.max(...allLaps);
      const totalLaps = allLaps.length;

      const bestSession = sessions.reduce(
        (best, s) => {
          const b = bestLap(s.laps);
          return b != null && (best.time == null || b < best.time)
            ? { time: b, session: s }
            : best;
        },
        { time: null, session: null }
      );

      recordsEl.innerHTML = `
        <div class="record-item">
          <span class="record-label">All-Time Best Lap</span>
          <span class="record-value" style="color:var(--green)">${formatTime(overallBest)}</span>
        </div>
        <div class="record-item">
          <span class="record-label">All-Time Average</span>
          <span class="record-value">${formatTime(overallAvg)}</span>
        </div>
        <div class="record-item">
          <span class="record-label">Slowest Lap</span>
          <span class="record-value" style="color:var(--red)">${formatTime(worst)}</span>
        </div>
        <div class="record-item">
          <span class="record-label">Total Laps Driven</span>
          <span class="record-value">${totalLaps}</span>
        </div>
        <div class="record-item">
          <span class="record-label">Total Sessions</span>
          <span class="record-value">${sessions.length}</span>
        </div>
        ${
          bestSession.session
            ? `<div class="record-item">
            <span class="record-label">Best Session Track</span>
            <span class="record-value">${escapeHtml(bestSession.session.trackName)}</span>
          </div>`
            : ""
        }
      `;
    }

    // Track Breakdown
    const breakdownEl = $("#track-breakdown");
    const tracks = {};
    sessions.forEach((s) => {
      if (!tracks[s.trackName]) tracks[s.trackName] = [];
      tracks[s.trackName].push(s);
    });

    if (!Object.keys(tracks).length) {
      breakdownEl.innerHTML =
        '<div class="empty-state"><p>Visit different tracks to compare.</p></div>';
    } else {
      breakdownEl.innerHTML = Object.entries(tracks)
        .map(([name, trackSessions]) => {
          const trackLaps = trackSessions.flatMap((s) => s.laps);
          return `
          <div class="track-item">
            <div class="track-name">${escapeHtml(name)}</div>
            <div class="track-stats">
              <span>Sessions: <strong>${trackSessions.length}</strong></span>
              <span>Best: <strong style="color:var(--green)">${formatTime(bestLap(trackLaps))}</strong></span>
              <span>Avg: <strong>${formatTime(avgLap(trackLaps))}</strong></span>
              <span>Laps: <strong>${trackLaps.length}</strong></span>
            </div>
          </div>`;
        })
        .join("");
    }

    renderProgressChart();
  }

  function renderProgressChart() {
    const canvas = $("#progress-chart");
    const emptyEl = $("#progress-empty");

    if (sessions.length < 2) {
      canvas.style.display = "none";
      emptyEl.classList.remove("hidden");
      if (progressChart) { progressChart.destroy(); progressChart = null; }
      return;
    }

    canvas.style.display = "block";
    emptyEl.classList.add("hidden");

    const sorted = [...sessions].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const labels = sorted.map(
      (s) => `${escapeHtml(s.trackName)} (${formatDate(s.date)})`
    );
    const bestData = sorted.map((s) => bestLap(s.laps));
    const avgData = sorted.map((s) => avgLap(s.laps));

    if (progressChart) progressChart.destroy();

    progressChart = new MiniChart(canvas, {
      labels,
      datasets: [
        { label: "Best Lap", data: bestData, color: "#22c55e" },
        { label: "Average", data: avgData, color: "#6366f1" },
      ],
      formatY: formatTime,
    });
  }

  // ── Import / Export ──────────────────────────────────────
  $("#export-btn").addEventListener("click", () => {
    const data = JSON.stringify(sessions, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kartlap-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Data exported!", "success");
  });

  $("#import-btn").addEventListener("click", () =>
    $("#import-file").click()
  );

  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error("Invalid format");
        const count = imported.length;
        imported.forEach((s) => {
          if (!sessions.find((x) => x.id === s.id)) {
            sessions.push(s);
          }
        });
        saveSessions(sessions);
        showToast(`Imported ${count} sessions!`, "success");
        renderDashboard();
      } catch {
        showToast("Invalid file format.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ── Mini Canvas Chart (no dependencies) ──────────────────
  class MiniChart {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.opts = opts;
      this.destroyed = false;
      this._resize();
      this._draw();
      this._resizeHandler = () => {
        this._resize();
        this._draw();
      };
      window.addEventListener("resize", this._resizeHandler);
    }

    destroy() {
      this.destroyed = true;
      window.removeEventListener("resize", this._resizeHandler);
    }

    _resize() {
      const parent = this.canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = Math.max(parent.clientHeight - 10, 200);
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = w;
      this.height = h;
    }

    _draw() {
      if (this.destroyed) return;
      const { ctx, width, height, opts } = this;
      const { datasets, labels, formatY, showBestLine } = opts;

      ctx.clearRect(0, 0, width, height);

      const pad = { top: 30, right: 20, bottom: 50, left: 80 };
      const chartW = width - pad.left - pad.right;
      const chartH = height - pad.top - pad.bottom;

      const allValues = datasets.flatMap((d) => d.data.filter((v) => v != null));
      if (!allValues.length) return;

      let minVal = Math.min(...allValues);
      let maxVal = Math.max(...allValues);
      const range = maxVal - minVal || 1000;
      minVal -= range * 0.1;
      maxVal += range * 0.1;

      const n = labels.length;
      const xStep = n > 1 ? chartW / (n - 1) : chartW / 2;

      const toX = (i) => pad.left + i * xStep;
      const toY = (v) =>
        pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = pad.top + (chartH / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();

        const val = maxVal - ((maxVal - minVal) / gridLines) * i;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(formatY(Math.round(val)), pad.left - 10, y + 4);
      }

      // Best line
      if (showBestLine != null) {
        const by = toY(showBestLine);
        ctx.strokeStyle = "rgba(34,197,94,0.3)";
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, by);
        ctx.lineTo(width - pad.right, by);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // X-axis labels
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      const labelSkip = Math.ceil(n / (chartW / 70));
      for (let i = 0; i < n; i++) {
        if (i % labelSkip !== 0 && i !== n - 1) continue;
        const x = toX(i);
        ctx.save();
        ctx.translate(x, height - pad.bottom + 16);
        ctx.rotate(-0.4);
        ctx.fillText(
          labels[i].length > 12 ? labels[i].slice(0, 12) + "…" : labels[i],
          0,
          0
        );
        ctx.restore();
      }

      // Datasets
      datasets.forEach((ds) => {
        const data = ds.data;

        // Line
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        let started = false;
        data.forEach((v, i) => {
          if (v == null) return;
          const x = toX(i);
          const y = toY(v);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Area fill
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = ds.color;
        ctx.beginPath();
        started = false;
        let firstX = 0;
        data.forEach((v, i) => {
          if (v == null) return;
          const x = toX(i);
          const y = toY(v);
          if (!started) {
            firstX = x;
            ctx.moveTo(x, pad.top + chartH);
            ctx.lineTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        });
        const lastIdx = data.length - 1;
        ctx.lineTo(toX(lastIdx), pad.top + chartH);
        ctx.lineTo(firstX, pad.top + chartH);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Dots
        data.forEach((v, i) => {
          if (v == null) return;
          const x = toX(i);
          const y = toY(v);
          ctx.fillStyle = ds.color;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#181a24";
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Legend
      if (datasets.length > 1) {
        let lx = pad.left;
        datasets.forEach((ds) => {
          ctx.fillStyle = ds.color;
          ctx.beginPath();
          ctx.arc(lx + 6, 14, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = "12px 'Inter', sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(ds.label, lx + 16, 18);
          lx += ctx.measureText(ds.label).width + 36;
        });
      }
    }
  }

  // ── Initialize ───────────────────────────────────────────
  renderDashboard();
  $("#session-date").value = new Date().toISOString().split("T")[0];
})();
