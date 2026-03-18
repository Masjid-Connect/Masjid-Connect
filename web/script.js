/**
 * The Salafi Masjid — Site Interactions
 * Scroll reveal, navbar state, mobile nav toggle.
 */

(function () {
  'use strict';

  // ─── Scroll Reveal (Intersection Observer) ──────────────────
  var revealSelectors = '.reveal, .reveal-scale, .reveal-left, .reveal-right, .reveal-stagger';
  var revealElements = document.querySelectorAll(revealSelectors);
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6, rootMargin: '0px 0px -60px 0px' }
    );

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealElements.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }


  // ─── Navbar scroll state ───────────────────────────────────
  const navbar = document.getElementById('navbar');
  const scrollThreshold = 50;

  // Only apply scroll-based styling on pages without navbar--solid
  // (i.e., the home page with the transparent hero)
  const isSolidNav = navbar && navbar.classList.contains('navbar--solid');

  function updateNavbar() {
    if (isSolidNav) return; // Always solid on inner pages
    if (window.scrollY > scrollThreshold) {
      navbar.classList.add('is-scrolled');
    } else {
      navbar.classList.remove('is-scrolled');
    }
  }

  if (navbar) {
    window.addEventListener('scroll', updateNavbar, { passive: true });
    updateNavbar();
  }

  // ─── Mobile nav toggle (iOS sheet) ─────────────────────────
  var toggle = document.getElementById('nav-toggle');
  var navMenu = document.getElementById('nav-menu');

  function closeMenu() {
    navMenu.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function openMenu() {
    navMenu.classList.add('is-open');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  if (toggle && navMenu) {
    toggle.addEventListener('click', function () {
      if (navMenu.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close on link/CTA click
    navMenu.querySelectorAll('.mobile-menu__item, .mobile-menu__cta, .navbar__link').forEach(function (link) {
      if (link.tagName === 'A') {
        link.addEventListener('click', closeMenu);
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
        closeMenu();
      }
    });
  }

  // ─── Dark mode toggle ─────────────────────────────────────
  var darkToggle = document.getElementById('dark-mode-toggle');

  if (darkToggle) {
    // Restore saved preference
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      darkToggle.checked = true;
    }

    darkToggle.addEventListener('change', function () {
      if (darkToggle.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
    });
  }

  // ─── Language segmented control ────────────────────────────
  var langToggle = document.getElementById('lang-toggle');

  if (langToggle) {
    var savedLang = localStorage.getItem('lang') || 'en';
    var langBtns = langToggle.querySelectorAll('.mobile-menu__seg-btn');

    // Restore saved lang
    langBtns.forEach(function (btn) {
      btn.classList.toggle('mobile-menu__seg-btn--active', btn.dataset.lang === savedLang);
    });

    langBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        langBtns.forEach(function (b) { b.classList.remove('mobile-menu__seg-btn--active'); });
        btn.classList.add('mobile-menu__seg-btn--active');
        localStorage.setItem('lang', btn.dataset.lang);
        // Language swap can be wired to i18n later
      });
    });
  }
  // ─── Footer accordion toggles (mobile) ────────────────────
  var footerCols = document.querySelectorAll('.footer__col:not(.footer__col--brand)');

  footerCols.forEach(function (col) {
    var heading = col.querySelector('.footer__heading');
    var list = col.querySelector('.footer__list');
    var badges = col.querySelector('.footer__store-badges');

    if (heading && list) {
      heading.addEventListener('click', function () {
        var isOpen = heading.classList.contains('is-open');

        // Close all other sections first
        footerCols.forEach(function (otherCol) {
          var otherHeading = otherCol.querySelector('.footer__heading');
          var otherList = otherCol.querySelector('.footer__list');
          var otherBadges = otherCol.querySelector('.footer__store-badges');
          if (otherHeading) otherHeading.classList.remove('is-open');
          if (otherList) otherList.classList.remove('is-open');
          if (otherBadges) otherBadges.classList.remove('is-open');
        });

        // Toggle current section
        if (!isOpen) {
          heading.classList.add('is-open');
          list.classList.add('is-open');
          if (badges) badges.classList.add('is-open');
        }
      });
    }
  });

  // ─── Speculative prefetch on hover (instant page loads) ────
  // Prefetch same-origin pages when the user hovers a link,
  // so by the time they click the page is already cached.
  var prefetched = {};

  function prefetchOnHover(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    // Only same-origin relative links, skip anchors/external/js
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
    if (prefetched[href]) return;
    prefetched[href] = true;
    var tag = document.createElement('link');
    tag.rel = 'prefetch';
    tag.href = href;
    document.head.appendChild(tag);
  }

  document.addEventListener('pointerenter', prefetchOnHover, true);

  // ─── Spam Protection Helpers ────────────────────────────────

  // Track when page loaded — submissions within 3s are likely bots
  var pageLoadTime = Date.now();
  var MIN_SUBMIT_DELAY = 3000; // 3 seconds

  // Turnstile token storage
  var turnstileTokens = { contact: null, donate: null };

  // Global callbacks for Turnstile
  window.onContactTurnstile = function (token) { turnstileTokens.contact = token; };
  window.onDonateTurnstile = function (token) { turnstileTokens.donate = token; };

  // Honeypot check — returns true if bot detected
  function isHoneypotFilled(formEl) {
    var hp = formEl.querySelector('.form-hp input');
    return hp && hp.value.length > 0;
  }

  // Time-based check — returns true if submitted too fast
  function isSubmittedTooFast() {
    return (Date.now() - pageLoadTime) < MIN_SUBMIT_DELAY;
  }

  // ─── Contact form handling ──────────────────────────────────
  var contactForm = document.getElementById('contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn = document.getElementById('contact-submit');
      var successEl = document.getElementById('form-success');
      var errorEl = document.getElementById('form-error');
      var errorText = errorEl.querySelector('span');
      var submitText = submitBtn.querySelector('.contact-form__submit-text');

      // Hide previous status
      successEl.hidden = true;
      errorEl.hidden = true;

      // ── Spam checks ──
      // 1. Honeypot
      if (isHoneypotFilled(contactForm)) {
        // Silently "succeed" — don't reveal the bot was caught
        successEl.hidden = false;
        contactForm.reset();
        return;
      }

      // 2. Time-based (too fast = bot)
      if (isSubmittedTooFast()) {
        errorText.textContent = 'Please wait a moment before submitting.';
        errorEl.hidden = false;
        return;
      }

      // 3. Turnstile token
      if (!turnstileTokens.contact) {
        errorText.textContent = 'Please complete the security check.';
        errorEl.hidden = false;
        return;
      }

      // Disable and show loading
      submitBtn.disabled = true;
      submitText.textContent = 'Sending...';

      var formData = new FormData(contactForm);
      var data = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        'cf-turnstile-response': turnstileTokens.contact
      };

      fetch('https://api.salafimasjid.app/api/v1/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Failed');
          successEl.hidden = false;
          contactForm.reset();
          turnstileTokens.contact = null;
          // Reset Turnstile widget
          if (window.turnstile) window.turnstile.reset();
        })
        .catch(function () {
          errorText.innerHTML = 'Something went wrong. Please email us directly at <a href="mailto:info@salafimasjid.app">info@salafimasjid.app</a>';
          errorEl.hidden = false;
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitText.textContent = 'Send Message';
        });
    });
  }

  // ─── Donate form spam protection ──────────────────────────────
  var donateSubmit = document.getElementById('donate-submit');

  if (donateSubmit) {
    var originalClick = donateSubmit.onclick;

    donateSubmit.addEventListener('click', function (e) {
      var formCard = donateSubmit.closest('.donate__form-card');
      var errorEl = document.getElementById('donate-error');
      var errorText = document.getElementById('donate-error-text');

      // 1. Honeypot
      if (formCard && isHoneypotFilled(formCard)) {
        // Silently "succeed"
        var successEl = document.getElementById('donate-success');
        if (successEl) successEl.hidden = false;
        return;
      }

      // 2. Time-based
      if (isSubmittedTooFast()) {
        if (errorEl && errorText) {
          errorText.textContent = 'Please wait a moment before submitting.';
          errorEl.hidden = false;
        }
        e.stopImmediatePropagation();
        return;
      }

      // 3. Turnstile token
      if (!turnstileTokens.donate) {
        if (errorEl && errorText) {
          errorText.textContent = 'Please complete the security check.';
          errorEl.hidden = false;
        }
        e.stopImmediatePropagation();
        return;
      }
    }, true); // capture phase — runs before any Stripe handler
  }
})();
