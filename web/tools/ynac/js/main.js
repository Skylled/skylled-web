// Boot sequence.
//  1. Apply theme + load settings
//  2. If no token → render sign-in
//  3. Load SDK, pick budget, fetch everything in parallel
//  4. Project forward 30 days, render confidence + calendar + banner
//  5. Wire refresh, settings, auto-refresh, visibility handling

import {
  loadSettings, saveSettings, applyTheme, DEFAULTS,
  PROJECTION_DAY_OPTIONS, CONFIDENT_DAYS,
} from './settings.js';
import { getStoredToken, startAuth, clearToken, logout } from './auth.js';
import { createClient, fetchAll, fetchBudgets, AuthError } from './ynab-client.js';
import {
  buildProjection, computeSpendConfidence, findOverdue, findHeadsUp, todayISO,
  isSpendableAccount,
} from './projection.js';
import { renderCalendar } from './calendar.js';
import { renderConfidence } from './spend-confidence.js';
import { setCurrencyFormat, formatMoney, formatMoneyShort } from './format.js';

// Sentinel accountId meaning "aggregate across every spendable cash account."
// Credit cards are on-budget in YNAB but are a liability, never spendable cash.
const ALL_ACCOUNTS = 'all';

const AUTO_REFRESH_MS = 10 * 60 * 1000;
// How old the data may be before a tab returning to the foreground refetches
// instead of waiting for the next interval tick.
const STALE_MS = 5 * 60 * 1000;

// Scroll distance before the jump-to-top button appears. Roughly the point
// where the spend-confidence header leaves the screen; it really earns its
// place at 60/90 days, where the calendar runs to several thousand pixels.
//
// EVERY module-level const must be declared ABOVE the `boot()` call below.
// `boot()` runs during module evaluation and synchronously reaches wireUi(),
// so a const declared further down the file is still in the temporal dead
// zone when it is read — which throws before showSignIn() can run and leaves
// the app stuck on "Loading your budget…". Function declarations hoist and are
// fine; `const`/`let` do not.
const SCROLL_TOP_AFTER_PX = 600;

const state = {
  settings: loadSettings(),
  client: null,
  budgets: [],
  accounts: [],
  scheduled: [],
  transactions: [],
  lastRefreshed: null,
  autoRefreshTimer: null,
  // ISO date the current projection was built for, so a tab left open
  // overnight can notice the rollover and rebuild.
  projectedFor: null,
  refreshing: false,
};

boot();

async function boot() {
  applyTheme(state.settings.theme);
  wireUi();

  const token = getStoredToken();
  if (!token) {
    showSignIn();
    return;
  }

  try {
    state.client = await createClient(token);
    await loadData();
  } catch (err) {
    if (err instanceof AuthError) {
      clearToken();
      showSignIn('Session expired. Reconnect to continue.');
    } else {
      showError(err);
    }
  }
}

async function loadData() {
  showLoading();
  // Pick budget: use stored id if we have one, otherwise ask YNAB for the
  // user's default ("last-used") budget via its `default` sentinel id.
  // See https://api.ynab.com/#oauth-default-plan. The resolved id comes back
  // on the response and we persist it so reloads bind to that specific budget.
  const budgetIdForRequest = state.settings.budgetId || 'default';

  // Fetch the budgets list in parallel so the Settings dialog's budget picker
  // always has options available, without adding a second round-trip.
  const [data, budgets] = await Promise.all([
    fetchAll(state.client, budgetIdForRequest),
    fetchBudgets(state.client),
  ]);
  state.budgets = budgets;

  if (state.settings.budgetId !== data.budgetId) {
    state.settings.budgetId = data.budgetId;
    // Changing budgets invalidates the stored accountId — let the account
    // fallback below pick a fresh one.
    state.settings.accountId = null;
    saveSettings(state.settings);
  }

  state.accounts = data.accounts;
  state.scheduled = data.scheduled;
  state.transactions = data.transactions;
  setCurrencyFormat(data.currencyFormat);

  normalizeAccountSelection();

  state.lastRefreshed = new Date();
  render();
  scheduleAutoRefresh();
}

// Accounts eligible for the aggregate view: cash-like only, with savings
// governed by the settings toggle. A single account the user picks explicitly
// is never filtered by this — the toggle only governs "All cash accounts".
function spendableAccounts() {
  const includeSavings = state.settings.includeSavings !== false;
  return state.accounts.filter(a => isSpendableAccount(a, { includeSavings }));
}

