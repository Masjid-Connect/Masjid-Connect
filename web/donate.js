/**
 * The Salafi Masjid — Donation Form (Stripe Elements)
 *
 * Handles amount selection, frequency toggle, and Stripe card payment.
 * PayPal button is a separate fallback until PayPal is enabled in Stripe.
 */
(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────
  var STRIPE_PK = 'pk_live_jhdJimpenQpkL3cvCMC8wSa700y5o67fj1';
  var API_URL = 'https://api.salafimasjid.app/api/v1/donate/';

  // ─── State ───────────────────────────────────────────────────
  var selectedAmount = 50;
  var frequency = 'one-time';
  var stripe = null;
  var cardElement = null;
  var isSubmitting = false;

  // ─── DOM refs ────────────────────────────────────────────────
  var amountBtns = document.querySelectorAll('.donate__amount');
  var freqBtns = document.querySelectorAll('.donate__freq-btn');
  var customInput = document.getElementById('custom-amount');
  var submitBtn = document.getElementById('donate-submit');
  var submitText = document.getElementById('donate-submit-text');
  var successEl = document.getElementById('donate-success');
  var errorEl = document.getElementById('donate-error');
  var errorText = document.getElementById('donate-error-text');
  var cardErrors = document.getElementById('card-errors');

  if (!submitBtn) return;

  // ─── Detect dark mode for Stripe styling ─────────────────────
  function getCardStyle() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      base: {
        fontSize: '15px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: isDark ? '#F5F5F7' : '#121216',
        '::placeholder': { color: isDark ? '#5B7A9E' : '#A8A8AD' }
      },
      invalid: { color: '#B91C1C' }
    };
  }

  // ─── Init Stripe ─────────────────────────────────────────────
  if (typeof Stripe !== 'undefined' && STRIPE_PK) {
    stripe = Stripe(STRIPE_PK);
    var elements = stripe.elements();

    cardElement = elements.create('card', {
      style: getCardStyle(),
      hidePostalCode: true
    });

    cardElement.mount('#card-element');

    cardElement.on('change', function (event) {
      cardErrors.textContent = event.error ? event.error.message : '';
    });

    // Update card style when dark mode toggles
    var darkToggle = document.getElementById('dark-mode-toggle');
    if (darkToggle) {
      darkToggle.addEventListener('change', function () {
        // Small delay to let the data-theme attribute update
        setTimeout(function () {
          cardElement.update({ style: getCardStyle() });
        }, 50);
      });
    }
  } else {
    var el = document.getElementById('card-element');
    if (el) {
      el.innerHTML = '<p style="color:var(--onyx-600);font-size:14px;padding:12px 0;">Card payment is loading...</p>';
    }
  }

  // ─── Amount selection ────────────────────────────────────────
  function updateSubmitText() {
    if (isSubmitting) return;
    var amountStr = selectedAmount % 1 === 0 ? selectedAmount.toString() : selectedAmount.toFixed(2);
    var label = frequency === 'monthly' ? 'Donate £' + amountStr + '/month' : 'Donate £' + amountStr;
    submitText.textContent = label;
  }

  amountBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      amountBtns.forEach(function (b) { b.classList.remove('donate__amount--active'); });
      btn.classList.add('donate__amount--active');
      selectedAmount = parseInt(btn.dataset.amount, 10);
      customInput.value = '';
      updateSubmitText();
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
    updateSubmitText();
  });

  // ─── Frequency toggle ───────────────────────────────────────
  freqBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      freqBtns.forEach(function (b) { b.classList.remove('donate__freq-btn--active'); });
      btn.classList.add('donate__freq-btn--active');
      frequency = btn.dataset.freq;
      updateSubmitText();
    });
  });

  // ─── Submit ──────────────────────────────────────────────────
  submitBtn.addEventListener('click', function () {
    if (isSubmitting || submitBtn.disabled) return;

    successEl.hidden = true;
    errorEl.hidden = true;
    cardErrors.textContent = '';

    if (!selectedAmount || selectedAmount < 1) {
      errorText.textContent = 'Please enter a valid donation amount.';
      errorEl.hidden = false;
      return;
    }

    if (selectedAmount > 10000) {
      errorText.textContent = 'For donations over £10,000, please contact the masjid directly.';
      errorEl.hidden = false;
      return;
    }

    if (!stripe || !cardElement) {
      errorText.textContent = 'Payment is still loading. Please refresh the page and try again.';
      errorEl.hidden = false;
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitText.textContent = 'Processing...';

    var email = document.getElementById('donor-email').value || '';

    // Step 1: Create PaymentIntent on backend
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(selectedAmount * 100), // pence
        currency: 'gbp',
        frequency: frequency,
        email: email
      })
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (body) {
            throw new Error(body.detail || 'Failed to create payment');
          });
        }
        return res.json();
      })
      .then(function (data) {
        // Step 2: Confirm with Stripe
        return stripe.confirmCardPayment(data.client_secret, {
          payment_method: {
            card: cardElement,
            billing_details: { email: email || undefined }
          },
          receipt_email: email || undefined
        });
      })
      .then(function (result) {
        if (result.error) {
          throw new Error(result.error.message);
        }

        // Success — show thank you state
        showSuccess();
      })
      .catch(function (err) {
        errorText.textContent = err.message || 'Something went wrong. Please try again.';
        errorEl.hidden = false;
      })
      .finally(function () {
        isSubmitting = false;
        submitBtn.disabled = false;
        updateSubmitText();
      });
  });

  function showSuccess() {
    successEl.hidden = false;
    // Scroll success into view
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Hide form fields but keep the success message visible
    var sections = document.querySelectorAll(
      '.donate__frequency, .donate__amounts, .donate__custom, ' +
      '.donate__card-section, .donate__email-field, .donate__submit, ' +
      '.donate__secure, .donate__paypal-divider, .donate__paypal-text, ' +
      '.donate__paypal-btn, .cf-turnstile, .form-hp'
    );
    sections.forEach(function (el) { el.style.display = 'none'; });

    // Show a "donate again" link
    var again = document.createElement('button');
    again.className = 'donate__again';
    again.textContent = 'Make another donation';
    again.type = 'button';
    again.addEventListener('click', function () { window.location.reload(); });
    successEl.parentNode.insertBefore(again, successEl.nextSibling);
  }

  // ─── Init ────────────────────────────────────────────────────
  updateSubmitText();
})();
