// Load/save settings from localStorage under `ynac.settings`.
// Settings are plain objects; all dollar-valued fields are stored in milliunits.

const KEY = 'ynac.settings';

export const DEFAULTS = Object.freeze({
  budgetId: null,
  accountId: null,           // primary account id
  warningThreshold: 200_000, // milliunits ($200)
  spendBuffer: 100_000,      // milliunits ($100)
  spendHorizonDays: 14,       // how many days out the "safe to spend" math looks
  theme: 'auto',             // auto | light | dark
});

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme || 'auto');
}