// True for accounts that only count when the savings toggle is on. Derived
// from isSpendableAccount so the account-type lists live in exactly one place.
function isSavingsAccount(account) {
  return isSpendableAccount(account, { includeSavings: true })
    && !isSpendableAccount(account, { includeSavings: false });
}

// Resolve the persisted accountId after an account-list refresh. Valid values
// are the sentinel ALL_ACCOUNTS (aggregate across spendable cash accounts) or
// a specific account id. If the stored id no longer resolves (account closed,
// deleted, or a different budget), fall back to the aggregate view — the most
// informative one — or, if there is nothing to aggregate (a budget of credit
// cards, or savings hidden by the toggle), to the first account we can show.
function normalizeAccountSelection() {
  const id = state.settings.accountId;
  const spendable = spendableAccounts();
  const resolves = id === ALL_ACCOUNTS
    ? spendable.length > 0
    : state.accounts.some(a => a.id === id);
  if (resolves) return;

  state.settings.accountId = spendable.length
    ? ALL_ACCOUNTS
    : (state.accounts.length ? state.accounts[0].id : null);
  saveSettings(state.settings);
}

function render() {
  hideLoading();
  hideError();
  hideSignIn();

  const scope = resolveAccountScope();
  if (!scope) {
    showError(new Error(state.accounts.length
      ? 'No spendable cash accounts found in this budget. YNAC projects checking, cash and savings accounts — credit cards are a liability, not spendable cash.'
      : 'No on-budget accounts found in this budget.'));
    return;
  }

  const today = todayISO();

  // Only activity on the accounts being summed may move this balance. A charge
  // booked on a credit card never touches the bank — the card payment does, and
  // that is its own scheduled transfer out of checking. Counting both would bill
  // the user twice. Items with no account_id stay in; buildProjection treats
  // those as unfiltered too.
  const scopeIds = new Set(scope.accountIds);
  const inScope = s => !s.account_id || scopeIds.has(s.account_id);
  const scheduled = state.scheduled.filter(inScope);

  // Overdue detection scans every fetched scheduled transaction, then narrows
  // the same way so another account's late bill doesn't surface here.
  const overdue = findOverdue(state.scheduled, state.transactions, today).filter(inScope);

  // Note what is NOT happening here: overdue scheduled transactions used to be
  // filtered out of `scheduled` entirely, which dropped the whole recurring
  // series — a late $1,800 rent silently made the month look $1,800 richer.
  // Every series goes in whole, and the late occurrence is carried into today
  // through the `overdue` option instead.
  const projection = buildProjection({
    startingBalance: scope.currentBalance,
    scheduled,
    todayIso: today,
    days: state.settings.projectionDays,
    warningThreshold: state.settings.warningThreshold,
    // null means "no single-account filter" inside buildProjection — exactly
    // what the aggregate view needs.
    accountId: scope.isAll ? null : scope.accountId,
    scopeAccountIds: scope.accountIds,
    overdue,
  });

  const confidence = computeSpendConfidence({
    currentBalance: scope.currentBalance,
    projection,
    spendBuffer: state.settings.spendBuffer,
    horizonDays: state.settings.spendHorizonDays,
  });

  const headsUp = findHeadsUp(projection, state.settings.warningThreshold);

  renderBanner(overdue);
  renderConfidence({
    confidence,
    headsUp,
    accountName: scope.label,
    spendBuffer: state.settings.spendBuffer,
    lastRefreshed: state.lastRefreshed,
    overdueCount: overdue.length,
    // Overdue amounts are counted against today now, so the header can say how
    // much of the drop they account for.
    overdueTotal: overdue.reduce((sum, s) => sum + (s.amount || 0), 0),
  });
  renderCalendar(projection);
  renderAccountBar(scope);
  renderRangeToggle();
  renderMeta();

  // The calendar title + legend are hidden on the signed-out screen; bring them
  // back with the grid itself.
  setHidden('cal-header', false);
  setHidden('cal-grid', false);
  setHidden('meta', false);
  // The drift caveat only applies once the window runs past the confident
  // horizon — at 30 days there is nothing to caveat.
  setHidden('cal-estimate-note', state.settings.projectionDays <= CONFIDENT_DAYS);

  state.projectedFor = today;
}

