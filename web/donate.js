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

  // ─── API health pre-check (diagnostic only) ────────────────
  var API_BASE = 'https://api.salafimasjid.app';
  fetch(API_BASE + '/health/', { method: 'GET', mode: 'cors' })
    .then(function (res) {
      console.log('[donate] API health check:', res.status, res.ok ? 'OK' : 'FAIL');
      if (!res.ok) {
        console.warn('[donate] API server returned', res.status, '— payments may not work');
      }
    })
    .catch(function (err) {
      console.error('[donate] API UNREACHABLE:', err.message,
        '— this means fetch() to', API_BASE, 'failed at the network level.',
        'Likely causes: CORS not allowing this origin (' + window.location.origin + '),',
        'DNS not resolving, or server is down.');
    });

  // ─── Card / Apple Pay / Google Pay (Stripe Checkout) ────────
  function resetCardBtn(label, originalText) {
    cardBtn.classList.remove('donate__method-btn--loading');
    if (label) label.textContent = originalText;
  }

  cardBtn.addEventListener('click', function () {
    if (!validateAmount()) return;

    // Lazy-init Stripe in case it wasn't ready at page load
    initStripe();

    if (!stripe) {
      showError('Payment is loading — Stripe.js has not initialised. Please wait a moment and try again.');
      console.error('[donate] Stripe.js not loaded. typeof Stripe:', typeof Stripe, '| PK set:', !!STRIPE_PK);
      return;
    }

    // Disable button to prevent double-clicks
    cardBtn.classList.add('donate__method-btn--loading');
    var label = cardBtn.querySelector('.donate__method-label');
    var originalText = label ? label.textContent : '';
    if (label) label.textContent = 'Redirecting to checkout...';

    var donatePageUrl = window.location.origin + window.location.pathname;
    var payload = {
      amount: Math.round(selectedAmount * 100),
      currency: 'gbp',
      frequency: frequency,
      success_url: donatePageUrl + '?success=1',
      cancel_url: donatePageUrl + '?cancelled=1'
    };

    console.log('[donate] POST', CHECKOUT_URL, JSON.stringify(payload));

    fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        console.log('[donate] Response:', res.status, res.statusText, '| CORS ok:', res.type !== 'opaque');

        if (!res.ok) {
          var contentType = res.headers.get('content-type') || '';

          // Server returned an error — try to extract detail
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

          // Non-JSON error (e.g., HTML error page from proxy/Nginx)
          return res.text().then(function (text) {
            console.error('[donate] Server error (non-JSON):', res.status, text.substring(0, 500));
            if (res.status === 502 || res.status === 504) {
              throw new Error('The payment server is not responding. It may be restarting — please try again in a minute. (' + res.status + ')');
            }
            if (res.status === 403) {
              throw new Error('Request blocked by the server. This may be a CSRF or permission issue. (' + res.status + ')');
            }
            throw new Error('Server error (' + res.status + '). Please try again later.');
          });
        }

        return res.json();
      })
      .then(function (data) {
        if (!data || !data.id) {
          console.error('[donate] Missing session ID in response:', JSON.stringify(data));
          throw new Error('Server returned an unexpected response — no checkout session ID.');
        }
        console.log('[donate] Redirecting to Stripe checkout, session:', data.id);
        return stripe.redirectToCheckout({ sessionId: data.id });
      })
      .then(function (result) {
        if (result && result.error) {
          console.error('[donate] Stripe redirect error:', result.error.message);
          throw new Error('Stripe: ' + result.error.message);
        }
      })
      .catch(function (err) {
        // Distinguish network/CORS failure from server errors
        var msg = err.message || 'Unknown error';

        if (err.name === 'TypeError' && (msg === 'Failed to fetch' || msg.indexOf('NetworkError') !== -1 || msg.indexOf('fetch') !== -1)) {
          // This is a network-level failure — could be CORS, DNS, or server unreachable
          console.error('[donate] Network/CORS failure:', msg);
          msg = 'Cannot reach the payment server (api.salafimasjid.app). '
              + 'This is usually a CORS, DNS, or connectivity issue. '
              + 'Check the browser console (F12 → Console) for details.';
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
      var label = btn.querySelector('.bank-sheet__copy-label');
      var svg = btn.querySelector('svg');
      if (label) {
        label.textContent = 'Copied!';
        btn.classList.add('bank-sheet__copy-btn--copied');
        if (svg) svg.style.display = 'none';

        setTimeout(function () {
          label.textContent = 'Copy';
          btn.classList.remove('bank-sheet__copy-btn--copied');
          if (svg) svg.style.display = '';
        }, 1500);
      }
    });
  }

  // Copy buttons
  var copyBtns = bankSheet ? bankSheet.querySelectorAll('.bank-sheet__copy-btn[data-copy]') : [];
  copyBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      copyToClipboard(btn.getAttribute('data-copy'), btn);
    });
  });

  // Also allow clicking the value itself
  var copyableValues = bankSheet ? bankSheet.querySelectorAll('.bank-sheet__value[data-copy]') : [];
  copyableValues.forEach(function (el) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () {
      var row = el.closest('.bank-sheet__copyable');
      var btn = row ? row.querySelector('.bank-sheet__copy-btn') : null;
      if (btn) copyToClipboard(el.getAttribute('data-copy'), btn);
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
