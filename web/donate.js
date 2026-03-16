/**
 * The Salafi Masjid — Donation Form (Stripe Elements)
 */
(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────
  // Replace with your live publishable key in production
  var STRIPE_PK = 'pk_live_jhdJimpenQpkL3cvCMC8wSa700y5o67fj1';
  var API_URL = 'https://api.salafimasjid.app/api/v1/donate/';

  // ─── State ───────────────────────────────────────────────────
  var selectedAmount = 50;
  var frequency = 'one-time';
  var stripe = null;
  var cardElement = null;

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

  // ─── Init Stripe ─────────────────────────────────────────────
  if (typeof Stripe !== 'undefined' && STRIPE_PK !== 'pk_live_jhdJimpenQpkL3cvCMC8wSa700y5o67fj1') {
    stripe = Stripe(STRIPE_PK);
    var elements = stripe.elements({
      fonts: [{ cssSrc: '' }]
    });

    cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '15px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#121216',
          '::placeholder': { color: '#A8A8AD' }
        },
        invalid: { color: '#B91C1C' }
      }
    });

    cardElement.mount('#card-element');

    cardElement.on('change', function (event) {
      cardErrors.textContent = event.error ? event.error.message : '';
    });
  } else {
    // Stripe not configured — show placeholder
    var el = document.getElementById('card-element');
    if (el) {
      el.innerHTML = '<p style="color:var(--onyx-600);font-size:14px;padding:12px 0;">Stripe is not configured yet. Add your publishable key to donate.js</p>';
    }
  }

  // ─── Amount selection ────────────────────────────────────────
  function updateSubmitText() {
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
    if (submitBtn.disabled) return;

    successEl.hidden = true;
    errorEl.hidden = true;
    cardErrors.textContent = '';

    if (!selectedAmount || selectedAmount < 1) {
      errorText.textContent = 'Please enter a valid donation amount.';
      errorEl.hidden = false;
      return;
    }

    if (!stripe || !cardElement) {
      errorText.textContent = 'Payment is not configured yet. Please contact the masjid directly.';
      errorEl.hidden = false;
      return;
    }

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
        if (!res.ok) throw new Error('Failed to create payment');
        return res.json();
      })
      .then(function (data) {
        // Step 2: Confirm with Stripe
        return stripe.confirmCardPayment(data.client_secret, {
          payment_method: {
            card: cardElement,
            billing_details: { email: email || undefined }
          }
        });
      })
      .then(function (result) {
        if (result.error) {
          throw new Error(result.error.message);
        }

        // Success
        successEl.hidden = false;
        submitBtn.style.display = 'none';
        cardElement.clear();
        customInput.value = '';
        document.getElementById('donor-email').value = '';
      })
      .catch(function (err) {
        errorText.textContent = err.message || 'Something went wrong. Please try again.';
        errorEl.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
        updateSubmitText();
      });
  });

  // ─── Init ────────────────────────────────────────────────────
  updateSubmitText();
})();