// Compute the account scope currently in view. Returns an object describing
// the starting balance, the ids being summed, a display label, and whether
// this is the aggregate ("All cash accounts") view — or null if nothing can be
// resolved. `accountIds` goes to buildProjection as `scopeAccountIds` so a
// transfer between two accounts already in view is treated as the wash it is.
function resolveAccountScope() {
  if (!state.accounts.length) return null;
  const id = state.settings.accountId;
  if (id === ALL_ACCOUNTS) {
    const spendable = spendableAccounts();
    if (!spendable.length) return null;
    const currentBalance = spendable.reduce(
      (sum, a) => sum + (a.cleared_balance || 0) + (a.uncleared_balance || 0),
      0,
    );
    const n = spendable.length;
    // The label has to say what was actually summed — "All accounts" over a
    // cash-only total is a lie the moment a credit card exists.
    const parts = ['All cash accounts', `${n} account${n === 1 ? '' : 's'}`];
    if (state.settings.includeSavings === false && state.accounts.some(isSavingsAccount)) {
      parts.push('savings excluded');
    }
    return {
      isAll: true,
      accountId: ALL_ACCOUNTS,
      accountIds: spendable.map(a => a.id),
      currentBalance,
      label: parts.join(' · '),
    };
  }
  const account = state.accounts.find(a => a.id === id);
  if (!account) return null;
  return {
    isAll: false,
    accountId: account.id,
    accountIds: [account.id],
    currentBalance: (account.cleared_balance || 0) + (account.uncleared_balance || 0),
    label: account.name,
  };
}

function renderAccountBar(scope) {
  const bar = document.getElementById('account-bar');
  const select = document.getElementById('account-picker');
  const balanceEl = document.getElementById('account-bar-balance');

  // Rebuild options so the list stays in sync with the budget's accounts.
  select.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = ALL_ACCOUNTS;
  // The count is the number of accounts the aggregate actually sums, not every
  // account in the list below it.
  const spendableCount = spendableAccounts().length;
  allOpt.textContent = `All Cash Accounts (${spendableCount})`;
  allOpt.disabled = spendableCount === 0;
  select.appendChild(allOpt);

  if (state.accounts.length > 1) {
    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '──────────';
    select.appendChild(sep);
  }

  for (const a of state.accounts) {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.name;
    select.appendChild(opt);
  }

  select.value = scope.accountId;
  balanceEl.innerHTML = `Balance <strong>${formatMoney(scope.currentBalance)}</strong>`;
  bar.hidden = false;
}

// The 30/60/90 window switcher. It lives beside the calendar title rather than
// in Settings because it is a view control you flip while reading, not a
// preference you set once — but it persists like one, so the window you left it
// on is the window you come back to.
function renderRangeToggle() {
  const host = document.getElementById('range-toggle');
  const current = state.settings.projectionDays;

  host.innerHTML = '';
  for (const days of PROJECTION_DAY_OPTIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'range-opt';
    btn.textContent = `${days}d`;
    btn.dataset.days = String(days);
    const active = days === current;
    btn.classList.toggle('is-active', active);
    // aria-pressed rather than a radio group: these are buttons that re-render
    // the view, and a screen reader should hear which one is engaged.
    btn.setAttribute('aria-pressed', String(active));
    btn.setAttribute('aria-label', `Project ${days} days`);
    btn.addEventListener('click', () => setProjectionDays(days));
    host.appendChild(btn);
  }

  document.getElementById('cal-title').textContent = `Next ${current} days`;
}

// Changing the window is pure re-projection over data we already hold — no
// refetch, so no API call and no rate-limit cost.
function setProjectionDays(days) {
  if (days === state.settings.projectionDays) return;
  state.settings.projectionDays = days;
  saveSettings(state.settings);
  render();
}

function renderBanner(overdue) {
  const slot = document.getElementById('banner-slot');
  slot.innerHTML = '';
  if (!overdue.length) return;

  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.setAttribute('role', 'status');

  const icon = document.createElement('span');
  icon.className = 'banner-icon';
  icon.textContent = '⚠';

  const text = document.createElement('span');
  text.className = 'banner-text';
  if (overdue.length === 1) {
    const o = overdue[0];
    const amt = formatMoneyShort(o.amount);
    const payee = o.payee_name || 'Scheduled bill';
    const dateLabel = formatShortDate(o.date_next);
    text.innerHTML =
      `<strong>1 scheduled bill looks overdue.</strong> ${escapeHtml(payee)} — ${amt} was due ${dateLabel} and hasn't cleared. Check YNAB to confirm.`;
  } else {
    text.innerHTML =
      `<strong>${overdue.length} scheduled bills look overdue.</strong> Check YNAB to confirm.`;
  }

  banner.appendChild(icon);
  banner.appendChild(text);
  slot.appendChild(banner);
}

