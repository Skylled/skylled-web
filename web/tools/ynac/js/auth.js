// YNAB OAuth Implicit Grant flow.
//
// Register a client at https://app.ynab.com/settings/developer with a redirect URI
// that matches the current origin exactly. The client ID is public.

const CLIENTS = {
  // Local dev. Redirect URI must match exactly in the YNAB developer settings,
  // e.g. http://localhost:8080/tools/ynac/oauth-callback.html
  'localhost': 'zZfslwdUt8_TRCyX6XAZRkpZjeT0DLGH115IU9lFIGk',
  '127.0.0.1': 'zZfslwdUt8_TRCyX6XAZRkpZjeT0DLGH115IU9lFIGk',
  // Production: register a client with redirect URI
  // https://skylled.dev/tools/ynac/oauth-callback.html and paste the id here.
  'skylled.dev': 'zZfslwdUt8_TRCyX6XAZRkpZjeT0DLGH115IU9lFIGk',
};

const TOKEN_KEY = 'ynac.token';
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

function getRedirectUri() {
  return window.location.origin + window.location.pathname.replace(/\/$/, '') + '/oauth-callback.html';
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
  const redirect = getRedirectUri();
  const url = new URL(AUTH_BASE);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('scope', 'read-only');
  window.location.assign(url.toString());
}

export function logout() {
  clearToken();
  window.location.reload();
}
