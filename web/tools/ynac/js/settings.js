// Load/save settings from localStorage under `ynac.settings`.
// Settings are plain objects; all dollar-valued fields are stored in milliunits.

const KEY = 'ynac.settings';

export const DEFAULTS = Object.freeze({
  budgetId: null,
  accountId: null,           // primary account id
  projectionDays: 30,        // calendar window: 30 | 60 | 90
  // Sits one buffer ABOVE the buffer ($200 + $100), so a day is flagged while
  // there is still headroom to react rather than at the moment the cushion is
  // already gone. A threshold at or below spendBuffer would only ever fire once
  // safe-to-spend had hit zero — a warning that arrives too late to act on.
  // The two are not mechanically coupled: raise spendBuffer and this does not
  // follow. See REG14.
  warningThreshold: 300_000, // milliunits ($300)
  spendBuffer: 100_000,      // milliunits ($100)
  spendHorizonDays: 7,       // how many days out the "safe to spend" math looks
  includeSavings: true,      // count savings in the aggregate "all cash accounts" view
  theme: 'auto',             // auto | light | dark
});

const THEMES = ['auto', 'light', 'dark'];

// Fixed set rather than a free range: each option is a rendered layout we've
// actually checked, and an arbitrary window (say 47 days) buys nothing.
export const PROJECTION_DAY_OPTIONS = Object.freeze([30, 60, 90]);
export const MAX_PROJECTION_DAYS = Math.max(...PROJECTION_DAY_OPTIONS);

// Beyond this many days the projection is scheduled-transactions-only and drifts
// optimistic — day-to-day spending isn't modelled. The calendar fades days past
// this point rather than presenting them as fact. See CLAUDE.md.
export const CONFIDENT_DAYS = 30;

// A stored value counts as "absent" — fall back to the default — when it is
// missing or blank. `null` is absent for every field except budgetId/accountId,
// where it is the real "nothing selected" value.
function isAbsent(value) {
  return value === undefined || value === null ||
    (typeof value === 'string' && value.trim() === '');
}

// Milliunit amounts. Non-numeric, non-finite or negative all fall back to the
// default rather than pushing a NaN into the projection math — a NaN there
// silently reads as "you're good to spend", which is the worst way to be wrong.
function sanitizeAmount(value, fallback) {
  if (isAbsent(value)) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

// Whole days. Clamped to the widest window the calendar can project, not to the
// currently-selected one — narrowing the window shouldn't silently rewrite a
// horizon the user chose. computeSpendConfidence clamps to the projection it is
// actually handed, so a horizon wider than the current window self-corrects for
// display without being destroyed in storage.
function sanitizeHorizon(value) {
  if (isAbsent(value)) return DEFAULTS.spendHorizonDays;
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return DEFAULTS.spendHorizonDays;
  return Math.min(MAX_PROJECTION_DAYS, Math.max(1, n));
}

// The calendar window itself. Anything not in the offered set falls back to the
// default rather than to the nearest option — a stored 45 means the store is
// corrupt or from a future build, and guessing at intent helps nobody.
function sanitizeProjectionDays(value) {
  if (isAbsent(value)) return DEFAULTS.projectionDays;
  const n = Math.trunc(Number(value));
  return PROJECTION_DAY_OPTIONS.includes(n) ? n : DEFAULTS.projectionDays;
}

// Flags. JSON round-trips real booleans, but a corrupt store can hand back the
// STRINGS 'false'/'0', and `Boolean('false')` is `true` — which would silently
// re-enable a toggle the user turned off. Read the common textual and numeric
// spellings explicitly; anything unrecognised falls back to the default.
const FALSE_WORDS = ['false', '0', 'no', 'off'];
const TRUE_WORDS = ['true', '1', 'yes', 'on'];

function sanitizeFlag(value, fallback) {
  if (isAbsent(value)) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const word = value.trim().toLowerCase();
    if (FALSE_WORDS.includes(word)) return false;
    if (TRUE_WORDS.includes(word)) return true;
    return fallback;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value !== 0 : fallback;
  return fallback;
}

// Ids are opaque strings from YNAB; anything else means the store is corrupt.
function sanitizeId(value) {
  return typeof value === 'string' ? value : null;
}

// Normalise anything that came out of localStorage (or a settings form) into a
// complete, well-typed settings object. Unknown keys are dropped.
export function sanitizeSettings(raw) {
  const src = (raw && typeof raw === 'object') ? raw : {};
  return {
    budgetId: sanitizeId(src.budgetId),
    accountId: sanitizeId(src.accountId),
    projectionDays: sanitizeProjectionDays(src.projectionDays),
    warningThreshold: sanitizeAmount(src.warningThreshold, DEFAULTS.warningThreshold),
    spendBuffer: sanitizeAmount(src.spendBuffer, DEFAULTS.spendBuffer),
    spendHorizonDays: sanitizeHorizon(src.spendHorizonDays),
    includeSavings: sanitizeFlag(src.includeSavings, DEFAULTS.includeSavings),
    theme: THEMES.includes(src.theme) ? src.theme : 'auto',
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return sanitizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeSettings(null);
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(sanitizeSettings(settings)));
}

export function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme || 'auto');
}