function renderMeta() {
  const el = document.getElementById('meta-projected');
  if (!state.lastRefreshed) { el.textContent = '—'; return; }
  const opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  const datePart = state.lastRefreshed.toLocaleDateString(undefined, opts);
  const timePart = state.lastRefreshed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  el.textContent = `Projected as of ${datePart} · ${timePart}`;
}

function formatShortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- UI state helpers ----------

// Tolerant of a missing node so a markup change can never break boot.
function setHidden(id, hidden) {
  const el = document.getElementById(id);
  if (el) el.hidden = hidden;
}

function showLoading() {
  document.getElementById('loading').hidden = false;
  document.getElementById('error').hidden = true;
  document.getElementById('signin').hidden = true;
}
function hideLoading() { document.getElementById('loading').hidden = true; }
function hideError() { document.getElementById('error').hidden = true; }
function hideSignIn() { document.getElementById('signin').hidden = true; }

function showError(err) {
  hideLoading();
  const el = document.getElementById('error');
  el.hidden = false;
  el.textContent = err?.message || String(err);
}

function showSignIn(msg) {
  hideLoading();
  // Signed out: stop polling and drop the client so neither the interval nor a
  // returning tab can fire another doomed request.
  state.client = null;
  state.projectedFor = null;
  clearAutoRefresh();
  document.getElementById('signin').hidden = false;
  if (msg) {
    const p = document.querySelector('#signin p');
    if (p) p.textContent = msg;
  }
  // Hide everything else until signed in — including the calendar's title and
  // legend, which otherwise float above the sign-in prompt with nothing under
  // them.
  setHidden('confidence', true);
  setHidden('account-bar', true);
  setHidden('cal-header', true);
  setHidden('cal-grid', true);
  setHidden('cal-estimate-note', true);
  setHidden('meta', true);
  document.getElementById('banner-slot').innerHTML = '';
}

// ---------- Wiring ----------

function wireUi() {
  document.getElementById('signin-btn').addEventListener('click', () => startAuth());

  document.getElementById('refresh-btn').addEventListener('click', refresh);
  document.getElementById('settings-btn').addEventListener('click', openSettings);

  document.getElementById('account-picker').addEventListener('change', (e) => {
    const value = e.target.value;
    if (!value) return;
    if (value === state.settings.accountId) return;
    state.settings.accountId = value;
    saveSettings(state.settings);
    render();
  });

  const dlg = document.getElementById('settings-dialog');
  document.getElementById('settings-cancel').addEventListener('click', () => dlg.close());
  document.getElementById('settings-logout').addEventListener('click', () => {
    if (confirm('Log out of YNAC? Your token will be cleared.')) logout();
  });
  document.getElementById('settings-form').addEventListener('submit', (e) => {
    // form method="dialog" will close — capture values first.
    const budget = document.getElementById('setting-budget').value;
    const warning = parseFloat(document.getElementById('setting-warning').value);
    const buffer = parseFloat(document.getElementById('setting-buffer').value);
    const horizon = parseInt(document.getElementById('setting-horizon').value, 10);
    const theme = document.getElementById('setting-theme').value;
    const savingsEl = document.getElementById('setting-include-savings');

    const budgetChanged = budget && budget !== state.settings.budgetId;

    if (budgetChanged) {
      state.settings.budgetId = budget;
      // Accounts belong to a budget; clear so loadData picks a fresh default
      // (which is now "All cash accounts" for the new budget).
      state.settings.accountId = null;
    }
    state.settings.warningThreshold = isFinite(warning) ? Math.round(warning * 1000) : DEFAULTS.warningThreshold;
    state.settings.spendBuffer = isFinite(buffer) ? Math.round(buffer * 1000) : DEFAULTS.spendBuffer;
    // Clamp horizon to [1, current window] — the projection can't answer for
    // days it doesn't cover.
    state.settings.spendHorizonDays = Number.isFinite(horizon)
      ? Math.min(state.settings.projectionDays, Math.max(1, horizon))
      : DEFAULTS.spendHorizonDays;
    state.settings.theme = theme;
    // Governs the aggregate view only; a single savings account picked from
    // the account bar is always projected.
    if (savingsEl) state.settings.includeSavings = savingsEl.checked;
    saveSettings(state.settings);
    applyTheme(theme);

    if (budgetChanged) {
      loadData().catch(showError);
    } else {
      // The savings toggle changes which accounts the aggregate sums, so the
      // stored selection may need to fall back. Same data — no refetch.
      normalizeAccountSelection();
      render();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') { clearAutoRefresh(); return; }
    if (!state.client) return;
    // A hidden tab's interval was cleared, so it may have missed hours of
    // ticks — and it may have crossed midnight, which would leave the calendar
    // showing yesterday. Refresh straight away in either case. Calling only
    // scheduleAutoRefresh() here (as this used to) restarts the 10-minute
    // countdown, so a tab switched more often than that never refreshed at all.
    if (isProjectionStale()) refresh();
    scheduleAutoRefresh();
  });

  wireScrollTop();
}

function wireScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;

  // Coalesce scroll events into one rAF callback. Scroll fires far more often
  // than the screen repaints, and this runs over a 90-day grid.
  let queued = false;
  const sync = () => {
    queued = false;
    btn.classList.toggle('is-visible', window.scrollY > SCROLL_TOP_AFTER_PX);
  };
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  // Re-evaluate on resize too: switching 90d → 30d can shorten the page so much
  // that the old scroll position no longer exists, and no scroll event fires.
  window.addEventListener('resize', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    // Move focus somewhere sensible rather than leaving it on a button that is
    // about to fade out from under the keyboard user. preventScroll matters:
    // focus() scrolls its target into view by default, which would race the
    // smooth scroll we just started and land the page with a jolt.
    const header = document.getElementById('confidence');
    if (header && !header.hidden) header.focus({ preventScroll: true });
  });

  sync();
}

