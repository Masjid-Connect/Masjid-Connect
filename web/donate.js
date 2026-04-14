/**
 * The Salafi Masjid — Donation Page
 *
 * Bank transfer only (for now). Stripe has been removed from the website
 * pending resolution of checkout issues. The mobile app continues to use
 * Stripe via the Django backend.
 *
 * This script handles:
 *   1. Daily rotating hadith (seeded by day of year)
 *   2. Tap-to-copy for bank details (sort code, account number, IBAN, etc.)
 */
(function () {
  'use strict';

  // ─── Tap-to-copy bank details ──────────────────────────────
  function copyToClipboard(text, btn) {
    if (!text || !navigator.clipboard) return;

    navigator.clipboard.writeText(text).then(function () {
      var copyLabel = btn.querySelector('.bank-sheet__copy-label');
      var svg = btn.querySelector('svg');
      if (copyLabel) {
        copyLabel.textContent = 'Copied!';
        btn.classList.add('bank-sheet__copy-btn--copied');
        if (svg) svg.style.display = 'none';

        setTimeout(function () {
          copyLabel.textContent = 'Copy';
          btn.classList.remove('bank-sheet__copy-btn--copied');
          if (svg) svg.style.display = '';
        }, 1500);
      }
    });
  }

  var copyBtns = document.querySelectorAll('.bank-sheet__copy-btn[data-copy]');
  copyBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      copyToClipboard(btn.getAttribute('data-copy'), btn);
    });
  });

  var copyableValues = document.querySelectorAll('.bank-sheet__value[data-copy]');
  copyableValues.forEach(function (el) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () {
      var row = el.closest('.bank-sheet__copyable');
      var btn = row ? row.querySelector('.bank-sheet__copy-btn') : null;
      if (btn) copyToClipboard(el.getAttribute('data-copy'), btn);
    });
  });

  // ─── Rotating hadith (only Bukhari, Muslim, or agreed upon) ──
  var hadiths = [
    { text: 'The most beloved of deeds to Allah are those that are most consistent, even if they are small.', source: 'Sahih al-Bukhari' },
    { text: 'Charity does not decrease wealth.', source: 'Sahih Muslim' },
    { text: 'Protect yourself from the Hellfire even if it is with half a date in charity.', source: 'Sahih al-Bukhari' },
    { text: 'The upper hand is better than the lower hand. The upper hand is the one that gives, and the lower hand is the one that receives.', source: 'Agreed upon' },
    { text: 'When a person dies, his deeds come to an end except for three: ongoing charity, beneficial knowledge, or a righteous child who prays for him.', source: 'Sahih Muslim' },
    { text: 'Allah said: Spend in charity, O son of Adam, and I will spend on you.', source: 'Agreed upon' },
    { text: 'Every Muslim has to give in charity. If he cannot find something to give, then he should work with his hands to benefit himself and give in charity.', source: 'Sahih al-Bukhari' },
  ];

  var hadithTextEl = document.getElementById('hadith-text-hero');
  var hadithSourceEl = document.getElementById('hadith-source-hero');

  if (hadithTextEl && hadithSourceEl) {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var dayOfYear = Math.floor((now - start) / 86400000);
    var hadith = hadiths[dayOfYear % hadiths.length];
    hadithTextEl.textContent = '\u201C' + hadith.text + '\u201D';
    hadithSourceEl.textContent = '\u2014 ' + hadith.source;
  }
})();
