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

  // ─── Mobile nav toggle ─────────────────────────────────────
  const toggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (toggle && navMenu) {
    toggle.addEventListener('click', function () {
      const isOpen = navMenu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close mobile nav on link click
    navMenu.querySelectorAll('.navbar__link').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
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
