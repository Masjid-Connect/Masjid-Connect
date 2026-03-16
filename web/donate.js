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

  // ─── Init Stripe ─────────────────────────────────────────────
  if (typeof Stripe !== 'undefined' && STRIPE_PK) {
    stripe = Stripe(STRIPE_PK);
  }

  // ─── Amount selection ────────────────────────────────────────
  amountBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      amountBtns.forEach(function (b) { b.classList.remove('donate__amount--active'); });
      btn.classList.add('donate__amount--active');
      selectedAmount = parseInt(btn.dataset.amount, 10);
      customInput.value = '';
    });
  });

  customInput.addEventListener('input', function () {
    var val = parseFloat(customInput.value);
    if (val && val > 0) {
      amountBtns.forEach(function (b) { b.classList.remove('donate__amount--active'); });
      selectedAmount = val;
    } else {
      selectedAmount = 50;
    }
  });

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
    errorEl.hidden = true;

    if (!selectedAmount || selectedAmount < 1) {
      errorText.textContent = 'Please select or enter a donation amount.';
      errorEl.hidden = false;
      return false;
    }

    if (selectedAmount > 10000) {
      errorText.textContent = 'For donations over £10,000, please contact the masjid directly.';
      errorEl.hidden = false;
      return false;
    }

    return true;
  }

  // ─── Card / Apple Pay / Google Pay (Stripe Checkout) ────────
  cardBtn.addEventListener('click', function () {
    if (!validateAmount()) return;

    if (!stripe) {
      errorText.textContent = 'Payment is loading. Please wait a moment and try again.';
      errorEl.hidden = false;
      return;
    }

    // Disable button to prevent double-clicks
    cardBtn.classList.add('donate__method-btn--loading');
    var label = cardBtn.querySelector('.donate__method-label');
    var originalText = label.textContent;
    label.textContent = 'Redirecting to checkout...';

    var origin = window.location.origin;
    var donatePageUrl = origin + '/donate.html';

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
          return res.json().then(function (body) {
            throw new Error(body.detail || 'Failed to start checkout');
          });
        }
        return res.json();
      })
      .then(function (data) {
        // Redirect to Stripe Checkout
        return stripe.redirectToCheckout({ sessionId: data.id });
      })
      .then(function (result) {
        if (result && result.error) {
          throw new Error(result.error.message);
        }
      })
      .catch(function (err) {
        errorText.textContent = err.message || 'Something went wrong. Please try again.';
        errorEl.hidden = false;
        cardBtn.classList.remove('donate__method-btn--loading');
        label.textContent = originalText;
      });
  });

  // ─── Bank Transfer (Bottom Sheet) ──────────────────────────
  var bankSheet = document.getElementById('bank-sheet');
  var bankBackdrop = document.getElementById('bank-sheet-backdrop');
  var bankClose = document.getElementById('bank-sheet-close');

  function openBankSheet() {
    bankSheet.hidden = false;
    // Trigger reflow for animation
    bankSheet.offsetHeight;
    bankSheet.classList.add('bank-sheet--open');
    document.body.style.overflow = 'hidden';
  }

  function closeBankSheet() {
    bankSheet.classList.remove('bank-sheet--open');
    document.body.style.overflow = '';
    setTimeout(function () { bankSheet.hidden = true; }, 300);
  }

  bankBtn.addEventListener('click', openBankSheet);
  bankClose.addEventListener('click', closeBankSheet);
  bankBackdrop.addEventListener('click', closeBankSheet);

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !bankSheet.hidden) closeBankSheet();
  });

  // ─── Check for Stripe redirect return ──────────────────────
  function checkReturnStatus() {
    var params = new URLSearchParams(window.location.search);

    if (params.get('success') === '1') {
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Hide the form steps
      var steps = document.querySelectorAll('.donate__step, .donate__secure, .form-hp');
      steps.forEach(function (el) { el.style.display = 'none'; });

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (params.get('cancelled') === '1') {
      // Clean URL silently — user just came back
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  checkReturnStatus();
})();
