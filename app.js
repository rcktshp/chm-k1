/* ============================================================
   KartLap — Go Kart Lap Times Tracker
   Black / White / Red Racing Edition
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "kartlap_sessions";

  function loadSessions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveSessions(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  let sessions = loadSessions();

  // ── Time helpers ────────────────────────────────────────
  function formatTime(ms) {
    if (ms == null || ms < 0) return "--:--.---";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return (
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0") + "." +
      String(millis).padStart(3, "0")
    );
  }

  function parseTimeToMs(minutes, seconds, millis) {
    const m = parseInt(minutes, 10) || 0;
    const s = parseInt(seconds, 10) || 0;
    const ms = parseInt(millis, 10) || 0;
    return m * 60000 + s * 1000 + ms;
  }

  function parseTimeString(str) {
    str = str.trim();
    const patterns = [
      /^(\d{1,2}):(\d{2})\.(\d{1,3})$/,
      /^(\d{1,2}):(\d{2}):(\d{1,3})$/,
      /^(\d{1,2})\.(\d{2})\.(\d{1,3})$/,
    ];
    for (const p of patterns) {
      const m = str.match(p);
      if (m) {
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        let ms = m[3];
        if (ms.length === 1) ms += "00";
        else if (ms.length === 2) ms += "0";
        ms = parseInt(ms, 10);
        if (secs < 60 && mins < 60) {
          return mins * 60000 + secs * 1000 + ms;
        }
      }
    }
    const secsOnly = str.match(/^(\d{2})\.(\d{1,3})$/);
    if (secsOnly) {
      const secs = parseInt(secsOnly[1], 10);
      let ms = secsOnly[2];
      if (ms.length === 1) ms += "00";
      else if (ms.length === 2) ms += "0";
      ms = parseInt(ms, 10);
      if (secs < 60) return secs * 1000 + ms;
    }
    return null;
  }

  function bestLap(laps) {
    if (!laps.length) return null;
    return Math.min(...laps);
  }

  function avgLap(laps) {
    if (!laps.length) return null;
    return Math.round(laps.reduce((a, b) => a + b, 0) / laps.length);
  }

  function medianLap(laps) {
    if (!laps.length) return null;
    const sorted = [...laps].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  function standardDeviation(arr) {
    if (arr.length < 2) return 0;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function uuid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── DOM ─────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const sidebar = $("#sidebar");
  const hamburger = $("#hamburger");
  const sidebarClose = $("#sidebar-close");
  const pageTitle = $("#page-title");

  // ── Navigation ──────────────────────────────────────────
  const viewNames = {
    dashboard: "Dashboard",
    "new-session": "New Session",
    scan: "Scan Photo",
    sessions: "Sessions",
    stats: "Statistics",
    "session-detail": "Session Detail",
  };

  function switchView(name) {
    $$(".view").forEach((v) => v.classList.remove("active"));
    const target = $(`#view-${name}`);
    if (target) target.classList.add("active");

    $$(".nav-link").forEach((l) => l.classList.remove("active"));
    const activeLink = $(`.nav-link[data-view="${name}"]`);
    if (activeLink) activeLink.classList.add("active");

    pageTitle.textContent = viewNames[name] || "KartLap";
    sidebar.classList.remove("open");

    if (name === "dashboard") renderDashboard();
    if (name === "sessions") renderSessions();
    if (name === "stats") renderStats();
    if (name === "new-session") resetSessionSetup();
    if (name === "scan") resetScan();
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (link) {
      e.preventDefault();
      switchView(link.dataset.view);
    }
  });

  hamburger.addEventListener("click", () => sidebar.classList.add("open"));
  sidebarClose.addEventListener("click", () => sidebar.classList.remove("open"));

  // ── Toast / Modal ───────────────────────────────────────
  function showToast(message, type = "info") {
    const container = $("#toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

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

  // ── Dashboard ───────────────────────────────────────────
  function renderDashboard() {
    const allLaps = sessions.flatMap((s) => s.laps);
    $("#stat-best-lap").textContent = formatTime(bestLap(allLaps));
    $("#stat-avg-lap").textContent = formatTime(avgLap(allLaps));
    $("#stat-total-sessions").textContent = sessions.length;
    $("#stat-total-laps").textContent = allLaps.length;

    const recentContainer = $("#recent-sessions");
    if (!sessions.length) {
      recentContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          <p>No sessions yet. Hit the track!</p>
          <a href="#" class="btn btn-primary btn-sm" data-view="new-session">New Session</a>
        </div>`;
      renderTrendChart();
      return;
    }

    const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 5);

    recentContainer.innerHTML = recent.map((s) => `
      <div class="session-card" data-session-id="${s.id}">
        <div class="session-card-left">
          <div class="session-card-track">${escapeHtml(s.trackName)}</div>
          <div class="session-card-meta">
            <span>${formatDate(s.date)}</span>
            <span class="badge badge-${s.type}">${s.type}</span>
            <span>${s.laps.length} laps</span>
            ${s.location ? `<span>${escapeHtml(s.location)}</span>` : ""}
          </div>
        </div>
        <div class="session-card-right">
          <div class="session-card-best">
            <div class="label">Best</div>
            <div class="value">${formatTime(bestLap(s.laps))}</div>
          </div>
        </div>
      </div>`).join("");

    recentContainer.querySelectorAll(".session-card").forEach((card) => {
      card.addEventListener("click", () => openSessionDetail(card.dataset.sessionId));
    });

    renderTrendChart();
  }

  // ── Trend Chart ─────────────────────────────────────────
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

    const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (trendChart) trendChart.destroy();
    trendChart = new MiniChart(canvas, {
      labels: sorted.map((s) => formatDate(s.date)),
      datasets: [
        { label: "Best Lap", data: sorted.map((s) => bestLap(s.laps)), color: "#ff0a0a" },
        { label: "Avg Lap", data: sorted.map((s) => avgLap(s.laps)), color: "#ffffff" },
      ],
      formatY: formatTime,
    });
  }

  // ── New Session ─────────────────────────────────────────
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

  // GPS location
  $("#btn-gps-location").addEventListener("click", () => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported.", "error");
      return;
    }
    showToast("Getting location...", "info");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await resp.json();
          const city = data.address.city || data.address.town || data.address.village || "";
          const state = data.address.state || "";
          const country = data.address.country_code?.toUpperCase() || "";
          const loc = [city, state, country].filter(Boolean).join(", ");
          $("#track-location").value = loc;
          showToast("Location found!", "success");
        } catch {
          $("#track-location").value = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
          showToast("Location set (coordinates).", "info");
        }
      },
      () => showToast("Location access denied.", "error"),
      { timeout: 10000 }
    );
  });

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
    btnStartStop.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Stop`;
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
    btnStartStop.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start`;
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
    if (stopwatchRunning) stopStopwatch(); else startStopwatch();
  });

  btnLap.addEventListener("click", () => {
    if (!stopwatchRunning) return;
    const now = performance.now();
    const lapTime = Math.floor(now - lastLapTimestamp);
    lastLapTimestamp = now;
    if (lapTime > 0) { currentLaps.push(lapTime); renderActiveLaps(); }
  });

  btnReset.addEventListener("click", resetStopwatchUI);

  $("#btn-add-manual").addEventListener("click", () => {
    const m = $("#manual-minutes").value;
    const s = $("#manual-seconds").value;
    const ms = $("#manual-millis").value;
    const time = parseTimeToMs(m, s, ms);
    if (time <= 0) { showToast("Enter a valid lap time.", "error"); return; }
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

    tbody.innerHTML = currentLaps.map((lap, i) => {
      const delta = i === 0 ? 0 : lap - currentLaps[i - 1];
      const deltaClass = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
      const deltaStr = i === 0
        ? '<span class="delta neutral">—</span>'
        : `<span class="delta ${deltaClass}">${delta > 0 ? "+" : ""}${formatTime(Math.abs(delta))}</span>`;
      const isBest = lap === best;
      return `<tr>
        <td class="lap-num">${i + 1}</td>
        <td class="lap-time${isBest ? " is-best" : ""}">${formatTime(lap)}</td>
        <td>${deltaStr}</td>
        <td><button class="btn-delete-lap" data-index="${i}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td>
      </tr>`;
    }).join("");

    tbody.querySelectorAll(".btn-delete-lap").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        currentLaps.splice(parseInt(btn.dataset.index, 10), 1);
        renderActiveLaps();
      });
    });
  }

  $("#btn-save-session").addEventListener("click", () => {
    if (!currentLaps.length) return;
    const session = {
      id: uuid(),
      trackName: $("#track-name").value.trim(),
      date: $("#session-date").value,
      location: $("#track-location").value.trim(),
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

  $("#btn-discard-session").addEventListener("click", async () => {
    if (currentLaps.length) {
      const ok = await showModal("Discard Session", "You have unsaved laps. Discard?");
      if (!ok) return;
    }
    currentLaps = [];
    resetStopwatchUI();
    resetSessionSetup();
  });

  // ── Photo Scan (OCR) ───────────────────────────────────
  let scannedTimes = [];

  function resetScan() {
    scannedTimes = [];
    $("#scan-preview").style.display = "none";
    $("#scan-progress").style.display = "none";
    $("#scan-results").style.display = "none";
    $("#scan-save-session").disabled = true;
    $("#scan-date").value = new Date().toISOString().split("T")[0];
  }

  const scanDropZone = $("#scan-drop-zone");
  const scanFileInput = $("#scan-file-input");

  scanDropZone.addEventListener("click", () => scanFileInput.click());

  scanDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    scanDropZone.classList.add("drag-over");
  });
  scanDropZone.addEventListener("dragleave", () => scanDropZone.classList.remove("drag-over"));
  scanDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    scanDropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) processImage(e.dataTransfer.files[0]);
  });

  scanFileInput.addEventListener("change", (e) => {
    if (e.target.files.length) processImage(e.target.files[0]);
    e.target.value = "";
  });

  async function processImage(file) {
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file.", "error");
      return;
    }

    const previewEl = $("#scan-preview");
    const previewImg = $("#scan-preview-img");
    previewEl.style.display = "block";
    previewImg.src = URL.createObjectURL(file);

    const progressEl = $("#scan-progress");
    const progressFill = $("#scan-progress-fill");
    const progressText = $("#scan-progress-text");
    progressEl.style.display = "block";
    progressFill.style.width = "0%";
    progressText.textContent = "Loading OCR engine...";

    $("#scan-results").style.display = "none";

    try {
      const worker = await Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const pct = Math.round(m.progress * 100);
            progressFill.style.width = pct + "%";
            progressText.textContent = `Scanning... ${pct}%`;
          } else if (m.status) {
            progressText.textContent = m.status.charAt(0).toUpperCase() + m.status.slice(1) + "...";
          }
        },
      });

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      progressFill.style.width = "100%";
      progressText.textContent = "Scan complete!";

      const times = extractTimesFromText(text);
      if (times.length) {
        scannedTimes = times;
        renderScannedTimes();
        showToast(`Found ${times.length} lap times!`, "success");
      } else {
        showToast("No lap times detected. Try a clearer photo.", "error");
        progressText.textContent = "No times found. Try a clearer image.";
      }
    } catch (err) {
      progressText.textContent = "OCR failed. Try another image.";
      showToast("Scan failed. Please try again.", "error");
    }
  }

  function extractTimesFromText(text) {
    const times = [];
    const patterns = [
      /\d{1,2}:\d{2}\.\d{1,3}/g,
      /\d{1,2}:\d{2}:\d{1,3}/g,
      /\d{2}\.\d{2,3}/g,
    ];
    const seen = new Set();
    for (const p of patterns) {
      const matches = text.match(p) || [];
      for (const m of matches) {
        const ms = parseTimeString(m);
        if (ms && ms > 5000 && ms < 600000 && !seen.has(ms)) {
          seen.add(ms);
          times.push(ms);
        }
      }
    }
    return times;
  }

  function renderScannedTimes() {
    const container = $("#scan-times-list");
    const resultsEl = $("#scan-results");
    resultsEl.style.display = "block";
    $("#scan-save-session").disabled = scannedTimes.length === 0;

    container.innerHTML = scannedTimes.map((t, i) =>
      `<span class="scan-time-chip">
        ${formatTime(t)}
        <button class="remove-chip" data-index="${i}">&times;</button>
      </span>`
    ).join("");

    container.querySelectorAll(".remove-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        scannedTimes.splice(parseInt(btn.dataset.index, 10), 1);
        renderScannedTimes();
      });
    });
  }

  $("#scan-add-all").addEventListener("click", () => {
    if (!scannedTimes.length) return;
    currentLaps.push(...scannedTimes);
    showToast(`Added ${scannedTimes.length} laps to current session!`, "success");
    switchView("new-session");
    $("#session-setup").classList.add("hidden");
    $("#session-active").classList.remove("hidden");
    renderActiveLaps();
  });

  $("#scan-save-session").addEventListener("click", () => {
    if (!scannedTimes.length) return;
    const trackName = $("#scan-track-name").value.trim();
    if (!trackName) {
      showToast("Please enter a track name.", "error");
      return;
    }
    const session = {
      id: uuid(),
      trackName,
      date: $("#scan-date").value || new Date().toISOString().split("T")[0],
      location: $("#scan-track-location").value.trim(),
      kartNumber: "",
      type: $("#scan-session-type").value,
      notes: "Imported from photo scan",
      laps: [...scannedTimes],
      createdAt: new Date().toISOString(),
    };
    sessions.push(session);
    saveSessions(sessions);
    scannedTimes = [];
    showToast("Session saved from scan!", "success");
    switchView("sessions");
  });

  // ── Sessions List ───────────────────────────────────────
  function renderSessions() {
    const search = $("#search-sessions").value.toLowerCase();
    const typeFilter = $("#filter-type").value;
    const sort = $("#sort-sessions").value;

    let filtered = sessions.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      const searchable = (s.trackName + " " + (s.location || "")).toLowerCase();
      if (search && !searchable.includes(search)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      switch (sort) {
        case "date-asc": return new Date(a.date) - new Date(b.date);
        case "date-desc": return new Date(b.date) - new Date(a.date);
        case "best-asc": return (bestLap(a.laps) || Infinity) - (bestLap(b.laps) || Infinity);
        case "best-desc": return (bestLap(b.laps) || 0) - (bestLap(a.laps) || 0);
        default: return 0;
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

    container.innerHTML = filtered.map((s) => `
      <div class="session-card" data-session-id="${s.id}">
        <div class="session-card-left">
          <div class="session-card-track">${escapeHtml(s.trackName)}</div>
          <div class="session-card-meta">
            <span>${formatDate(s.date)}</span>
            <span class="badge badge-${s.type}">${s.type}</span>
            <span>${s.laps.length} laps</span>
            ${s.location ? `<span>${escapeHtml(s.location)}</span>` : ""}
            ${s.kartNumber ? `<span>Kart #${escapeHtml(s.kartNumber)}</span>` : ""}
          </div>
        </div>
        <div class="session-card-right">
          <div class="session-card-best">
            <div class="label">Best</div>
            <div class="value">${formatTime(bestLap(s.laps))}</div>
          </div>
          <div class="session-card-actions">
            <button class="btn btn-outline btn-sm btn-delete-session" data-id="${s.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>`).join("");

    container.querySelectorAll(".session-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-delete-session")) return;
        openSessionDetail(card.dataset.sessionId);
      });
    });

    container.querySelectorAll(".btn-delete-session").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const ok = await showModal("Delete Session", "Permanently delete this session?");
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

  // ── Session Detail ──────────────────────────────────────
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
        ${session.location ? `<span class="detail-meta-item">${escapeHtml(session.location)}</span>` : ""}
        ${session.kartNumber ? `<span class="detail-meta-item">Kart #${escapeHtml(session.kartNumber)}</span>` : ""}
        <span class="detail-meta-item">${session.laps.length} laps</span>
      </div>
      <div class="detail-stats-row">
        <div class="detail-stat">
          <span class="label">Best Lap</span>
          <span class="value" style="color:var(--red);text-shadow:0 0 12px var(--red-glow)">${formatTime(best)}</span>
        </div>
        <div class="detail-stat">
          <span class="label">Average</span>
          <span class="value">${formatTime(avg)}</span>
        </div>
        <div class="detail-stat">
          <span class="label">Median</span>
          <span class="value">${formatTime(medianLap(session.laps))}</span>
        </div>
        <div class="detail-stat">
          <span class="label">Worst</span>
          <span class="value" style="color:var(--text-muted)">${formatTime(session.laps.length ? Math.max(...session.laps) : null)}</span>
        </div>
        <div class="detail-stat">
          <span class="label">Consistency</span>
          <span class="value">${session.laps.length > 1 ? formatTime(Math.round(standardDeviation(session.laps))) : "—"}</span>
        </div>
      </div>
      ${session.notes ? `<div class="detail-notes">${escapeHtml(session.notes)}</div>` : ""}`;

    const tbody = $("#detail-laps-body");
    tbody.innerHTML = session.laps.map((lap, i) => {
      const delta = lap - best;
      const deltaClass = delta === 0 ? "neutral" : "positive";
      const isBest = lap === best;
      return `<tr>
        <td class="lap-num">${i + 1}</td>
        <td class="lap-time${isBest ? " is-best" : ""}">${formatTime(lap)}</td>
        <td><span class="delta ${deltaClass}">${delta === 0 ? "BEST" : `+${formatTime(delta)}`}</span></td>
      </tr>`;
    }).join("");

    renderSessionChart(session);
  }

  function renderSessionChart(session) {
    const canvas = $("#session-chart");
    if (sessionChart) sessionChart.destroy();
    if (session.laps.length < 2) return;
    sessionChart = new MiniChart(canvas, {
      labels: session.laps.map((_, i) => `Lap ${i + 1}`),
      datasets: [{ label: "Lap Time", data: session.laps, color: "#ff0a0a" }],
      formatY: formatTime,
      showBestLine: bestLap(session.laps),
    });
  }

  $("#back-to-sessions").addEventListener("click", () => switchView("sessions"));

  // ── Statistics ──────────────────────────────────────────
  let progressChart = null;

  function renderStats() {
    const allLaps = sessions.flatMap((s) => s.laps);

    // Highlight cards
    const highlightsEl = $("#stats-highlights");
    if (!sessions.length) {
      highlightsEl.innerHTML = "";
    } else {
      const overallBest = bestLap(allLaps);
      const overallAvg = avgLap(allLaps);
      const overallMedian = medianLap(allLaps);
      const consistency = standardDeviation(allLaps);
      const totalTime = allLaps.reduce((a, b) => a + b, 0);

      let improvementHtml = "";
      if (sessions.length >= 2) {
        const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstBest = bestLap(sorted[0].laps);
        const lastBest = bestLap(sorted[sorted.length - 1].laps);
        if (firstBest && lastBest) {
          const diff = firstBest - lastBest;
          const cls = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";
          const sign = diff > 0 ? "-" : "+";
          improvementHtml = `
            <div class="highlight-card">
              <span class="improvement-badge ${cls}">${sign}${formatTime(Math.abs(diff))}</span>
              <span class="highlight-label">Improvement (First → Last)</span>
            </div>`;
        }
      }

      highlightsEl.innerHTML = `
        <div class="highlight-card">
          <span class="highlight-value red">${formatTime(overallBest)}</span>
          <span class="highlight-label">All-Time Best</span>
        </div>
        <div class="highlight-card">
          <span class="highlight-value">${formatTime(overallAvg)}</span>
          <span class="highlight-label">Overall Average</span>
        </div>
        <div class="highlight-card">
          <span class="highlight-value">${formatTime(overallMedian)}</span>
          <span class="highlight-label">Median Lap</span>
        </div>
        <div class="highlight-card">
          <span class="highlight-value">${formatTime(Math.round(consistency))}</span>
          <span class="highlight-label">Consistency (Std Dev)</span>
        </div>
        <div class="highlight-card">
          <span class="highlight-value">${allLaps.length}</span>
          <span class="highlight-label">Total Laps</span>
        </div>
        <div class="highlight-card">
          <span class="highlight-value">${formatTime(Math.round(totalTime / 1000) * 1000)}</span>
          <span class="highlight-label">Total Track Time</span>
        </div>
        ${improvementHtml}
      `;
    }

    // Personal Records
    const recordsEl = $("#personal-records");
    if (!sessions.length) {
      recordsEl.innerHTML = '<div class="empty-state"><p>Complete sessions to see records.</p></div>';
    } else {
      const overallBest = bestLap(allLaps);
      const worst = Math.max(...allLaps);

      const bestSession = sessions.reduce((best, s) => {
        const b = bestLap(s.laps);
        return b != null && (best.time == null || b < best.time) ? { time: b, session: s } : best;
      }, { time: null, session: null });

      const mostLapsSession = sessions.reduce((max, s) =>
        s.laps.length > (max?.laps.length || 0) ? s : max, sessions[0]);

      const bestAvgSession = sessions.reduce((best, s) => {
        const a = avgLap(s.laps);
        return a != null && (best.avg == null || a < best.avg) ? { avg: a, session: s } : best;
      }, { avg: null, session: null });

      const uniqueTracks = new Set(sessions.map((s) => s.trackName)).size;

      recordsEl.innerHTML = `
        <div class="record-item">
          <span class="record-label">Best Ever Lap</span>
          <span class="record-value" style="color:var(--red);text-shadow:0 0 10px var(--red-glow)">${formatTime(overallBest)}</span>
        </div>
        <div class="record-item">
          <span class="record-label">Worst Lap</span>
          <span class="record-value" style="color:var(--text-dim)">${formatTime(worst)}</span>
        </div>
        <div class="record-item">
          <span class="record-label">Best Avg Session</span>
          <span class="record-value">${formatTime(bestAvgSession.avg)}</span>
        </div>
        ${bestSession.session ? `<div class="record-item">
          <span class="record-label">Fastest Track</span>
          <span class="record-value">${escapeHtml(bestSession.session.trackName)}</span>
        </div>` : ""}
        <div class="record-item">
          <span class="record-label">Most Laps in Session</span>
          <span class="record-value">${mostLapsSession.laps.length}</span>
        </div>
        <div class="record-item">
          <span class="record-label">Tracks Visited</span>
          <span class="record-value">${uniqueTracks}</span>
        </div>
        <div class="record-item">
          <span class="record-label">Total Sessions</span>
          <span class="record-value">${sessions.length}</span>
        </div>`;
    }

    // Top 10 Laps
    const topLapsEl = $("#top-laps");
    if (allLaps.length < 1) {
      topLapsEl.innerHTML = '<div class="empty-state"><p>Record laps to see your fastest times.</p></div>';
    } else {
      const lapEntries = [];
      sessions.forEach((s) => {
        s.laps.forEach((lap) => lapEntries.push({ time: lap, track: s.trackName, date: s.date }));
      });
      lapEntries.sort((a, b) => a.time - b.time);
      const top = lapEntries.slice(0, 10);
      topLapsEl.innerHTML = `<table class="top-laps-table">${top.map((l, i) =>
        `<tr>
          <td class="rank${i === 0 ? " gold" : ""}">#${i + 1}</td>
          <td class="time-col">${formatTime(l.time)}</td>
          <td class="track-col">${escapeHtml(l.track)}</td>
          <td class="track-col">${formatDate(l.date)}</td>
        </tr>`
      ).join("")}</table>`;
    }

    // Track Breakdown
    const breakdownEl = $("#track-breakdown");
    const tracks = {};
    sessions.forEach((s) => {
      if (!tracks[s.trackName]) tracks[s.trackName] = [];
      tracks[s.trackName].push(s);
    });
    if (!Object.keys(tracks).length) {
      breakdownEl.innerHTML = '<div class="empty-state"><p>Visit different tracks to compare.</p></div>';
    } else {
      breakdownEl.innerHTML = Object.entries(tracks).map(([name, trkSessions]) => {
        const trkLaps = trkSessions.flatMap((s) => s.laps);
        const loc = trkSessions.find((s) => s.location)?.location;
        return `<div class="track-item">
          <div class="track-name">${escapeHtml(name)}${loc ? ` <span style="color:var(--text-dim);font-weight:400;font-size:0.82rem">— ${escapeHtml(loc)}</span>` : ""}</div>
          <div class="track-stats">
            <span>Sessions: <strong>${trkSessions.length}</strong></span>
            <span>Best: <strong style="color:var(--red)">${formatTime(bestLap(trkLaps))}</strong></span>
            <span>Avg: <strong>${formatTime(avgLap(trkLaps))}</strong></span>
            <span>Laps: <strong>${trkLaps.length}</strong></span>
          </div>
        </div>`;
      }).join("");
    }

    // Lap Time Distribution
    const distEl = $("#lap-distribution");
    if (allLaps.length < 5) {
      distEl.innerHTML = '<div class="empty-state"><p>Record more laps to see distribution.</p></div>';
    } else {
      const minLap = Math.min(...allLaps);
      const maxLap = Math.max(...allLaps);
      const bucketCount = 6;
      const bucketSize = Math.ceil((maxLap - minLap) / bucketCount) || 1000;
      const buckets = Array.from({ length: bucketCount }, () => 0);
      allLaps.forEach((lap) => {
        const idx = Math.min(Math.floor((lap - minLap) / bucketSize), bucketCount - 1);
        buckets[idx]++;
      });
      const maxBucket = Math.max(...buckets);

      distEl.innerHTML = buckets.map((count, i) => {
        const from = minLap + i * bucketSize;
        const to = from + bucketSize;
        const pct = maxBucket ? Math.round((count / maxBucket) * 100) : 0;
        return `<div class="distribution-bar-container">
          <div class="distribution-label-row">
            <span class="range">${formatTime(from)} — ${formatTime(to)}</span>
            <span class="count">${count}</span>
          </div>
          <div class="distribution-bar">
            <div class="distribution-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>`;
      }).join("");
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

    const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (progressChart) progressChart.destroy();
    progressChart = new MiniChart(canvas, {
      labels: sorted.map((s) => `${escapeHtml(s.trackName)} (${formatDate(s.date)})`),
      datasets: [
        { label: "Best Lap", data: sorted.map((s) => bestLap(s.laps)), color: "#ff0a0a" },
        { label: "Average", data: sorted.map((s) => avgLap(s.laps)), color: "#ffffff" },
      ],
      formatY: formatTime,
    });
  }

  // ── Import / Export ─────────────────────────────────────
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

  $("#import-btn").addEventListener("click", () => $("#import-file").click());

  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error("Invalid");
        const count = imported.length;
        imported.forEach((s) => {
          if (!sessions.find((x) => x.id === s.id)) sessions.push(s);
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

  // ── Canvas Chart ────────────────────────────────────────
  class MiniChart {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.opts = opts;
      this.destroyed = false;
      this._resize();
      this._draw();
      this._resizeHandler = () => { this._resize(); this._draw(); };
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
      const toY = (v) => pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = pad.top + (chartH / 5) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
        const val = maxVal - ((maxVal - minVal) / 5) * i;
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(formatY(Math.round(val)), pad.left - 10, y + 4);
      }

      // Best line
      if (showBestLine != null) {
        const by = toY(showBestLine);
        ctx.strokeStyle = "rgba(255,10,10,0.3)";
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad.left, by); ctx.lineTo(width - pad.right, by); ctx.stroke();
        ctx.setLineDash([]);
      }

      // X labels
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      const labelSkip = Math.ceil(n / (chartW / 70));
      for (let i = 0; i < n; i++) {
        if (i % labelSkip !== 0 && i !== n - 1) continue;
        const x = toX(i);
        ctx.save();
        ctx.translate(x, height - pad.bottom + 16);
        ctx.rotate(-0.4);
        ctx.fillText(labels[i].length > 12 ? labels[i].slice(0, 12) + "…" : labels[i], 0, 0);
        ctx.restore();
      }

      // Lines
      datasets.forEach((ds) => {
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowColor = ds.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        let started = false;
        ds.data.forEach((v, i) => {
          if (v == null) return;
          const x = toX(i), y = toY(v);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Area
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = ds.color;
        ctx.beginPath();
        started = false;
        let firstX = 0;
        ds.data.forEach((v, i) => {
          if (v == null) return;
          const x = toX(i), y = toY(v);
          if (!started) { firstX = x; ctx.moveTo(x, pad.top + chartH); ctx.lineTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(toX(ds.data.length - 1), pad.top + chartH);
        ctx.lineTo(firstX, pad.top + chartH);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;

        // Dots
        ds.data.forEach((v, i) => {
          if (v == null) return;
          const x = toX(i), y = toY(v);
          ctx.fillStyle = ds.color;
          ctx.shadowColor = ds.color;
          ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#0a0a0a";
          ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
        });
      });

      // Legend
      if (datasets.length > 1) {
        let lx = pad.left;
        datasets.forEach((ds) => {
          ctx.fillStyle = ds.color;
          ctx.beginPath(); ctx.arc(lx + 6, 14, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = "12px 'Inter', sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(ds.label, lx + 16, 18);
          lx += ctx.measureText(ds.label).width + 36;
        });
      }
    }
  }

  // ── Init ────────────────────────────────────────────────
  renderDashboard();
  $("#session-date").value = new Date().toISOString().split("T")[0];
})();
