// Render the rolling calendar grid (30, 60 or 90 days — see settings.js
// PROJECTION_DAY_OPTIONS).
//
// The spec mentions FullCalendar as a dependency, but the mockup uses a plain
// CSS grid that matches the visual target exactly and avoids a 70 KB dependency.
// This module builds that grid from a ProjectedDay[].
//
// The window is split into one grid per calendar month. A single flat grid was
// fine at 30 days, but at 90 it is ~13 undifferentiated rows and a month change
// is marked only by a small label on the 1st. Per-month grids also keep the
// positional CSS (`:nth-child(7n)` for the right-hand border, `:nth-last-child`
// for the last row) working — interleaving full-width header rows into one grid
// would shift that counting and break both.

import { formatBalance, formatEventAmount, formatMoneyWhole, truncateName } from './format.js';
import { parseISODate } from './projection.js';
import { CONFIDENT_DAYS } from './settings.js';

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_LONG = ['January','February','March','April','May','June','July',
  'August','September','October','November','December'];
const MAX_EVENTS_INLINE = 3;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function renderCalendar(projection) {
  const host = document.getElementById('cal-days');
  host.innerHTML = '';

  if (!projection.length) return;

  for (const month of groupByMonth(projection)) {
    host.appendChild(buildMonthSection(month));
  }
}

// Split a flat ProjectedDay[] into contiguous calendar months, carrying each
// day's index in the original window so the estimate boundary stays absolute
// (day 31 of the window, not day 31 of a month).
function groupByMonth(projection) {
  const months = [];
  let current = null;
  projection.forEach((day, index) => {
    const key = day.date.slice(0, 7); // YYYY-MM
    if (!current || current.key !== key) {
      current = { key, days: [] };
      months.push(current);
    }
    current.days.push({ day, index });
  });
  return months;
}

function buildMonthSection({ key, days }) {
  const section = document.createElement('section');
  section.className = 'cal-month';

  const [year, month] = key.split('-').map(Number);
  // Tag a month only when EVERY day in it is past the confident horizon. A
  // month straddling the boundary is half solid, and labelling the whole thing
  // "estimate" would understate the near days as much as omitting the tag
  // overstates the far ones. The per-day fade marks the real boundary.
  const isEstimate = days.every(d => d.index >= CONFIDENT_DAYS);
  if (isEstimate) section.classList.add('cal-month-estimate');

  section.appendChild(buildMonthHead(year, month, days, isEstimate));

  const grid = document.createElement('div');
  grid.className = 'cal-days';

  // Pad the first row so the month's first rendered day lines up with its
  // day-of-week. JS getDay(): 0=Sun..6=Sat; the grid is Mon-first.
  const first = parseISODate(days[0].day.date);
  const padCount = (first.getDay() + 6) % 7;
  for (let i = 0; i < padCount; i++) grid.appendChild(buildPad());

  for (const { day, index } of days) grid.appendChild(buildDayCell(day, index));

  // Pad the last row so each month block stays rectangular.
  const remainder = (padCount + days.length) % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) grid.appendChild(buildPad());
  }

  section.appendChild(grid);
  return section;
}

