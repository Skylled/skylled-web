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
  const d = Number(iso.split('-')[2]);
  // Clamp day to last day of target month so Jan 31 + 1 month = Feb 28/29.
  return dayOfMonthOffset(iso, n, d);
}

// Day `day` of the month `n` months after the month of `iso`, clamped to that
// month's length. Every monthly occurrence is computed from the ORIGINAL anchor
// through this helper, so the clamp applies only to the month being emitted —
// Jan 31 + 1 = Feb 28 but Jan 31 + 2 = Mar 31, not Mar 28.
function dayOfMonthOffset(iso, n, day) {
  const [y, m] = iso.split('-').map(Number);
  const targetMonth = m - 1 + n;
  const daysInTarget = new Date(y, targetMonth + 1, 0).getDate();
  return formatISODate(new Date(y, targetMonth, Math.min(day, daysInTarget)));
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
//
// Occurrence *i* is always derived from the original anchor date, never chained
// off the previous (possibly clamped) result — chaining loses the 31st forever
// the first time it passes through February.
export function expandScheduled(scheduled, fromIso, endExclusiveIso) {
  const rule = FREQUENCY_STEPS[scheduled.frequency] || { kind: 'once' };
  const anchor = scheduled.date_next || scheduled.date_first;
  if (!anchor) return [];

  const out = [];
  const SAFETY = 1000; // cap loop iterations
  const start = startIndexFor(anchor, rule, fromIso);
  for (let i = start; i < start + SAFETY; i++) {
    const date = occurrenceAt(anchor, rule, i);
    if (date === null) break;
    if (compareISO(date, endExclusiveIso) >= 0) break;
    if (compareISO(date, fromIso) >= 0) out.push(date);
  }
  return out;
}

// The i-th occurrence of `rule` measured from `anchor`, or null once the series
// is exhausted. Occurrences are strictly increasing in `i`.
function occurrenceAt(anchor, rule, i) {
  switch (rule.kind) {
    case 'once':
      return i === 0 ? anchor : null;
    case 'days':
      return addDays(anchor, i * rule.step);
    case 'months':
      return addMonths(anchor, i * rule.step);
    case 'twiceAMonth': {
      // Twice a month is a *pair of days-of-month*, not a +14/+16 shuffle: an
      // anchor of the 1st fires on the 1st and the 16th of every month. The
      // old approximation invented a third occurrence (Aug 1 → Aug 15, Aug 29,
      // Sep 1 …), which double-charged the user once a month.
      const { lo, hi, startIndex } = twiceAMonthPair(anchor);
      const k = startIndex + i;
      return dayOfMonthOffset(anchor, Math.floor(k / 2), k % 2 === 0 ? lo : hi);
    }
    default:
      return null;
  }
}

// Derive the anchor's pair of days-of-month, plus which half of the pair the
// anchor itself is (so the series starts on the anchor, not before it).
function twiceAMonthPair(anchor) {
  const d = Number(anchor.split('-')[2]);
  return d <= 15
    ? { lo: d, hi: d + 15, startIndex: 0 }
    : { lo: d - 15, hi: d, startIndex: 1 };
}

// Occurrences are indexed off the anchor, so a rule anchored on an old
// `date_first` can jump straight to the window instead of burning the safety
// budget walking forward one step at a time. Every kind has to fast-forward:
// walking from index 0 meant a distant anchor hit the cap before reaching the
// window and the whole series vanished from the projection — silently, and in
// the direction that makes the balance read richer than it is.
//
// The result is deliberately conservative (it may land an occurrence or two
// before `fromIso`); the caller skips anything earlier than the window.
function startIndexFor(anchor, rule, fromIso) {
  if (compareISO(anchor, fromIso) >= 0) return 0;
  switch (rule.kind) {
    case 'days': {
      const gap = diffDays(anchor, fromIso);
      return gap > 0 ? Math.ceil(gap / rule.step) : 0;
    }
    case 'months':
      return Math.max(0, Math.floor(monthsBetween(anchor, fromIso) / rule.step) - 1);
    case 'twiceAMonth': {
      // Two occurrences per month, so index ≈ 2 × months elapsed.
      const { startIndex } = twiceAMonthPair(anchor);
      return Math.max(0, 2 * monthsBetween(anchor, fromIso) - startIndex - 2);
    }
    default:
      return 0;
  }
}

// Whole calendar months between two ISO dates, ignoring day-of-month.
function monthsBetween(fromIso, toIso) {
  const [ay, am] = fromIso.split('-').map(Number);
  const [by, bm] = toIso.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

// ---------- Overdue detection ----------

// A scheduled transaction is overdue when:
//  - date_next is strictly before today, AND
//  - no cleared transaction exists on or after that date with matching payee
//    and amount within ±10%.
//
// Matching is greedy and one-to-one: each transaction can settle at most one
// scheduled item. Without that, a single $75 payment cleared two identical $75
// bills and both vanished from the banner.
export function findOverdue(scheduled, transactions, todayIso) {
  const txns = transactions || [];
  const candidates = (scheduled || [])
    .filter(s => s.date_next && compareISO(s.date_next, todayIso) < 0)
    .sort((a, b) => compareISO(a.date_next, b.date_next));

  // Keyed on array index — fixture transactions have no reliable unique id.
  const consumed = new Set();
  const overdue = [];
  for (const s of candidates) {
    let matched = -1;
    for (let i = 0; i < txns.length; i++) {
      if (consumed.has(i)) continue;
      if (settles(txns[i], s)) { matched = i; break; }
    }
    if (matched === -1) overdue.push(s);
    else consumed.add(matched);
  }
  return overdue;
}

function settles(t, s) {
  if (!t.cleared || t.cleared === 'uncleared') return false;
  if (compareISO(t.date, s.date_next) < 0) return false;
  if (s.payee_id && t.payee_id && s.payee_id === t.payee_id) {
    return amountsWithin(t.amount, s.amount, 0.10);
  }
  if (s.payee_name && t.payee_name && s.payee_name === t.payee_name) {
    return amountsWithin(t.amount, s.amount, 0.10);
  }
  return false;
}

function amountsWithin(a, b, ratio) {
  if (a === 0 && b === 0) return true;
  const base = Math.abs(b) || 1;
  return Math.abs(a - b) / base <= ratio;
}

// ---------- Account classification ----------

// "All accounts" means spendable cash, never credit. Credit cards are
// `on_budget` in YNAB, so summing every on-budget account inflates the balance
// by whatever is sitting on the cards.
export const CASH_ACCOUNT_TYPES = ['checking', 'cash'];
export const SAVINGS_ACCOUNT_TYPES = ['savings'];

// Is this account eligible for the aggregate view? `includeSavings: false`
// narrows it to day-to-day cash. An account whose `type` we don't recognise is
// never spendable — the safe direction to be wrong in.
export function isSpendableAccount(account, { includeSavings = true } = {}) {
  const type = account && account.type;
  if (typeof type !== 'string') return false;
  if (CASH_ACCOUNT_TYPES.includes(type)) return true;
  if (includeSavings && SAVINGS_ACCOUNT_TYPES.includes(type)) return true;
  return false;
}

// ---------- Projection ----------

// Build the 30-day window starting from `todayIso`, applying scheduled
// transactions to a running balance. Returns ProjectedDay[].
//
// `startingBalance` is the today-start balance in milliunits, and day 0's
// `startingBalance` IS that real current balance — the calendar shows it next
// to the projected end of day.
// `scheduled` is the raw list from YNAB, including any series that has an
// overdue occurrence: dropping the whole series to hide one late bill lost
// every future occurrence of it too.
// `scopeAccountIds` is the set of accounts currently in view; transfers between
// two of them are a wash and get skipped.
// `overdue` (from findOverdue) is carried into today and counted — the money
// hasn't left yet, but it is owed, so a late bill must not read as headroom.
export function buildProjection({
  startingBalance,
  scheduled,
  todayIso,
  days = 30,
  warningThreshold = 200_000,
  accountId = null,
  scopeAccountIds = null,
  overdue = [],
}) {
  const endExclusive = addDays(todayIso, days);
  const scope = toIdSet(scopeAccountIds);

  // Per-day event bucket keyed by ISO date.
  const byDate = new Map();
  for (let i = 0; i < days; i++) byDate.set(addDays(todayIso, i), []);

  for (const s of scheduled) {
    if (!isInScope(s, accountId, scope)) continue;
    const occurrences = expandScheduled(s, todayIso, endExclusive);
    for (const date of occurrences) {
      const bucket = byDate.get(date);
      if (!bucket) continue;
      bucket.push(makeEvent(s, date, false, null));
    }
  }

  // Carry overdue occurrences into today. Dedup by scheduled id: a date_next
  // that sits in the past can still step forward onto today (a weekly bill due
  // last Tuesday, viewed the next Tuesday), and we must not charge the same
  // bill twice. When that happens we flag the occurrence already in the bucket
  // instead of skipping the carry-in — dropping the flag would leave the
  // calendar with nothing to mark late and no due date to show.
  const todayBucket = byDate.get(todayIso);
  if (todayBucket) {
    const seen = new Map(todayBucket.map(e => [e.scheduledId, e]));
    for (const s of overdue) {
      if (!isInScope(s, accountId, scope)) continue;
      const existing = seen.get(s.id);
      if (existing) {
        existing.isOverdue = true;
        existing.originalDate = s.date_next || null;
        continue;
      }
      const event = makeEvent(s, todayIso, true, s.date_next || null);
      seen.set(s.id, event);
      todayBucket.push(event);
    }
  }

  const result = [];
  let balance = startingBalance;
  for (let i = 0; i < days; i++) {
    const date = addDays(todayIso, i);
    const events = byDate.get(date) || [];
    // Overdue first, then biggest mover regardless of sign. Sorting outflows
    // ahead of inflows used to bury a paycheck behind "+2 more".
    events.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
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
    });
  }
  return result;
}

