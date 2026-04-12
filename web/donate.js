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
  const API_BASE = 'https://api.salafimasjid.app';
  const CHECKOUT_URL = API_BASE + '/api/v1/donate/checkout/';
  const STRIPE_PK = 'pk_live_jhdJimpenQpkL3cvCMC8wSa700y5o67fj1';

  // ─── State ───────────────────────────────────────────────────
  let selectedAmount = 25;
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
  const coverFeesCheckbox = document.getElementById('cover-fees');
  const coverFeesAmountEl = document.getElementById('cover-fees-amount');
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
      updateFeeDisplay();
    });
  });

  if (customInput) {
    customInput.addEventListener('input', function () {
      const val = parseFloat(customInput.value);
      if (val && val > 0) {
        amountBtns.forEach(function (b) { b.classList.remove('donate__amount--active'); });
        selectedAmount = val;
      } else {
        selectedAmount = 0;
      }
      updateFeeDisplay();
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

  // ─── Fee calculation ────────────────────────────────────────
  // Blended estimate: 2.5% + 20p covers UK card (1.2%+20p with nonprofit
  // discount), EU/intl cards, Apple Pay, Google Pay, and PayPal.
  // Pay by Bank is lower, but we use a single conservative estimate.
  var FEE_PERCENT = 0.025;
  var FEE_FIXED_PENCE = 20;

  function calculateFee(amountPounds) {
    // gross = (net_pence + fixed) / (1 - percent) — solve for fee
    var netPence = Math.round(amountPounds * 100);
    var grossPence = Math.ceil((netPence + FEE_FIXED_PENCE) / (1 - FEE_PERCENT));
    return (grossPence - netPence) / 100;
  }

  function updateFeeDisplay() {
    if (!coverFeesAmountEl) return;
    var fee = calculateFee(selectedAmount);
    coverFeesAmountEl.textContent = '£' + fee.toFixed(2);
  }

  // Update fee whenever amount changes
  updateFeeDisplay();

  // ─── Cover fees checkbox listener ─────────────────────────
  if (coverFeesCheckbox) {
    coverFeesCheckbox.addEventListener('change', updateFeeDisplay);
  }

  // ─── Live total display ───────────────────────────────────
  var liveTotalBase = document.getElementById('live-total-base');
  var liveTotalFee = document.getElementById('live-total-fee');
  var liveTotalFeeRow = document.getElementById('live-total-fee-row');
  var liveTotalGiftAid = document.getElementById('live-total-gift-aid');
  var liveTotalGiftAidRow = document.getElementById('live-total-gift-aid-row');
  var liveTotalAmount = document.getElementById('live-total-amount');

  function updateLiveTotal() {
    if (!liveTotalAmount) return;

    var base = selectedAmount || 0;
    var fee = 0;
    var giftAidValue = 0;
    var total = base;

    // Base amount
    if (liveTotalBase) {
      liveTotalBase.textContent = base % 1 === 0 ? '£' + base.toLocaleString('en-GB') : '£' + base.toFixed(2);
    }

    // Processing fee
    if (coverFeesCheckbox && coverFeesCheckbox.checked) {
      fee = calculateFee(base);
      total += fee;
      if (liveTotalFee) liveTotalFee.textContent = '£' + fee.toFixed(2);
      if (liveTotalFeeRow) liveTotalFeeRow.hidden = false;
    } else {
      if (liveTotalFeeRow) liveTotalFeeRow.hidden = true;
    }

    // Gift Aid
    if (giftAidCheckbox && giftAidCheckbox.checked) {
      giftAidValue = base * 0.25;
      if (liveTotalGiftAid) liveTotalGiftAid.textContent = '£' + giftAidValue.toFixed(2);
      if (liveTotalGiftAidRow) liveTotalGiftAidRow.hidden = false;
    } else {
      if (liveTotalGiftAidRow) liveTotalGiftAidRow.hidden = true;
    }

    // Total (charge amount = base + fee; gift aid is reclaimed separately)
    liveTotalAmount.textContent = '£' + total.toFixed(2);
  }

  // Wire up live total updates
  if (coverFeesCheckbox) {
    coverFeesCheckbox.addEventListener('change', updateLiveTotal);
  }
  if (giftAidCheckbox) {
    giftAidCheckbox.addEventListener('change', updateLiveTotal);
  }

  // Also update live total when amount changes — hook into existing amount listeners
  var _origUpdateFeeDisplay = updateFeeDisplay;
  updateFeeDisplay = function () {
    _origUpdateFeeDisplay();
    updateLiveTotal();
  };

  // Initial live total
  updateLiveTotal();

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
    hideSuccess();
    if (errorText) errorText.textContent = msg;
    if (errorEl) errorEl.hidden = false;
  }

  function hideError() {
    if (errorEl) errorEl.hidden = true;
  }

  function hideSuccess() {
    if (successEl) {
      successEl.hidden = true;
      successEl.classList.remove('donate__status--enter');
    }
    if (formCard) formCard.classList.remove('donate__form-card--locked');
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
    if (coverFeesCheckbox && coverFeesCheckbox.checked) {
      parts.push('+£' + calculateFee(selectedAmount).toFixed(2) + ' fees');
    }
    summaryMeta.textContent = parts.join(' · ');
  }

  // ─── Show/hide checkout inline (no page change) ────────────
  var formCard = document.querySelector('.donate__form-card');

  function showCheckout() {
    // Hide error during checkout
    if (errorEl) errorEl.classList.add('status--checkout-hidden');

    // Update and show the summary bar
    updateSummary();

    // Lock the form — dim it, disable interactions, but keep visible
    if (formCard) formCard.classList.add('donate__form-card--locked');

    // Show summary bar between form and checkout
    if (summaryEl) {
      summaryEl.hidden = false;
      summaryEl.offsetHeight;
      summaryEl.classList.add('donate__summary--visible');
    }

    // Show checkout container below the form
    if (checkoutContainer) {
      checkoutContainer.hidden = false;
      checkoutContainer.offsetHeight;
      checkoutContainer.classList.add('checkout--visible');
    }

    // Scroll to checkout smoothly
    setTimeout(function () {
      if (summaryEl) summaryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function showForm() {
    // Fade out checkout + summary
    if (checkoutContainer) checkoutContainer.classList.remove('checkout--visible');
    if (summaryEl) summaryEl.classList.remove('donate__summary--visible');

    setTimeout(function () {
      if (checkoutContainer) checkoutContainer.hidden = true;
      if (summaryEl) summaryEl.hidden = true;

      // Unlock the form
      if (formCard) formCard.classList.remove('donate__form-card--locked');

      // Allow error to be shown again
      if (errorEl) errorEl.classList.remove('status--checkout-hidden');

      hideError();
      hideSuccess();
      destroyCheckout();

      // Scroll back to top of form
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  function createSession() {
    const returnUrl = window.location.origin + window.location.pathname;

    return fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(selectedAmount * 100),
        currency: 'gbp',
        frequency: frequency,
        return_url: returnUrl,
        ui_mode: 'embedded',
        gift_aid: giftAidCheckbox && giftAidCheckbox.checked ? 'yes' : 'no',
        cover_fees: coverFeesCheckbox && coverFeesCheckbox.checked ? 'yes' : 'no',
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
    hideSuccess();

    createSession()
      .then(function (data) {
        if (!data.client_secret) {
          throw new Error('Server did not return a checkout session. Please try again.');
        }
        // Wait for Stripe.js to load (it's loaded async)
        return waitForStripe().then(function () {
          return data;
        });
      })
      .then(function (data) {
        // eslint-disable-next-line no-undef
        const stripe = Stripe(STRIPE_PK);
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
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          showError('Unable to connect. Please check your internet connection and try again.');
          return;
        }
        // Fallback: embedded checkout failed — redirect to Stripe Hosted Checkout
        console.warn('Embedded checkout failed, falling back to hosted redirect:', err.message);
        fallbackToHostedCheckout();
      });
  }

  // ─── Fallback: Stripe Hosted Checkout (redirect) ─────────────
  function fallbackToHostedCheckout() {
    setLoading(true);
    const returnUrl = window.location.origin + window.location.pathname;

    fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(selectedAmount * 100),
        currency: 'gbp',
        frequency: frequency,
        return_url: returnUrl,
        ui_mode: 'url',
        gift_aid: giftAidCheckbox && giftAidCheckbox.checked ? 'yes' : 'no',
        cover_fees: coverFeesCheckbox && coverFeesCheckbox.checked ? 'yes' : 'no',
      }),
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.detail || 'Something went wrong.');
        });
      }
      return res.json();
    }).then(function (data) {
      if (data && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Could not create checkout session.');
      }
    }).catch(function (err) {
      setLoading(false);
      showError(err.message || 'Unable to process donation. Please try again.');
    });
  }

  // ─── Wait for Stripe.js to be available ─────────────────────
  function waitForStripe() {
    return new Promise(function (resolve, reject) {
      // eslint-disable-next-line no-undef
      if (typeof Stripe !== 'undefined') {
        resolve();
        return;
      }

      var attempts = 0;
      var maxAttempts = 50; // 5 seconds
      var interval = setInterval(function () {
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

  // ─── Donation funnel tracking (Sentry breadcrumbs) ──────────
  function trackDonationStep(step, data) {
    if (window.Sentry && window.Sentry.addBreadcrumb) {
      window.Sentry.addBreadcrumb({
        category: 'donation',
        message: step,
        level: 'info',
        data: data || {},
      });
    }
  }

  // ─── Wire up the Donate Now button ──────────────────────────
  cardBtn.addEventListener('click', function () {
    trackDonationStep('checkout_started', { amount: selectedAmount, frequency: frequency });
  });
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

  // ─── Rotating Hadiths ────────────────────────────────────────
  // Only Bukhari, Muslim, or agreed upon (muttafaqun 'alayh)
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

  // ─── Check for return from checkout ─────────────────────────
  var params = new URLSearchParams(window.location.search);
  var donation = params.get('donation');

  function showSuccess() {
    hideError();
    if (formCard) formCard.classList.add('donate__form-card--locked');
    if (successEl) {
      successEl.hidden = false;
      // Trigger entrance animation after a frame
      requestAnimationFrame(function () {
        successEl.classList.add('donate__status--enter');
      });
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  if (donation === 'success') {
    trackDonationStep('donation_success');
    var sessionId = params.get('session_id');
    window.history.replaceState({}, '', window.location.pathname);

    if (sessionId) {
      // Verify the session actually completed before showing success
      fetch(API_BASE + '/api/v1/donate/session-status/?session_id=' + encodeURIComponent(sessionId))
        .then(function (res) {
          if (!res.ok) throw new Error('Verification failed');
          return res.json();
        })
        .then(function (data) {
          if (data.status === 'complete') {
            showSuccess();
          } else {
            // Session not complete — user likely cancelled or payment failed
            showError('Donation was not completed. You can try again whenever you\u2019re ready.');
          }
        })
        .catch(function () {
          // Can't verify — show success to avoid hiding a real donation
          showSuccess();
        });
    } else {
      // No session_id — likely a hosted checkout redirect, show success
      showSuccess();
    }
  } else if (donation === 'cancelled') {
    trackDonationStep('donation_cancelled');
    showError('Donation was cancelled. You can try again whenever you\u2019re ready.');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (donation === 'error') {
    var msg = params.get('msg') || 'Something went wrong. Please try again.';
    showError(msg);
    window.history.replaceState({}, '', window.location.pathname);
  }
})();
