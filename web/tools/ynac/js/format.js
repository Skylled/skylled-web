// Display formatting helpers. Operate on milliunits; never mutate.

let currencyFormat = null;

export function setCurrencyFormat(format) {
  currencyFormat = format || null;
}

// Intl.NumberFormat construction is expensive and these run ~100× per render
// (one per calendar cell, plus every event amount). Cache by the only things
// that vary: currency code and fraction digits. The locale is always the
// system default, so it can't stale the cache.
const formatterCache = new Map();

function getFormatter(iso, minDecimals, maxDecimals) {
  const key = `${iso}:${minDecimals}:${maxDecimals}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: iso,
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

// The budget's currency code. Intl throws a RangeError on anything that isn't a
// 3-letter alphabetic code, and getFormatter only caches on success — so one
// malformed iso_code would re-throw on every call and blank the whole render.
// Validate the shape and fall back to USD instead.
function currencyCode() {
  const iso = String(currencyFormat?.iso_code ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(iso) ? iso : 'USD';
}

// The budget's decimal precision. YNAB sends 0 for JPY/KRW-style currencies.
// Coerced and clamped so a malformed budget payload can't throw out of Intl.
function currencyDecimals() {
  const d = Number(currencyFormat?.decimal_digits ?? 2);
  if (!Number.isFinite(d)) return 2;
  return Math.min(Math.max(Math.trunc(d), 0), 4);
}

export function formatMoney(milliunits, { signed = true } = {}) {
  const value = milliunits / 1000;
  const decimals = currencyDecimals();
  const formatted = getFormatter(currencyCode(), decimals, decimals).format(Math.abs(value));
  if (!signed) return formatted;
  if (value < 0) return '−' + formatted;
  if (value > 0) return formatted;
  return formatted;
}

// Short form: no decimals when whole, compact for prose. Always positive sign.
export function formatMoneyShort(milliunits) {
  const value = Math.abs(milliunits) / 1000;
  const whole = Math.round(value) === value;
  // decimal_digits is a ceiling, not a suggestion: a 0-decimal currency must
  // never show cents, whole value or not.
  const decimals = whole ? 0 : Math.min(2, currencyDecimals());
  return getFormatter(currencyCode(), decimals, decimals).format(value);
}

// Whole units only, always. Used for money inside prose sentences so one
// sentence can't read "$2,288.98 in bills and $2,400 coming in". Unsigned,
// like formatMoneyShort — callers supply the direction in words.
export function formatMoneyWhole(milliunits) {
  const value = Math.abs(milliunits) / 1000;
  return getFormatter(currencyCode(), 0, 0).format(value);
}

export function formatEventAmount(milliunits) {
  const abs = Math.abs(milliunits);
  const short = formatMoneyShort(abs);
  return milliunits < 0 ? '−' + short : '+' + short;
}

// formatMoneyShort is already unsigned, so the sign is entirely ours to add.
export function formatBalance(milliunits) {
  return (milliunits < 0 ? '−' : '') + formatMoneyShort(Math.abs(milliunits));
}

// Clamp a payee/memo string to fit in a narrow calendar cell.
// CSS ellipsis is the primary line of defense; this is a second line — if the
// grid ever slips into content-sized tracks, a payee like
// "Scheduled transfer from [long joint account nickname]" can't silently
// blow out the column. Full text stays available via the event's title attr.
export function truncateName(name, max = 28) {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (trimmed.length <= max) return trimmed;
  // Use a proper ellipsis glyph; it reads better than three dots.
  return trimmed.slice(0, Math.max(1, max - 1)).trimEnd() + '…';
}
