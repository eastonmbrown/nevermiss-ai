/* Voo AI Integrations — site.js (vanilla, no dependencies) */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav: scrolled state + mobile menu ---------- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('menuToggle');
  var links = document.getElementById('navLinks');

  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 12);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    if (!toggle || !links) return;
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (nav) nav.classList.toggle('scrolled', open || window.scrollY > 12);
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!links.classList.contains('open')) return;
      if (!e.target.closest('#navLinks') && !e.target.closest('#menuToggle')) setMenu(false);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Card spotlight (pointer devices only) ---------- */
  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
    var ticking = false;
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.card');
      if (!card || ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Pause aurora when the top of the page is off-screen ---------- */
  var atmosphere = document.querySelector('.atmosphere');
  if (atmosphere && 'IntersectionObserver' in window) {
    var sentinel = document.querySelector('.hero') || document.body;
    var auroras = atmosphere.querySelectorAll('.aurora');
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      auroras.forEach(function (a) { a.style.animationPlayState = visible ? 'running' : 'paused'; });
    }, { threshold: 0 }).observe(sentinel);
  }

  /* ---------- Chat widget opener (GoHighLevel / LeadConnector) ---------- */
  var chatReady = false;
  window.addEventListener('LC_chatWidgetLoaded', function () { chatReady = true; });

  function openChat() {
    try {
      var w = window.leadConnector && window.leadConnector.chatWidget;
      if (w && typeof w.openWidget === 'function') { w.openWidget(); return true; }
    } catch (err) { /* fall through */ }
    return false;
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.js-open-chat');
    if (!trigger) return;
    e.preventDefault();
    if (openChat()) return;
    // Widget blocked or not loaded yet: retry briefly, then fall back to email.
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (openChat() || tries > 8) {
        clearInterval(timer);
        if (tries > 8) {
          window.location.href = 'mailto:easton@voointegrations.com?subject=' + encodeURIComponent('Question — Voo AI Integrations');
        }
      }
    }, 250);
  });

  /* ---------- GHL form slot: hide fallback form when an embed is present ---------- */
  var slot = document.getElementById('ghl-form-slot');
  var fallback = document.getElementById('fallbackForm');
  if (slot && fallback) {
    var check = function () {
      if (slot.children.length > 0) { fallback.hidden = true; slot.style.display = 'block'; }
    };
    check();
    if ('MutationObserver' in window) new MutationObserver(check).observe(slot, { childList: true });
  }

  /* ---------- Fallback form: build a clean mailto instead of enctype=text/plain ---------- */
  if (fallback) {
    fallback.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = fallback;
      var required = f.querySelectorAll('[required]');
      var ok = true;
      required.forEach(function (input) {
        var valid = input.checkValidity();
        input.style.borderColor = valid ? '' : '#f87171';
        if (!valid) ok = false;
      });
      if (!ok) { f.querySelector(':invalid').focus(); return; }
      var g = function (n) { var el = f.elements[n]; return el ? el.value.trim() : ''; };
      var subject = 'AI Audit request — ' + g('business');
      var body = [
        'Name: ' + g('name'),
        'Business: ' + g('business'),
        'Email: ' + g('email'),
        'Interested in: ' + g('interest'),
        '',
        g('message')
      ].join('\n');
      window.location.href = 'mailto:easton@voointegrations.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }


  /* ---------- Hero constellation (canvas, paused off-screen) ---------- */
  var canvas = document.getElementById('constellation');
  if (canvas && canvas.getContext && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var pts = [], W = 0, H = 0, running = false, rafId = null;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var mouse = { x: -9999, y: -9999 };

    function resize() {
      var r = canvas.parentNode.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(18, Math.min(70, Math.round((W * H) / 20000)));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, r: Math.random() * 1.4 + .6, hue: Math.random() < .3 ? '34,211,238' : '91,140,255' });
      }
    }

    function frame() {
      if (!running) { rafId = null; return; }
      ctx.clearRect(0, 0, W, H);
      var i, j, p, q, dx, dy, d, LINK = 140;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
        // gentle pull toward the cursor
        dx = mouse.x - p.x; dy = mouse.y - p.y; d = dx * dx + dy * dy;
        if (d < 40000) { p.x += dx * 0.004; p.y += dy * 0.004; }
      }
      ctx.lineWidth = 1;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        for (j = i + 1; j < pts.length; j++) {
          q = pts[j]; dx = p.x - q.x; dy = p.y - q.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(' + p.hue + ',' + ((1 - d / LINK) * 0.28).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        ctx.fillStyle = 'rgba(' + p.hue + ',.85)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      rafId = requestAnimationFrame(frame);
    }

    resize();
    var resizeTimer;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
    var heroEl = canvas.closest('.hero');
    heroEl.addEventListener('pointermove', function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
    heroEl.addEventListener('pointerleave', function () { mouse.x = -9999; mouse.y = -9999; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        running = entries[0].isIntersecting && !document.hidden;
        if (running && rafId === null) frame();
      }, { threshold: 0 }).observe(heroEl);
    } else { running = true; frame(); }
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running && rafId === null) frame();
    });
  }

  /* ---------- Preview panel 3D tilt (pointer devices) ---------- */
  var previewWrap = document.querySelector('.preview-wrap');
  var preview = previewWrap && previewWrap.querySelector('.preview');
  if (preview && window.matchMedia && window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
    previewWrap.addEventListener('pointermove', function (e) {
      var r = preview.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - .5;
      var py = (e.clientY - r.top) / r.height - .5;
      preview.classList.add('tilting');
      preview.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg');
      preview.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg');
    }, { passive: true });
    previewWrap.addEventListener('pointerleave', function () {
      preview.classList.remove('tilting');
      preview.style.removeProperty('--ry'); preview.style.removeProperty('--rx');
    });
  }

  /* ---------- Count-up numbers ---------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countIO.unobserve(entry.target);
        var el = entry.target, target = parseFloat(el.getAttribute('data-count')), dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
        var start = null, dur = 1600;
        function tick(ts) {
          if (!start) start = ts;
          var t = Math.min(1, (ts - start) / dur), eased = 1 - Math.pow(1 - t, 3);
          el.textContent = (target * eased).toFixed(dec);
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: .5 });
    counters.forEach(function (el) { el.textContent = (0).toFixed(parseInt(el.getAttribute('data-decimals') || '0', 10)); countIO.observe(el); });
  }


  /* ---------- Hero torus nucleus (canvas point cloud, chrome + cyan/amber rim light) ---------- */
  var torus = document.getElementById('torus');
  var scene = document.getElementById('scene');
  if (torus && scene && torus.getContext && !reduceMotion) {
    var tc = torus.getContext('2d');
    var TW = 0, TH = 0, tdpr = Math.min(window.devicePixelRatio || 1, 2), grid = [], trun = false, traf = null, t0 = null;
    var tmx = 0, tmy = 0, smx = 0, smy = 0; // mouse influence, smoothed
    function tResize() {
      var r = torus.getBoundingClientRect();
      TW = r.width; TH = r.height;
      torus.width = Math.round(TW * tdpr); torus.height = Math.round(TH * tdpr);
      tc.setTransform(tdpr, 0, 0, tdpr, 0, 0);
      var nU = TW < 520 ? 72 : 112, nV = TW < 520 ? 24 : 36;
      grid = []; buckets = [];
      for (var i = 0; i < nU; i++) for (var j = 0; j < nV; j++) {
        var u = i / nU * Math.PI * 2, v = j / nV * Math.PI * 2;
        grid.push({ cu: Math.cos(u), su: Math.sin(u), cv: Math.cos(v), sv: Math.sin(v) });
      }
    }
    function norm(x, y, z) { var l = Math.sqrt(x * x + y * y + z * z) || 1; return [x / l, y / l, z / l]; }
    var L1 = norm(-0.55, -0.75, 0.45); // cyan key light, upper left
    var L2 = norm(0.8, 0.55, 0.2);     // faint amber rim, lower right
    // Colors are quantized into a small palette so each frame is a few dozen batched fills, not thousands.
    var palette = {}, buckets = [];
    function colorFor(key, d1, d2, spec, depth) {
      var c = palette[key];
      if (!c) {
        var cr = 34 + d1 * 40 + d2 * 200 + spec * 220;
        var cg = 46 + d1 * 190 + d2 * 130 + spec * 230;
        var cb = 70 + d1 * 220 + d2 * 40 + spec * 255;
        c = palette[key] = 'rgba(' + (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0) + ',' + (0.14 + depth * 0.8).toFixed(2) + ')';
      }
      return c;
    }
    function tFrame(now) {
      if (!trun) { traf = null; return; }
      if (t0 === null) t0 = now;
      var t = (now - t0) / 1000;
      smx += (tmx - smx) * 0.04; smy += (tmy - smy) * 0.04;
      tc.clearRect(0, 0, TW, TH);
      var R = Math.min(TW, TH) * 0.27, rr = R * 0.42;
      var ax = 1.1 + Math.sin(t * 0.21) * 0.12 + smy * 0.35;
      var ay = t * 0.32 + smx * 0.6;
      var az = Math.sin(t * 0.14) * 0.16;
      var cax = Math.cos(ax), sax = Math.sin(ax), cay = Math.cos(ay), say = Math.sin(ay), caz = Math.cos(az), saz = Math.sin(az);
      var cx = TW / 2, cy = TH / 2, f = R * 6, invRange = 1 / (R + rr);
      var n = grid.length, k, b;
      for (b = 0; b < buckets.length; b++) if (buckets[b]) buckets[b].n = 0;
      for (k = 0; k < n; k++) {
        var g = grid[k];
        var x = (R + rr * g.cv) * g.cu, y = (R + rr * g.cv) * g.su, z = rr * g.sv;
        var nx = g.cv * g.cu, ny = g.cv * g.su, nz = g.sv;
        var y1 = y * cax - z * sax, z1 = y * sax + z * cax; y = y1; z = z1;
        var ny1 = ny * cax - nz * sax, nz1 = ny * sax + nz * cax; ny = ny1; nz = nz1;
        var x2 = x * cay + z * say, z2 = -x * say + z * cay; x = x2; z = z2;
        var nx2 = nx * cay + nz * say, nz2 = -nx * say + nz * cay; nx = nx2; nz = nz2;
        var x3 = x * caz - y * saz, y3 = x * saz + y * caz; x = x3; y = y3;
        var nx3 = nx * caz - ny * saz, ny3 = nx * saz + ny * caz; nx = nx3; ny = ny3;
        var sc = f / (f - z);
        var d1 = Math.max(0, nx * L1[0] + ny * L1[1] + nz * L1[2]);
        var d2 = Math.max(0, nx * L2[0] + ny * L2[1] + nz * L2[2]);
        var spec = Math.pow(Math.max(0, nz), 18);
        var depth = (z * invRange + 1) / 2;
        // quantize: 8 key-light levels, 4 rim levels, 4 specular levels, 5 depth levels
        var q1 = (d1 * 7 + .5) | 0, q2 = (d2 * 3 + .5) | 0, q3 = (spec * 3 + .5) | 0, q4 = (depth * 4 + .5) | 0;
        var key = ((q1 * 4 + q2) * 4 + q3) * 5 + q4;
        var bk = buckets[key] || (buckets[key] = { n: 0, xs: new Float32Array(n), ys: new Float32Array(n), ss: new Float32Array(n), c: colorFor(key, q1 / 7, q2 / 3, q3 / 3, q4 / 4) });
        var i2 = bk.n++;
        bk.xs[i2] = cx + x * sc; bk.ys[i2] = cy + y * sc; bk.ss[i2] = (1.4 + depth * 1.5) * sc;
      }
      for (b = 0; b < buckets.length; b++) {
        var bb = buckets[b];
        if (!bb || !bb.n) continue;
        tc.fillStyle = bb.c;
        tc.beginPath();
        for (k = 0; k < bb.n; k++) { var s2 = bb.ss[k]; tc.rect(bb.xs[k] - s2 / 2, bb.ys[k] - s2 / 2, s2, s2); }
        tc.fill();
      }
      traf = requestAnimationFrame(tFrame);
    }
    tResize();
    var tResizeTimer;
    window.addEventListener('resize', function () { clearTimeout(tResizeTimer); tResizeTimer = setTimeout(function () { tResize(); drawFilaments(); }, 150); });
    var heroSection = scene.closest('.hero');
    heroSection.addEventListener('pointermove', function (e) {
      var r = heroSection.getBoundingClientRect();
      tmx = (e.clientX - r.left) / r.width - .5; tmy = (e.clientY - r.top) / r.height - .5;
    }, { passive: true });
    heroSection.addEventListener('pointerleave', function () { tmx = 0; tmy = 0; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        trun = entries[0].isIntersecting && !document.hidden;
        if (trun && traf === null) traf = requestAnimationFrame(tFrame);
      }, { threshold: 0 }).observe(scene);
    } else { trun = true; traf = requestAnimationFrame(tFrame); }
    document.addEventListener('visibilitychange', function () {
      trun = !document.hidden;
      if (trun && traf === null) traf = requestAnimationFrame(tFrame);
    });
  }

  /* ---------- Data filaments: torus core -> holographic cards ---------- */
  var filaments = document.getElementById('filaments');
  function drawFilaments() {
    if (!filaments || !scene) return;
    var r = scene.getBoundingClientRect();
    if (!r.width) return;
    filaments.setAttribute('viewBox', '0 0 ' + r.width + ' ' + r.height);
    var cx = r.width / 2, cy = r.height / 2, R = Math.min(r.width, r.height) * 0.27;
    var out = '';
    scene.querySelectorAll('.holo').forEach(function (h, i) {
      if (getComputedStyle(h).display === 'none') return;
      var b = h.getBoundingClientRect();
      var x = b.left - r.left + b.width / 2, y = b.top - r.top + b.height / 2;
      var dx = x - cx, dy = y - cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var sx = cx + dx / len * R * 0.62, sy = cy + dy / len * R * 0.62;
      var qx = (sx + x) / 2 - dy * 0.18, qy = (sy + y) / 2 + dx * 0.18;
      out += '<path class="' + (i === 0 ? 'amber' : '') + '" d="M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + '"/>';
    });
    filaments.innerHTML = out;
  }
  if (filaments && scene) {
    // cards finish snapping into place ~2.3s after load; draw once they have settled
    setTimeout(drawFilaments, reduceMotion ? 50 : 2400);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(drawFilaments, reduceMotion ? 60 : 2500); });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
