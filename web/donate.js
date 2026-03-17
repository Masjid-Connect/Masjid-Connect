/**
 * The Salafi Masjid — Donation Page
 *
 * Architecture:
 *   Card / Apple Pay / Google Pay / PayPal / Pay by Bank  →  Stripe Hosted Checkout (redirect)
 *   Bank Transfer                                          →  Bottom sheet with bank details
 *
 * Uses a form POST to the API which redirects to Stripe's hosted checkout.
 * No cross-origin fetch() calls — avoids CORS entirely.
 */
(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────
  var CHECKOUT_URL = 'https://api.salafimasjid.app/api/v1/donate/checkout/';

  // ─── State ───────────────────────────────────────────────────
  var selectedAmount = 50;
  var frequency = 'one-time';

  // ─── DOM refs ────────────────────────────────────────────────
  var amountBtns = document.querySelectorAll('.donate__amount');
  var freqBtns = document.querySelectorAll('.donate__freq-btn');
  var customInput = document.getElementById('custom-amount');
  var cardBtn = document.getElementById('pay-card');
  var bankBtn = document.getElementById('pay-bank');
  var successEl = document.getElementById('donate-success');
  var errorEl = document.getElementById('donate-error');
  var errorText = document.getElementById('donate-error-text');
  var formSteps = document.querySelectorAll('.donate__step, .donate__secure, .form-hp');

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
      showError('Please select or enter a donation amount.');
      return false;
    }

    if (selectedAmount > 10000) {
      showError('For donations over £10,000, please contact the masjid directly.');
      return false;
    }

    return true;
  }

  function showError(msg) {
    if (errorText) errorText.textContent = msg;
    if (errorEl) errorEl.hidden = false;
  }

  // ─── Card / Apple Pay / Google Pay / PayPal (Hosted Checkout) ──
  //
  // Submits a hidden HTML form to the API. The API creates a Stripe
  // hosted checkout session and returns a 303 redirect to Stripe.
  // This is a full page navigation — no CORS, no fetch().
  //
  cardBtn.addEventListener('click', function () {
    if (!validateAmount()) return;

    // Show loading state
    cardBtn.classList.add('donate__method-btn--loading');
    var label = cardBtn.querySelector('.donate__method-label');
    var originalText = label ? label.textContent : '';
    if (label) label.textContent = 'Redirecting to checkout...';

    var returnUrl = window.location.origin + window.location.pathname;

    // Build and submit a hidden form (full page navigation, no CORS)
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = CHECKOUT_URL;
    form.style.display = 'none';

    var fields = {
      amount: Math.round(selectedAmount * 100),
      currency: 'gbp',
      frequency: frequency,
      return_url: returnUrl
    };

    Object.keys(fields).forEach(function (name) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = fields[name];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
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

  var copyBtns = bankSheet ? bankSheet.querySelectorAll('.bank-sheet__copy-btn[data-copy]') : [];
  copyBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      copyToClipboard(btn.getAttribute('data-copy'), btn);
    });
  });

  var copyableValues = bankSheet ? bankSheet.querySelectorAll('.bank-sheet__value[data-copy]') : [];
  copyableValues.forEach(function (el) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () {
      var row = el.closest('.bank-sheet__copyable');
      var btn = row ? row.querySelector('.bank-sheet__copy-btn') : null;
      if (btn) copyToClipboard(el.getAttribute('data-copy'), btn);
    });
  });

  // ─── Check for return from Stripe checkout ─────────────────
  var params = new URLSearchParams(window.location.search);
  var donation = params.get('donation');

  if (donation === 'success') {
    // User completed payment — show success message
    formSteps.forEach(function (el) { el.style.display = 'none'; });
    if (successEl) {
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    window.history.replaceState({}, '', window.location.pathname);
  } else if (donation === 'cancelled') {
    // User cancelled — show the form again with a message
    showError('Donation was cancelled. You can try again whenever you\'re ready.');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (donation === 'error') {
    var msg = params.get('msg') || 'Something went wrong. Please try again.';
    showError(msg);
    window.history.replaceState({}, '', window.location.pathname);
  }
})();
