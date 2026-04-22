// Display formatting helpers. Operate on milliunits; never mutate.

let currencyFormat = null;

export function setCurrencyFormat(format) {
  currencyFormat = format || null;
}

export function formatMoney(milliunits, { signed = true } = {}) {
  const value = milliunits / 1000;
  const iso = currencyFormat?.iso_code || 'USD';
  const decimals = currencyFormat?.decimal_digits ?? 2;
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: iso,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const formatted = formatter.format(Math.abs(value));
  if (!signed) return formatted;
  if (value < 0) return '−' + formatted;
  if (value > 0) return formatted;
  return formatted;
}

// Short form: no decimals when whole, compact for prose. Always positive sign.
export function formatMoneyShort(milliunits) {
  const value = Math.abs(milliunits) / 1000;
  const iso = currencyFormat?.iso_code || 'USD';
  const whole = Math.round(value) === value;
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: iso,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
  return formatter.format(value);
}

export function formatEventAmount(milliunits) {
  const abs = Math.abs(milliunits);
  const short = formatMoneyShort(abs);
  return milliunits < 0 ? '−' + short : '+' + short;
}

export function formatBalance(milliunits) {
  return formatMoneyShort(milliunits) === formatMoneyShort(-milliunits) && milliunits < 0
    ? '−' + formatMoneyShort(-milliunits)
    : (milliunits < 0 ? '−' : '') + formatMoneyShort(Math.abs(milliunits));
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
