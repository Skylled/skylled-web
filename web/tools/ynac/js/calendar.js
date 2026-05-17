// Render the rolling 30-day calendar grid.
//
// The spec mentions FullCalendar as a dependency, but the mockup uses a plain
// CSS grid that matches the visual target exactly and avoids a 70 KB dependency.
// This module builds that grid from a ProjectedDay[].

import { formatBalance, formatEventAmount, truncateName } from './format.js';
import { parseISODate, todayISO, compareISO } from './projection.js';

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MAX_EVENTS_INLINE = 3;

export function renderCalendar(projection) {
  const host = document.getElementById('cal-days');
  host.innerHTML = '';

  if (!projection.length) return;

  // Pad the first row so day 1 lines up with its day-of-week (Mon = column 1).
  const first = parseISODate(projection[0].date);
  // JS getDay(): 0=Sun..6=Sat. We want Mon-first: shift so Mon=0..Sun=6.
  const padCount = (first.getDay() + 6) % 7;
  for (let i = 0; i < padCount; i++) {
    const pad = document.createElement('div');
    pad.className = 'day day-pad';
    host.appendChild(pad);
  }

  const today = todayISO();
  for (const day of projection) {
    host.appendChild(buildDayCell(day, today));
  }

  // Pad the last row so the grid has a clean rectangular shape on desktop.
  const total = padCount + projection.length;
  const remainder = total % 7;
  if (remainder !== 0) {
    const tail = 7 - remainder;
    for (let i = 0; i < tail; i++) {
      const pad = document.createElement('div');
      pad.className = 'day day-pad';
      host.appendChild(pad);
    }
  }
}

function buildDayCell(day, todayIso) {
  const cell = document.createElement('div');
  const classes = ['day'];
  if (day.isToday) classes.push('day-today');
  else if (compareISO(day.date, todayIso) < 0) classes.push('day-past');
  if (day.isNegative) classes.push('day-negative');
  else if (day.isLowBalance) classes.push('day-low');
  if (day.events.length === 0) classes.push('day-empty');
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
  // Show month label for day 1 of a month (mockup convention).
  if (d === 1) {
    const monthEl = document.createElement('span');
    monthEl.className = 'day-month-label';
    monthEl.textContent = MONTH_SHORT[m - 1];
    numEl.appendChild(monthEl);
  }
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

  const bal = document.createElement('div');
  bal.className = 'day-bal';
  bal.textContent = formatBalance(day.endingBalance);
  cell.appendChild(bal);

  return cell;
}

function renderEvent(ev, { truncate = false } = {}) {
  const el = document.createElement('div');
  const cls = ['event'];
  if (ev.isOverdue) cls.push('overdue');
  else if (ev.amount > 0) cls.push('inflow');
  el.className = cls.join(' ');
  // Always put the full payee + memo in the tooltip so truncated names
  // remain discoverable on hover.
  el.title = [ev.payeeName, ev.memo].filter(Boolean).join(' — ');

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
  el.appendChild(amt);
  return el;
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