// Stale when the window no longer starts on today, or when the data is old
// enough that the interval would have fired anyway.
function isProjectionStale() {
  if (state.projectedFor && state.projectedFor !== todayISO()) return true;
  if (!state.lastRefreshed) return true;
  return Date.now() - state.lastRefreshed.getTime() >= STALE_MS;
}

function openSettings() {
  const dlg = document.getElementById('settings-dialog');

  const budgetSel = document.getElementById('setting-budget');
  budgetSel.innerHTML = '';
  for (const b of state.budgets) {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    if (b.id === state.settings.budgetId) opt.selected = true;
    budgetSel.appendChild(opt);
  }

  // Account picker has moved to the main calendar view; this dialog now only
  // handles budget, the savings toggle, thresholds, and theme.
  document.getElementById('setting-warning').value = (state.settings.warningThreshold / 1000).toFixed(0);
  document.getElementById('setting-buffer').value = (state.settings.spendBuffer / 1000).toFixed(0);
  // Cap the horizon input at the window actually being projected — offering 90
  // while showing 30 days would promise a number the projection can't produce.
  const horizonEl = document.getElementById('setting-horizon');
  horizonEl.max = String(state.settings.projectionDays);
  horizonEl.value = Math.min(
    state.settings.spendHorizonDays || DEFAULTS.spendHorizonDays,
    state.settings.projectionDays,
  );
  document.getElementById('setting-theme').value = state.settings.theme || 'auto';
  const savingsEl = document.getElementById('setting-include-savings');
  if (savingsEl) savingsEl.checked = state.settings.includeSavings !== false;
  if (typeof dlg.showModal === 'function') dlg.showModal();
}

async function refresh() {
  // Guard against overlapping fetches (interval tick landing on a manual
  // refresh) and against running before the client exists / after sign-out.
  if (state.refreshing || !state.client) return;
  state.refreshing = true;
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('is-spinning');
  try {
    const budgetId = state.settings.budgetId;
    if (!budgetId) { await loadData(); return; }
    const data = await fetchAll(state.client, budgetId);
    state.accounts = data.accounts;
    state.scheduled = data.scheduled;
    state.transactions = data.transactions;
    setCurrencyFormat(data.currencyFormat);
    normalizeAccountSelection();
    state.lastRefreshed = new Date();
    render();
  } catch (err) {
    if (err instanceof AuthError) {
      clearToken();
      showSignIn('Session expired. Reconnect to continue.');
    } else {
      showError(err);
    }
  } finally {
    state.refreshing = false;
    btn.classList.remove('is-spinning');
  }
}

function scheduleAutoRefresh() {
  clearAutoRefresh();
  state.autoRefreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible') refresh();
  }, AUTO_REFRESH_MS);
}
function clearAutoRefresh() {
  if (state.autoRefreshTimer) clearInterval(state.autoRefreshTimer);
  state.autoRefreshTimer = null;
}