function buildMonthHead(year, month, days, isEstimate) {
  const head = document.createElement('header');
  head.className = 'cal-month-head';

  const name = document.createElement('span');
  name.className = 'cal-month-name';
  // Year only when the window crosses into a different one — "January 2027"
  // matters, "September 2026" three times over does not.
  const showYear = year !== parseISODate(days[0].day.date).getFullYear()
    || month === 1;
  name.textContent = showYear
    ? `${MONTH_LONG[month - 1]} ${year}`
    : MONTH_LONG[month - 1];
  head.appendChild(name);

  const meta = document.createElement('span');
  meta.className = 'cal-month-meta';

  // Net movement across the days of this month that are inside the window —
  // not the whole calendar month, which would overstate a partial first month.
  const net = days.reduce(
    (sum, d) => sum + d.day.events.reduce((s, e) => s + e.amount, 0), 0,
  );
  if (net !== 0) {
    const netEl = document.createElement('span');
    netEl.className = net < 0 ? 'cal-month-net is-out' : 'cal-month-net is-in';
    netEl.textContent = `${net < 0 ? '−' : '+'}${formatMoneyWhole(net)}`;
    netEl.title = days.length < 28
      ? 'Net scheduled movement across this month’s days inside the window'
      : 'Net scheduled movement this month';
    meta.appendChild(netEl);
  }

  if (isEstimate) {
    const tag = document.createElement('span');
    tag.className = 'cal-month-tag';
    tag.textContent = 'estimate';
    tag.title = 'Beyond ' + CONFIDENT_DAYS + ' days only scheduled transactions '
      + 'are modelled — day-to-day spending is not, so the balance reads high.';
    meta.appendChild(tag);
  }

  head.appendChild(meta);
  return head;
}

function buildPad() {
  const pad = document.createElement('div');
  pad.className = 'day day-pad';
  return pad;
}

function buildDayCell(day, index = 0) {
  const cell = document.createElement('div');
  const classes = ['day'];
  // No past-day branch: the window always starts today, so nothing before it
  // can ever be rendered.
  if (day.isToday) classes.push('day-today');
  if (day.isNegative) classes.push('day-negative');
  else if (day.isLowBalance) classes.push('day-low');
  if (day.events.length === 0) classes.push('day-empty');
  // Past the confident horizon the running balance is scheduled-only and drifts
  // optimistic. Fade it so it never reads as hard fact.
  if (index >= CONFIDENT_DAYS) classes.push('day-estimate');
  cell.className = classes.join(' ');

  const [y, m, d] = day.date.split('-').map(Number);
  const jsDate = new Date(y, m - 1, d);
  const dow = DOW_SHORT[jsDate.getDay()];

  const wrap = document.createElement('span');
  wrap.className = 'day-num-wrap';
  const dowEl = document.createElement('span');
  dowEl.className = 'day-dow';
  dowEl.textContent = dow;
  const numEl = document.createElement('span');
  numEl.className = 'day-num';
  numEl.textContent = String(d);
  // The mockup put a small month label on the 1st; the per-month section header
  // now carries that, so repeating it inside the cell is just noise.
  wrap.appendChild(dowEl);
  wrap.appendChild(numEl);
  cell.appendChild(wrap);

  const eventsEl = document.createElement('div');
  eventsEl.className = 'events';
  const visible = day.events.slice(0, MAX_EVENTS_INLINE);
  for (const ev of visible) eventsEl.appendChild(renderEvent(ev, { truncate: true }));
  if (day.events.length > MAX_EVENTS_INLINE) {
    const more = document.createElement('button');
    more.className = 'event-more';
    more.type = 'button';
    more.textContent = `+${day.events.length - MAX_EVENTS_INLINE} more`;
    more.addEventListener('click', () => openDayDialog(day));
    eventsEl.appendChild(more);
  }
  cell.appendChild(eventsEl);

  // KEEP THIS LAST. `.day` is a flex column and the balance block is pinned to
  // the foot of the cell with `margin-top: auto` (see css/styles.css `.day`).
  // That only works while the balance is the final child — anything appended
  // after it joins the same column flow and renders *below* the balance, off
  // the bottom of the cell. New day-cell content goes above this line.
  cell.appendChild(buildDayBalance(day));

  return cell;
}

