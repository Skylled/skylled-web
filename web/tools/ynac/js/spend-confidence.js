// Render the spend-confidence header.

import { formatMoney, formatMoneyWhole } from './format.js';

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

// Shown when the numbers didn't add up to something renderable (corrupt
// settings, a half-loaded fetch). A NaN safe-to-spend scores as green in the
// naive comparison, so an unusable figure must never reach the normal path.
const UNAVAILABLE = {
  label: "Can't say right now",
  verdict: "Some of the numbers didn't come through.",
};

// Second sentence of the reason, keyed by level. The first sentence names the
// low point; this one says what it means. Kept short — the verdict headline
// above already carries the tone.
const TAILS = {
  green: 'Room to move.',
  amber: 'Not much room.',
  red: "That's underwater.",
};

export function renderConfidence({
  confidence,
  headsUp,
  accountName,
  spendBuffer,
  lastRefreshed,
  overdueCount,
  overdueTotal = 0,
}) {
  const c = confidence || {};
  const root = document.getElementById('confidence');
  root.hidden = false;

  // A non-finite safe-to-spend means the level below it is meaningless — treat
  // the whole card as unavailable and fall back to amber rather than green.
  const usable = Number.isFinite(Number(c.safeToSpend)) && Boolean(VERDICTS[c.level]);
  const level = usable ? c.level : 'amber';
  root.setAttribute('data-level', level);

  const horizonLabel = describeHorizon(c.horizonDays);
  const outflowAbs = Math.abs(finite(c.outflowHorizon));
  const inflow = Math.max(0, finite(c.inflowHorizon));
  const buffer = Math.max(0, finite(spendBuffer));
  const overdueN = Math.max(0, Math.trunc(finite(overdueCount)));

  const v = usable ? VERDICTS[c.level] : UNAVAILABLE;
  document.getElementById('confidence-label').textContent = v.label;
  document.getElementById('confidence-verdict').textContent = v.verdict;

  document.getElementById('confidence-reason').textContent = usable
    ? buildReason({
        level, horizonLabel, outflowAbs, inflow, buffer, overdueN, overdueTotal,
        troughBalance: Number(c.troughBalance),
        troughDate: c.troughDate,
        safeToSpend: Number(c.safeToSpend),
      })
    : "Safe-to-spend couldn't be worked out from the current data. Try refreshing, or check your settings.";

  // Stats
  document.getElementById('stat-balance').textContent = moneyStat(c.currentBalance);
  document.getElementById('stat-balance-sub').textContent =
    [accountName, lastRefreshed ? `as of ${formatClock(lastRefreshed)}` : null].filter(Boolean).join(' · ');

  // Outflow card — the big number is GROSS outflows, so the sub-label has to
  // stay additive. Anything phrased as "less $X" would imply income had
  // already been subtracted from the figure above it, which it hasn't.
  document.getElementById('stat-outflow-label').textContent = `Outflows next ${horizonLabel}`;
  document.getElementById('stat-outflow').textContent =
    moneyStat(Math.abs(Number(c.outflowHorizon)));
  const outflowSub = [
    outflowAbs > 0 ? 'Scheduled bills' : inflow > 0 ? 'No bills' : null,
    inflow > 0 ? `+${formatMoneyWhole(inflow)} income expected` : null,
  ].filter(Boolean);
  document.getElementById('stat-outflow-sub').textContent = outflowSub.join(' · ') || '—';

  // The sub-label names what the figure is derived from. It used to read "after
  // bills and income", which described a netted total; the number is now the
  // lowest point the balance reaches, so it has to say which day that is.
  document.getElementById('stat-safe').textContent = moneyStat(c.safeToSpend);
  const safeBase = c.troughDate
    ? `Low point ${formatDateLabel(c.troughDate)}`
    : 'No dip ahead';
  document.getElementById('stat-safe-sub').textContent =
    buffer > 0 ? `${safeBase}, minus ${formatMoneyWhole(buffer)} buffer` : safeBase;

  // Heads-up strip (worst upcoming day)
  const headsUpEl = document.getElementById('heads-up');
  const headsUpBalance = headsUp ? Number(headsUp.endingBalance) : NaN;
  if (headsUp && Number.isFinite(headsUpBalance)) {
    headsUpEl.hidden = false;
    const textEl = document.getElementById('heads-up-text');
    const strong = document.createElement('strong');
    strong.textContent = 'Heads up:';
    textEl.replaceChildren(
      strong,
      ` things get tight around ${formatDateLabel(headsUp.date)} — projected balance dips to ${formatMoney(headsUpBalance)}.`
    );
  } else {
    headsUpEl.hidden = true;
  }
}