function makeEvent(s, date, isOverdue, originalDate) {
  return {
    id: isOverdue ? `${s.id}:overdue:${originalDate}` : `${s.id}:${date}`,
    scheduledId: s.id,
    date,
    amount: s.amount,
    payeeName: s.payee_name || 'Scheduled transaction',
    memo: s.memo || null,
    isOverdue,
    originalDate,
  };
}

// Account filters, shared by scheduled occurrences and overdue carry-ins.
// A scheduled transaction with no `account_id` is never filtered — we can't
// place it, so we show it rather than silently losing money from the window.
function isInScope(s, accountId, scope) {
  if (s.deleted) return false;
  if (accountId && s.account_id && s.account_id !== accountId) return false;
  if (scope && s.account_id) {
    // A leg booked on an account we are not looking at cannot move this
    // balance. Dropping it also makes the transfer rule below correct when
    // YNAB hands us BOTH legs: without it the out-of-scope +$X leg would be
    // summed in and wash a transfer that really does leave the view.
    if (!scope.has(s.account_id)) return false;
    // Both legs already in view → the money never leaves the aggregate.
    if (s.transfer_account_id && scope.has(s.transfer_account_id)) return false;
  }
  return true;
}

function toIdSet(ids) {
  if (!ids) return null;
  const set = ids instanceof Set ? ids : new Set(ids);
  return set.size ? set : null;
}

