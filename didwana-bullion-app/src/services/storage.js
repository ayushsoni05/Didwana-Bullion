import { APP_INFO } from '../config/constants';

const KEYS = {
  TOKEN: 'db_auth_token',
  USER: 'db_auth_user',
  REMEMBER: 'db_auth_remember',
  LEGAL_CONSENT: 'db_legal_consent',
  COOKIE_PREFS: 'db_cookie_prefs',
  FUNC_PREFS: 'db_functional_prefs',
  LAST_RATES: 'db_last_rates',
};

const DEFAULT_COOKIE_PREFS = {
  essential: true,
  functional: true,
  decided: false,
  updatedAt: null,
};

const DEFAULT_FUNCTIONAL_PREFS = {
  tickAudio: false,
  defaultTerminal: 'ALL',
  chartRange: 'LIVE',
  theme: 'dark', // 'dark' | 'light' | 'system'
};

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage, key, val) {
  try {
    storage.setItem(key, val);
  } catch {
    // Ignore quota errors
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore
  }
}

export const authStorage = {
  saveSession(token, user, rememberMe = true) {
    const target = rememberMe ? localStorage : sessionStorage;
    const other = rememberMe ? sessionStorage : localStorage;
    safeRemove(other, KEYS.TOKEN);
    safeRemove(other, KEYS.USER);
    safeSet(target, KEYS.TOKEN, token);
    if (user) safeSet(target, KEYS.USER, JSON.stringify(user));
    safeSet(localStorage, KEYS.REMEMBER, rememberMe ? '1' : '0');
  },

  getToken() {
    return safeGet(localStorage, KEYS.TOKEN) || safeGet(sessionStorage, KEYS.TOKEN);
  },

  getUser() {
    const raw = safeGet(localStorage, KEYS.USER) || safeGet(sessionStorage, KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearSession() {
    safeRemove(localStorage, KEYS.TOKEN);
    safeRemove(localStorage, KEYS.USER);
    safeRemove(sessionStorage, KEYS.TOKEN);
    safeRemove(sessionStorage, KEYS.USER);
  },
};

export const ratesCache = {
  saveLastRates(rates) {
    if (!rates) return;
    safeSet(localStorage, KEYS.LAST_RATES, JSON.stringify(rates));
  },
  getLastRates() {
    const raw = safeGet(localStorage, KEYS.LAST_RATES);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};

export const consentStorage = {
  getLegalConsent() {
    const raw = safeGet(localStorage, KEYS.LEGAL_CONSENT);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.version === APP_INFO.legalVersion ? parsed : null;
    } catch {
      return null;
    }
  },

  saveLegalConsent() {
    const payload = {
      version: APP_INFO.legalVersion,
      acceptedAt: new Date().toISOString(),
    };
    safeSet(localStorage, KEYS.LEGAL_CONSENT, JSON.stringify(payload));
    return payload;
  },

  getCookiePrefs() {
    const raw = safeGet(localStorage, KEYS.COOKIE_PREFS);
    if (!raw) return { ...DEFAULT_COOKIE_PREFS };
    try {
      return { ...DEFAULT_COOKIE_PREFS, ...JSON.parse(raw), essential: true };
    } catch {
      return { ...DEFAULT_COOKIE_PREFS };
    }
  },

  saveCookiePrefs(functionalEnabled) {
    const prefs = {
      essential: true,
      functional: Boolean(functionalEnabled),
      decided: true,
      updatedAt: new Date().toISOString(),
    };
    safeSet(localStorage, KEYS.COOKIE_PREFS, JSON.stringify(prefs));
    if (!prefs.functional) {
      safeRemove(localStorage, KEYS.FUNC_PREFS);
    }
    return prefs;
  },

  getFunctionalPrefs() {
    const cookiePrefs = this.getCookiePrefs();
    if (!cookiePrefs.functional) return { ...DEFAULT_FUNCTIONAL_PREFS };
    const raw = safeGet(localStorage, KEYS.FUNC_PREFS);
    if (!raw) return { ...DEFAULT_FUNCTIONAL_PREFS };
    try {
      return { ...DEFAULT_FUNCTIONAL_PREFS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_FUNCTIONAL_PREFS };
    }
  },

  saveFunctionalPrefs(partial) {
    const cookiePrefs = this.getCookiePrefs();
    if (!cookiePrefs.functional) return { ...DEFAULT_FUNCTIONAL_PREFS, ...partial };
    const next = { ...this.getFunctionalPrefs(), ...partial };
    safeSet(localStorage, KEYS.FUNC_PREFS, JSON.stringify(next));
    return next;
  },
};
