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
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealElements.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // ─── Parallax (subtle Y-shift on scroll) ──────────────────
  var parallaxEls = document.querySelectorAll('.parallax');

  if (parallaxEls.length && !prefersReducedMotion) {
    var ticking = false;

    function updateParallax() {
      var scrollY = window.scrollY;

      parallaxEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var speed = parseFloat(el.dataset.speed) || 0.08;
        var center = rect.top + rect.height / 2;
        var viewCenter = window.innerHeight / 2;
        var offset = (center - viewCenter) * speed;
        el.style.transform = 'translateY(' + offset + 'px)';
      });

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
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
  // ─── Contact form handling ──────────────────────────────────
  var contactForm = document.getElementById('contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn = document.getElementById('contact-submit');
      var successEl = document.getElementById('form-success');
      var errorEl = document.getElementById('form-error');
      var submitText = submitBtn.querySelector('.contact-form__submit-text');

      // Hide previous status
      successEl.hidden = true;
      errorEl.hidden = true;

      // Disable and show loading
      submitBtn.disabled = true;
      submitText.textContent = 'Sending...';

      var formData = new FormData(contactForm);
      var data = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
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
        })
        .catch(function () {
          errorEl.hidden = false;
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitText.textContent = 'Send Message';
        });
    });
  }
})();
