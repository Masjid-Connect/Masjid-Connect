/**
 * Masjid Connect — Donation Dashboard Charts
 * Uses Chart.js with branded Sapphire/Gold/Sage/Crimson palette.
 */

document.addEventListener('DOMContentLoaded', function () {
  const COLORS = {
    sapphire: '#0F2D52',
    sapphireLight: '#5B9BD5',
    gold: '#D4AF37',
    goldBright: '#E5C14B',
    sage: '#2D6A4F',
    crimson: '#B91C1C',
    stone100: '#F9F7F2',
    stone300: '#E5E0D3',
    onyx600: '#6B6B70',
  };

  // Check for dark mode
  const isDark = document.documentElement.classList.contains('dark');

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: {
          color: isDark ? '#D1D5DB' : COLORS.onyx600,
          font: { size: 12, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
        },
      },
    },
  };

  // ── Monthly Trend Line Chart ──────────────────────────────────────

  const trendEl = document.getElementById('chart-monthly-trend');
  if (trendEl) {
    const data = JSON.parse(trendEl.dataset.trend || '[]');
    const labels = data.map(d => d.month);
    const amounts = data.map(d => d.total_pounds);
    const counts = data.map(d => d.count);
    const giftAid = data.map(d => d.gift_aid_pounds);

    new Chart(trendEl, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Donations (£)',
            data: amounts,
            borderColor: COLORS.sapphire,
            backgroundColor: COLORS.sapphire + '20',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: COLORS.sapphire,
          },
          {
            label: 'Gift Aid (£)',
            data: giftAid,
            borderColor: COLORS.gold,
            backgroundColor: COLORS.gold + '20',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: COLORS.gold,
          },
        ],
      },
      options: {
        ...chartDefaults,
        scales: {
          x: {
            ticks: { color: isDark ? '#9CA3AF' : COLORS.onyx600, font: { size: 11 } },
            grid: { color: isDark ? '#333' : COLORS.stone300 },
          },
          y: {
            ticks: {
              color: isDark ? '#9CA3AF' : COLORS.onyx600,
              font: { size: 11 },
              callback: v => '£' + v.toLocaleString(),
            },
            grid: { color: isDark ? '#333' : COLORS.stone300 },
          },
        },
      },
    });
  }

  // ── Monthly Counts Line Chart (summary view — no amounts) ─────────

  const countsEl = document.getElementById('chart-monthly-counts');
  if (countsEl) {
    const data = JSON.parse(countsEl.dataset.counts || '[]');
    const labels = data.map(d => d.month);
    const counts = data.map(d => d.count);

    new Chart(countsEl, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Donations',
            data: counts,
            borderColor: COLORS.sapphire,
            backgroundColor: COLORS.sapphire + '20',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: COLORS.sapphire,
          },
        ],
      },
      options: {
        ...chartDefaults,
        scales: {
          x: {
            ticks: { color: isDark ? '#9CA3AF' : COLORS.onyx600, font: { size: 11 } },
            grid: { color: isDark ? '#333' : COLORS.stone300 },
          },
          y: {
            ticks: {
              color: isDark ? '#9CA3AF' : COLORS.onyx600,
              font: { size: 11 },
              stepSize: 1,
            },
            grid: { color: isDark ? '#333' : COLORS.stone300 },
          },
        },
      },
    });
  }

  // ── Frequency Pie Chart ───────────────────────────────────────────

  const freqEl = document.getElementById('chart-frequency');
  if (freqEl) {
    const data = JSON.parse(freqEl.dataset.frequency || '{}');

    new Chart(freqEl, {
      type: 'doughnut',
      data: {
        labels: ['One-time', 'Monthly'],
        datasets: [{
          data: [data.one_time || 0, data.monthly || 0],
          backgroundColor: [COLORS.sapphire, COLORS.gold],
          borderWidth: 2,
          borderColor: isDark ? '#1A1A1E' : '#fff',
        }],
      },
      options: {
        ...chartDefaults,
        cutout: '60%',
        plugins: {
          ...chartDefaults.plugins,
          tooltip: {
            callbacks: {
              label: ctx => '£' + ctx.parsed.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            },
          },
        },
      },
    });
  }

  // ── Source Pie Chart ──────────────────────────────────────────────

  const sourceEl = document.getElementById('chart-source');
  if (sourceEl) {
    const data = JSON.parse(sourceEl.dataset.source || '{}');
    const sourceLabels = {
      stripe: 'Stripe',
      bank_transfer: 'Bank Transfer',
      cash: 'Cash',
      other: 'Other',
    };
    const labels = Object.keys(data).map(k => sourceLabels[k] || k);
    const values = Object.values(data);
    const colors = [COLORS.sapphire, COLORS.sage, COLORS.gold, COLORS.crimson];

    new Chart(sourceEl, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, values.length),
          borderWidth: 2,
          borderColor: isDark ? '#1A1A1E' : '#fff',
        }],
      },
      options: {
        ...chartDefaults,
        cutout: '60%',
        plugins: {
          ...chartDefaults.plugins,
          tooltip: {
            callbacks: {
              label: ctx => '£' + ctx.parsed.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            },
          },
        },
      },
    });
  }
});
