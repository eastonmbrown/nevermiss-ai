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

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
