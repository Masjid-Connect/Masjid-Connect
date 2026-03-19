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
  const CHECKOUT_URL = '/api/v1/donate/checkout/';

  // ─── State ───────────────────────────────────────────────────
  let selectedAmount = 50;
  let frequency = 'one-time';
  let checkoutInstance = null;

  // ─── DOM refs ────────────────────────────────────────────────
  const amountBtns = document.querySelectorAll('.donate__amount');
  const freqBtns = document.querySelectorAll('.donate__freq-btn');
  const customInput = document.getElementById('custom-amount');
  const cardBtn = document.getElementById('pay-card');
  const bankBtn = document.getElementById('pay-bank');
  const successEl = document.getElementById('donate-success');
  const errorEl = document.getElementById('donate-error');
  const errorText = document.getElementById('donate-error-text');
  const giftAidCheckbox = document.getElementById('gift-aid');
  const formSteps = document.querySelectorAll('.donate__step, .form-hp');
  const secureEl = document.querySelector('.donate__secure');
  const checkoutContainer = document.getElementById('checkout-container');
  const checkoutBack = document.getElementById('checkout-back');
  const summaryEl = document.getElementById('checkout-summary');
  const summaryAmount = document.getElementById('summary-amount');
  const summaryMeta = document.getElementById('summary-meta');

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
      const val = parseFloat(customInput.value);
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
    const label = cardBtn.querySelector('.donate__method-label');
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

  // ─── Build summary text ─────────────────────────────────────
  function updateSummary() {
    if (!summaryAmount || !summaryMeta) return;

    var amt = selectedAmount;
    // Format with commas for large amounts
    var formatted = amt % 1 === 0 ? '£' + amt.toLocaleString('en-GB') : '£' + amt.toFixed(2);
    summaryAmount.textContent = formatted;

    var parts = [];
    parts.push(frequency === 'monthly' ? 'Monthly donation' : 'One-time donation');
    if (giftAidCheckbox && giftAidCheckbox.checked) parts.push('Gift Aid');
    summaryMeta.textContent = parts.join(' · ');
  }

  // ─── Show/hide checkout vs form (Apple-style collapse) ─────
  function showCheckout() {
    // Hide error during checkout
    if (errorEl) errorEl.classList.add('status--checkout-hidden');

    // Update and show the summary bar
    updateSummary();

    // Fade out form steps
    formSteps.forEach(function (el) {
      el.classList.add('donate__step--hidden');
    });

    // After form fades out, reveal summary + checkout
    setTimeout(function () {
      formSteps.forEach(function (el) { el.hidden = true; });

      // Show summary
      if (summaryEl) {
        summaryEl.hidden = false;
        summaryEl.offsetHeight;
        summaryEl.classList.add('donate__summary--visible');
      }

      // Show checkout container
      if (checkoutContainer) {
        checkoutContainer.hidden = false;
        checkoutContainer.offsetHeight;
        checkoutContainer.classList.add('checkout--visible');
      }
    }, 200);
  }

  function showForm() {
    // Fade out checkout + summary
    if (checkoutContainer) checkoutContainer.classList.remove('checkout--visible');
    if (summaryEl) summaryEl.classList.remove('donate__summary--visible');

    setTimeout(function () {
      if (checkoutContainer) checkoutContainer.hidden = true;
      if (summaryEl) summaryEl.hidden = true;

      // Restore form steps
      formSteps.forEach(function (el) {
        el.hidden = false;
        el.offsetHeight;
        el.classList.remove('donate__step--hidden');
      });

      // Allow error to be shown again
      if (errorEl) errorEl.classList.remove('status--checkout-hidden');

      hideError();
      destroyCheckout();
    }, 300);
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
    const returnUrl = window.location.origin + window.location.pathname;

    return fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(selectedAmount * 100),
        currency: 'gbp',
        frequency: frequency,
        return_url: returnUrl,
        ui_mode: uiMode,
        gift_aid: giftAidCheckbox && giftAidCheckbox.checked ? 'yes' : 'no',
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
        if (!data.client_secret) {
          throw new Error('Server did not return a checkout session. Please try again.');
        }
        if (!data.publishable_key) {
          throw new Error('Payment configuration incomplete. Please contact the masjid.');
        }

        // Wait for Stripe.js to load (it's loaded async)
        return waitForStripe().then(function () {
          return data;
        });
      })
      .then(function (data) {
        // eslint-disable-next-line no-undef
        const stripe = Stripe(data.publishable_key);
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
        console.error('Embedded checkout failed:', err.message);
        // Show the error so the user (and developer) can see what went wrong,
        // rather than silently falling back to redirect checkout.
        showError('Checkout could not load inline. ' + err.message + ' Redirecting to payment page...');
        // Give the user a moment to see the message, then redirect as fallback
        setTimeout(formPostFallback, 2000);
      });
  }

  // ─── Fallback: form POST redirect to Stripe Hosted Checkout ─
  function formPostFallback() {
    const returnUrl = window.location.origin + window.location.pathname;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = CHECKOUT_URL;
    form.style.display = 'none';

    const fields = {
      amount: Math.round(selectedAmount * 100),
      currency: 'gbp',
      frequency: frequency,
      return_url: returnUrl,
      gift_aid: giftAidCheckbox && giftAidCheckbox.checked ? 'yes' : 'no'
    };

    Object.keys(fields).forEach(function (name) {
      const input = document.createElement('input');
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
      // eslint-disable-next-line no-undef
      if (typeof Stripe !== 'undefined') {
        resolve();
        return;
      }

      let attempts = 0;
      const maxAttempts = 50; // 5 seconds
      const interval = setInterval(function () {
        attempts++;
        // eslint-disable-next-line no-undef
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
  const bankSheet = document.getElementById('bank-sheet');
  const bankBackdrop = document.getElementById('bank-sheet-backdrop');
  const bankClose = document.getElementById('bank-sheet-close');

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
      const copyLabel = btn.querySelector('.bank-sheet__copy-label');
      const svg = btn.querySelector('svg');
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

  const copyBtns = bankSheet ? bankSheet.querySelectorAll('.bank-sheet__copy-btn[data-copy]') : [];
  copyBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      copyToClipboard(btn.getAttribute('data-copy'), btn);
    });
  });

  const copyableValues = bankSheet ? bankSheet.querySelectorAll('.bank-sheet__value[data-copy]') : [];
  copyableValues.forEach(function (el) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () {
      const row = el.closest('.bank-sheet__copyable');
      const btn = row ? row.querySelector('.bank-sheet__copy-btn') : null;
      if (btn) copyToClipboard(el.getAttribute('data-copy'), btn);
    });
  });

  // ─── Check for return from checkout ─────────────────────────
  const params = new URLSearchParams(window.location.search);
  const donation = params.get('donation');

  if (donation === 'success') {
    formSteps.forEach(function (el) { el.hidden = true; });
    if (successEl) {
      successEl.hidden = false;
      // Trigger entrance animation after a frame
      requestAnimationFrame(function () {
        successEl.classList.add('donate__status--enter');
      });
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    window.history.replaceState({}, '', window.location.pathname);
  } else if (donation === 'cancelled') {
    showError('Donation was cancelled. You can try again whenever you\'re ready.');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (donation === 'error') {
    const msg = params.get('msg') || 'Something went wrong. Please try again.';
    showError(msg);
    window.history.replaceState({}, '', window.location.pathname);
  }
})();
