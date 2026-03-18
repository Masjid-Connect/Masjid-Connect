/**
 * The Salafi Masjid — Donation Page
 *
 * Architecture:
 *   Primary:  Stripe Embedded Checkout (inline, no redirect)
 *   Fallback: Stripe Hosted Checkout (redirect if embedded fails)
 *   Manual:   Bank Transfer bottom sheet
 *
 * Flow:
 *   1. User selects frequency + amount
 *   2. Clicks "Donate Now"
 *   3. fetch() creates a checkout session via the API
 *   4. Stripe.js mounts the embedded checkout inline
 *   5. On completion → success state
 *   6. If embedded fails → falls back to redirect checkout
 */
(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────
  var CHECKOUT_URL = '/api/v1/donate/checkout/';

  // ─── State ───────────────────────────────────────────────────
  var selectedAmount = 50;
  var frequency = 'one-time';
  var checkoutInstance = null;

  // ─── DOM refs ────────────────────────────────────────────────
  var amountBtns = document.querySelectorAll('.donate__amount');
  var freqBtns = document.querySelectorAll('.donate__freq-btn');
  var customInput = document.getElementById('custom-amount');
  var cardBtn = document.getElementById('pay-card');
  var bankBtn = document.getElementById('pay-bank');
  var successEl = document.getElementById('donate-success');
  var errorEl = document.getElementById('donate-error');
  var errorText = document.getElementById('donate-error-text');
  var giftAidCheckbox = document.getElementById('gift-aid');
  var formSteps = document.querySelectorAll('.donate__step, .form-hp');
  var checkoutContainer = document.getElementById('checkout-container');
  var checkoutBack = document.getElementById('checkout-back');

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
    hideError();

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

  function hideError() {
    if (errorEl) errorEl.hidden = true;
  }

  // ─── Loading state ──────────────────────────────────────────
  function setLoading(loading) {
    var label = cardBtn.querySelector('.donate__method-label');
    if (loading) {
      cardBtn.classList.add('donate__method-btn--loading');
      cardBtn.disabled = true;
      if (label) label.textContent = 'Loading checkout...';
    } else {
      cardBtn.classList.remove('donate__method-btn--loading');
      cardBtn.disabled = false;
      if (label) label.textContent = 'Donate Now';
    }
  }

  // ─── Show/hide checkout vs form ─────────────────────────────
  function showCheckout() {
    formSteps.forEach(function (el) { el.hidden = true; });
    if (checkoutContainer) checkoutContainer.hidden = false;
    if (checkoutBack) checkoutBack.hidden = false;
  }

  function showForm() {
    formSteps.forEach(function (el) { el.hidden = false; });
    if (checkoutContainer) checkoutContainer.hidden = true;
    if (checkoutBack) checkoutBack.hidden = true;
    hideError();
    destroyCheckout();
  }

  function destroyCheckout() {
    if (checkoutInstance) {
      checkoutInstance.destroy();
      checkoutInstance = null;
    }
  }

  // ─── Back button ────────────────────────────────────────────
  if (checkoutBack) {
    checkoutBack.addEventListener('click', showForm);
  }

  // ─── Create checkout session via API ────────────────────────
  function createSession(uiMode) {
    var returnUrl = window.location.origin + window.location.pathname;

    return fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(selectedAmount * 100),
        currency: 'gbp',
        frequency: frequency,
        return_url: returnUrl,
        gift_aid: giftAidCheckbox && giftAidCheckbox.checked ? 'yes' : 'no',
        ui_mode: uiMode,
      }),
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.detail || 'Something went wrong.');
        });
      }
      return res.json();
    });
  }

  // ─── Stripe Embedded Checkout ───────────────────────────────
  function initEmbeddedCheckout() {
    if (!validateAmount()) return;

    setLoading(true);
    hideError();

    createSession('embedded')
      .then(function (data) {
        if (!data.client_secret || !data.publishable_key) {
          throw new Error('Missing checkout credentials.');
        }

        // Wait for Stripe.js to load (it's loaded async)
        return waitForStripe().then(function () {
          return data;
        });
      })
      .then(function (data) {
        var stripe = Stripe(data.publishable_key);
        return stripe.initEmbeddedCheckout({
          clientSecret: data.client_secret,
        });
      })
      .then(function (checkout) {
        checkoutInstance = checkout;
        setLoading(false);
        showCheckout();
        checkout.mount('#checkout-container');
      })
      .catch(function (err) {
        setLoading(false);
        // Fallback: redirect checkout via form POST
        console.warn('Embedded checkout failed, trying redirect:', err.message);
        formPostFallback();
      });
  }

  // ─── Fallback: form POST redirect to Stripe Hosted Checkout ─
  function formPostFallback() {
    var returnUrl = window.location.origin + window.location.pathname;

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = CHECKOUT_URL;
    form.style.display = 'none';

    var fields = {
      amount: Math.round(selectedAmount * 100),
      currency: 'gbp',
      frequency: frequency,
      return_url: returnUrl,
      gift_aid: giftAidCheckbox && giftAidCheckbox.checked ? 'yes' : 'no',
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
  }

  // ─── Wait for Stripe.js to be available ─────────────────────
  function waitForStripe() {
    return new Promise(function (resolve, reject) {
      if (typeof Stripe !== 'undefined') {
        resolve();
        return;
      }

      var attempts = 0;
      var maxAttempts = 50; // 5 seconds
      var interval = setInterval(function () {
        attempts++;
        if (typeof Stripe !== 'undefined') {
          clearInterval(interval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Stripe.js failed to load.'));
        }
      }, 100);
    });
  }

  // ─── Wire up the Donate Now button ──────────────────────────
  cardBtn.addEventListener('click', initEmbeddedCheckout);

  // ─── Bank Transfer (Bottom Sheet) ───────────────────────────
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

  // ─── Check for return from checkout ─────────────────────────
  var params = new URLSearchParams(window.location.search);
  var donation = params.get('donation');

  if (donation === 'success') {
    formSteps.forEach(function (el) { el.hidden = true; });
    if (successEl) {
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    window.history.replaceState({}, '', window.location.pathname);
  } else if (donation === 'cancelled') {
    showError('Donation was cancelled. You can try again whenever you\'re ready.');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (donation === 'error') {
    var msg = params.get('msg') || 'Something went wrong. Please try again.';
    showError(msg);
    window.history.replaceState({}, '', window.location.pathname);
  }
})();
