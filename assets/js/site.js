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

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
