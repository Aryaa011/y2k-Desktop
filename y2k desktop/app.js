(function () {
  "use strict";

  const DESKTOP_PAD_BOTTOM = 48;

  const songs = [
    { name: "Sample Track 1", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { name: "Sample Track 2", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  ];

  const CHAOS_MESSAGES = [
    { title: "System Warning", text: "An unidentified error wants to be friends.", icon: "⚠" },
    { title: "Error detected", text: "Memory corrupted with good vibes only.", icon: "✖" },
    { title: "Critical Update", text: "Installing nostalgia… 327% complete.", icon: "↓" },
    { title: "Security Alert", text: "Your desktop is too aesthetic. Proceed anyway?", icon: "🔒" },
    { title: "System Warning", text: "The year 2000 called. It wants its pixels back.", icon: "📞" },
  ];

  let audioCtx = null;
  let zTop = 100;
  let chaosTimer = null;
  let chaosMode = false;
  const windowsByType = new Map();
  const windowCleanups = new Map();

  const els = {
    windowsRoot: document.getElementById("windows-root"),
    taskbarTabs: document.getElementById("taskbar-tabs"),
    btnStart: document.getElementById("btn-start"),
    startMenu: document.getElementById("start-menu"),
    submenuPrograms: document.getElementById("submenu-programs"),
    popupLayer: document.getElementById("popup-layer"),
    chaosLayer: document.getElementById("chaos-layer"),
    clock: document.getElementById("clock"),
  };

  let songIndex = 0;
  let musicUiRoot = null;
  let audioHooksInstalled = false;

  function getAudioPlayer() {
    return document.getElementById("audioPlayer");
  }

  function loadSong(index) {
    const audio = getAudioPlayer();
    if (!audio || !songs.length) return;
    songIndex = (index + songs.length) % songs.length;
    audio.src = songs[songIndex].src;
    audio.load();
    syncMusicUiLabels();
  }

  function playSong() {
    const audio = getAudioPlayer();
    return audio ? audio.play().catch(() => {}) : Promise.resolve();
  }

  function pauseSong() {
    const audio = getAudioPlayer();
    if (audio) audio.pause();
  }

  function nextSong() {
    loadSong(songIndex + 1);
    return playSong();
  }

  function prevSong() {
    loadSong(songIndex - 1);
    return playSong();
  }

  function formatMusicTime(t) {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function syncMusicUiLabels() {
    if (!musicUiRoot) return;
    const audio = getAudioPlayer();
    const nameEl = musicUiRoot.querySelector("[data-mp-name]");
    const playBtn = musicUiRoot.querySelector("[data-mp-play]");
    const pauseBtn = musicUiRoot.querySelector("[data-mp-pause]");
    if (nameEl) nameEl.textContent = songs[songIndex] ? songs[songIndex].name : "—";
    const playing = audio && !audio.paused;
    if (playBtn) playBtn.disabled = playing;
    if (pauseBtn) pauseBtn.disabled = !playing;
  }

  function installAudioHooksOnce() {
    if (audioHooksInstalled) return;
    const audio = getAudioPlayer();
    if (!audio) return;
    audioHooksInstalled = true;

    audio.addEventListener("timeupdate", () => {
      if (!musicUiRoot || !audio.duration) return;
      const seek = musicUiRoot.querySelector("[data-mp-seek]");
      const cur = musicUiRoot.querySelector("[data-mp-cur]");
      if (seek) seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      if (cur) cur.textContent = formatMusicTime(audio.currentTime);
    });

    audio.addEventListener("loadedmetadata", () => {
      if (!musicUiRoot) return;
      const dur = musicUiRoot.querySelector("[data-mp-dur]");
      if (dur) dur.textContent = formatMusicTime(audio.duration);
    });

    audio.addEventListener("play", syncMusicUiLabels);
    audio.addEventListener("pause", syncMusicUiLabels);
    audio.addEventListener("ended", () => {
      loadSong(songIndex + 1);
      playSong();
    });
  }

  function getAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playClickSound() {
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 1400;
      g.gain.setValueAtTime(0.055, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.05);
    } catch (_) {}
  }

  function playStartupSound() {
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = freq;
        const t = ctx.currentTime + i * 0.07;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.4);
      });
    } catch (_) {}
  }

  let startupPlayed = false;
  function tryStartupSound() {
    if (startupPlayed) return;
    startupPlayed = true;
    playStartupSound();
  }

  document.addEventListener(
    "pointerdown",
    () => {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();
    },
    { passive: true }
  );

  function bringToFront(winEl) {
    zTop += 1;
    winEl.style.zIndex = String(zTop);
    syncTabActive(winEl.dataset.winType);
  }

  function syncTabActive(activeType) {
    els.taskbarTabs.querySelectorAll(".taskbar__tab").forEach((tab) => {
      tab.classList.toggle("taskbar__tab--active", tab.dataset.winType === activeType);
    });
  }

  function updateClock() {
    const now = new Date();
    els.clock.textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    els.clock.setAttribute("datetime", now.toISOString());
  }
  setInterval(updateClock, 1000);
  updateClock();

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function showMsgbox(title, message, icon, buttons) {
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.className = "msgbox";
      wrap.setAttribute("role", "dialog");
      wrap.innerHTML = `
        <div class="msgbox__title">${escapeHtml(title)}</div>
        <div class="msgbox__body">
          <span class="msgbox__icon" aria-hidden="true">${icon}</span>
          <p class="msgbox__text">${message}</p>
        </div>
        <div class="msgbox__actions"></div>`;
      const actions = wrap.querySelector(".msgbox__actions");
      buttons.forEach((b) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "msgbox__btn";
        btn.textContent = b.label;
        btn.addEventListener("click", () => {
          playClickSound();
          wrap.remove();
          if (!els.popupLayer.children.length) els.popupLayer.replaceChildren();
          resolve(b.value);
        });
        actions.appendChild(btn);
      });
      els.popupLayer.appendChild(wrap);
    });
  }

  function spawnFloatingPopup() {
    const pick = CHAOS_MESSAGES[Math.floor(Math.random() * CHAOS_MESSAGES.length)];
    const wrap = document.createElement("div");
    wrap.className = "msgbox msgbox--floating";
    const x = 8 + Math.random() * (window.innerWidth - 300);
    const y = 8 + Math.random() * (window.innerHeight - DESKTOP_PAD_BOTTOM - 200);
    wrap.style.left = `${x}px`;
    wrap.style.top = `${y}px`;
    wrap.style.zIndex = String(14000 + Math.floor(Math.random() * 500));
    wrap.innerHTML = `
      <div class="msgbox__title">${escapeHtml(pick.title)}</div>
      <div class="msgbox__body">
        <span class="msgbox__icon" aria-hidden="true">${pick.icon}</span>
        <p class="msgbox__text">${escapeHtml(pick.text)}</p>
      </div>
      <div class="msgbox__actions">
        <button type="button" class="msgbox__btn" data-chaos-ok>OK</button>
      </div>`;
    wrap.querySelector("[data-chaos-ok]").addEventListener("click", () => {
      playClickSound();
      wrap.remove();
    });
    els.chaosLayer.appendChild(wrap);
  }

  function chaosBurst(count) {
    const n = count || 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) spawnFloatingPopup();
  }

  function setChaosMode(on) {
    chaosMode = on;
    const btn = document.getElementById("btn-chaos-toggle");
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (chaosTimer) {
      clearInterval(chaosTimer);
      chaosTimer = null;
    }
    if (on) {
      chaosTimer = setInterval(() => {
        if (Math.random() < 0.55) spawnFloatingPopup();
      }, 3200);
    }
  }

  document.getElementById("btn-chaos").addEventListener("click", () => {
    playClickSound();
    chaosBurst();
  });

  document.getElementById("btn-chaos-toggle").addEventListener("click", () => {
    playClickSound();
    setChaosMode(!chaosMode);
  });

  /** Close button: delegated — .close-btn hides parent .window */
  els.windowsRoot.addEventListener("click", (e) => {
    const btn = e.target.closest(".close-btn");
    if (!btn) return;
    const win = btn.closest(".window");
    if (!win || !els.windowsRoot.contains(win)) return;
    e.preventDefault();
    e.stopPropagation();
    const type = win.dataset.winType;
    if (type) closeWindow(type);
  });

  const titles = {
    computer: "My Computer",
    documents: "My Documents",
    music: "Song — Music Player",
    camera: "Webcam Studio",
    recycle: "Recycle Bin",
    about: "About AryaOS",
    internet: "Internet Explorer",
    paint: "untitled - Paint",
    solitaire: "Solitaire",
  };

  function clampWindowPosition(winEl) {
    const maxLeft = window.innerWidth - 80;
    const maxTop = window.innerHeight - DESKTOP_PAD_BOTTOM - 40;
    let left = parseFloat(winEl.style.left) || 0;
    let top = parseFloat(winEl.style.top) || 0;
    winEl.style.left = `${Math.max(0, Math.min(left, maxLeft))}px`;
    winEl.style.top = `${Math.max(0, Math.min(top, maxTop))}px`;
  }

  function defaultSize(type) {
    const map = {
      internet: [440, 320],
      paint: [580, 460],
      solitaire: [720, 520],
      camera: [400, 460],
      music: [420, 420],
    };
    return map[type] || [360, 280];
  }

  function buildWindowContent(type) {
    switch (type) {
      case "music":
        return buildMusicContent();
      case "camera":
        return buildCameraContent();
      case "paint":
        return buildPaintContent();
      case "solitaire":
        return buildSolitaireContent();
      case "about":
        return buildAboutContent();
      case "internet":
        return buildInternetContent();
      case "computer":
        return buildExplorer(`<ul class="explorer-list">
          <li>Local Disk (C:)</li><li>CD Drive (D:)</li><li>Shared Documents</li><li>My Network Places</li>
        </ul>`);
      case "documents":
        return buildExplorer(`<ul class="explorer-list">
          <li>Resume_1999.doc</li><li>vacation.bmp</li><li>readme.txt</li><li>mixtape.wma</li>
        </ul>`);
      case "recycle": {
        const d = document.createElement("div");
        d.className = "window__body--padded";
        d.innerHTML = `<p>The Recycle Bin is empty.</p><p style="font-size:11px;color:#555;">Deleted items would appear here.</p>`;
        return d;
      }
      default:
        return document.createElement("div");
    }
  }

  function buildExplorer(html) {
    const d = document.createElement("div");
    d.className = "window__body--padded window__body--tan";
    d.innerHTML = html;
    return d;
  }

  function buildAboutContent() {
    const d = document.createElement("div");
    d.className = "about-panel window__body--padded";
    d.innerHTML = `
      <p><strong>Welcome to AryaOS</strong></p>
      <p>A retro Windows XP–style desktop in the browser.</p>
      <div class="sys-line">
        Microsoft Windows XP Home Edition (simulated)<br>
        Version 5.1 — Build 2600<br>
        Computer: Virtual Pentium III<br>
        Memory: 128 MB RAM
      </div>`;
    return d;
  }

  function buildInternetContent() {
    const d = document.createElement("div");
    d.className = "window__body--padded";
    d.innerHTML = `
      <div class="browser-chrome"><span>Address</span>
        <input type="text" readonly value="http://www.arya.local/glitch.htm" /></div>
      <div class="browser-view browser-view--glitch">
        Connecting…<br><br>ERR_NOSTALGIA_OVERFLOW<br>▓▒░ SIGNAL LOST ░▒▓
      </div>`;
    return d;
  }

  function buildMusicContent() {
    const root = document.createElement("div");
    root.className = "music-player";
    root.setAttribute("data-music-panel", "true");
    root.innerHTML = `
      <div class="music-player__row">
        <div class="music-player__album" aria-hidden="true"></div>
        <div class="music-player__controls">
          <button type="button" class="music-player__btn" data-mp-prev title="Previous">|◀</button>
          <button type="button" class="music-player__btn music-player__btn--primary" data-mp-play title="Play">Play</button>
          <button type="button" class="music-player__btn" data-mp-pause title="Pause">Pause</button>
          <button type="button" class="music-player__btn" data-mp-next title="Next">▶|</button>
        </div>
      </div>
      <div class="music-player__track" data-mp-name>—</div>
      <div class="music-player__progress">
        <span class="music-player__time" data-mp-cur>0:00</span>
        <div class="music-player__bar-wrap">
          <input type="range" class="music-player__seek" data-mp-seek min="0" max="1000" value="0" />
        </div>
        <span class="music-player__time" data-mp-dur>0:00</span>
      </div>`;
    return root;
  }

  function initMusicWindow(winEl) {
    const root = winEl.querySelector("[data-music-panel]");
    if (!root) return;

    musicUiRoot = root;
    installAudioHooksOnce();

    root.querySelector("[data-mp-prev]").addEventListener("click", () => {
      playClickSound();
      prevSong();
    });

    root.querySelector("[data-mp-next]").addEventListener("click", () => {
      playClickSound();
      nextSong();
    });

    root.querySelector("[data-mp-play]").addEventListener("click", () => {
      playClickSound();
      playSong().then(syncMusicUiLabels);
    });

    root.querySelector("[data-mp-pause]").addEventListener("click", () => {
      playClickSound();
      pauseSong();
    });

    const seek = root.querySelector("[data-mp-seek]");
    seek.addEventListener("input", () => {
      const audio = getAudioPlayer();
      if (!audio || !audio.duration) return;
      audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    });

    loadSong(songIndex);
    syncMusicUiLabels();

    windowCleanups.set("music", () => {
      pauseSong();
      musicUiRoot = null;
    });
  }

  function buildCameraContent() {
    const d = document.createElement("div");
    d.className = "camera-wrap";
    d.innerHTML = `
      <video class="camera-preview" playsinline muted autoplay data-cam-video></video>
      <div class="camera-wrap__actions">
        <button type="button" class="camera-wrap__btn" data-cam-cap>Capture</button>
      </div>
      <div data-cam-snap></div>
      <div class="camera-error" data-cam-err hidden></div>`;
    return d;
  }

  function initCameraWindow(winEl) {
    const video = winEl.querySelector("[data-cam-video]");
    const errEl = winEl.querySelector("[data-cam-err]");
    const snapWrap = winEl.querySelector("[data-cam-snap]");
    let stream = null;

    errEl.hidden = true;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        video.srcObject = stream;
      })
      .catch(() => {
        errEl.hidden = false;
        errEl.textContent = "Camera unavailable. Allow permission or use HTTPS.";
      });

    winEl.querySelector("[data-cam-cap]").addEventListener("click", () => {
      playClickSound();
      if (!video.videoWidth) return;
      const c = document.createElement("canvas");
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext("2d").drawImage(video, 0, 0);
      snapWrap.replaceChildren();
      const img = document.createElement("img");
      img.className = "camera-capture-preview";
      img.src = c.toDataURL("image/png");
      img.alt = "Capture";
      snapWrap.appendChild(img);
    });

    windowCleanups.set("camera", () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    });
  }

  function buildPaintContent() {
    const d = document.createElement("div");
    d.className = "paint-app";
    d.innerHTML = `
      <div class="paint-menu"><span>File</span><span>Edit</span><span>Image</span><span>Help</span></div>
      <div class="paint-body">
        <div class="paint-tools">
          <button type="button" class="paint-tool paint-tool--active" data-tool="pen" title="Pencil">✎</button>
          <button type="button" class="paint-tool" data-tool="eraser" title="Eraser">⌫</button>
        </div>
        <div class="paint-canvas-wrap">
          <canvas class="paint-canvas" width="480" height="320"></canvas>
        </div>
      </div>
      <div class="paint-colors" data-palette></div>`;
    const pal = d.querySelector("[data-palette]");
    const colors = ["#000000", "#808080", "#800000", "#ff0000", "#ff8080", "#ffff00", "#00ff00", "#008080", "#0000ff", "#8000ff", "#ffffff"];
    colors.forEach((c, i) => {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "paint-swatch" + (i === 0 ? " paint-swatch--active" : "");
      sw.style.background = c;
      sw.dataset.color = c;
      pal.appendChild(sw);
    });
    return d;
  }

  function initPaintWindow(winEl) {
    const canvas = winEl.querySelector(".paint-canvas");
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let tool = "pen";
    let color = "#000000";
    let drawing = false;

    winEl.querySelectorAll(".paint-tool").forEach((b) => {
      b.addEventListener("click", () => {
        playClickSound();
        winEl.querySelectorAll(".paint-tool").forEach((x) => x.classList.remove("paint-tool--active"));
        b.classList.add("paint-tool--active");
        tool = b.dataset.tool;
      });
    });

    winEl.querySelectorAll(".paint-swatch").forEach((s) => {
      s.addEventListener("click", () => {
        playClickSound();
        winEl.querySelectorAll(".paint-swatch").forEach((x) => x.classList.remove("paint-swatch--active"));
        s.classList.add("paint-swatch--active");
        color = s.dataset.color;
      });
    });

    function pos(ev) {
      const r = canvas.getBoundingClientRect();
      const scaleX = canvas.width / r.width;
      const scaleY = canvas.height / r.height;
      return { x: (ev.clientX - r.left) * scaleX, y: (ev.clientY - r.top) * scaleY };
    }

    function startDraw(ev) {
      drawing = true;
      const p = pos(ev);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    function draw(ev) {
      if (!drawing) return;
      const p = pos(ev);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = tool === "eraser" ? 14 : 2;
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    function endDraw() {
      drawing = false;
      ctx.beginPath();
    }

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      startDraw(e);
    });
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", endDraw);
    canvas.addEventListener("pointercancel", endDraw);

    windowCleanups.set("paint", () => {});
  }

  /* ——— Simplified Klondike Solitaire ——— */
  const SUITS = ["♥", "♦", "♣", "♠"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  function cardColor(s) {
    return s <= 1 ? "red" : "black";
  }

  function buildSolitaireContent() {
    const d = document.createElement("div");
    d.className = "solitaire-app";
    d.innerHTML = `
      <div class="solitaire-toolbar">
        <button type="button" data-sol-restart>Restart</button>
      </div>
      <div class="solitaire-board" data-sol-board></div>`;
    return d;
  }

  function initSolitaireWindow(winEl) {
    const board = winEl.querySelector("[data-sol-board]");

    function makeDeck() {
      const d = [];
      for (let s = 0; s < 4; s++) {
        for (let r = 1; r <= 13; r++) d.push({ suit: s, rank: r, faceUp: false });
      }
      return d;
    }

    function shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    let state = null;
    let drag = null;
    let winShown = false;

    function newGame() {
      winShown = false;
      const deck = shuffle(makeDeck());
      const tab = [[], [], [], [], [], [], []];
      let idx = 0;
      for (let c = 0; c < 7; c++) {
        for (let r = 0; r <= c; r++) {
          const card = deck[idx++];
          card.faceUp = r === c;
          tab[c].push(card);
        }
      }
      state = {
        stock: deck.slice(idx),
        waste: [],
        foundations: [[], [], [], []],
        tableau: tab,
      };
      drag = null;
      render();
    }

    function top(arr) {
      return arr.length ? arr[arr.length - 1] : null;
    }

    function validSequence(cards) {
      for (let i = 0; i < cards.length - 1; i++) {
        if (cardColor(cards[i].suit) === cardColor(cards[i + 1].suit)) return false;
        if (cards[i + 1].rank !== cards[i].rank + 1) return false;
      }
      return true;
    }

    function canMoveToTableau(cards, destCol) {
      if (!cards.length) return false;
      const anchor = cards[cards.length - 1];
      if (destCol.length === 0) return anchor.rank === 13;
      const d = top(destCol);
      return cardColor(anchor.suit) !== cardColor(d.suit) && anchor.rank === d.rank - 1;
    }

    function canMoveToFoundation(card, fi) {
      const pile = state.foundations[fi];
      if (pile.length === 0) return card.rank === 1 && fi === card.suit;
      const t = top(pile);
      return card.suit === t.suit && card.rank === t.rank + 1;
    }

    function applyMove(from, to, count) {
      let moved;
      if (from.type === "waste") {
        moved = state.waste.splice(-1, 1);
      } else if (from.type === "tableau") {
        moved = state.tableau[from.ci].splice(-count, count);
        const col = state.tableau[from.ci];
        const t = top(col);
        if (t && !t.faceUp) t.faceUp = true;
      }
      if (to.type === "tableau") {
        state.tableau[to.ci].push(...moved);
      } else if (to.type === "foundation") {
        state.foundations[to.fi].push(...moved);
      }
    }

    function tryAutoFoundation(card, from) {
      for (let fi = 0; fi < 4; fi++) {
        if (canMoveToFoundation(card, fi)) {
          applyMove(from, { type: "foundation", fi }, 1);
          return true;
        }
      }
      return false;
    }

    function cardEl(card, showFace, interactive) {
      const el = document.createElement("div");
      el.className = "sol-card " + (showFace ? (cardColor(card.suit) === "red" ? "sol-card--red" : "sol-card--black") : "sol-card--back");
      if (showFace) {
        el.innerHTML = `<span>${RANKS[card.rank - 1]}${SUITS[card.suit]}</span>`;
      }
      if (interactive && showFace) el.style.cursor = "grab";
      return el;
    }

    function onTableauPointerDown(e, ci, idx) {
      if (!state.tableau[ci][idx].faceUp) return;
      const col = state.tableau[ci];
      const slice = col.slice(idx);
      if (!validSequence(slice)) return;
      e.preventDefault();
      playClickSound();
      drag = { from: { type: "tableau", ci }, count: slice.length, cards: slice.slice() };

      const ghost = document.createElement("div");
      ghost.className = "sol-card sol-card--dragging";
      ghost.style.position = "fixed";
      ghost.style.left = `${e.clientX - 24}px`;
      ghost.style.top = `${e.clientY - 33}px`;
      ghost.style.zIndex = "30000";
      ghost.innerHTML = slice.map((c) => `${RANKS[c.rank - 1]}${SUITS[c.suit]}`).join(" ");
      document.body.appendChild(ghost);

      function move(ev) {
        ghost.style.left = `${ev.clientX - 24}px`;
        ghost.style.top = `${ev.clientY - 33}px`;
      }

      function up(ev) {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        ghost.remove();
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const pile = el && el.closest(".solitaire-pile");
        if (pile && pile.dataset.col !== undefined) {
          const destCi = +pile.dataset.col;
          if (canMoveToTableau(drag.cards, state.tableau[destCi])) {
            applyMove(drag.from, { type: "tableau", ci: destCi }, drag.count);
            drag = null;
            render();
            return;
          }
        }
        const fnd = el && el.closest("[data-foundation]");
        if (fnd) {
          const fi = +fnd.dataset.foundation;
          const bottom = drag.cards[drag.cards.length - 1];
          if (drag.count === 1 && canMoveToFoundation(bottom, fi)) {
            applyMove(drag.from, { type: "foundation", fi }, 1);
            drag = null;
            render();
            return;
          }
        }
        drag = null;
        render();
      }

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up, { once: true });
    }

    function render() {
      board.replaceChildren();
      const rowF = document.createElement("div");
      rowF.className = "solitaire-row solitaire-row--found";
      const stockEl = document.createElement("div");
      stockEl.className = "solitaire-pile solitaire-pile--stock";
      stockEl.title = "Draw";
      if (state.stock.length) stockEl.appendChild(cardEl(state.stock[state.stock.length - 1], true, false));
      stockEl.addEventListener("click", () => {
        playClickSound();
        if (state.stock.length) {
          const c = state.stock.pop();
          c.faceUp = true;
          state.waste.push(c);
        } else if (state.waste.length) {
          while (state.waste.length) {
            const c = state.waste.pop();
            c.faceUp = false;
            state.stock.push(c);
          }
        }
        render();
      });
      rowF.appendChild(stockEl);
      const wasteEl = document.createElement("div");
      wasteEl.className = "solitaire-pile";
      if (state.waste.length) {
        const w = top(state.waste);
        const we = cardEl(w, true, true);
        we.addEventListener("dblclick", (e) => {
          e.preventDefault();
          if (tryAutoFoundation(w, { type: "waste" })) render();
        });
        wasteEl.appendChild(we);
      }
      rowF.appendChild(wasteEl);
      for (let fi = 0; fi < 4; fi++) {
        const p = document.createElement("div");
        p.className = "solitaire-pile";
        p.dataset.foundation = String(fi);
        const f = state.foundations[fi];
        if (f.length) p.appendChild(cardEl(top(f), true, true));
        rowF.appendChild(p);
      }
      board.appendChild(rowF);
      const rowT = document.createElement("div");
      rowT.className = "solitaire-row";
      for (let ci = 0; ci < 7; ci++) {
        const col = document.createElement("div");
        col.className = "solitaire-pile";
        col.dataset.col = String(ci);
        const arr = state.tableau[ci];
        arr.forEach((card, idx) => {
          const face = card.faceUp;
          const cel = cardEl(card, face, face);
          cel.style.top = `${4 + idx * 16}px`;
          if (face) cel.addEventListener("pointerdown", (e) => onTableauPointerDown(e, ci, idx));
          if (face) {
            cel.addEventListener("dblclick", (e) => {
              e.preventDefault();
              if (idx !== arr.length - 1) return;
              if (tryAutoFoundation(card, { type: "tableau", ci })) render();
            });
          }
          col.appendChild(cel);
        });
        rowT.appendChild(col);
      }
      board.appendChild(rowT);
      if (!winShown && state.foundations.every((f) => f.length === 13)) {
        winShown = true;
        showMsgbox("Solitaire", "You win! Well played.", "🂡", [{ label: "OK", value: true }]);
      }
    }

    winEl.querySelector("[data-sol-restart]").addEventListener("click", () => {
      playClickSound();
      newGame();
    });

    newGame();
    windowCleanups.set("solitaire", () => {});
  }

  function openOrFocusWindow(type) {
    playClickSound();
    tryStartupSound();
    if (windowsByType.has(type)) {
      const existing = windowsByType.get(type);
      if (existing.classList.contains("window--minimized")) {
        existing.classList.remove("window--minimized");
        const tab = els.taskbarTabs.querySelector(`[data-win-type="${type}"]`);
        if (tab) tab.classList.remove("taskbar__tab--min");
      }
      bringToFront(existing);
      return existing;
    }

    const winEl = document.createElement("div");
    winEl.className = "window";
    winEl.dataset.winType = type;
    const [w, h] = defaultSize(type);
    const offset = windowsByType.size * 22;
    winEl.style.width = `${w}px`;
    winEl.style.height = `${h}px`;
    winEl.style.left = `${40 + offset}px`;
    winEl.style.top = `${28 + offset}px`;

    const bodyClass =
      type === "computer" || type === "documents" || type === "recycle" || type === "about" || type === "internet"
        ? "window__body window__body--padded" + (type === "computer" || type === "documents" ? " window__body--tan" : "")
        : "window__body";

    winEl.innerHTML = `
      <div class="window__titlebar" data-drag-handle>
        <span class="window__title">${escapeHtml(titles[type] || "Window")}</span>
        <div class="window__controls">
          <button type="button" class="window__btn" data-win-min title="Minimize">_</button>
          <button type="button" class="window__btn" data-win-max title="Maximize">□</button>
          <button type="button" class="window__btn window__btn--close close-btn" data-win-close title="Close">×</button>
        </div>
      </div>
      <div class="${bodyClass}"></div>`;

    const body = winEl.querySelector(".window__body");
    const content = buildWindowContent(type);
    if (content.classList && content.classList.contains("window__body--padded")) {
      body.replaceWith(content);
      content.classList.add("window__body");
      if (type === "computer" || type === "documents") content.classList.add("window__body--tan");
    } else {
      body.appendChild(content);
    }

    els.windowsRoot.appendChild(winEl);
    windowsByType.set(type, winEl);

    if (type === "music") initMusicWindow(winEl);
    if (type === "camera") initCameraWindow(winEl);
    if (type === "paint") initPaintWindow(winEl);
    if (type === "solitaire") initSolitaireWindow(winEl);

    bringToFront(winEl);
    attachDrag(winEl);
    attachWindowControls(winEl);
    addTaskbarTab(type, titles[type] || type);
    return winEl;
  }

  function addTaskbarTab(type, title) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "taskbar__tab";
    tab.dataset.winType = type;
    tab.textContent = title;
    tab.addEventListener("click", () => {
      playClickSound();
      const w = windowsByType.get(type);
      if (!w) return;
      if (w.classList.contains("window--minimized")) {
        w.classList.remove("window--minimized");
        tab.classList.remove("taskbar__tab--min");
      }
      bringToFront(w);
    });
    els.taskbarTabs.appendChild(tab);
    syncTabActive(type);
  }

  function removeTaskbarTab(type) {
    const tab = els.taskbarTabs.querySelector(`[data-win-type="${type}"]`);
    if (tab) tab.remove();
  }

  function closeWindow(type) {
    playClickSound();
    const fn = windowCleanups.get(type);
    if (fn) fn();
    windowCleanups.delete(type);
    const w = windowsByType.get(type);
    if (!w) return;
    w.remove();
    windowsByType.delete(type);
    removeTaskbarTab(type);
    const remaining = Array.from(windowsByType.values());
    if (remaining.length) bringToFront(remaining[remaining.length - 1]);
    else els.taskbarTabs.querySelectorAll(".taskbar__tab").forEach((t) => t.classList.remove("taskbar__tab--active"));
  }

  function attachWindowControls(winEl) {
    const type = winEl.dataset.winType;
    winEl.querySelector("[data-win-min]").addEventListener("click", (e) => {
      e.stopPropagation();
      playClickSound();
      winEl.classList.add("window--minimized");
      const tab = els.taskbarTabs.querySelector(`[data-win-type="${type}"]`);
      if (tab) tab.classList.add("taskbar__tab--min");
    });
    let preMax = null;
    winEl.querySelector("[data-win-max]").addEventListener("click", (e) => {
      e.stopPropagation();
      playClickSound();
      if (winEl.classList.contains("window--maximized")) {
        winEl.classList.remove("window--maximized");
        if (preMax) {
          winEl.style.left = preMax.left;
          winEl.style.top = preMax.top;
          winEl.style.width = preMax.width;
          winEl.style.height = preMax.height;
        }
      } else {
        preMax = {
          left: winEl.style.left,
          top: winEl.style.top,
          width: winEl.style.width,
          height: winEl.style.height,
        };
        winEl.classList.add("window--maximized");
      }
    });
  }

  function attachDrag(winEl) {
    const handle = winEl.querySelector("[data-drag-handle]");
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".window__btn, .close-btn")) return;
      if (winEl.classList.contains("window--maximized")) return;
      e.preventDefault();
      bringToFront(winEl);
      handle.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startY = e.clientY;
      const origLeft = parseFloat(winEl.style.left) || 0;
      const origTop = parseFloat(winEl.style.top) || 0;
      function onMove(ev) {
        winEl.style.left = `${origLeft + ev.clientX - startX}px`;
        winEl.style.top = `${origTop + ev.clientY - startY}px`;
        clampWindowPosition(winEl);
      }
      function onUp(ev) {
        handle.releasePointerCapture(ev.pointerId);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
      }
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
    });
  }

  function setStartOpen(open) {
    els.startMenu.hidden = !open;
    els.btnStart.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) els.submenuPrograms.hidden = true;
  }

  els.btnStart.addEventListener("click", (e) => {
    e.stopPropagation();
    playClickSound();
    setStartOpen(els.startMenu.hidden);
  });

  document.addEventListener("click", () => setStartOpen(false));
  els.startMenu.addEventListener("click", (e) => e.stopPropagation());

  const programsRow = els.startMenu.querySelector("[data-submenu='programs']");
  programsRow.addEventListener("mouseenter", () => {
    els.submenuPrograms.hidden = false;
  });
  programsRow.addEventListener("mouseleave", (e) => {
    if (!programsRow.contains(e.relatedTarget)) els.submenuPrograms.hidden = true;
  });

  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
    programsRow.addEventListener("click", (e) => {
      e.stopPropagation();
      els.submenuPrograms.hidden = !els.submenuPrograms.hidden;
    });
  }

  els.startMenu.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setStartOpen(false);
      openOrFocusWindow(btn.dataset.open);
    });
  });

  els.startMenu.querySelector("[data-action='shutdown']").addEventListener("click", async () => {
    playClickSound();
    setStartOpen(false);
    const ok = await showMsgbox("Shut Down AryaOS", "Shut down the computer?", "⚠", [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ]);
    if (ok) await showMsgbox("Shut Down", "It is now safe to turn off your computer.", "🖥", [{ label: "OK", value: true }]);
  });

  document.querySelectorAll(".desk-icon").forEach((btn) => {
    btn.addEventListener("click", () => {
      const map = {
        computer: "computer",
        documents: "documents",
        music: "music",
        paint: "paint",
        camera: "camera",
        recycle: "recycle",
        solitaire: "solitaire",
      };
      const t = map[btn.dataset.action];
      if (t) openOrFocusWindow(t);
    });
  });

  window.addEventListener("resize", () => {
    windowsByType.forEach((w) => {
      if (!w.classList.contains("window--maximized")) clampWindowPosition(w);
    });
  });

  document.addEventListener(
    "click",
    () => {
      const audio = document.getElementById("audioPlayer");
      if (!audio || !audio.src) return;
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    },
    { once: true }
  );

  setTimeout(() => {
    showMsgbox("Welcome", "Welcome, user. AryaOS is ready.", "💬", [{ label: "OK", value: true }]);
  }, 500);
})();
