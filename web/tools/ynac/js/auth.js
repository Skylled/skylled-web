// YNAB OAuth Implicit Grant flow.
//
// Register a client at https://app.ynab.com/settings/developer with a redirect URI
// that matches the current origin exactly. The client ID is public.

const CLIENTS = {
  // Local dev. Redirect URI must match exactly in the YNAB developer settings,
  // e.g. http://localhost:8080/tools/ynac/oauth-callback.html
  'localhost': 'zZfslwdUt8_TRCyX6XAZRkpZjeT0DLGH115IU9lFIGk',
  '127.0.0.1': 'zZfslwdUt8_TRCyX6XAZRkpZjeT0DLGH115IU9lFIGk',
  // Production: registered with redirect URI
  // https://skylled.dev/tools/ynac/oauth-callback.html
  'skylled.dev': 'zZfslwdUt8_TRCyX6XAZRkpZjeT0DLGH115IU9lFIGk',
};

const TOKEN_KEY = 'ynac.token';
// Keep STATE_KEY / TOKEN_KEY in sync with oauth-callback.html — that page runs
// before this module loads, so it can't import them.
//
// CLAUDE.md rule 5 says the only storage is `ynac.token` and `ynac.settings` in
// localStorage. STATE_KEY is a deliberate, narrow exception: the OAuth CSRF
// nonce is not sensitive (it's a public URL parameter by design), it is
// single-use, and sessionStorage is strictly shorter-lived than the localStorage
// the rule already permits. Nothing sensitive lives outside localStorage.
const STATE_KEY = 'ynac.oauth_state';
const AUTH_BASE = 'https://app.ynab.com/oauth/authorize';

function getClientId() {
  const host = window.location.hostname;
  const id = CLIENTS[host];
  if (!id || id.startsWith('REPLACE_WITH')) {
    console.warn(
      `[YNAC] No YNAB OAuth client id configured for host "${host}". ` +
      'Edit js/auth.js and set CLIENTS[host] to your client id.'
    );
  }
  return id;
}

// The redirect URI must match the one registered with YNAB *exactly*, so it has
// to be the same string whether the user is on `/`, `/index.html`, or a project
// subpath like `/YNAC/`. Drop a trailing filename segment (anything with a dot
// in it) and any trailing slashes, then append the callback:
//   /                 → /oauth-callback.html
//   /index.html       → /oauth-callback.html
//   /YNAC/            → /YNAC/oauth-callback.html
//   /YNAC/index.html  → /YNAC/oauth-callback.html
function getRedirectUri() {
  const base = window.location.pathname
    .replace(/[^/]*\.[^/]*$/, '')
    .replace(/\/+$/, '');
  return window.location.origin + base + '/oauth-callback.html';
}

// Single-use OAuth `state` nonce. 128 bits from the CSPRNG, hex encoded, stashed
// in sessionStorage so it dies with the tab and can never outlive the sign-in it
// authorises. oauth-callback.html refuses to store a token whose `state` doesn't
// match, which is what stops a crafted callback link from planting someone
// else's access token in this origin's localStorage.
function createStateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function getStoredToken() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.token) return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) return null;
    return parsed.token;
  } catch {
    return null;
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  try {
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    // sessionStorage can be unavailable (private mode, blocked storage) —
    // nothing to clean up in that case.
  }
}

export function startAuth() {
  const clientId = getClientId();
  if (!clientId || clientId.startsWith('REPLACE_WITH')) {
    alert(
      'This YNAC build has no OAuth client ID configured for ' + window.location.hostname +
      '.\n\nEdit js/auth.js and add your client ID, then reload.'
    );
    return;
  }
  const state = createStateNonce();
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch (e) {
    // Without a stored nonce the callback has nothing to verify against and
    // will reject the token, so stop here rather than starting a doomed round
    // trip the user can't diagnose.
    alert(
      'YNAC needs session storage to sign in securely, and this browser is ' +
      'blocking it. Enable storage for this site (or leave private browsing) ' +
      'and try again.'
    );
    console.warn('[YNAC] Could not stash OAuth state nonce.', e);
    return;
  }

  const redirect = getRedirectUri();
  const url = new URL(AUTH_BASE);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('scope', 'read-only');
  url.searchParams.set('state', state);
  window.location.assign(url.toString());
}

export function logout() {
  clearToken();
  window.location.reload();
}