// Today is the only cell where two numbers are meaningful: the balance the
// account actually holds right now (day.startingBalance — the projection
// hasn't applied anything yet on day 0) and where it lands once today's
// scheduled events hit. Showing only the projected figure contradicted the
// header's "Balance today", so today gets both, labelled.
function buildDayBalance(day) {
  const actual = day.startingBalance;
  const projected = day.endingBalance;
  // Collapse to one figure when there's nothing to compare — no events, or
  // events that net to zero. Two identical labelled numbers is pure noise.
  // Finite guard so a malformed day can never paint "$NaN" into the grid.
  const showBoth = day.isToday
    && Number.isFinite(actual)
    && Number.isFinite(projected)
    && actual !== projected;

  if (!showBoth) {
    const bal = document.createElement('div');
    bal.className = 'day-bal';
    bal.textContent = formatBalance(projected);
    return bal;
  }

  const wrap = document.createElement('div');
  wrap.className = 'day-bals';
  wrap.appendChild(buildBalanceFigure('day-bal-actual', 'now', actual, 'Actual balance right now'));
  wrap.appendChild(buildBalanceFigure(
    'day-bal-projected', 'end of day', projected,
    "Projected balance after today's scheduled events",
  ));
  return wrap;
}

function buildBalanceFigure(variantClass, tagText, milliunits, title) {
  const el = document.createElement('span');
  el.className = `day-bal ${variantClass}`;
  el.title = `${title}: ${formatBalance(milliunits)}`;
  const tag = document.createElement('span');
  tag.className = 'day-bal-tag';
  tag.textContent = tagText;
  el.appendChild(tag);
  el.appendChild(document.createTextNode(formatBalance(milliunits)));
  return el;
}

function renderEvent(ev, { truncate = false } = {}) {
  const el = document.createElement('div');
  const cls = ['event'];
  if (ev.isOverdue) cls.push('overdue');
  else if (ev.amount > 0) cls.push('inflow');
  el.className = cls.join(' ');
  // Always put the full payee + memo in the tooltip so truncated names
  // remain discoverable on hover. Overdue items append their real due date —
  // they render on today's cell, so without it the date looks wrong.
  el.title = [ev.payeeName, ev.memo, overdueContext(ev)].filter(Boolean).join(' — ');

  const name = document.createElement('span');
  name.className = 'event-name';
  // Inline cells: hard-clip long names so one rogue scheduled inflow (e.g. a
  // long joint-account nickname) can't blow out the grid. The day dialog
  // passes truncate: false so the full name is visible with more room.
  name.textContent = truncate ? truncateName(ev.payeeName) : ev.payeeName;

  const amt = document.createElement('span');
  amt.className = 'event-amt';
  amt.textContent = formatEventAmount(ev.amount);

  el.appendChild(name);
  if (ev.isOverdue) el.appendChild(renderOverdueTag(ev));
  el.appendChild(amt);
  return el;
}

// An overdue occurrence is carried into today's bucket, so the cell it sits in
// no longer tells you when it was actually due. Say so on the chip itself.
function renderOverdueTag(ev) {
  const tag = document.createElement('span');
  tag.className = 'event-overdue-tag';
  tag.textContent = ev.originalDate ? `due ${formatShortDate(ev.originalDate)}` : 'overdue';
  return tag;
}

function overdueContext(ev) {
  if (!ev.isOverdue) return null;
  return ev.originalDate ? `Overdue: was due ${formatLongDate(ev.originalDate)}` : 'Overdue';
}

// "2026-08-04" → "Aug 4". Read the ISO parts directly rather than going
// through a Date — the cell label must never shift with the timezone.
function formatShortDate(iso) {
  if (!ISO_DATE_RE.test(iso)) return String(iso);
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}`;
}

function formatLongDate(iso) {
  if (!ISO_DATE_RE.test(iso)) return String(iso);
  // parseISODate builds a local Date, so toLocaleDateString stays on the
  // right calendar day.
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function openDayDialog(day) {
  const dlg = document.getElementById('day-dialog');
  const [y, m, d] = day.date.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  document.getElementById('day-dialog-title').textContent = label;
  const list = document.getElementById('day-dialog-events');
  list.innerHTML = '';
  for (const ev of day.events) list.appendChild(renderEvent(ev));
  if (typeof dlg.showModal === 'function') dlg.showModal();
}
