// Pure projection math. No DOM, no fetch, no localStorage.
// Amounts are always milliunits (1000 = $1.00); we never divide until display.
// Dates are always ISO `YYYY-MM-DD` strings; we never leak a `Date` object out.

// ---------- ISO date helpers ----------

export function todayISO() {
  return formatISODate(new Date());
}

export function formatISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return formatISODate(d);
}

export function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  // Clamp day to last day of target month so Jan 31 + 1 month = Feb 28/29.
  const targetMonth = m - 1 + n;
  const daysInTarget = new Date(y, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(d, daysInTarget);
  return formatISODate(new Date(y, targetMonth, clampedDay));
}

export function diffDays(fromIso, toIso) {
  const a = parseISODate(fromIso);
  const b = parseISODate(toIso);
  return Math.round((b - a) / 86400000);
}

export function compareISO(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------- Recurrence expansion ----------

// YNAB frequency values we handle. Anything else falls through as a single
// occurrence on date_next (safe default — the user still sees the event).
const FREQUENCY_STEPS = {
  daily: { kind: 'days', step: 1 },
  weekly: { kind: 'days', step: 7 },
  everyOtherWeek: { kind: 'days', step: 14 },
  every4Weeks: { kind: 'days', step: 28 },
  twiceAMonth: { kind: 'twiceAMonth' },
  monthly: { kind: 'months', step: 1 },
  everyOtherMonth: { kind: 'months', step: 2 },
  every3Months: { kind: 'months', step: 3 },
  every4Months: { kind: 'months', step: 4 },
  twiceAYear: { kind: 'months', step: 6 },
  yearly: { kind: 'months', step: 12 },
  everyOtherYear: { kind: 'months', step: 24 },
  never: { kind: 'once' },
};

// Expand a single scheduled transaction into occurrences on or after `from`
// (inclusive) and strictly before `endExclusive`. Returns ISO date strings.
export function expandScheduled(scheduled, fromIso, endExclusiveIso) {
  const rule = FREQUENCY_STEPS[scheduled.frequency] || { kind: 'once' };
  const first = scheduled.date_next || scheduled.date_first;
  if (!first) return [];

  const out = [];
  let cursor = first;

  // Fast-forward past `fromIso` without generating intermediate results.
  // For step-based rules, advance by `step` units; for twiceAMonth we fall
  // back to per-step walking.
  const SAFETY = 1000; // cap loop iterations
  let i = 0;

  while (compareISO(cursor, endExclusiveIso) < 0 && i < SAFETY) {
    if (compareISO(cursor, fromIso) >= 0) out.push(cursor);
    cursor = stepDate(cursor, rule);
    if (cursor === null) break;
    i += 1;
  }

  return out;
}

function stepDate(iso, rule) {
  switch (rule.kind) {
    case 'once':
      return null;
    case 'days':
      return addDays(iso, rule.step);
    case 'months':
      return addMonths(iso, rule.step);
    case 'twiceAMonth': {
      // YNAB's twiceAMonth fires on date_first, then +14 days, then next month
      // same day, then +14, etc. We approximate with alternating +14 / +16.
      // Good enough for MVP; cadence stays within a few days of real YNAB.
      const [y, m, d] = iso.split('-').map(Number);
      if (d <= 15) return addDays(iso, 14);
      // From back half, snap to the 1st of next month minus (d - 16) -ish.
      const nextMonth = addMonths(`${y}-${String(m).padStart(2,'0')}-01`, 1);
      return nextMonth;
    }
    default:
      return null;
  }
}

// ---------- Overdue detection ----------

// A scheduled transaction is overdue when:
//  - date_next is strictly before today, AND
//  - no cleared transaction exists on or after that date with matching payee
//    and amount within ±10%.
export function findOverdue(scheduled, transactions, todayIso) {
  const overdue = [];
  for (const s of scheduled) {
    if (!s.date_next || compareISO(s.date_next, todayIso) >= 0) continue;
    const match = transactions.some(t => {
      if (!t.cleared || t.cleared === 'uncleared') return false;
      if (compareISO(t.date, s.date_next) < 0) return false;
      if (s.payee_id && t.payee_id && s.payee_id === t.payee_id) {
        return amountsWithin(t.amount, s.amount, 0.10);
      }
      if (s.payee_name && t.payee_name && s.payee_name === t.payee_name) {
        return amountsWithin(t.amount, s.amount, 0.10);
      }
      return false;
    });
    if (!match) overdue.push(s);
  }
  return overdue;
}

function amountsWithin(a, b, ratio) {
  if (a === 0 && b === 0) return true;
  const base = Math.abs(b) || 1;
  return Math.abs(a - b) / base <= ratio;
}

// ---------- Projection ----------

// Build the 30-day window starting from `todayIso`, applying scheduled
// transactions to a running balance. Returns ProjectedDay[].
//
// `startingBalance` is the today-start balance in milliunits.
// `scheduled` is the raw list from YNAB (overdue items are filtered out by
// this function; they don't count toward the projection because they haven't
// cleared).
export function buildProjection({
  startingBalance,
  scheduled,
  todayIso,
  days = 30,
  warningThreshold = 200_000,
  accountId = null,
}) {
  const endExclusive = addDays(todayIso, days);

  // Per-day event bucket keyed by ISO date.
  const byDate = new Map();
  for (let i = 0; i < days; i++) byDate.set(addDays(todayIso, i), []);

  for (const s of scheduled) {
    if (accountId && s.account_id && s.account_id !== accountId) continue;
    if (s.deleted) continue;
    const occurrences = expandScheduled(s, todayIso, endExclusive);
    for (const date of occurrences) {
      const bucket = byDate.get(date);
      if (!bucket) continue;
      bucket.push({
        id: `${s.id}:${date}`,
        scheduledId: s.id,
        date,
        amount: s.amount,
        payeeName: s.payee_name || 'Scheduled transaction',
        memo: s.memo || null,
        isOverdue: false,
      });
    }
  }

  const result = [];
  let balance = startingBalance;
  for (let i = 0; i < days; i++) {
    const date = addDays(todayIso, i);
    const events = byDate.get(date) || [];
    // Sort: inflows last (so stacked cell shows outflows first, income at bottom).
    events.sort((a, b) => {
      if ((a.amount < 0) !== (b.amount < 0)) return a.amount < 0 ? -1 : 1;
      return Math.abs(b.amount) - Math.abs(a.amount);
    });
    const startingBalanceForDay = balance;
    for (const e of events) balance += e.amount;
    result.push({
      date,
      startingBalance: startingBalanceForDay,
      events,
      endingBalance: balance,
      isLowBalance: balance < warningThreshold && balance >= 0,
      isNegative: balance < 0,
      isToday: i === 0,
      isPast: false,
    });
  }
  return result;
}

// ---------- Spend confidence ----------

// Sum events inside the first `horizonDays` of `projection`, returning both
// outflow (negative sum) and inflow (positive sum). Safe-to-spend now factors
// both: a paycheck that lands inside the horizon shouldn't be hidden from the
// user just because it hasn't cleared yet.
export function computeSpendConfidence({
  currentBalance,
  projection,
  spendBuffer,
  horizonDays = 7,
}) {
  const n = Math.max(1, Math.min(horizonDays, projection.length));
  let outflowHorizon = 0; // negative
  let inflowHorizon = 0;  // positive
  for (let i = 0; i < n; i++) {
    for (const e of projection[i].events) {
      if (e.amount < 0) outflowHorizon += e.amount;
      else inflowHorizon += e.amount;
    }
  }
  const netFlow = outflowHorizon + inflowHorizon;
  // safeToSpend = currentBalance + netFlow - spendBuffer
  // (outflowHorizon is negative; inflowHorizon is positive; netFlow can be either.)
  const safeToSpend = currentBalance + netFlow - spendBuffer;

  let level;
  if (safeToSpend <= 0) level = 'red';
  else if (safeToSpend < 2 * spendBuffer) level = 'amber';
  else level = 'green';

  return {
    currentBalance,
    outflowHorizon,
    inflowHorizon,
    netFlow,
    safeToSpend,
    level,
    horizonDays: n,
  };
}

// Find the worst projected day (lowest ending balance) within the window.
// Returns null if no day dips below the warning threshold.
export function findHeadsUp(projection, warningThreshold) {
  let worst = null;
  for (const day of projection) {
    if (day.endingBalance < warningThreshold) {
      if (!worst || day.endingBalance < worst.endingBalance) worst = day;
    }
  }
  return worst;
}