// ---------- Spend confidence ----------

const DEFAULT_HORIZON_DAYS = 7;

// Fallback buffer for an unusable `spendBuffer`. Coercing a bad buffer to 0
// would be worse than useless: the amber band is `safeToSpend < 2 * buffer`,
// so a zero buffer collapses it and every positive balance reports GREEN.
// Failing green is this app's worst failure mode, so a buffer we can't trust
// falls back to a real one rather than to nothing. settings.js sanitizes this
// upstream too — this is the second lock on the same door.
const DEFAULT_SPEND_BUFFER = 100_000; // milliunits ($100), mirrors settings DEFAULTS

// Sum events inside the first `horizonDays` of `projection`, returning both
// outflow (negative sum) and inflow (positive sum). Safe-to-spend factors
// both: a paycheck that lands inside the horizon shouldn't be hidden from the
// user just because it hasn't cleared yet.
//
// Every input is sanitized first. Junk in a setting used to produce a NaN
// horizon, a loop that never ran, $0 of outflows and a confident green —
// failing green is the worst thing this app can do.
export function computeSpendConfidence({
  currentBalance,
  projection,
  spendBuffer,
  horizonDays = DEFAULT_HORIZON_DAYS,
}) {
  const proj = Array.isArray(projection) ? projection : [];
  const balance = finiteOr(currentBalance, 0);
  // A negative buffer is as untrustworthy as a non-finite one — it would widen
  // safe-to-spend past the real balance.
  const rawBuffer = finiteOr(spendBuffer, NaN);
  const buffer = Number.isFinite(rawBuffer) && rawBuffer >= 0
    ? rawBuffer
    : DEFAULT_SPEND_BUFFER;
  const horizon = Math.trunc(finiteOr(horizonDays, DEFAULT_HORIZON_DAYS));
  const n = Math.max(1, Math.min(horizon, proj.length));

  let outflowHorizon = 0; // negative
  let inflowHorizon = 0;  // positive
  for (let i = 0; i < n; i++) {
    const day = proj[i];
    if (!day) continue;
    for (const e of day.events) {
      if (e.amount < 0) outflowHorizon += e.amount;
      else inflowHorizon += e.amount;
    }
  }
  const netFlow = outflowHorizon + inflowHorizon;
  // safeToSpend = currentBalance + netFlow - spendBuffer
  // (outflowHorizon is negative; inflowHorizon is positive; netFlow can be either.)
  const safeToSpend = balance + netFlow - buffer;

  let level;
  if (safeToSpend <= 0) level = 'red';
  else if (safeToSpend < 2 * buffer) level = 'amber';
  else level = 'green';

  return {
    currentBalance: balance,
    outflowHorizon,
    inflowHorizon,
    netFlow,
    safeToSpend,
    level,
    horizonDays: n,
  };
}

// Coerce to a finite number, falling back rather than letting NaN through.
// `null`/`''` mean "absent" (Number() would read them as 0).
function finiteOr(value, fallback) {
  if (value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
