/* =========================================================
   NewsGPT — front-end app (vanilla JS, no build step)
   ========================================================= */
(function () {
  "use strict";

  const CFG = window.NEWSGPT_CONFIG;
  const DATA = window.NEWSGPT_DATA;
  const STORIES = DATA.stories;
  const byId = (id) => STORIES.find((s) => s.id === id);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TZ = "Asia/Kolkata";
  const fmtDate = (iso) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso));
  const fmtTime = (iso) => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ }).format(new Date(iso)).toUpperCase();
  const dayKey = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso)); // YYYY-MM-DD
  const lastItem = (s) => s.timeline[s.timeline.length - 1];
  const slug = (c) => encodeURIComponent(c);

  // safe localStorage
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 3200);
  }

  /* ---------------- images with category fallback art ---------------- */
  const GLYPHS = {
    Business: '<path d="M-60 30L-30 0 -5 18 30-20 60-40" fill="none"/><path d="M-60 40H60" />',
    Technology: '<rect x="-34" y="-24" width="68" height="48" rx="2" fill="none"/><path d="M-14 36H14M0 24V36"/><path d="M-18-6l-8 6 8 6M18-6l8 6-8 6M4-12l-8 24"/>',
    Politics: '<path d="M-52 30H52M-44 30V0M-22 30V0M0 30V0M22 30V0M44 30V0M-56 0H56L0-34Z" fill="none"/>',
    Sports: '<circle r="30" fill="none"/><path d="M-30 0C-10-14 10-14 30 0M-30 0C-10 14 10 14 30 0M0-30V30"/>',
    Science: '<circle r="6"/><ellipse rx="40" ry="14" fill="none"/><ellipse rx="40" ry="14" transform="rotate(60)" fill="none"/><ellipse rx="40" ry="14" transform="rotate(-60)" fill="none"/>',
    Entertainment: '<rect x="-42" y="-26" width="84" height="52" rx="2" fill="none"/><path d="M-42-12H42M-42 12H42M-20-26V26M20-26V26"/>',
    Health: '<path d="M-10-34H10V-10H34V10H10V34H-10V10H-34V-10H-10Z" fill="none"/>',
    "World News": '<circle r="32" fill="none"/><ellipse rx="14" ry="32" fill="none"/><path d="M-32 0H32M-26-16H26M-26 16H26"/>',
  };
  function fallbackArt(category, label) {
    const g = GLYPHS[category] || GLYPHS["World News"];
    return `<div class="art-fallback" role="img" aria-label="${esc(label || category + " illustration placeholder")}">
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="320" height="180" fill="var(--parchment)"/>
        <rect x="10" y="10" width="300" height="160" fill="none" stroke="var(--gold)" stroke-width="1"/>
        <rect x="16" y="16" width="288" height="148" fill="none" stroke="var(--gold)" stroke-width=".5" stroke-dasharray="1 4" stroke-linecap="round"/>
        <g transform="translate(160 84)" stroke="var(--gold-dark)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="var(--card)">${g}</g>
        <text x="160" y="148" text-anchor="middle" font-family="Cinzel, serif" font-size="11" letter-spacing="4" fill="var(--text2)">${esc(category.toUpperCase())}</text>
      </svg></div>`;
  }
  function photo(story, opts = {}) {
    const fig = document.createElement("figure");
    fig.className = "photo" + (opts.reveal ? " reveal-img" : "");
    const showCredit = !!(story.image && opts.credit !== false);
    if (!story.image) {
      fig.innerHTML = fallbackArt(story.category) + `<figcaption class="photo__credit">Placeholder art</figcaption>`;
      return fig;
    }
    const img = new Image();
    img.alt = story.image.alt;
    img.loading = opts.eager ? "eager" : "lazy";
    img.decoding = "async";
    img.src = story.image.src;
    img.addEventListener("error", () => {
      img.remove();
      fig.insertAdjacentHTML("afterbegin", fallbackArt(story.category, story.image.alt));
      const c = $(".photo__credit", fig); if (c) c.textContent = "Photo unavailable — placeholder art";
    }, { once: true });
    fig.appendChild(img);
    if (showCredit) fig.insertAdjacentHTML("beforeend", `<figcaption class="photo__credit">Photo: ${esc(story.image.credit)}</figcaption>`);
    return fig;
  }

  /* ---------------- scroll reveal ---------------- */
  let io;
  function observeReveals(root) {
    if (!("IntersectionObserver" in window) || reduceMotion()) { $$(".reveal,.reveal-img,.t-item,.timeline", root).forEach((e) => e.classList.add("is-in")); return; }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    $$(".reveal,.reveal-img,.t-item,.timeline", root).forEach((e) => io.observe(e));
  }

  /* ---------------- focus trap helper ---------------- */
  function trap(container, e) {
    if (e.key !== "Tab") return;
    const f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', container).filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* =========================================================
     FEATURE LINE (rotating value propositions)
     ========================================================= */
  const feature = (function () {
    const el = $("#featureText");
    const msgs = DATA.MARQUEE;
    let i = 0, timer = null, running = false;
    el.textContent = msgs[0];
    function cycle() {
      if (!running) return;
      el.textContent = msgs[i];
      if (reduceMotion()) { timer = setTimeout(() => { i = (i + 1) % msgs.length; cycle(); }, 4000); return; }
      const anim = el.animate([
        { opacity: 0, transform: "translateX(48px)" },
        { opacity: 1, transform: "translateX(8px)", offset: 0.2 },
        { opacity: 1, transform: "translateX(0)", offset: 0.55 },
        { opacity: 1, transform: "translateX(-8px)", offset: 0.8 },
        { opacity: 0, transform: "translateX(-48px)" },
      ], { duration: 4400, easing: "cubic-bezier(.22,.61,.36,1)", fill: "both" });
      anim.onfinish = () => { i = (i + 1) % msgs.length; cycle(); };
      timer = anim;
    }
    function start() { if (running) return; running = true; cycle(); }
    function stop() { running = false; if (timer && timer.cancel) timer.cancel(); else clearTimeout(timer); }
    // pause when header scrolled out of view or tab hidden
    const host = $(".feature-line");
    if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => (en.isIntersecting && !document.hidden ? start() : stop())).observe(host);
    else start();
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    return { start, stop };
  })();

  /* =========================================================
     HEADER / DRAWER / THEME
     ========================================================= */
  const bar = $(".header-bar");
  const onScroll = () => bar.classList.toggle("is-stuck", window.scrollY > 120);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const drawer = $("#drawer"), scrim = $("#scrim"), menuBtn = $("#menuBtn");
  let lastFocus = null;
  function buildDrawer() {
    const items = [
      ["Home", "#/", "home"],
      ["Daily News", "#/daily", "daily"],
      ...DATA.CATEGORIES.map((c) => [c, `#/topic/${slug(c)}`, "topic:" + c]),
      ["sep"],
      ["Saved Stories", "#/saved", "saved"],
      ["About NewsGPT", "#/about", "about"],
    ];
    $("#drawerList").innerHTML = items.map((it) => it[0] === "sep" ? '<li class="sep" role="separator"></li>' : `<li><a href="${it[1]}" data-nav="${it[2]}">${esc(it[0])}</a></li>`).join("");
  }
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.removeAttribute("inert"); drawer.setAttribute("aria-hidden", "false");
    scrim.hidden = false; requestAnimationFrame(() => { scrim.classList.add("is-open"); drawer.classList.add("is-open"); });
    menuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#drawerClose").focus(), 30);
  }
  function closeDrawer(restore = true) {
    drawer.classList.remove("is-open"); scrim.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true"); drawer.setAttribute("inert", "");
    document.body.style.overflow = "";
    setTimeout(() => { scrim.hidden = true; }, 300);
    if (restore && lastFocus) lastFocus.focus();
  }
  menuBtn.addEventListener("click", openDrawer);
  $("#drawerClose").addEventListener("click", () => closeDrawer());
  scrim.addEventListener("click", () => closeDrawer());
  drawer.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); else trap(drawer, e); });
  drawer.addEventListener("click", (e) => { if (e.target.closest("a")) closeDrawer(false); });

  $("#homeBtn").addEventListener("click", () => {
    if ((location.hash || "#/") === "#/" || location.hash === "") window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
    else location.hash = "#/";
  });

  // theme
  function applyTheme(t) {
    document.documentElement.dataset.theme = t === "dark" ? "dark" : "light";
    const b = $("#themeBtn"); b.textContent = "Dark mode: " + (t === "dark" ? "on" : "off"); b.setAttribute("aria-pressed", String(t === "dark"));
  }
  applyTheme(store.get("ng-theme", "light"));
  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next); store.set("ng-theme", next);
  });

  /* =========================================================
     SEARCH (UI ready for a future API)
     ========================================================= */
  const MAXSUG = 6;
  // INTEGRATION POINT — replace the local branch with a real request:
  //   const r = await fetch(`${CFG.apiBase}/search?q=${encodeURIComponent(q)}`); return r.json();
  async function searchNews(q) {
   if (CFG.apiBase) {
  const r = await fetch(
    `${CFG.apiBase}/search?q=${encodeURIComponent(q)}&top_n=10`
  );

  if (!r.ok) {
    throw new Error("Search request failed");
  }

  const data = await r.json();

  // FastAPI returns { query, count, results }.
  // The frontend expects an array of results.
  return Array.isArray(data) ? data : (data.results || []);
}
    await new Promise((r) => setTimeout(r, 120)); // simulate latency in sample mode
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = [];
    STORIES.forEach((s) => {
      const hay = (t) => t.toLowerCase();
      let score = 0;
      terms.forEach((t) => {
        if (hay(s.headline).includes(t)) score += 4;
        if (hay(s.category).includes(t)) score += 3;
        if (hay(s.dek).includes(t)) score += 1;
      });
      if (score) out.push({ kind: "story", storyId: s.id, title: s.headline, category: s.category, publisher: "Story timeline · " + s.timeline.length + " articles", publishedAt: lastItem(s).publishedAt, score: score + 2 });
      s.timeline.forEach((a) => {
        let sc = 0;
        terms.forEach((t) => { if (hay(a.headline).includes(t)) sc += 3; if (hay(a.summary).includes(t)) sc += 1; if (hay(a.publisher).includes(t)) sc += 1; });
        if (sc) out.push({ kind: "article", storyId: s.id, title: a.headline, category: s.category, publisher: a.publisher, publishedAt: a.publishedAt, score: sc });
      });
    });
    return out.sort((a, b) => b.score - a.score || new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  function initSearch(root) {
    const input = $(".search__input", root), list = $(".suggest", root), clearBtn = $(".search__clear", root), form = $(".search__box", root);
    let results = [], active = -1, seq = 0, timer;
    const open = () => { list.hidden = false; input.setAttribute("aria-expanded", "true"); };
    const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); active = -1; input.removeAttribute("aria-activedescendant"); };
    const state = (msg) => { list.innerHTML = `<li class="s-state" role="presentation">${esc(msg)}</li>`; open(); };
    function render() {
      list.innerHTML = results.slice(0, MAXSUG).map((r, i) => `<li role="option" id="sg-${i}" data-i="${i}" aria-selected="${i === active}">
        <span class="s-title">${esc(r.title)}</span>
        <span class="s-meta">${esc(r.category)} · ${esc(r.publisher)} · ${fmtDate(r.publishedAt)}</span></li>`).join("");
      open();
    }
      function go(r) {
      close();

      // Real news articles open inside NewsGPT first.
      if (r.articleId) {
        location.hash = `#/article/${encodeURIComponent(r.articleId)}`;
        return;
      }

      // Preserve existing sample-story navigation.
      if (r.storyId) {
        location.hash = `#/story/${encodeURIComponent(r.storyId)}`;
        return;
      }

      // Fallback for any external article without an ID.
      if (r.url) {
        window.open(r.url, "_blank", "noopener,noreferrer");
      }
    }
    function submit() {
      const q = input.value.trim(); if (!q) return;
      close(); location.hash = `#/search/${encodeURIComponent(q)}`;
    }
    input.addEventListener("input", () => {
      clearBtn.hidden = !input.value;
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { close(); return; }
      const my = ++seq;
      timer = setTimeout(async () => {
        state("Searching…");
        try {
          const r = await searchNews(q); if (my !== seq) return;
          results = r; active = -1;
          if (!r.length) state(`No sample matches for “${q}”.`); else render();
        } catch (err) { if (my === seq) state("Search is unavailable right now. Please try again."); }
      }, 150);
    });
    input.addEventListener("keydown", (e) => {
      const n = Math.min(results.length, MAXSUG);
      if (e.key === "ArrowDown" && n) { e.preventDefault(); active = (active + 1) % n; render(); input.setAttribute("aria-activedescendant", "sg-" + active); }
      else if (e.key === "ArrowUp" && n) { e.preventDefault(); active = (active - 1 + n) % n; render(); input.setAttribute("aria-activedescendant", "sg-" + active); }
      else if (e.key === "Enter") { e.preventDefault(); if (active >= 0 && results[active]) go(results[active]); else submit(); }
      else if (e.key === "Escape") { if (!list.hidden) { close(); } else if (input.value) { input.value = ""; clearBtn.hidden = true; } }
    });
    list.addEventListener("mousedown", (e) => { const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); go(results[+li.dataset.i]); } });
    clearBtn.addEventListener("click", () => { input.value = ""; clearBtn.hidden = true; close(); input.focus(); });
    $(".search__go", root).addEventListener("click", submit);
    form.addEventListener("submit", (e) => e.preventDefault());
    document.addEventListener("click", (e) => { if (!root.contains(e.target)) close(); });
    return input;
  }
  const searchMarkup = (value = "") => `
    <div class="search" role="search">
      <label class="side-title" for="searchInput" style="display:block">Search News</label>
      <div class="search__box">
        <input class="search__input" id="searchInput" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggestList" autocomplete="off" placeholder="Search topics, people, events, or headlines..." value="${esc(value)}">
        <button class="search__clear" type="button" aria-label="Clear search" ${value ? "" : "hidden"}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        <button class="search__go" type="button" aria-label="Search"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      </div>
      <ul class="suggest" id="suggestList" role="listbox" aria-label="Search suggestions" hidden></ul>
      <p class="search__note">${CFG.apiBase ? "Connected to the NewsGPT search API." : "Keyword search over sample data only. Semantic search needs the backend."}</p>
    </div>`;

  /* =========================================================
     VIEWS
     ========================================================= */
  const app = $("#app");

  function cardEl(s, i) {
    const a = document.createElement("a");
    a.className = "card reveal"; a.style.setProperty("--i", i % 6);
    a.href = `#/story/${s.id}`;
    a.appendChild(photo(s, { credit: false }));
    a.insertAdjacentHTML("beforeend", `<span class="cat-label">${esc(s.category)}</span>
      <h3>${esc(s.headline)}</h3><p>${esc(s.dek)}</p>
      <span class="meta"><b>${s.timeline.length} articles</b> · updated ${fmtDate(lastItem(s).publishedAt)}, ${fmtTime(lastItem(s).publishedAt)}</span>`);
    return a;
  }

  /* ---------- carousel ---------- */
  function buildCarousel(host) {
    const feats = STORIES.filter((s) => s.featured);
    host.innerHTML = `
      <div class="carousel" role="region" aria-roledescription="carousel" aria-label="Daily News featured stories" tabindex="0">
        <div class="carousel__viewport"><div class="carousel__track"></div></div>
        <div class="carousel__controls">
          <button class="arrow-btn" data-dir="-1" type="button" aria-label="Previous story">← Previous</button>
          <div class="dots" role="group" aria-label="Choose story"></div>
          <button class="arrow-btn" data-dir="1" type="button" aria-label="Next story">Next →</button>
        </div>
        <div class="carousel__controls" style="justify-content:flex-end;padding-top:6px">
          <button class="pause-btn" type="button" aria-pressed="false">Pause auto-advance</button>
        </div>
      </div>`;
    const root = $(".carousel", host), track = $(".carousel__track", root), dots = $(".dots", root);
    feats.forEach((s, idx) => {
      const slide = document.createElement("article");
      slide.className = "slide"; slide.setAttribute("role", "group"); slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", `${idx + 1} of ${feats.length}`);
      slide.appendChild(photo(s, { eager: idx === 0 }));
      const l = lastItem(s), f = s.timeline[0];
      slide.insertAdjacentHTML("beforeend", `<div class="slide__body">
        <span class="cat-label">${esc(s.category)}</span><span class="sample-tag">Sample</span>
        <h3 class="slide__headline">${esc(s.headline)}</h3>
        <p class="slide__dek">${esc(s.dek)}</p>
        <div class="slide__foot">
          <span class="meta"><b>${esc(l.publisher)}</b> · ${fmtDate(l.publishedAt)}, ${fmtTime(l.publishedAt)} · ${s.timeline.length} related articles</span>
          <a class="btn-outline" href="#/story/${s.id}" aria-label="Know more: ${esc(s.headline)}">Know More <span aria-hidden="true">↓</span></a>
        </div></div>`);
      track.appendChild(slide);
      const d = document.createElement("button");
      d.type = "button"; d.className = "dot"; d.setAttribute("aria-label", `Go to story ${idx + 1}: ${s.headline}`);
      d.addEventListener("click", () => go(idx, true));
      dots.appendChild(d);
    });
    let cur = 0, timer = null, userPaused = false, hovering = false, visible = true;
    const n = feats.length, DELAY = 7000;
    function go(i, manual) {
      cur = (i + n) % n;
      track.style.transform = `translateX(${-cur * 100}%)`;
      $$(".slide", track).forEach((sl, k) => { sl.inert = k !== cur; sl.setAttribute("aria-hidden", String(k !== cur)); });
      $$(".dot", dots).forEach((d, k) => d.setAttribute("aria-current", String(k === cur)));
      if (manual) schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (reduceMotion() || userPaused || hovering || !visible || document.hidden) return;
      timer = setTimeout(() => { go(cur + 1); schedule(); }, DELAY);
    }
    $$("[data-dir]", root).forEach((b) => b.addEventListener("click", () => go(cur + +b.dataset.dir, true)));
    root.addEventListener("keydown", (e) => {
      if (e.target.closest("a,button") && e.target !== root) return;
      if (e.key === "ArrowRight") { go(cur + 1, true); e.preventDefault(); } else if (e.key === "ArrowLeft") { go(cur - 1, true); e.preventDefault(); }
    });
    root.addEventListener("mouseenter", () => { hovering = true; schedule(); });
    root.addEventListener("mouseleave", () => { hovering = false; schedule(); });
    root.addEventListener("focusin", () => { hovering = true; schedule(); });
    root.addEventListener("focusout", () => { hovering = false; schedule(); });
    const pb = $(".pause-btn", root);
    if (reduceMotion()) { pb.hidden = true; }
    pb.addEventListener("click", () => { userPaused = !userPaused; pb.setAttribute("aria-pressed", String(userPaused)); pb.textContent = userPaused ? "Resume auto-advance" : "Pause auto-advance"; schedule(); });
    // swipe
    const vp = $(".carousel__viewport", root); let sx = null, sy = 0;
    vp.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; });
    vp.addEventListener("pointerup", (e) => {
      if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1), true);
    });
    vp.addEventListener("pointercancel", () => { sx = null; });
    if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; schedule(); }, { threshold: 0.35 }).observe(root);
    document.addEventListener("visibilitychange", schedule);
    go(0); schedule();
    host._cleanup = () => { clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
  }

  /* ---------- home ---------- */
  function viewHome(scrollTo) {
    const cats = DATA.CATEGORIES;
    const countOf = (c) => STORIES.filter((s) => s.category === c).length;
    app.innerHTML = `
      <div class="container">
        <div class="home-grid">
          <section class="area-search reveal" aria-label="Search">${searchMarkup()}</section>
          <section class="area-news" id="daily-news" aria-labelledby="dn-h">
            <div class="section-head reveal"><h2 id="dn-h">Daily News</h2><span class="kicker">Sample edition · ${fmtDate("2026-10-15T09:00:00+05:30")}</span></div>
            <div id="carouselHost" class="reveal"></div>
          </section>
          <section class="area-topics reveal" aria-labelledby="tp-h">
            <h2 class="side-title" id="tp-h">Popular Topics</h2>
            <ul class="topic-list">${cats.map((c) => `<li><a href="#/topic/${slug(c)}"><span>${esc(c)}</span><span class="count" aria-label="${countOf(c)} stories">${countOf(c)}</span></a></li>`).join("")}</ul>
          </section>
          <section class="area-trending reveal" aria-labelledby="tr-h">
            <h2 class="side-title" id="tr-h">Trending Stories</h2>
            <ol class="trend-list">${DATA.TRENDING.map((id) => { const s = byId(id); return `<li><a href="#/story/${s.id}">${esc(s.headline)}</a></li>`; }).join("")}</ol>
          </section>
        </div>
        <section class="page-pad" aria-labelledby="ms-h">
          <div class="section-head reveal"><h2 id="ms-h">More Stories</h2><span class="kicker">Each opens a timeline</span></div>
          <div class="cards" id="moreCards"></div>
        </section>
      </div>`;
    buildCarousel($("#carouselHost"));
    initSearch($(".search", app));
    const cards = $("#moreCards");
    STORIES.forEach((s, i) => cards.appendChild(cardEl(s, i)));
    observeReveals(app);
    if (scrollTo) requestAnimationFrame(() => { const t = $("#" + scrollTo); if (t) t.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" }); });
    else window.scrollTo(0, 0);
  }

  /* ---------- topic ---------- */
  function viewTopic(cat) {
    if (!DATA.CATEGORIES.includes(cat)) return viewNotFound();
    const list = STORIES.filter((s) => s.category === cat);
    app.innerHTML = `<div class="container page-pad">
      <p class="crumbs"><a href="#/">← Back to home</a></p>
      <div class="section-head"><h2>${esc(cat)}</h2><span class="kicker">${list.length} sample ${list.length === 1 ? "story" : "stories"}</span></div>
      ${list.length ? '<div class="cards" id="topicCards"></div>' : `<p class="empty">No sample stories in ${esc(cat)} yet. Real topic filtering will use the backend.</p>`}
    </div>`;
    const c = $("#topicCards"); if (c) list.forEach((s, i) => c.appendChild(cardEl(s, i)));
    observeReveals(app); window.scrollTo(0, 0);
  }

  /* ---------- search results ---------- */
  async function viewSearch(q) {
    app.innerHTML = `<div class="container page-pad">
      <p class="crumbs"><a href="#/">← Back to home</a></p>
      <div class="section-head">
        <h2>Search</h2>
        <span class="kicker" id="srCount">Searching…</span>
      </div>
      <div style="max-width:560px;margin-bottom:26px">${searchMarkup(q)}</div>
      <div id="srOut" aria-live="polite"></div>

      <section style="margin-top:42px" aria-labelledby="recommendHeading">
        <div class="section-head">
          <h2 id="recommendHeading">Recommended for You</h2>
          <span class="kicker" id="recCount">Loading…</span>
        </div>
        <div id="recOut" aria-live="polite"></div>
      </section>
    </div>`;

    initSearch($(".search", app));

    const out = $("#srOut");
    const recOut = $("#recOut");
    const recCount = $("#recCount");

    function renderArticleCards(articles) {
      if (!articles.length) {
        return `<p class="empty">No matching articles found. Try another search.</p>`;
      }

      return articles.map((x, i) => {
        const href = x.articleId
          ? `#/article/${encodeURIComponent(x.articleId)}`
          : x.storyId
            ? `#/story/${encodeURIComponent(x.storyId)}`
            : x.url
              ? esc(x.url)
              : "#/";

        const external = x.articleId || x.storyId
          ? ""
          : x.url
            ? 'target="_blank" rel="noopener noreferrer"'
            : "";

        return `
          <a class="card reveal"
             style="--i:${i % 6};margin-bottom:18px"
             href="${href}" ${external}>
            <span class="cat-label">${esc(x.category || "News")} · Article</span>
            <h3>${esc(x.title || "Untitled article")}</h3>
            <p>${esc(x.description || "")}</p>
            <span class="meta">
              <b>${esc(x.publisher || "Unknown publisher")}</b>
              · ${fmtDate(x.publishedAt)}
            </span>
          </a>
        `;
      }).join("");
    }

    // Search results
    const searchTask = (async () => {
      try {
        const results = await searchNews(q);

        $("#srCount").textContent =
          `${results.length} result${results.length === 1 ? "" : "s"} for “${q}”`;

        out.innerHTML = renderArticleCards(results);
      } catch (error) {
        console.error("NewsGPT search error:", error);
        $("#srCount").textContent = "Error";
        out.innerHTML =
          `<p class="empty" role="alert">Search is unavailable right now. Please try again.</p>`;
      }
    })();

    // Recommendations
    const recommendationTask = (async () => {
      try {
        if (!CFG.apiBase) {
          throw new Error("NewsGPT API is not configured.");
        }

        const response = await fetch(
          `${CFG.apiBase}/recommend?q=${encodeURIComponent(q)}&top_n=10`
        );

        if (!response.ok) {
          throw new Error(`Recommendation request failed: ${response.status}`);
        }

        const data = await response.json();
        const recommendations = Array.isArray(data)
          ? data
          : (data.results || []);

        recCount.textContent =
          `${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"}`;

        recOut.innerHTML = renderArticleCards(recommendations);
      } catch (error) {
        console.error("NewsGPT recommendation error:", error);
        recCount.textContent = "Unavailable";
        recOut.innerHTML =
          `<p class="empty">Recommendations couldn't load. Search results are still available.</p>`;
      }
    })();

    await Promise.all([searchTask, recommendationTask]);

    observeReveals(app);
    window.scrollTo(0, 0);
  }


  /* ---------- real article detail ---------- */
  async function viewArticle(articleId) {
    app.innerHTML = `<div class="container page-pad">
      <p class="crumbs"><a href="#/">← Back to home</a></p>
      <div id="articleDetail" aria-live="polite">
        <p class="empty">Loading article…</p>
      </div>
    </div>`;

    window.scrollTo(0, 0);

    try {
      const response = await fetch(
        `${CFG.apiBase}/articles/${encodeURIComponent(articleId)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("This article could not be found.");
        }
        throw new Error("Unable to load this article.");
      }

      const article = await response.json();
      const detail = $("#articleDetail");

      const originalLink = article.url
        ? `<a class="btn btn--primary"
              href="${esc(article.url)}"
              target="_blank"
              rel="noopener noreferrer">
              Read Original Article ↗
           </a>`
        : `<p class="empty">The original article link is unavailable.</p>`;

      const image = article.imageUrl
        ? `<img src="${esc(article.imageUrl)}"
                alt=""
                loading="lazy"
                style="display:block;width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin:24px 0"
                onerror="this.style.display='none'">`
        : "";

      detail.innerHTML = `
        <article class="article-detail">
          <span class="cat-label">${esc(article.category || "News")}</span>

          <h1 style="margin:16px 0">${esc(article.title || "Untitled article")}</h1>

          <div class="meta" style="margin-bottom:20px">
            <b>${esc(article.publisher || "Unknown publisher")}</b>
            ${article.publishedAt
              ? ` · ${fmtDate(article.publishedAt)}`
              : ""}
          </div>

          ${image}

          <section aria-labelledby="article-summary-heading"
                   style="max-width:800px;margin:28px 0">
            <h2 id="article-summary-heading">Summary</h2>
            <p style="font-size:1.08rem;line-height:1.8">
              ${esc(article.description || "No summary is available in the dataset for this article.")}
            </p>
          </section>

          ${originalLink}

          <section style="margin-top:48px"
                   aria-labelledby="article-recommendations-heading">
            <div class="section-head">
              <h2 id="article-recommendations-heading">Related Recommendations</h2>
              <span class="kicker" id="articleRecCount">Loading…</span>
            </div>
            <div id="articleRecOut" aria-live="polite"></div>
          </section>
        </article>
      `;

      loadArticleRecommendations(article);

      observeReveals(app);
    } catch (error) {
      console.error("Article detail error:", error);

      $("#articleDetail").innerHTML = `
        <p class="empty" role="alert">${esc(error.message || "Unable to load this article.")}</p>
        <p><a href="#/">Return to NewsGPT</a></p>
      `;
    }
  }

  async function loadArticleRecommendations(article) {
    const output = $("#articleRecOut");
    const count = $("#articleRecCount");

    try {
      const response = await fetch(
        `${CFG.apiBase}/recommend?q=${encodeURIComponent(article.title)}&top_n=10`
      );

      if (!response.ok) {
        throw new Error("Recommendation request failed.");
      }

      const data = await response.json();
      const recommendations = (Array.isArray(data) ? data : data.results || [])
        .filter(item => String(item.articleId) !== String(article.articleId));

      count.textContent =
        `${recommendations.length} related article${recommendations.length === 1 ? "" : "s"}`;

      if (!recommendations.length) {
        output.innerHTML = `<p class="empty">No related articles found.</p>`;
        return;
      }

      output.innerHTML = recommendations.map((item, index) => `
        <a class="card reveal"
           style="--i:${index % 6};margin-bottom:18px"
           href="#/article/${encodeURIComponent(item.articleId)}">
          <span class="cat-label">${esc(item.category || "News")} · Recommended</span>
          <h3>${esc(item.title || "Untitled article")}</h3>
          <p>${esc(item.description || "")}</p>
          <span class="meta">
            <b>${esc(item.publisher || "Unknown publisher")}</b>
            ${item.publishedAt ? ` · ${fmtDate(item.publishedAt)}` : ""}
          </span>
        </a>
      `).join("");

      observeReveals(output);
    } catch (error) {
      console.error("Article recommendations error:", error);
      count.textContent = "Unavailable";
      output.innerHTML =
        `<p class="empty">Recommendations couldn't load. You can still read the article above.</p>`;
    }
  }


  /* ---------- story / timeline ---------- */
  function viewStory(id) {
    const s = byId(id); if (!s) return viewNotFound();
    const tl = s.timeline, first = tl[0], last = lastItem(s);
    const pubs = [...new Set(tl.map((a) => a.publisher))].sort();
    app.innerHTML = `<div class="container">
      <header class="story-head">
        <p class="crumbs"><a href="#/">← Back to home</a> &nbsp;·&nbsp; <a href="#/topic/${slug(s.category)}">More in ${esc(s.category)}</a></p>
        <span class="cat-label">${esc(s.category)}</span><span class="sample-tag">Sample story</span>
        <h1>${esc(s.headline)}</h1>
        <p class="overview"><span class="ai">Overview</span>${esc(s.dek)} <em>This overview is a short written sample built only from the ${tl.length} sample articles listed below; each entry links to its original source once real data is connected.</em></p>
        <div class="stats">
          <div class="stat"><b>${fmtDate(first.publishedAt)}</b><span>First observed</span></div>
          <div class="stat"><b>${fmtDate(last.publishedAt)}</b><span>Latest observed</span></div>
          <div class="stat"><b>${tl.length}</b><span>Related articles</span></div>
          <div class="stat"><b>${pubs.length}</b><span>Publishers</span></div>
          <div class="stat"><button class="btn-text" id="saveBtn" type="button" aria-pressed="false"></button></div>
        </div>
      </header>
      <div class="story-layout">
        <div class="story-top">
          <div id="storyPhoto"></div>
          <form class="filters" id="tlFilters" aria-label="Filter timeline">
            <label>Publisher<select name="pub"><option value="">All publishers</option>${pubs.map((p) => `<option>${esc(p)}</option>`).join("")}</select></label>
            <label>From<input type="date" name="from" min="${dayKey(first.publishedAt)}" max="${dayKey(last.publishedAt)}"></label>
            <label>To<input type="date" name="to" min="${dayKey(first.publishedAt)}" max="${dayKey(last.publishedAt)}"></label>
            <label>Order<select name="order"><option value="asc">Oldest first</option><option value="desc">Newest first</option></select></label>
            <button class="btn-text" type="reset">Reset</button>
          </form>
        </div>
        <section aria-labelledby="tl-h">
          <div class="section-head"><h2 id="tl-h">Story Timeline</h2><span class="kicker" id="tlCount"></span></div>
          <p class="meta" style="margin:-6px 0 18px">Times show when each article was <b>published</b> (IST). A separate “reported event” line appears only when an article states when the event itself happened.</p>
          <div id="tlHost"></div>
        </section>
      </div></div>`;
    $("#storyPhoto").appendChild(photo(s, { eager: true }));

    // save toggle
    const saveBtn = $("#saveBtn");
    const paintSave = () => { const on = store.get("ng-saved", []).includes(s.id); saveBtn.textContent = on ? "★ Saved to your list" : "☆ Save this story"; saveBtn.setAttribute("aria-pressed", String(on)); };
    saveBtn.addEventListener("click", () => {
      let sv = store.get("ng-saved", []);
      sv = sv.includes(s.id) ? sv.filter((x) => x !== s.id) : [...sv, s.id];
      store.set("ng-saved", sv); paintSave(); toast(sv.includes(s.id) ? "Story saved on this device." : "Removed from saved stories.");
    });
    paintSave();

    const host = $("#tlHost"), form = $("#tlFilters");
    function renderTL() {
      const f = new FormData(form), pub = f.get("pub"), from = f.get("from"), to = f.get("to"), order = f.get("order");
      let items = tl.filter((a) => (!pub || a.publisher === pub) && (!from || dayKey(a.publishedAt) >= from) && (!to || dayKey(a.publishedAt) <= to));
      items = items.slice().sort((a, b) => (new Date(a.publishedAt) - new Date(b.publishedAt)) * (order === "desc" ? -1 : 1));
      $("#tlCount").textContent = `${items.length} of ${tl.length} articles`;
      if (!items.length) { host.innerHTML = `<p class="empty">No articles match these filters.</p>`; return; }
      let html = '<div class="timeline"><span class="timeline__line" aria-hidden="true"></span>', prev = "";
      items.forEach((a, i) => {
        const k = dayKey(a.publishedAt);
        if (k !== prev) { html += `<h3 class="t-date">${fmtDate(a.publishedAt)}</h3>`; prev = k; }
        html += `<article class="t-item" style="transition-delay:${Math.min(i, 5) * 60}ms"><div class="t-card">
          <div class="t-time meta"><span><b>Published ${fmtTime(a.publishedAt)}</b></span><span>${esc(a.publisher)}</span></div>
          ${a.eventNote ? `<span class="t-event">Reported event: ${esc(a.eventNote)}</span>` : ""}
          <h4 style="margin:0 0 6px;font:400 22px/1.2 var(--f-serif)">${esc(a.headline)}</h4>
          <p>${esc(a.summary)}</p>
          ${a.url ? `<a class="src-link" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">Read original article ↗</a>` : `<a class="src-link" href="#" aria-disabled="true" data-sample>Original link (sample — not a real article)</a>`}
        </div></article>`;
      });
      host.innerHTML = html + "</div>";
      observeReveals(host);
    }
    form.addEventListener("input", renderTL); form.addEventListener("reset", () => setTimeout(renderTL));
    host.addEventListener("click", (e) => { const a = e.target.closest("[data-sample]"); if (a) { e.preventDefault(); toast("Sample data: no real original article exists for this entry."); } });
    renderTL(); window.scrollTo(0, 0);
  }

  /* ---------- saved / about / not found ---------- */
  function viewSaved() {
    const ids = store.get("ng-saved", []), list = ids.map(byId).filter(Boolean);
    app.innerHTML = `<div class="container page-pad">
      <p class="crumbs"><a href="#/">← Back to home</a></p>
      <div class="section-head"><h2>Saved Stories</h2><span class="kicker">Stored on this device only</span></div>
      ${list.length ? '<div class="cards" id="savedCards"></div>' : '<p class="empty">You have not saved any stories yet. Open a story and choose “Save this story”.</p>'}</div>`;
    const c = $("#savedCards"); if (c) list.forEach((s, i) => c.appendChild(cardEl(s, i)));
    observeReveals(app); window.scrollTo(0, 0);
  }
  function viewAbout() {
    app.innerHTML = `<div class="container page-pad about">
      <p class="crumbs"><a href="#/">← Back to home</a></p>
      <div class="section-head"><h2>About NewsGPT</h2></div>
      <p>NewsGPT helps you follow a story, not just a headline. Related coverage from different publishers is grouped into one chronological timeline, and every entry keeps a link to the original article.</p>
      <h3 class="side-title" style="margin-top:28px">What works in this build</h3>
      <ul><li>Homepage, carousel, topic pages, story timelines with filters, saved stories (this device only).</li>
      <li>Keyword search over clearly labelled sample data.</li></ul>
      <h3 class="side-title" style="margin-top:28px">What needs the backend</h3>
      <ul><li>Real articles and original links (set <code>apiBase</code> in data.js).</li>
      <li>Story clustering and semantic search. Sample groupings are hand-written.</li>
      <li>Real accounts and Google sign-in (an OAuth client ID and server are required).</li></ul></div>`;
    window.scrollTo(0, 0);
  }
  function viewNotFound() {
    app.innerHTML = `<div class="container page-pad"><div class="section-head"><h2>Page not found</h2></div><p class="empty">That page does not exist. <a href="#/">Return to the homepage.</a></p></div>`;
  }

  /* ---------- router ---------- */
  let carouselHost = null;
  function route() {
    const h = location.hash || "#/";
    const parts = h.replace(/^#\/?/, "").split("/");
    const cur = $("#carouselHost"); if (cur && cur._cleanup) cur._cleanup();
    let navKey = "home";
    switch (parts[0]) {
      case "": viewHome(); break;
      case "daily": viewHome("daily-news"); navKey = "daily"; break;
      case "article": viewArticle(decodeURIComponent(parts[1] || "")); navKey = ""; break;
      case "story": viewStory(decodeURIComponent(parts[1] || "")); navKey = ""; break;
      case "topic": { const c = decodeURIComponent(parts[1] || ""); viewTopic(c); navKey = "topic:" + c; break; }
      case "search": viewSearch(decodeURIComponent(parts.slice(1).join("/"))); navKey = ""; break;
      case "saved": viewSaved(); navKey = "saved"; break;
      case "about": viewAbout(); navKey = "about"; break;
      default: viewNotFound(); navKey = "";
    }
    $$("#drawerList a").forEach((a) => (a.dataset.nav === navKey ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    document.title = "NewsGPT — AI-Powered News Discovery & Story Timelines";
    if (parts[0] !== "") { app.focus({ preventScroll: true }); }
  }
  window.addEventListener("hashchange", route);

  /* =========================================================
     AUTH MODAL (demonstration flow — clearly labelled)
     ========================================================= */
  const aScrim = $("#authScrim"), aModal = $("#authModal");
  let mode = "signin", user = null, aLast = null;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function paintAuth() {
    const reg = mode === "register";
    $("#authTitle").textContent = reg ? "Create your account" : "Welcome to NewsGPT";
    $("#authSub").textContent = reg ? "Save stories and follow topics." : "Discover stories that matter.";
    $("#authSubmit").textContent = reg ? "Register" : "Sign In";
    $("#authSwitchText").textContent = reg ? "Already have an account?" : "Don't have an account?";
    $("#authSwitch").textContent = reg ? "Sign In" : "Register";
    $("#authPass").autocomplete = reg ? "new-password" : "current-password";
    $("#forgotBtn").parentElement.hidden = reg;
    $("#authDemo").textContent = CFG.googleClientId ? "Real sign-in requires a backend. Email forms here are not connected." : "Demonstration only: no account system or Google OAuth is connected yet, so nothing is stored or verified.";
    ["authEmailErr", "authPassErr", "authStatus"].forEach((i) => { $("#" + i).textContent = ""; });
    $("#authStatus").className = "form-status";
    $("#authEmail").removeAttribute("aria-invalid"); $("#authPass").removeAttribute("aria-invalid");
  }
  function openAuth() {
    if (user) { // signed-in demo state: offer sign out
      if (confirm("Sign out of the demo session?")) { user = null; $("#accountLabel").textContent = "Sign In"; toast("Signed out of the demo session."); }
      return;
    }
    aLast = document.activeElement; mode = "signin"; paintAuth(); $("#authForm").reset();
    aScrim.hidden = false; document.body.style.overflow = "hidden";
    setTimeout(() => $("#authEmail").focus(), 30);
  }
  function closeAuth() { aScrim.hidden = true; document.body.style.overflow = ""; if (aLast) aLast.focus(); }
  $("#accountBtn").addEventListener("click", openAuth);
  $("#authClose").addEventListener("click", closeAuth);
  aScrim.addEventListener("mousedown", (e) => { if (e.target === aScrim) closeAuth(); });
  aModal.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAuth(); else trap(aModal, e); });
  $("#authSwitch").addEventListener("click", () => { mode = mode === "signin" ? "register" : "signin"; paintAuth(); });
  $("#passToggle").addEventListener("click", (e) => {
    const p = $("#authPass"), show = p.type === "password";
    p.type = show ? "text" : "password"; e.currentTarget.textContent = show ? "Hide" : "Show";
    e.currentTarget.setAttribute("aria-pressed", String(show)); e.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
  $("#googleBtn").addEventListener("click", () => {
    const st = $("#authStatus"); st.className = "form-status err";
    st.textContent = CFG.googleClientId ? "Google OAuth also needs a server callback, which is not part of this front-end build." : "Google sign-in is not configured yet. It needs an OAuth client ID and a backend.";
  });
  $("#forgotBtn").addEventListener("click", () => {
    const email = $("#authEmail").value.trim(), st = $("#authStatus");
    if (!emailRe.test(email)) { $("#authEmailErr").textContent = "Enter your email above first."; $("#authEmail").setAttribute("aria-invalid", "true"); $("#authEmail").focus(); return; }
    st.className = "form-status ok"; st.textContent = "Demo: a password-reset email would be sent here once a backend exists.";
  });
  $("#authForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const em = $("#authEmail"), pw = $("#authPass"), st = $("#authStatus"), btn = $("#authSubmit");
    let bad = null; $("#authEmailErr").textContent = ""; $("#authPassErr").textContent = ""; em.removeAttribute("aria-invalid"); pw.removeAttribute("aria-invalid"); st.textContent = "";
    if (!emailRe.test(em.value.trim())) { $("#authEmailErr").textContent = "Enter a valid email address."; em.setAttribute("aria-invalid", "true"); bad = em; }
    if (mode === "register" ? pw.value.length < 8 : pw.value.length < 1) { $("#authPassErr").textContent = mode === "register" ? "Use at least 8 characters." : "Enter your password."; pw.setAttribute("aria-invalid", "true"); bad = bad || pw; }
    if (bad) { bad.focus(); return; }
    btn.disabled = true; const label = btn.textContent; btn.textContent = "Please wait…"; st.className = "form-status"; st.textContent = "Working…";
    setTimeout(() => {   // no network call and the password is never stored
      user = { email: em.value.trim() }; pw.value = "";
      st.className = "form-status ok"; st.textContent = "Demo session started. This is not a real account.";
      $("#accountLabel").textContent = "Demo user";
      btn.disabled = false; btn.textContent = label;
      setTimeout(closeAuth, 1100);
    }, 900);
  });

  /* ---------------- boot ---------------- */
  buildDrawer();
  route();
})();
