/**
 * The Salafi Masjid — Donation Page
 *
 * Architecture:
 *   Card / Apple Pay / Google Pay  →  Stripe Checkout (redirect)
 *   PayPal                         →  PayPal hosted donation page
 *   Bank Transfer                  →  Bottom sheet with bank details
 */
(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────
  var STRIPE_PK = 'pk_live_jhdJimpenQpkL3cvCMC8wSa700y5o67fj1';
  var CHECKOUT_URL = 'https://api.salafimasjid.app/api/v1/donate/checkout/';

  // ─── State ───────────────────────────────────────────────────
  var selectedAmount = 50;
  var frequency = 'one-time';
  var stripe = null;

  // ─── DOM refs ────────────────────────────────────────────────
  var amountBtns = document.querySelectorAll('.donate__amount');
  var freqBtns = document.querySelectorAll('.donate__freq-btn');
  var customInput = document.getElementById('custom-amount');
  var cardBtn = document.getElementById('pay-card');
  var bankBtn = document.getElementById('pay-bank');
  var successEl = document.getElementById('donate-success');
  var errorEl = document.getElementById('donate-error');
  var errorText = document.getElementById('donate-error-text');

  if (!cardBtn) return;

  // ─── Amount selection ────────────────────────────────────────
  amountBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      amountBtns.forEach(function (b) { b.classList.remove('donate__amount--active'); });
      btn.classList.add('donate__amount--active');
      selectedAmount = parseInt(btn.dataset.amount, 10);
      if (customInput) customInput.value = '';
    });
  });

  if (customInput) {
    customInput.addEventListener('input', function () {
      var val = parseFloat(customInput.value);
      if (val && val > 0) {
        amountBtns.forEach(function (b) { b.classList.remove('donate__amount--active'); });
        selectedAmount = val;
      } else {
        selectedAmount = 50;
      }
    });
  }

  // ─── Frequency toggle ───────────────────────────────────────
  freqBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      freqBtns.forEach(function (b) { b.classList.remove('donate__freq-btn--active'); });
      btn.classList.add('donate__freq-btn--active');
      frequency = btn.dataset.freq;
    });
  });

  // ─── Validation ─────────────────────────────────────────────
  function validateAmount() {
    if (errorEl) errorEl.hidden = true;

    if (!selectedAmount || selectedAmount < 1) {
      if (errorText) errorText.textContent = 'Please select or enter a donation amount.';
      if (errorEl) errorEl.hidden = false;
      return false;
    }

    if (selectedAmount > 10000) {
      if (errorText) errorText.textContent = 'For donations over £10,000, please contact the masjid directly.';
      if (errorEl) errorEl.hidden = false;
      return false;
    }

    return true;
  }

  function showError(msg) {
    if (errorText) errorText.textContent = msg;
    if (errorEl) errorEl.hidden = false;
  }

  // ─── Init Stripe (deferred, never blocks other listeners) ──
  function initStripe() {
    if (stripe) return;
    try {
      if (typeof Stripe !== 'undefined' && STRIPE_PK) {
        stripe = Stripe(STRIPE_PK);
      }
    } catch (e) {
      stripe = null;
    }
  }

  // Try once now, and retry on click if needed
  initStripe();

  // ─── Card / Apple Pay / Google Pay (Stripe Checkout) ────────
  cardBtn.addEventListener('click', function () {
    if (!validateAmount()) return;

    // Lazy-init Stripe in case it wasn't ready at page load
    initStripe();

    if (!stripe) {
      showError('Payment is loading. Please wait a moment and try again.');
      return;
    }

    // Disable button to prevent double-clicks
    cardBtn.classList.add('donate__method-btn--loading');
    var label = cardBtn.querySelector('.donate__method-label');
    var originalText = label ? label.textContent : '';
    if (label) label.textContent = 'Redirecting to checkout...';

    var donatePageUrl = window.location.origin + window.location.pathname;

    fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(selectedAmount * 100),
        currency: 'gbp',
        frequency: frequency,
        success_url: donatePageUrl + '?success=1',
        cancel_url: donatePageUrl + '?cancelled=1'
      })
    })
      .then(function (res) {
        if (!res.ok) {
          var contentType = res.headers.get('content-type') || '';
          if (contentType.indexOf('application/json') !== -1) {
            return res.json().then(function (body) {
              throw new Error(body.detail || 'Failed to start checkout');
            });
          }
          throw new Error('Payment service is temporarily unavailable. Please try again later.');
        }
        return res.json();
      })
      .then(function (data) {
        return stripe.redirectToCheckout({ sessionId: data.id });
      })
      .then(function (result) {
        if (result && result.error) {
          throw new Error(result.error.message);
        }
      })
      .catch(function (err) {
        showError(err.message || 'Something went wrong. Please try again.');
        cardBtn.classList.remove('donate__method-btn--loading');
        if (label) label.textContent = originalText;
      });
  });

  // ─── Bank Transfer (Bottom Sheet) ──────────────────────────
  var bankSheet = document.getElementById('bank-sheet');
  var bankBackdrop = document.getElementById('bank-sheet-backdrop');
  var bankClose = document.getElementById('bank-sheet-close');

  function openBankSheet() {
    if (!bankSheet) return;
    bankSheet.hidden = false;
    bankSheet.offsetHeight; // trigger reflow for animation
    bankSheet.classList.add('bank-sheet--open');
    document.body.style.overflow = 'hidden';
  }

  function closeBankSheet() {
    if (!bankSheet) return;
    bankSheet.classList.remove('bank-sheet--open');
    document.body.style.overflow = '';
    setTimeout(function () { bankSheet.hidden = true; }, 300);
  }

  if (bankBtn) bankBtn.addEventListener('click', openBankSheet);
  if (bankClose) bankClose.addEventListener('click', closeBankSheet);
  if (bankBackdrop) bankBackdrop.addEventListener('click', closeBankSheet);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && bankSheet && !bankSheet.hidden) closeBankSheet();
  });

  // ─── Tap-to-copy bank details ────────────────────────────
  var copyableValues = bankSheet ? bankSheet.querySelectorAll('.bank-sheet__value[data-copy]') : [];

  copyableValues.forEach(function (el) {
    el.addEventListener('click', function () {
      var text = el.getAttribute('data-copy');
      if (!text || !navigator.clipboard) return;

      navigator.clipboard.writeText(text).then(function () {
        var original = el.textContent;
        el.textContent = 'Copied';
        el.classList.add('bank-sheet__value--copied');

        setTimeout(function () {
          el.textContent = original;
          el.classList.remove('bank-sheet__value--copied');
        }, 1500);
      });
    });
  });

  // ─── Check for Stripe redirect return ──────────────────────
  var params = new URLSearchParams(window.location.search);

  if (params.get('success') === '1') {
    if (successEl) {
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    var steps = document.querySelectorAll('.donate__step, .donate__secure, .form-hp');
    steps.forEach(function (el) { el.style.display = 'none'; });
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (params.get('cancelled') === '1') {
    window.history.replaceState({}, '', window.location.pathname);
  }
})();
