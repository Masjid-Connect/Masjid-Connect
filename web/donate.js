/**
 * The Salafi Masjid — Donation Page
 *
 * Architecture:
 *   Card / Apple Pay / Google Pay / PayPal / Pay by Bank  →  Stripe Embedded Checkout (inline)
 *   Bank Transfer                                          →  Bottom sheet with bank details
 */
(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────
  var STRIPE_PK = 'pk_live_jhdJimpenQpkL3cvCMC8wSa700y5o67fj1';
  var CHECKOUT_URL = 'https://api.salafimasjid.app/api/v1/donate/checkout/';
  var SESSION_STATUS_URL = 'https://api.salafimasjid.app/api/v1/donate/session-status/';

  // ─── State ───────────────────────────────────────────────────
  var selectedAmount = 50;
  var frequency = 'one-time';
  var stripe = null;
  var embeddedCheckout = null;

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

  // ─── Init Stripe (deferred) ─────────────────────────────────
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

  initStripe();

  // ─── API health pre-check (diagnostic only) ────────────────
  var API_BASE = 'https://api.salafimasjid.app';
  fetch(API_BASE + '/health/', { method: 'GET', mode: 'cors' })
    .then(function (res) {
      console.log('[donate] API health check:', res.status, res.ok ? 'OK' : 'FAIL');
    })
    .catch(function (err) {
      console.error('[donate] API UNREACHABLE:', err.message);
    });

  // ─── Show / hide checkout vs form steps ─────────────────────
  function showCheckout() {
    formSteps.forEach(function (el) { el.style.display = 'none'; });
    if (checkoutContainer) checkoutContainer.hidden = false;
    if (checkoutBack) checkoutBack.hidden = false;
  }

  function showForm() {
    formSteps.forEach(function (el) { el.style.display = ''; });
    if (checkoutContainer) checkoutContainer.hidden = true;
    if (checkoutBack) checkoutBack.hidden = true;
    if (errorEl) errorEl.hidden = true;
  }

  // ─── Destroy any existing embedded checkout ─────────────────
  function destroyCheckout() {
    if (embeddedCheckout) {
      embeddedCheckout.destroy();
      embeddedCheckout = null;
    }
  }

  // ─── Back button ────────────────────────────────────────────
  if (checkoutBack) {
    checkoutBack.addEventListener('click', function () {
      destroyCheckout();
      showForm();
    });
  }

  // ─── Card / Apple Pay / Google Pay / PayPal (Embedded Checkout) ──
  function resetCardBtn(label, originalText) {
    cardBtn.classList.remove('donate__method-btn--loading');
    if (label) label.textContent = originalText;
  }

  cardBtn.addEventListener('click', function () {
    if (!validateAmount()) return;

    initStripe();

    if (!stripe) {
      showError('Payment is loading — please wait a moment and try again.');
      console.error('[donate] Stripe.js not loaded. typeof Stripe:', typeof Stripe);
      return;
    }

    // Disable button
    cardBtn.classList.add('donate__method-btn--loading');
    var label = cardBtn.querySelector('.donate__method-label');
    var originalText = label ? label.textContent : '';
    if (label) label.textContent = 'Loading checkout...';

    var returnUrl = window.location.origin + window.location.pathname;
    var payload = {
      amount: Math.round(selectedAmount * 100),
      currency: 'gbp',
      frequency: frequency,
      return_url: returnUrl
    };

    console.log('[donate] POST', CHECKOUT_URL, JSON.stringify(payload));

    fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        console.log('[donate] Response:', res.status, res.statusText);

        if (!res.ok) {
          var contentType = res.headers.get('content-type') || '';

          if (contentType.indexOf('application/json') !== -1) {
            return res.json().then(function (body) {
              console.error('[donate] Server error JSON:', JSON.stringify(body));
              var detail = body.detail || JSON.stringify(body);

              if (res.status === 503) {
                throw new Error('Payment service not configured on the server. Please contact the masjid. (503)');
              }
              if (res.status === 502) {
                throw new Error('Stripe rejected the request — ' + detail + ' (502)');
              }
              if (res.status === 400) {
                throw new Error(detail + ' (400)');
              }
              if (res.status === 429) {
                throw new Error('Too many attempts. Please wait a few minutes and try again. (429)');
              }
              throw new Error(detail + ' (' + res.status + ')');
            });
          }

          return res.text().then(function (text) {
            console.error('[donate] Server error (non-JSON):', res.status, text.substring(0, 500));
            if (res.status === 502 || res.status === 504) {
              throw new Error('The payment server is not responding. Please try again in a minute. (' + res.status + ')');
            }
            if (res.status === 403) {
              throw new Error('Request blocked by the server. (' + res.status + ')');
            }
            throw new Error('Server error (' + res.status + '). Please try again later.');
          });
        }

        return res.json();
      })
      .then(function (data) {
        if (!data || !data.client_secret) {
          console.error('[donate] Missing client_secret in response:', JSON.stringify(data));
          throw new Error('Server returned an unexpected response.');
        }

        console.log('[donate] Mounting embedded checkout');

        // Destroy any previous instance
        destroyCheckout();

        // Mount the Stripe Embedded Checkout
        return stripe.initEmbeddedCheckout({
          clientSecret: data.client_secret
        });
      })
      .then(function (checkout) {
        embeddedCheckout = checkout;
        resetCardBtn(label, originalText);
        showCheckout();
        checkout.mount('#checkout-mount');
      })
      .catch(function (err) {
        var msg = err.message || 'Unknown error';

        if (err.name === 'TypeError' && (msg === 'Failed to fetch' || msg.indexOf('NetworkError') !== -1 || msg.indexOf('fetch') !== -1)) {
          console.error('[donate] Network/CORS failure:', msg);
          msg = 'Cannot reach the payment server. Please check your connection and try again.';
        }

        console.error('[donate] Checkout failed:', err);
        showError(msg);
        resetCardBtn(label, originalText);
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

  // ─── Check for return from embedded checkout ──────────────
  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get('session_id');

  if (sessionId) {
    // User has returned from embedded checkout — check the session status
    formSteps.forEach(function (el) { el.style.display = 'none'; });

    fetch(SESSION_STATUS_URL + '?session_id=' + encodeURIComponent(sessionId))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.status === 'complete') {
          if (successEl) {
            successEl.hidden = false;
            successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          showError('Payment was not completed. Please try again.');
          formSteps.forEach(function (el) { el.style.display = ''; });
        }
      })
      .catch(function () {
        // If we can't check status, still show success (webhook will confirm)
        if (successEl) {
          successEl.hidden = false;
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

    window.history.replaceState({}, '', window.location.pathname);
  }
})();
