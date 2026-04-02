/* ============================================================
   KartLap — Go Kart Lap Times Tracker
   Black / White / Red Racing Edition
   ============================================================ */

(function () {
  "use strict";

  // ── Auth System ─────────────────────────────────────────
  const AUTH_USERS_KEY = "kartlap_users";
  const AUTH_SESSION_KEY = "kartlap_auth";

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  }

  function getAuthSession() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));
    } catch {
      return null;
    }
  }

  function setAuthSession(user) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
  }

  function clearAuthSession() {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }

  let currentUser = null;

  function storageKeyForUser(username) {
    if (!username || username === "__guest__") return "kartlap_sessions";
    return `kartlap_sessions_${username}`;
  }

  function loadSessions() {
    const key = storageKeyForUser(currentUser?.username);
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  function saveSessions(s) {
    const key = storageKeyForUser(currentUser?.username);
    localStorage.setItem(key, JSON.stringify(s));
  }

  const $q = (sel) => document.querySelector(sel);

  // Auth UI
  const authScreen = $q("#auth-screen");
  const appEl = $q("#app");
  const signinCard = $q("#auth-signin");
  const signupCard = $q("#auth-signup");
  const signinError = $q("#signin-error");
  const signupError = $q("#signup-error");

  function showAuthError(el, msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function hideAuthError(el) {
    el.classList.add("hidden");
  }

  $q("#goto-signup").addEventListener("click", (e) => {
    e.preventDefault();
    signinCard.classList.add("hidden");
    signupCard.classList.remove("hidden");
    hideAuthError(signinError);
    hideAuthError(signupError);
  });

  $q("#goto-signin").addEventListener("click", (e) => {
    e.preventDefault();
    signupCard.classList.add("hidden");
    signinCard.classList.remove("hidden");
    hideAuthError(signinError);
    hideAuthError(signupError);
  });

  $q("#signin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthError(signinError);
    const username = $q("#signin-username").value.trim().toLowerCase();
    const password = $q("#signin-password").value;
    if (!username || !password) { showAuthError(signinError, "All fields are required."); return; }

    const users = getUsers();
    const user = users[username];
    if (!user) { showAuthError(signinError, "Account not found."); return; }

    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) { showAuthError(signinError, "Incorrect password."); return; }

    currentUser = { username, displayName: user.displayName };
    setAuthSession(currentUser);
    enterApp();
  });

  $q("#signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthError(signupError);
    const username = $q("#signup-username").value.trim().toLowerCase();
    const displayName = $q("#signup-display").value.trim() || username;
    const password = $q("#signup-password").value;
    const confirm = $q("#signup-confirm").value;

    if (!username || !password) { showAuthError(signupError, "Username and password are required."); return; }
    if (username.length < 3) { showAuthError(signupError, "Username must be at least 3 characters."); return; }
    if (!/^[a-z0-9_]+$/.test(username)) { showAuthError(signupError, "Username: lowercase letters, numbers, underscores only."); return; }
    if (password.length < 4) { showAuthError(signupError, "Password must be at least 4 characters."); return; }
    if (password !== confirm) { showAuthError(signupError, "Passwords don't match."); return; }

    const users = getUsers();
    if (users[username]) { showAuthError(signupError, "Username already taken."); return; }

    const hash = await hashPassword(password);
    users[username] = { displayName, passwordHash: hash, createdAt: new Date().toISOString() };
    saveUsers(users);

    currentUser = { username, displayName };
    setAuthSession(currentUser);
    enterApp();
  });

  function enterApp() {
    authScreen.classList.add("hidden");
    appEl.classList.remove("hidden");
    sessions = loadSessions();
    profile = loadProfile();
    updateCoinDisplay();
    updateUserUI();
    renderDashboard();
    $q("#session-date").value = new Date().toISOString().split("T")[0];
  }

  function updateUserUI() {
    if (!currentUser) return;
    const name = currentUser.displayName || currentUser.username;
    const isGuest = currentUser.username === "__guest__";
    $q("#user-display-name").textContent = name;
    $q("#user-tag").textContent = isGuest ? "guest" : `@${currentUser.username}`;

    const avatarEl = $q("#user-avatar");
    const avatarItem = SHOP_ITEMS.avatars.find((a) => a.id === profile.equipped.avatar) || SHOP_ITEMS.avatars[0];
    const borderItem = SHOP_ITEMS.borders.find((b) => b.id === profile.equipped.border) || SHOP_ITEMS.borders[0];
    avatarEl.textContent = avatarItem.preview || name.charAt(0).toUpperCase();
    avatarEl.style.background = avatarItem.bg;
    avatarEl.style.color = avatarItem.color;
    avatarEl.style.border = borderItem.style;
    avatarEl.style.boxShadow = borderItem.shadow || "none";
    if (borderItem.gradient) {
      avatarEl.style.border = "3px solid transparent";
      avatarEl.style.background = `linear-gradient(${avatarItem.bg},${avatarItem.bg}) padding-box,linear-gradient(135deg,#f13333,#1789ff,#f1b900,#1e9944) border-box`;
    }
    avatarEl.style.fontSize = avatarItem.preview ? "1rem" : "0.85rem";

    updateCoinDisplay();
  }

  $q("#signout-btn").addEventListener("click", () => {
    clearAuthSession();
    currentUser = null;
    appEl.classList.add("hidden");
    authScreen.classList.remove("hidden");
    $q("#signin-username").value = "";
    $q("#signin-password").value = "";
    hideAuthError(signinError);
    signinCard.classList.remove("hidden");
    signupCard.classList.add("hidden");
  });

  // Check for existing session on load
  const existingAuth = getAuthSession();
  if (existingAuth) {
    currentUser = existingAuth;
  }

  let sessions = loadSessions();

  // ── Coins & Shop System ─────────────────────────────────
  const SHOP_ITEMS = {
    avatars: [
      { id: "default", name: "Default", preview: "", price: 0, bg: "var(--red-glow-strong)", color: "var(--red)" },
      { id: "fire", name: "Fire", preview: "🔥", price: 50, bg: "#2a1a00", color: "#ff6600" },
      { id: "lightning", name: "Lightning", preview: "⚡", price: 75, bg: "#2a2400", color: "#f1b900" },
      { id: "trophy", name: "Trophy", preview: "🏆", price: 100, bg: "#2a2400", color: "#f1b900" },
      { id: "helmet", name: "Helmet", preview: "🪖", price: 100, bg: "#1a2a1a", color: "#1e9944" },
      { id: "flag", name: "Checkered", preview: "🏁", price: 150, bg: "#1a1a2a", color: "#1789ff" },
      { id: "rocket", name: "Rocket", preview: "🚀", price: 200, bg: "#2a1a2a", color: "#a855f7" },
      { id: "skull", name: "Skull", preview: "💀", price: 250, bg: "#1a1a1a", color: "#eeeff3" },
      { id: "crown", name: "Crown", preview: "👑", price: 500, bg: "#2a2400", color: "#f1b900" },
      { id: "alien", name: "Alien", preview: "👽", price: 300, bg: "#0a2a1a", color: "#00ff66" },
    ],
    borders: [
      { id: "default", name: "Default", style: "2px solid var(--red)", price: 0 },
      { id: "blue", name: "Blue Ring", style: "2px solid #1789ff", price: 50 },
      { id: "gold", name: "Gold Ring", style: "2px solid #f1b900", price: 100 },
      { id: "green", name: "Green Ring", style: "2px solid #1e9944", price: 75 },
      { id: "thick-red", name: "Bold Red", style: "4px solid var(--red)", price: 100 },
      { id: "thick-blue", name: "Bold Blue", style: "4px solid #1789ff", price: 100 },
      { id: "glow-red", name: "Red Glow", style: "2px solid var(--red)", shadow: "0 0 12px rgba(241,51,51,0.5)", price: 200 },
      { id: "glow-blue", name: "Blue Glow", style: "2px solid #1789ff", shadow: "0 0 12px rgba(23,137,255,0.5)", price: 200 },
      { id: "glow-gold", name: "Gold Glow", style: "2px solid #f1b900", shadow: "0 0 12px rgba(241,185,0,0.5)", price: 300 },
      { id: "rainbow", name: "Rainbow", style: "3px solid", gradient: true, price: 500 },
    ],
    titles: [
      { id: "default", name: "No Title", text: "", price: 0 },
      { id: "rookie", name: "Rookie", text: "Rookie Racer", price: 25 },
      { id: "speedster", name: "Speedster", text: "Speedster", price: 75 },
      { id: "hotlap", name: "Hot Lap", text: "Hot Lap Hero", price: 100 },
      { id: "apex", name: "Apex", text: "Apex Hunter", price: 150 },
      { id: "podium", name: "Podium", text: "Podium Finisher", price: 150 },
      { id: "drift", name: "Drift King", text: "Drift King", price: 200 },
      { id: "nitro", name: "Nitro", text: "Nitro Boost", price: 250 },
      { id: "legend", name: "Legend", text: "Track Legend", price: 400 },
      { id: "champion", name: "Champion", text: "Grand Champion", price: 500 },
    ],
  };

  const COIN_REWARDS = [
    { desc: "Complete a session", amount: 10 },
    { desc: "Record 5+ laps in a session", amount: 5 },
    { desc: "Set a new personal best", amount: 25 },
    { desc: "Complete 5 sessions (milestone)", amount: 50 },
    { desc: "Complete 10 sessions", amount: 100 },
    { desc: "Complete 25 sessions", amount: 200 },
    { desc: "Record 50 total laps", amount: 50 },
    { desc: "Record 100 total laps", amount: 100 },
    { desc: "Visit 3 different tracks", amount: 75 },
    { desc: "Sign up for an account", amount: 25 },
  ];

  function profileKey(username) {
    if (!username || username === "__guest__") return "kartlap_profile";
    return `kartlap_profile_${username}`;
  }

  function loadProfile() {
    try {
      const p = JSON.parse(localStorage.getItem(profileKey(currentUser?.username)));
      return p || defaultProfile();
    } catch {
      return defaultProfile();
    }
  }

  function defaultProfile() {
    return {
      coins: 0,
      owned: { avatars: ["default"], borders: ["default"], titles: ["default"] },
      equipped: { avatar: "default", border: "default", title: "default" },
      claimedMilestones: [],
    };
  }

  function saveProfile(p) {
    localStorage.setItem(profileKey(currentUser?.username), JSON.stringify(p));
  }

  let profile = loadProfile();

  function addCoins(amount, reason) {
    profile.coins += amount;
    saveProfile(profile);
    updateCoinDisplay();
    if (reason) showToast(`+${amount} coins — ${reason}`, "success");
  }

  function updateCoinDisplay() {
    const els = [
      $q("#coin-count"),
      $q("#shop-coin-count"),
    ];
    els.forEach((el) => { if (el) el.textContent = profile.coins; });
  }

  function checkAndAwardCoins(sessions) {
    const allLaps = sessions.flatMap((s) => s.laps);
    const totalSessions = sessions.length;
    const totalLaps = allLaps.length;
    const uniqueTracks = new Set(sessions.map((s) => s.trackName)).size;

    const milestones = [
      { id: "sessions_5", check: totalSessions >= 5, amount: 50, desc: "5 sessions milestone" },
      { id: "sessions_10", check: totalSessions >= 10, amount: 100, desc: "10 sessions milestone" },
      { id: "sessions_25", check: totalSessions >= 25, amount: 200, desc: "25 sessions milestone" },
      { id: "laps_50", check: totalLaps >= 50, amount: 50, desc: "50 laps milestone" },
      { id: "laps_100", check: totalLaps >= 100, amount: 100, desc: "100 laps milestone" },
      { id: "tracks_3", check: uniqueTracks >= 3, amount: 75, desc: "3 tracks visited" },
    ];

    milestones.forEach((m) => {
      if (m.check && !profile.claimedMilestones.includes(m.id)) {
        profile.claimedMilestones.push(m.id);
        addCoins(m.amount, m.desc);
      }
    });
  }

  function awardSessionCoins(session, isNewPB) {
    addCoins(10, "Session completed");
    if (session.laps.length >= 5) addCoins(5, "5+ laps bonus");
    if (isNewPB) addCoins(25, "New personal best!");
    checkAndAwardCoins(sessions);
  }

  // ── Shop Rendering ──────────────────────────────────────
  function renderShop() {
    updateCoinDisplay();
    renderShopCategory("avatars", "#shop-avatars");
    renderShopCategory("borders", "#shop-borders");
    renderShopCategory("titles", "#shop-titles");
    renderEarnList();
  }

  function renderShopCategory(category, containerSel) {
    const container = $q(containerSel);
    if (!container) return;
    const items = SHOP_ITEMS[category];
    container.innerHTML = items.map((item) => {
      const owned = profile.owned[category].includes(item.id);
      const equipped = profile.equipped[category === "avatars" ? "avatar" : category === "borders" ? "border" : "title"] === item.id;
      let previewHtml = "";
      if (category === "avatars") {
        const letter = (currentUser?.displayName || currentUser?.username || "?").charAt(0).toUpperCase();
        previewHtml = `<div class="avatar-preview-circle" style="background:${item.bg};color:${item.color}">${item.preview || letter}</div>`;
      } else if (category === "borders") {
        const letter = (currentUser?.displayName || currentUser?.username || "?").charAt(0).toUpperCase();
        let borderStyle = item.style;
        let extra = item.shadow ? `box-shadow:${item.shadow};` : "";
        if (item.gradient) {
          borderStyle = "3px solid transparent";
          extra += "background:linear-gradient(var(--bg-card),var(--bg-card)) padding-box,linear-gradient(135deg,#f13333,#1789ff,#f1b900,#1e9944) border-box;";
        }
        previewHtml = `<div class="border-preview-circle" style="border:${borderStyle};${extra}">${letter}</div>`;
      } else {
        previewHtml = `<div style="font-size:0.88rem;color:var(--red);font-weight:700;min-height:40px;display:flex;align-items:center;justify-content:center;">${item.text || "—"}</div>`;
      }

      let statusHtml = "";
      if (equipped) statusHtml = `<span class="shop-item-status equipped-label">Equipped</span>`;
      else if (owned) statusHtml = `<span class="shop-item-status owned-label">Owned</span>`;
      else statusHtml = `<span class="shop-item-price${item.price === 0 ? " free" : ""}">${item.price === 0 ? "Free" : item.price}</span>`;

      return `<div class="shop-item${owned ? " owned" : ""}${equipped ? " equipped" : ""}" data-category="${category}" data-id="${item.id}">
        ${previewHtml}
        <div class="shop-item-name">${item.name}</div>
        ${statusHtml}
      </div>`;
    }).join("");

    container.querySelectorAll(".shop-item").forEach((el) => {
      el.addEventListener("click", () => handleShopClick(el.dataset.category, el.dataset.id));
    });
  }

  async function handleShopClick(category, id) {
    const items = SHOP_ITEMS[category];
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const eqKey = category === "avatars" ? "avatar" : category === "borders" ? "border" : "title";
    const owned = profile.owned[category].includes(id);

    if (owned) {
      profile.equipped[eqKey] = id;
      saveProfile(profile);
      renderShop();
      renderProfileView();
      updateUserUI();
      showToast(`${item.name} equipped!`, "success");
    } else {
      if (profile.coins < item.price) {
        showToast(`Not enough coins! Need ${item.price}, have ${profile.coins}.`, "error");
        return;
      }
      if (item.price > 0) {
        const ok = await showModal("Buy Item", `Buy "${item.name}" for ${item.price} coins?`);
        if (!ok) return;
      }
      profile.coins -= item.price;
      profile.owned[category].push(id);
      profile.equipped[eqKey] = id;
      saveProfile(profile);
      renderShop();
      renderProfileView();
      updateCoinDisplay();
      updateUserUI();
      showToast(`Purchased ${item.name}!`, "success");
    }
  }

  function renderEarnList() {
    const el = $q("#earn-list");
    if (!el) return;
    el.innerHTML = COIN_REWARDS.map((r) =>
      `<div class="earn-item">
        <span class="earn-desc">${r.desc}</span>
        <span class="earn-amount">+${r.amount}</span>
      </div>`
    ).join("");
  }

  // ── Profile Rendering ───────────────────────────────────
  function renderProfileView() {
    const preview = $q("#profile-preview");
    if (!preview) return;
    const name = currentUser?.displayName || currentUser?.username || "Guest";
    const letter = name.charAt(0).toUpperCase();
    const avatarItem = SHOP_ITEMS.avatars.find((a) => a.id === profile.equipped.avatar) || SHOP_ITEMS.avatars[0];
    const borderItem = SHOP_ITEMS.borders.find((b) => b.id === profile.equipped.border) || SHOP_ITEMS.borders[0];
    const titleItem = SHOP_ITEMS.titles.find((t) => t.id === profile.equipped.title) || SHOP_ITEMS.titles[0];

    let borderStyle = borderItem.style;
    let extraStyle = borderItem.shadow ? `box-shadow:${borderItem.shadow};` : "";
    if (borderItem.gradient) {
      borderStyle = "3px solid transparent";
      extraStyle += "background:linear-gradient(var(--bg-card),var(--bg-card)) padding-box,linear-gradient(135deg,#f13333,#1789ff,#f1b900,#1e9944) border-box;";
    }

    preview.innerHTML = `
      <div class="profile-avatar-large" style="background:${avatarItem.bg};color:${avatarItem.color};border:${borderStyle};${extraStyle}">
        ${avatarItem.preview || letter}
      </div>
      <div class="profile-name">${escapeHtml(name)}</div>
      ${titleItem.text ? `<div class="profile-title-text">${titleItem.text}</div>` : ""}
      <div class="profile-coins-display">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" font-weight="bold" fill="#0c0f19">$</text></svg>
        ${profile.coins} coins
      </div>`;

    renderEquipSection("avatars", "avatar", "#equip-avatars");
    renderEquipSection("borders", "border", "#equip-borders");
    renderEquipSection("titles", "title", "#equip-titles");
  }

  function renderEquipSection(category, eqKey, containerSel) {
    const container = $q(containerSel);
    if (!container) return;
    const owned = profile.owned[category];
    const items = SHOP_ITEMS[category].filter((i) => owned.includes(i.id));
    container.innerHTML = items.map((item) => {
      const active = profile.equipped[eqKey] === item.id;
      let icon = "";
      if (category === "avatars") icon = item.preview || "●";
      else if (category === "borders") icon = "◯";
      else icon = item.text || "—";
      return `<div class="equip-chip${active ? " active" : ""}" data-category="${category}" data-id="${item.id}">
        <span class="chip-icon">${icon}</span>
        ${item.name}
      </div>`;
    }).join("");

    container.querySelectorAll(".equip-chip").forEach((el) => {
      el.addEventListener("click", () => {
        profile.equipped[eqKey] = el.dataset.id;
        saveProfile(profile);
        renderProfileView();
        renderShop();
        updateUserUI();
      });
    });
  }

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
    tracks: "Tracks",
    shop: "Shop",
    profile: "Profile",
  };

  // ── K1 Speed Locations ──────────────────────────────────
  const K1_LOCATIONS = {
    usa: [
      { state: "Alabama", locations: [{ name: "Birmingham", url: "https://www.k1speed.com/birmingham-location.html" }] },
      { state: "Arizona", locations: [{ name: "Phoenix", url: "https://www.k1speed.com/phoenix-location.html" }] },
      { state: "Arkansas", locations: [{ name: "Rogers", url: "https://www.k1speed.com/rogers-location.html" }] },
      { state: "California", locations: [
        { name: "Anaheim", url: "https://www.k1speed.com/anaheim-location.html" },
        { name: "Burbank", url: "https://www.k1speed.com/burbank-location.html" },
        { name: "Carlsbad", url: "https://www.k1speed.com/carlsbad-location.html" },
        { name: "Chula Vista", url: "https://www.k1speed.com/chula-vista-location.html" },
        { name: "Clovis", url: "https://www.k1speed.com/clovis-location.html" },
        { name: "Corona", url: "https://www.k1speed.com/corona-location.html" },
        { name: "Culver City", url: "https://www.k1speed.com/culver-city-location.html", badge: "open" },
        { name: "Dublin", url: "https://www.k1speed.com/dublin-location.html" },
        { name: "Irvine", url: "https://www.k1speed.com/irvine-location.html" },
        { name: "Ontario", url: "https://www.k1speed.com/ontario-location.html" },
        { name: "Sacramento", url: "https://www.k1speed.com/sacramento-location.html" },
        { name: "San Diego", url: "https://www.k1speed.com/san-diego-location.html" },
        { name: "S. San Francisco", url: "https://www.k1speed.com/san-francisco-location.html" },
        { name: "Santa Clara", url: "https://www.k1speed.com/santa-clara-location.html" },
        { name: "Thousand Oaks", url: "https://www.k1speed.com/thousand-oaks-location.html" },
        { name: "Torrance", url: "https://www.k1speed.com/torrance-location.html" },
        { name: "Winchester (K1 Circuit)", url: "http://www.k1circuit.com/winchester/" },
      ]},
      { state: "Colorado", locations: [
        { name: "Denver – Littleton", url: "https://www.k1speed.com/denver-location.html" },
        { name: "Denver – Thornton", url: "https://www.k1speed.com/thornton-location.html", badge: "coming-soon" },
      ]},
      { state: "Florida", locations: [
        { name: "Daytona Beach", url: "https://www.k1speed.com/daytona-location.html" },
        { name: "Fort Lauderdale", url: "https://www.k1speed.com/fort-lauderdale-location.html" },
        { name: "Jacksonville", url: "https://www.k1speed.com/jacksonville-location.html" },
        { name: "Miami – Medley", url: "https://www.k1speed.com/miami-location.html" },
        { name: "Orlando", url: "https://www.k1speed.com/orlando-location.html" },
        { name: "Riviera Beach", url: "https://www.k1speed.com/west-palm-beach-location.html" },
        { name: "Tampa Bay", url: "https://www.k1speed.com/tampa-bay-location.html" },
      ]},
      { state: "Georgia", locations: [
        { name: "Atlanta – Duluth", url: "https://www.k1speed.com/atlanta-location.html" },
        { name: "Atlanta – Buckhead", url: "https://www.k1speed.com/buckhead-location.html", badge: "coming-soon" },
      ]},
      { state: "Idaho", locations: [{ name: "Boise – Meridian", url: "https://www.k1speed.com/boise-location.html" }] },
      { state: "Illinois", locations: [
        { name: "Addison", url: "https://www.k1speed.com/addison-location.html" },
        { name: "Buffalo Grove", url: "https://www.k1speed.com/buffalo-grove-location.html" },
        { name: "Mokena", url: "https://www.k1speed.com/mokena-location.html" },
      ]},
      { state: "Indiana", locations: [
        { name: "Indianapolis – Fishers", url: "https://www.k1speed.com/indianapolis-location.html" },
        { name: "Whiteland (K1 Circuit)", url: "https://www.k1circuit.com/whiteland" },
      ]},
      { state: "Iowa", locations: [{ name: "Des Moines", url: "https://www.k1speed.com/des-moines-location.html" }] },
      { state: "Kansas", locations: [{ name: "Kansas City", url: "https://www.k1speed.com/kansas-city-location.html", badge: "coming-soon" }] },
      { state: "Kentucky", locations: [{ name: "Louisville", badge: "planning" }] },
      { state: "Louisiana", locations: [{ name: "New Orleans", url: "https://www.k1speed.com/new-orleans-location.html" }] },
      { state: "Maryland", locations: [{ name: "Jessup", url: "https://www.k1speed.com/jessup-location.html" }] },
      { state: "Massachusetts", locations: [{ name: "Boston – Wilmington", url: "https://www.k1speed.com/boston-location.html" }] },
      { state: "Michigan", locations: [
        { name: "Oxford", url: "https://www.k1speed.com/oxford-location.html" },
        { name: "Traverse City", url: "https://www.k1speed.com/traverse-city-location.html" },
      ]},
      { state: "Missouri", locations: [{ name: "Lee's Summit", url: "https://www.k1speed.com/lees-summit-location.html" }] },
      { state: "Nevada", locations: [{ name: "Las Vegas", url: "https://www.k1speed.com/las-vegas-location.html" }] },
      { state: "New Jersey", locations: [
        { name: "Cinnaminson", url: "https://www.k1speed.com/cinnaminson-location.html" },
        { name: "Totowa", url: "https://www.k1speed.com/totowa-location.html", badge: "open" },
      ]},
      { state: "New York", locations: [
        { name: "Mount Kisco", url: "https://www.k1speed.com/mount-kisco-location.html" },
        { name: "West Nyack", url: "https://www.k1speed.com/west-nyack-location.html" },
      ]},
      { state: "North Carolina", locations: [{ name: "Concord", url: "https://www.k1speed.com/concord-location.html" }] },
      { state: "Ohio", locations: [
        { name: "Canton", url: "https://www.k1speed.com/canton-location.html" },
        { name: "Cleveland – Avon", url: "https://www.k1speed.com/cleveland-location.html", badge: "coming-soon" },
        { name: "Columbus", url: "https://www.k1speed.com/columbus-location.html" },
      ]},
      { state: "Oregon", locations: [
        { name: "Bend", url: "https://www.k1speed.com/bend-location.html" },
        { name: "Portland – Hillsboro", url: "https://www.k1speed.com/portland-location.html" },
      ]},
      { state: "Pennsylvania", locations: [
        { name: "Harrisburg", url: "https://www.k1speed.com/harrisburg-location.html" },
        { name: "Horsham", url: "https://www.k1speed.com/horsham-location.html" },
      ]},
      { state: "South Carolina", locations: [
        { name: "Charleston", url: "https://www.k1speed.com/charleston-location.html", badge: "coming-soon" },
        { name: "Myrtle Beach", url: "https://www.k1speed.com/myrtle-beach-location.html" },
      ]},
      { state: "Tennessee", locations: [
        { name: "Knoxville", url: "https://www.k1speed.com/knoxville-location.html" },
        { name: "Memphis", url: "https://www.k1speed.com/memphis-location.html" },
        { name: "Nashville", url: "https://www.k1speed.com/nashville-location.html" },
      ]},
      { state: "Texas", locations: [
        { name: "Arlington", url: "https://www.k1speed.com/arlington-location.html" },
        { name: "Austin", url: "https://www.k1speed.com/austin-location.html" },
        { name: "Dallas – Richardson", url: "https://www.k1speed.com/dallas-location.html" },
        { name: "Houston", url: "https://www.k1speed.com/houston-location.html" },
        { name: "San Antonio", url: "https://www.k1speed.com/san-antonio-location.html" },
        { name: "The Woodlands – Conroe", url: "https://www.k1speed.com/the-woodlands-location.html" },
      ]},
      { state: "Utah", locations: [{ name: "Salt Lake City – Sandy", url: "https://www.k1speed.com/salt-lake-city-location.html" }] },
      { state: "Virginia", locations: [
        { name: "Dulles", url: "https://www.k1speed.com/dulles-location.html" },
        { name: "Manassas", url: "https://www.k1speed.com/manassas-location.html" },
        { name: "Richmond", url: "https://www.k1speed.com/richmond-location.html" },
      ]},
      { state: "Washington", locations: [
        { name: "Seattle – Redmond", url: "https://www.k1speed.com/seattle-location.html" },
        { name: "Seattle – Tukwila", url: "https://www.k1speed.com/tukwila-location.html" },
      ]},
      { state: "Wisconsin", locations: [{ name: "Milwaukee – Waukesha", url: "https://www.k1speed.com/milwaukee-location.html" }] },
    ],
    international: [
      { state: "Canada", locations: [
        { name: "Cambridge", url: "https://www.k1speed.ca/cambridge.html" },
        { name: "Mississauga", url: "https://www.k1speed.ca/mississauga-location.html" },
        { name: "St. Catharines", url: "https://www.k1speed.ca/location/stcatharines/" },
        { name: "Toronto", url: "https://www.k1speed.ca/toronto-location.html" },
      ]},
      { state: "China", locations: [
        { name: "Shenzhen", url: "https://www.k1speed.com/shenzhen-location.html" },
        { name: "Guangzhou" },
      ]},
      { state: "England", locations: [
        { name: "Canary Wharf – London", url: "https://www.k1speed.com/uk/canary-wharf.html" },
        { name: "Vauxhall – London", badge: "planning" },
      ]},
      { state: "France", locations: [
        { name: "Caen", url: "https://www.k1speed.com/fr/caen.html" },
        { name: "Le Mans", url: "https://www.k1speed.com/fr/le-mans.html" },
        { name: "Paris", badge: "coming-soon" },
      ]},
      { state: "Italy", locations: [
        { name: "Catania", url: "https://www.k1speed.com/it/catania.html", badge: "open" },
        { name: "Erba", url: "https://www.k1speed.com/it/erba.html" },
        { name: "Marcianise", url: "https://www.k1speed.com/it/napoli-marcianise.html" },
        { name: "Meda / Monza", url: "https://www.k1speed.com/it/meda.html" },
        { name: "Milan", url: "https://www.k1speed.com/it/milano-bicocca.html" },
        { name: "Roma", url: "https://hollywoodkart.it/porta-di-roma/", badge: "coming-soon" },
        { name: "Turin", url: "https://www.k1speed.com/it/torino.html" },
        { name: "Udine", url: "http://k1speed.com/it/udine.html", badge: "open" },
      ]},
      { state: "Mexico", locations: [
        { name: "ARTZ Pedregal", url: "https://www.k1speed.mx/artz.html", badge: "open" },
        { name: "Coapa", url: "https://www.k1speed.mx/coapa.html" },
        { name: "Garden Santa Fe", url: "https://www.k1speed.mx/santa-fe-centro.html" },
        { name: "Manacar", url: "https://www.k1speed.mx/manacar-centro.html" },
        { name: "Queretaro", url: "https://www.k1speed.mx/queretaro-uptown.html" },
      ]},
      { state: "Puerto Rico", locations: [
        { name: "Caguas", url: "https://www.k1speed.com/caguas-location.html" },
        { name: "Canovanas", url: "https://www.k1speed.com/canovanas-location.html" },
      ]},
      { state: "Scotland", locations: [{ name: "Glasgow", url: "https://www.k1speed.com/uk/glasgow.html", badge: "planning" }] },
      { state: "South Korea", locations: [{ name: "Vivaldi Park" }] },
    ],
  };

  let tracksRegion = "usa";

  function renderTracks() {
    const search = ($("#search-tracks")?.value || "").toLowerCase();
    const data = K1_LOCATIONS[tracksRegion] || [];

    const filtered = data.map((group) => {
      const locs = group.locations.filter((l) =>
        l.name.toLowerCase().includes(search) || group.state.toLowerCase().includes(search)
      );
      return { ...group, locations: locs };
    }).filter((g) => g.locations.length > 0);

    const container = $("#tracks-list");
    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state"><p>No locations match your search.</p></div>';
      return;
    }

    container.innerHTML = filtered.map((group) => {
      const locsHtml = group.locations.map((loc) => {
        const badgeHtml = loc.badge === "open" ? '<span class="track-loc-badge open">Now Open</span>'
          : loc.badge === "coming-soon" ? '<span class="track-loc-badge coming-soon">Coming Soon</span>'
          : loc.badge === "planning" ? '<span class="track-loc-badge planning">Planning</span>' : "";
        const tag = loc.url ? "a" : "div";
        const href = loc.url ? ` href="${loc.url}" target="_blank" rel="noopener"` : "";
        return `<${tag} class="track-location"${href}>
          <svg class="track-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <div class="track-loc-info">
            <span class="track-loc-name">${escapeHtml(loc.name)}</span>
            <span class="track-loc-sub">${escapeHtml(group.state)}</span>
          </div>
          ${badgeHtml}
        </${tag}>`;
      }).join("");

      return `<div class="track-region-group">
        <div class="track-region-header">
          ${escapeHtml(group.state)}
          <span class="region-count">${group.locations.length}</span>
        </div>
        <div class="track-location-list">${locsHtml}</div>
      </div>`;
    }).join("");
  }

  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".track-tab");
    if (tab) {
      $$(".track-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      tracksRegion = tab.dataset.region;
      renderTracks();
    }
  });

  const searchTracksEl = $("#search-tracks");
  if (searchTracksEl) searchTracksEl.addEventListener("input", renderTracks);

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
    if (name === "tracks") renderTracks();
    if (name === "shop") renderShop();
    if (name === "profile") renderProfileView();
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
        { label: "Best Lap", data: sorted.map((s) => bestLap(s.laps)), color: "#f13333" },
        { label: "Avg Lap", data: sorted.map((s) => avgLap(s.laps)), color: "#1789ff" },
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
    const prevBest = bestLap(sessions.flatMap((s) => s.laps));
    sessions.push(session);
    saveSessions(sessions);

    const newBest = bestLap(sessions.flatMap((s) => s.laps));
    const isNewPB = prevBest === null || (newBest !== null && newBest < prevBest);
    awardSessionCoins(session, isNewPB);

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

  // ── Camera & Photo Scan (OCR) ────────────────────────────
  let scannedTimes = [];
  let cameraStream = null;
  let facingMode = "environment";

  const cameraWrapper = $("#camera-wrapper");
  const scanCaptured = $("#scan-captured");
  const cameraVideo = $("#camera-video");
  const cameraCanvas = $("#camera-canvas");
  const scanFileInput = $("#scan-file-input");

  async function startCamera() {
    stopCamera();
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play();
    } catch (err) {
      showToast("Camera not available. Use the gallery button.", "error");
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    cameraVideo.srcObject = null;
  }

  function resetScan() {
    scannedTimes = [];
    scanCaptured.classList.add("hidden");
    cameraWrapper.classList.remove("hidden");
    $("#scan-progress").style.display = "none";
    $("#scan-results").style.display = "none";
    $("#scan-save-session").disabled = true;
    $("#scan-date").value = new Date().toISOString().split("T")[0];
    startCamera();
  }

  function capturePhoto() {
    const vw = cameraVideo.videoWidth;
    const vh = cameraVideo.videoHeight;
    if (!vw || !vh) { showToast("Camera not ready yet.", "error"); return null; }
    cameraCanvas.width = vw;
    cameraCanvas.height = vh;
    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraVideo, 0, 0, vw, vh);
    return new Promise((resolve) => {
      cameraCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });
  }

  // Shutter button — take photo
  $("#camera-shutter").addEventListener("click", async () => {
    const blob = await capturePhoto();
    if (!blob) return;
    stopCamera();
    cameraWrapper.classList.add("hidden");
    scanCaptured.classList.remove("hidden");
    processImage(blob);
  });

  // Gallery button — pick from photos
  $("#camera-gallery-btn").addEventListener("click", () => scanFileInput.click());

  scanFileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      stopCamera();
      cameraWrapper.classList.add("hidden");
      scanCaptured.classList.remove("hidden");
      processImage(e.target.files[0]);
    }
    e.target.value = "";
  });

  // Flip camera
  $("#camera-flip-btn").addEventListener("click", () => {
    facingMode = facingMode === "environment" ? "user" : "environment";
    startCamera();
  });

  // Retake
  $("#scan-retake").addEventListener("click", () => {
    resetScan();
  });

  // Stop camera when leaving the scan view
  const origSwitchView = switchView;
  switchView = function (name) {
    if (name !== "scan") stopCamera();
    origSwitchView(name);
  };

  async function processImage(blobOrFile) {
    const previewImg = $("#scan-preview-img");
    previewImg.src = URL.createObjectURL(blobOrFile);

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

      const { data: { text } } = await worker.recognize(blobOrFile);
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
        progressText.textContent = "No times found — retake or try a clearer image.";
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
    const prevBest = bestLap(sessions.flatMap((s) => s.laps));
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
    const newBest = bestLap(sessions.flatMap((s) => s.laps));
    const isNewPB = prevBest === null || (newBest !== null && newBest < prevBest);
    awardSessionCoins(session, isNewPB);
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
      datasets: [{ label: "Lap Time", data: session.laps, color: "#f13333" }],
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
        { label: "Best Lap", data: sorted.map((s) => bestLap(s.laps)), color: "#f13333" },
        { label: "Average", data: sorted.map((s) => avgLap(s.laps)), color: "#1789ff" },
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
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = pad.top + (chartH / 5) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
        const val = maxVal - ((maxVal - minVal) / 5) * i;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
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
      ctx.fillStyle = "rgba(0,0,0,0.35)";
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
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
        });
      });

      // Legend
      if (datasets.length > 1) {
        let lx = pad.left;
        datasets.forEach((ds) => {
          ctx.fillStyle = ds.color;
          ctx.beginPath(); ctx.arc(lx + 6, 14, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.font = "12px 'Inter', sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(ds.label, lx + 16, 18);
          lx += ctx.measureText(ds.label).width + 36;
        });
      }
    }
  }

  // ── Init ────────────────────────────────────────────────
  if (currentUser) {
    enterApp();
  } else {
    authScreen.classList.remove("hidden");
    appEl.classList.add("hidden");
  }
})();
