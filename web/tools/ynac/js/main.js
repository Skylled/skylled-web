// Boot sequence.
//  1. Apply theme + load settings
//  2. If no token → render sign-in
//  3. Load SDK, pick budget, fetch everything in parallel
//  4. Project forward 30 days, render confidence + calendar + banner
//  5. Wire refresh, settings, auto-refresh, visibility handling

import { loadSettings, saveSettings, applyTheme, DEFAULTS } from './settings.js';
import { getStoredToken, startAuth, clearToken, logout } from './auth.js';
import { createClient, fetchAll, fetchBudgets, AuthError } from './ynab-client.js';
import {
  buildProjection, computeSpendConfidence, findOverdue, findHeadsUp, todayISO,
} from './projection.js';
import { renderCalendar } from './calendar.js';
import { renderConfidence } from './spend-confidence.js';
import { setCurrencyFormat, formatMoney, formatMoneyShort } from './format.js';

// Sentinel accountId meaning "aggregate across every on-budget account."
const ALL_ACCOUNTS = 'all';

const AUTO_REFRESH_MS = 10 * 60 * 1000;

const state = {
  settings: loadSettings(),
  client: null,
  budgets: [],
  accounts: [],
  scheduled: [],
  transactions: [],
  lastRefreshed: null,
  autoRefreshTimer: null,
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

// Resolve the persisted accountId after an account-list refresh. Valid values
// are the sentinel ALL_ACCOUNTS (aggregate across every on-budget account) or
// a specific account id. If the stored id no longer resolves (account closed,
// deleted, or a different budget), default to "All Accounts" — the most
// informative view and a safe fallback when the prior selection is gone.
function normalizeAccountSelection() {
  const id = state.settings.accountId;
  const resolves = id === ALL_ACCOUNTS || state.accounts.some(a => a.id === id);
  if (!resolves) {
    state.settings.accountId = state.accounts.length ? ALL_ACCOUNTS : null;
    saveSettings(state.settings);
  }
}

function render() {
  hideLoading();
  hideError();
  hideSignIn();

  const scope = resolveAccountScope();
  if (!scope) {
    showError(new Error('No on-budget accounts found in this budget.'));
    return;
  }

  const today = todayISO();

  // Overdue detection scans across all fetched scheduled transactions; when
  // viewing a single account we narrow the banner to that account so another
  // account's overdue bill doesn't surface here.
  const overdueAll = findOverdue(state.scheduled, state.transactions, today);
  const overdue = scope.isAll
    ? overdueAll
    : overdueAll.filter(s => s.account_id === scope.accountId);
  const overdueIds = new Set(overdue.map(s => s.id));
  const scheduledForProjection = state.scheduled.filter(s => !overdueIds.has(s.id));

  const projection = buildProjection({
    startingBalance: scope.currentBalance,
    scheduled: scheduledForProjection,
    todayIso: today,
    days: 30,
    warningThreshold: state.settings.warningThreshold,
    // null means "no account filter" inside buildProjection — exactly what
    // aggregate view needs.
    accountId: scope.isAll ? null : scope.accountId,
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
  });
  renderCalendar(projection);
  renderAccountBar(scope);
  renderMeta();
}

// Compute the account scope currently in view. Returns an object describing
// the starting balance, a display label, and whether this is the aggregate
// ("All accounts") view, or null if nothing can be resolved.
function resolveAccountScope() {
  if (!state.accounts.length) return null;
  const id = state.settings.accountId;
  if (id === ALL_ACCOUNTS) {
    const currentBalance = state.accounts.reduce(
      (sum, a) => sum + (a.cleared_balance || 0) + (a.uncleared_balance || 0),
      0,
    );
    const n = state.accounts.length;
    return {
      isAll: true,
      accountId: ALL_ACCOUNTS,
      currentBalance,
      label: `All accounts · ${n} account${n === 1 ? '' : 's'}`,
    };
  }
  const account = state.accounts.find(a => a.id === id);
  if (!account) return null;
  return {
    isAll: false,
    accountId: account.id,
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
  allOpt.textContent = `All Accounts (${state.accounts.length})`;
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
  document.getElementById('signin').hidden = false;
  if (msg) {
    const p = document.querySelector('#signin p');
    if (p) p.textContent = msg;
  }
  // Hide everything else until signed in
  document.getElementById('confidence').hidden = true;
  document.getElementById('account-bar').hidden = true;
  document.getElementById('cal-grid').hidden = true;
  document.getElementById('meta').hidden = true;
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

    const budgetChanged = budget && budget !== state.settings.budgetId;

    if (budgetChanged) {
      state.settings.budgetId = budget;
      // Accounts belong to a budget; clear so loadData picks a fresh default
      // (which is now "All Accounts" for the new budget).
      state.settings.accountId = null;
    }
    state.settings.warningThreshold = isFinite(warning) ? Math.round(warning * 1000) : DEFAULTS.warningThreshold;
    state.settings.spendBuffer = isFinite(buffer) ? Math.round(buffer * 1000) : DEFAULTS.spendBuffer;
    // Clamp horizon to [1, 30] — the projection only ever covers 30 days.
    state.settings.spendHorizonDays = Number.isFinite(horizon)
      ? Math.min(30, Math.max(1, horizon))
      : DEFAULTS.spendHorizonDays;
    state.settings.theme = theme;
    saveSettings(state.settings);
    applyTheme(theme);

    if (budgetChanged) loadData().catch(showError);
    else render();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleAutoRefresh();
    else clearAutoRefresh();
  });
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
  // handles budget, thresholds, and theme.
  document.getElementById('setting-warning').value = (state.settings.warningThreshold / 1000).toFixed(0);
  document.getElementById('setting-buffer').value = (state.settings.spendBuffer / 1000).toFixed(0);
  document.getElementById('setting-horizon').value = state.settings.spendHorizonDays || DEFAULTS.spendHorizonDays;
  document.getElementById('setting-theme').value = state.settings.theme || 'auto';
  if (typeof dlg.showModal === 'function') dlg.showModal();
}

async function refresh() {
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
