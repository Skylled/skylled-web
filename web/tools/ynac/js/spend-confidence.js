// Render the spend-confidence header.

import { formatMoney, formatMoneyShort } from './format.js';

const VERDICTS = {
  green: {
    label: "You're good to spend",
    verdict: 'Comfortable through the horizon.',
  },
  amber: {
    label: 'Tread carefully',
    verdict: "Tight — mind what's coming up.",
  },
  red: {
    label: "Don't spend",
    verdict: 'Hold off — bills will outrun the balance.',
  },
};

export function renderConfidence({
  confidence,
  headsUp,
  accountName,
  spendBuffer,
  lastRefreshed,
  overdueCount,
}) {
  const root = document.getElementById('confidence');
  root.hidden = false;
  root.setAttribute('data-level', confidence.level);

  const horizon = confidence.horizonDays || 7;
  const horizonLabel = describeHorizon(horizon);

  const v = VERDICTS[confidence.level];
  document.getElementById('confidence-label').textContent = v.label;
  document.getElementById('confidence-verdict').textContent = v.verdict;

  // Reason sentence — composed from numbers so it reads naturally.
  const outflowAbs = Math.abs(confidence.outflowHorizon || 0);
  const inflow = confidence.inflowHorizon || 0;
  const parts = [];
  if (outflowAbs > 0 || inflow > 0) {
    const pieces = [];
    if (outflowAbs > 0) pieces.push(`${formatMoneyShort(outflowAbs)} in bills`);
    if (inflow > 0) pieces.push(`${formatMoneyShort(inflow)} coming in`);
    const netPhrase = pieces.join(' and ');
    parts.push(
      `After ${netPhrase} over the next ${horizonLabel} and your ${formatMoneyShort(spendBuffer)} buffer,`
    );
    if (confidence.level === 'green') parts.push("there's still room.");
    else if (confidence.level === 'amber') parts.push("you're close to the edge.");
    else parts.push("you're over.");
  } else {
    parts.push(`Nothing scheduled in the next ${horizonLabel}.`);
    if (confidence.level !== 'red') parts.push('Easy stretch.');
  }
  if (overdueCount > 0) {
    parts.push(`Don't forget ${overdueCount} overdue item${overdueCount === 1 ? '' : 's'}.`);
  }
  document.getElementById('confidence-reason').textContent = parts.join(' ');

  // Stats
  document.getElementById('stat-balance').textContent = formatMoney(confidence.currentBalance);
  document.getElementById('stat-balance-sub').textContent =
    [accountName, lastRefreshed ? `as of ${formatClock(lastRefreshed)}` : null].filter(Boolean).join(' · ');

  // Outflow card — label reflects the configured horizon, sub-label shows
  // inflow when present so the user sees what's being netted in.
  document.getElementById('stat-outflow-label').textContent = `Outflows next ${horizonLabel}`;
  document.getElementById('stat-outflow').textContent = formatMoney(outflowAbs);
  let outflowSub = outflowAbs > 0 ? 'Scheduled bills' : '—';
  if (inflow > 0) {
    outflowSub = outflowAbs > 0
      ? `Bills · less ${formatMoneyShort(inflow)} income`
      : `Plus ${formatMoneyShort(inflow)} income`;
  }
  document.getElementById('stat-outflow-sub').textContent = outflowSub;

  document.getElementById('stat-safe').textContent = formatMoney(confidence.safeToSpend);
  const safeSub = inflow > 0
    ? `After bills, income, and ${formatMoneyShort(spendBuffer)} buffer`
    : `After bills + ${formatMoneyShort(spendBuffer)} buffer`;
  document.getElementById('stat-safe-sub').textContent = safeSub;

  // Heads-up strip (worst upcoming day)
  const headsUpEl = document.getElementById('heads-up');
  if (headsUp) {
    headsUpEl.hidden = false;
    const dateLabel = formatDateLabel(headsUp.date);
    const balLabel = formatMoney(headsUp.endingBalance);
    document.getElementById('heads-up-text').innerHTML =
      `<strong>Heads up:</strong> things get tight around ${dateLabel} — projected balance dips to ${balLabel}.`;
  } else {
    headsUpEl.hidden = true;
  }
}

function describeHorizon(days) {
  if (days === 7) return '7 days';
  if (days === 14) return '14 days';
  if (days % 7 === 0) return `${days / 7} weeks`;
  return `${days} days`;
}

function formatClock(date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
