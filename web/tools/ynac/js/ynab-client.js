// Thin wrapper over the YNAB browser SDK (loaded from CDN in index.html... actually
// here via dynamic import so main.js stays the only entry point).
//
// All calls are GET-only. A 401 resolves to an `AuthError` so main.js can prompt
// for re-auth.

const SDK_URL = 'https://unpkg.com/ynab@2/dist/browser/ynab.js';

let sdkPromise = null;
function loadSdk() {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.ynab) return resolve(window.ynab);
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve(window.ynab);
    script.onerror = () => reject(new Error('Failed to load YNAB SDK'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

function wrapError(err) {
  const status = err && (err.error?.id || err.error?.detail || err.detail);
  const code = err && (err.error?.id || err.status || err.response?.status);
  if (code === 401 || (typeof status === 'string' && status.includes('401'))) {
    return new AuthError('Access token expired or invalid');
  }
  return err;
}

export async function createClient(token) {
  const ynab = await loadSdk();
  if (!ynab || !ynab.API) throw new Error('YNAB SDK did not load correctly');
  return new ynab.API(token);
}

export async function fetchAll(client, budgetId) {
  try {
    const today = new Date();
    const since = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    const sinceIso = formatISODate(since);

    const [budgetResp, accountsResp, scheduledResp, transactionsResp] = await Promise.all([
      client.budgets.getBudgetById(budgetId),
      client.accounts.getAccounts(budgetId),
      client.scheduledTransactions.getScheduledTransactions(budgetId),
      client.transactions.getTransactions(budgetId, sinceIso),
    ]);

    const budget = budgetResp.data.budget;
    const accounts = accountsResp.data.accounts.filter(a => !a.deleted && !a.closed && a.on_budget);
    const scheduled = scheduledResp.data.scheduled_transactions.filter(s => !s.deleted);
    const transactions = transactionsResp.data.transactions.filter(t => !t.deleted);

    return {
      // `budget.id` is the resolved id — important when the caller passed the
      // string "default" (the YNAB API's alias for the user's default budget):
      // the response always contains the real id, which callers persist so
      // subsequent loads bind to that specific budget.
      budgetId: budget.id,
      currencyFormat: budget.currency_format,
      accounts,
      scheduled,
      transactions,
    };
  } catch (err) {
    throw wrapError(err);
  }
}

export async function fetchBudgets(client) {
  try {
    const resp = await client.budgets.getBudgets();
    return resp.data.budgets.filter(b => !b.deleted);
  } catch (err) {
    throw wrapError(err);
  }
}

function formatISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