// Compose the reason sentence from the numbers. Money here is always whole
// units — a sentence that mixes "$2,288.98" with "$2,400" reads like a typo.
//
// The sentence has to name the low point and its date. Safe-to-spend is derived
// from that one day, so a sentence that only quoted horizon totals would leave
// the headline figure looking unrelated to every other number on the card —
// which is precisely how the old netted number hid the problem it caused.
function buildReason({
  level, horizonLabel, outflowAbs, inflow, buffer, overdueN, overdueTotal,
  troughBalance, troughDate, safeToSpend,
}) {
  const parts = [];
  if (outflowAbs > 0 || inflow > 0) {
    const pieces = [];
    if (outflowAbs > 0) pieces.push(`${formatMoneyWhole(outflowAbs)} in bills`);
    if (inflow > 0) pieces.push(`${formatMoneyWhole(inflow)} coming in`);
    const context = `After ${pieces.join(' and ')} over the next ${horizonLabel}`;
    parts.push(
      troughDate && Number.isFinite(troughBalance)
        ? `${context}, your balance bottoms out at ${signedWhole(troughBalance)} on ${formatDateLabel(troughDate)}.`
        : `${context}, nothing dips below what you have today.`
    );
    parts.push(describeMargin(safeToSpend, buffer));
    parts.push(TAILS[level]);
  } else {
    parts.push(`Nothing scheduled in the next ${horizonLabel}.`);
    if (level !== 'red') parts.push('Easy stretch.');
  }
  if (overdueN > 0) {
    // Overdue occurrences are carried into today's projection, so say so —
    // otherwise the balance looks lower than the calendar explains.
    const noun = `${overdueN} overdue item${overdueN === 1 ? '' : 's'}`;
    const verb = overdueN === 1 ? 'is' : 'are';
    const total = Math.abs(finite(overdueTotal));
    parts.push(
      total > 0
        ? `${noun} worth ${formatMoneyWhole(total)} ${verb} already counted against today.`
        : `${noun} ${verb} already counted against today.`
    );
  }
  return parts.join(' ');
}

// How the low point sits against the buffer. Phrased two ways because
// "leaves −$150" is not a sentence anyone parses at a glance.
function describeMargin(safeToSpend, buffer) {
  if (!Number.isFinite(safeToSpend)) return '';
  if (safeToSpend >= 0) {
    return buffer > 0
      ? `That leaves ${formatMoneyWhole(safeToSpend)} once your ${formatMoneyWhole(buffer)} buffer is set aside.`
      : `That leaves ${formatMoneyWhole(safeToSpend)} to spend.`;
  }
  return buffer > 0
    ? `That's ${formatMoneyWhole(safeToSpend)} short of your ${formatMoneyWhole(buffer)} buffer.`
    : `That's ${formatMoneyWhole(safeToSpend)} in the red.`;
}

// formatMoneyWhole is unsigned by design (callers supply direction in words),
// but a trough can genuinely be negative and the sign is the whole point there.
function signedWhole(milliunits) {
  return (milliunits < 0 ? '−' : '') + formatMoneyWhole(milliunits);
}

// Big stat values keep their cents — but show a dash rather than "$NaN".
function moneyStat(milliunits) {
  const value = Number(milliunits);
  return Number.isFinite(value) ? formatMoney(value) : '—';
}

// Anything non-numeric collapses to 0, which the `> 0` guards then skip.
function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function describeHorizon(days) {
  const n = Math.round(Number(days));
  if (!Number.isFinite(n) || n < 1) return '7 days';
  if (n > 7 && n % 7 === 0) {
    const weeks = n / 7;
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }
  return `${n} day${n === 1 ? '' : 's'}`;
}

function formatClock(date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
