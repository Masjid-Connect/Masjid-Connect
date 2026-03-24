/**
 * The Salafi Masjid — Site Interactions
 * Scroll reveal, navbar state, mobile nav toggle.
 */

// ─── Sentry Browser Error Tracking ─────────────────────────
// Lightweight init — captures unhandled errors and rejections.
// DSN is only set in production builds; no-ops if absent.
(function () {
  var SENTRY_DSN = ''; // Set to your Sentry Browser DSN in production
  if (!SENTRY_DSN) return;

  var sentryScript = document.createElement('script');
  sentryScript.src = 'https://browser.sentry-cdn.com/8.0.0/bundle.tracing.min.js';
  sentryScript.crossOrigin = 'anonymous';
  sentryScript.onload = function () {
    if (window.Sentry) {
      window.Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.1,
        environment: window.location.hostname === 'salafimasjid.app' ? 'production' : 'staging',
        beforeSend: function (event) {
          // Strip PII
          if (event.user) {
            delete event.user.email;
            delete event.user.ip_address;
          }
          return event;
        },
      });
    }
  };
  document.head.appendChild(sentryScript);
})();

(function () {
  'use strict';

  // ─── Scroll Reveal (Intersection Observer) ──────────────────
  const revealSelectors = '.reveal, .reveal-scale, .reveal-left, .reveal-right, .reveal-stagger';
  const revealElements = document.querySelectorAll(revealSelectors);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    // Default observer for most elements (60% visible triggers reveal)
    var defaultThreshold = 0.6;
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: defaultThreshold, rootMargin: '0px 0px -60px 0px' }
    );

    // Low-threshold observer for tall elements (legal pages, long content)
    var lowThresholdObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            lowThresholdObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -60px 0px' }
    );

    revealElements.forEach(function (el) {
      if (el.dataset.revealThreshold) {
        lowThresholdObserver.observe(el);
      } else {
        revealObserver.observe(el);
      }
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
  const toggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

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
  const darkToggle = document.getElementById('dark-mode-toggle');

  if (darkToggle) {
    // Restore saved preference
    const savedTheme = localStorage.getItem('theme');
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
  const langToggle = document.getElementById('lang-toggle');

  if (langToggle) {
    const savedLang = localStorage.getItem('lang') || 'en';
    const langBtns = langToggle.querySelectorAll('.mobile-menu__seg-btn');

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
  const footerCols = document.querySelectorAll('.footer__col:not(.footer__col--brand)');

  footerCols.forEach(function (col, index) {
    const heading = col.querySelector('.footer__heading');
    const list = col.querySelector('.footer__list');
    const badges = col.querySelector('.footer__store-badges');

    if (heading && list) {
      // ARIA: make headings accessible as toggle buttons
      const regionId = 'footer-section-' + index;
      heading.setAttribute('role', 'button');
      heading.setAttribute('aria-expanded', 'false');
      heading.setAttribute('aria-controls', regionId);
      heading.setAttribute('tabindex', '0');
      list.setAttribute('id', regionId);
      list.setAttribute('role', 'region');

      function toggleSection() {
        const isOpen = heading.classList.contains('is-open');

        // Close all other sections first
        footerCols.forEach(function (otherCol) {
          const otherHeading = otherCol.querySelector('.footer__heading');
          const otherList = otherCol.querySelector('.footer__list');
          const otherBadges = otherCol.querySelector('.footer__store-badges');
          if (otherHeading) {
            otherHeading.classList.remove('is-open');
            otherHeading.setAttribute('aria-expanded', 'false');
          }
          if (otherList) otherList.classList.remove('is-open');
          if (otherBadges) otherBadges.classList.remove('is-open');
        });

        // Toggle current section
        if (!isOpen) {
          heading.classList.add('is-open');
          heading.setAttribute('aria-expanded', 'true');
          list.classList.add('is-open');
          if (badges) badges.classList.add('is-open');
        }
      }

      heading.addEventListener('click', toggleSection);
      heading.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleSection();
        }
      });
    }
  });

  // ─── Speculative prefetch on hover (instant page loads) ────
  // Prefetch same-origin pages when the user hovers a link,
  // so by the time they click the page is already cached.
  const prefetched = {};

  function prefetchOnHover(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    // Only same-origin relative links, skip anchors/external/js
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
    if (prefetched[href]) return;
    prefetched[href] = true;
    const tag = document.createElement('link');
    tag.rel = 'prefetch';
    tag.href = href;
    document.head.appendChild(tag);
  }

  document.addEventListener('pointerenter', prefetchOnHover, true);

  // ─── Spam Protection Helpers ────────────────────────────────

  // Track when page loaded — submissions within 3s are likely bots
  const pageLoadTime = Date.now();
  const MIN_SUBMIT_DELAY = 3000; // 3 seconds

  // Turnstile token storage
  const turnstileTokens = { contact: null, donate: null };

  // Global callbacks for Turnstile
  window.onContactTurnstile = function (token) { turnstileTokens.contact = token; };
  window.onDonateTurnstile = function (token) { turnstileTokens.donate = token; };

  // Honeypot check — returns true if bot detected
  function isHoneypotFilled(formEl) {
    const hp = formEl.querySelector('.form-hp input');
    return hp && hp.value.length > 0;
  }

  // Time-based check — returns true if submitted too fast
  function isSubmittedTooFast() {
    return (Date.now() - pageLoadTime) < MIN_SUBMIT_DELAY;
  }

  // ─── Contact form handling ──────────────────────────────────
  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const submitBtn = document.getElementById('contact-submit');
      const formSuccessEl = document.getElementById('form-success');
      const formErrorEl = document.getElementById('form-error');
      const formErrorText = formErrorEl.querySelector('span');
      const submitText = submitBtn.querySelector('.contact-form__submit-text');

      // Hide previous status
      formSuccessEl.hidden = true;
      formErrorEl.hidden = true;

      // ── Spam checks ──
      // 1. Honeypot
      if (isHoneypotFilled(contactForm)) {
        // Silently "succeed" — don't reveal the bot was caught
        formSuccessEl.hidden = false;
        contactForm.reset();
        return;
      }

      // 2. Time-based (too fast = bot)
      if (isSubmittedTooFast()) {
        formErrorText.textContent = 'Please wait a moment before submitting.';
        formErrorEl.hidden = false;
        return;
      }

      // 3. Turnstile token
      if (!turnstileTokens.contact) {
        formErrorText.textContent = 'Please complete the security check.';
        formErrorEl.hidden = false;
        return;
      }

      // Disable and show loading
      submitBtn.disabled = true;
      submitText.textContent = 'Sending...';

      const formData = new FormData(contactForm);
      const data = {
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
          formErrorEl.hidden = true;
          formSuccessEl.hidden = false;
          contactForm.reset();
          turnstileTokens.contact = null;
          // Reset Turnstile widget
          if (window.turnstile) window.turnstile.reset();
        })
        .catch(function () {
          formSuccessEl.hidden = true;
          formErrorText.innerHTML = 'Something went wrong. Please email us directly at <a href="mailto:info@salafimasjid.app">info@salafimasjid.app</a>';
          formErrorEl.hidden = false;
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitText.textContent = 'Send Message';
        });
    });
  }

  // ─── Donate form spam protection ──────────────────────────────
  const donateSubmit = document.getElementById('pay-card');

  if (donateSubmit) {
    donateSubmit.addEventListener('click', function (e) {
      const formCard = donateSubmit.closest('.donate__form-card');
      const donateErrorEl = document.getElementById('donate-error');
      const donateErrorText = document.getElementById('donate-error-text');

      // 1. Honeypot
      if (formCard && isHoneypotFilled(formCard)) {
        // Silently "succeed"
        const donateSuccessEl = document.getElementById('donate-success');
        if (donateSuccessEl) donateSuccessEl.hidden = false;
        return;
      }

      // 2. Time-based
      if (isSubmittedTooFast()) {
        if (donateErrorEl && donateErrorText) {
          donateErrorText.textContent = 'Please wait a moment before submitting.';
          donateErrorEl.hidden = false;
        }
        e.stopImmediatePropagation();
        return;
      }

      // 3. Turnstile token
      if (!turnstileTokens.donate) {
        if (donateErrorEl && donateErrorText) {
          donateErrorText.textContent = 'Please complete the security check.';
          donateErrorEl.hidden = false;
        }
        e.stopImmediatePropagation();
        return;
      }
    }, true); // capture phase — runs before any Stripe handler
  }
})();
