import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { API_BASE_URL, AUTH_BASE_URL } from '../config/constants';
import { authStorage } from './storage';

async function request(path, options = {}, baseUrl = API_BASE_URL) {
  const token = authStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${baseUrl}${path}`;
  const method = (options.method || 'GET').toUpperCase();

  // On native Android, CapacitorHttp bypasses WebView CORS preflight issues
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({
      url,
      method,
      headers,
      data: options.body ? JSON.parse(options.body) : undefined,
      connectTimeout: options.timeout || 15000,
      readTimeout: options.timeout || 15000,
    });

    const data = typeof res.data === 'string' ? (() => {
      try {
        return JSON.parse(res.data);
      } catch {
        return { message: res.data };
      }
    })() : (res.data || {});

    if (res.status < 200 || res.status >= 300) {
      const err = new Error(data.message || data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);

  try {
    const res = await fetch(url, {
      ...options,
      method,
      headers,
      signal: controller.signal,
    });

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      const err = new Error(data.message || data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const authApi = {
  async login({ identifier, password }) {
    const clean = identifier.trim();
    const isEmail = clean.includes('@');
    const payload = {
      ...(isEmail ? { email: clean.toLowerCase() } : { phone: clean }),
      password,
    };
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, AUTH_BASE_URL);
  },

  async register({ name, email, phone, password, acceptedLegal }) {
    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      acceptedLegal: Boolean(acceptedLegal),
    };
    return request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, AUTH_BASE_URL);
  },

  async getMe() {
    try {
      return await request('/api/auth/me', { method: 'GET' }, AUTH_BASE_URL);
    } catch (err) {
      if (err.status === 404) {
        return await request('/api/user/profile', { method: 'GET' }, AUTH_BASE_URL);
      }
      throw err;
    }
  },

  async forgotPassword(identifier) {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: identifier.includes('@') ? identifier.trim().toLowerCase() : undefined,
        identifier: identifier.trim(),
      }),
    }, AUTH_BASE_URL);
  },
};

export const pricesApi = {
  async getLatest() {
    return request('/api/prices/latest', { method: 'GET' });
  },

  async getIbjaLive() {
    return request('/api/prices/ibja-live', { method: 'GET' });
  },

  async getHistory(range = '1D') {
    return request(`/api/prices/history?range=${encodeURIComponent(range)}`, {
      method: 'GET',
    });
  },

  subscribeStream({ onData, onStatus }) {
    let eventSource = null;
    let closed = false;
    let retryTimer = null;

    const connect = () => {
      if (closed) return;
      onStatus?.('CONNECTING');
      const token = authStorage.getToken();
      const url = token
        ? `${API_BASE_URL}/api/prices/stream?token=${encodeURIComponent(token)}`
        : `${API_BASE_URL}/api/prices/stream`;

      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        onStatus?.('LIVE');
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onData?.(parsed);
        } catch {
          // Ignore heartbeat / non-JSON frames
        }
      };

      eventSource.onerror = () => {
        onStatus?.('RECONNECTING');
        eventSource?.close();
        if (!closed) {
          retryTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      eventSource?.close();
    };
  },
};

function pickNum(...vals) {
  for (const v of vals) {
    if (v === '--' || v === null || v === undefined || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function findProduct(products, matcher) {
  if (!Array.isArray(products)) return null;
  return products.find((p) => matcher((p.name || p.displayName || '').toLowerCase())) || null;
}

/**
 * Normalizes live payloads from:
 * - himanshuBullion (HB Jodhpur)
 * - mosunBullion (Mosun & Sons Sujangarh)
 * - ibja / /api/prices/ibja-live (IBJA Official)
 */
export function normalizeBullionPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw.payload || raw.data || raw.rates || raw;
  const now = data.updatedAt || data.lastUpdated || data.timestamp || raw.timestamp || new Date().toISOString();

  // 1. HB Jodhpur (himanshuBullion)
  const hb = data.himanshuBullion || data.hb || data.HB || {};
  const hbProds = hb.products || [];
  const hbGold995 = findProduct(hbProds, (n) => n.includes('995'));
  const hbSilverPeti = findProduct(hbProds, (n) => n.includes('peti') || n.includes('999.9'));
  const hbSilverChorsa = findProduct(hbProds, (n) => n.includes('chorsa'));

  const HB = {
    updatedAt: now,
    status: hb.isLive ? 'LIVE' : hb.marketState || 'LIVE',
    items: {
      gold995: {
        name: 'Gold 995',
        unit: '10g',
        bid: pickNum(hbGold995?.bid, data.sellRates?.gold_995, hbGold995?.ask, data.buyRates?.gold_995),
        ask: pickNum(hbGold995?.ask, data.buyRates?.gold_995, hbGold995?.bid),
        high: pickNum(hbGold995?.high, data.market?.highPrice),
        low: pickNum(hbGold995?.low, data.market?.lowPrice),
      },
      gold916: {
        name: '22K 916',
        unit: '10g',
        bid: pickNum(data.sellRates?.gold_22k_10g, data.gold_10g_22k),
        ask: pickNum(data.buyRates?.gold_22k_10g, data.gold_10g_22k),
        high: null,
        low: null,
      },
      silverPeti: {
        name: 'Silver Peti',
        unit: '1KG',
        bid: pickNum(hbSilverPeti?.bid, data.sellRates?.silver_1kg, hbSilverPeti?.ask, data.silver_1kg),
        ask: pickNum(hbSilverPeti?.ask, data.buyRates?.silver_1kg, data.silver_1kg),
        high: pickNum(hbSilverPeti?.high),
        low: pickNum(hbSilverPeti?.low),
      },
      silverChorsa: {
        name: 'Silver Chorsa',
        unit: '1KG',
        bid: pickNum(hbSilverChorsa?.bid, data.sellRates?.silver_chorsa_1kg, hbSilverChorsa?.ask, data.silver_chorsa_1kg),
        ask: pickNum(hbSilverChorsa?.ask, data.buyRates?.silver_chorsa_1kg, data.silver_chorsa_1kg),
        high: pickNum(hbSilverChorsa?.high),
        low: pickNum(hbSilverChorsa?.low),
      },
    },
  };

  // 2. Mosun & Sons Sujangarh (mosunBullion)
  const mosun = data.mosunBullion || data.mosun || data.MOSUN || {};
  const mr = mosun.rates || {};
  const MOSUN = {
    updatedAt: now,
    status: mosun.isLive ? 'LIVE' : mosun.marketState || 'LIVE',
    items: {
      gold995: {
        name: 'Gold 995',
        unit: '10g',
        bid: pickNum(mr.gold_995_bid, mr.gold_995),
        ask: pickNum(mr.gold_995_ask, mr.gold_995),
        high: pickNum(mr.gold_995_high),
        low: pickNum(mr.gold_995_low),
      },
      gold916: {
        name: '22K 916',
        unit: '10g',
        bid: pickNum(mr.gold_22k_10g_bid, mr.gold_22k_10g),
        ask: pickNum(mr.gold_22k_10g_ask, mr.gold_22k),
        high: null,
        low: null,
      },
      silverPeti: {
        name: 'Silver Peti',
        unit: '1KG',
        bid: pickNum(mr.silver_999_1kg_bid, mr.silver_peti, mr.silver_999_1kg),
        ask: pickNum(mr.silver_999_1kg_ask, mr.silver_peti, mr.silver_999_1kg),
        high: null,
        low: null,
      },
      silverChorsa: {
        name: 'Silver Chorsa',
        unit: '1KG',
        bid: pickNum(mr.silver_chorsa_bid, mr.silver_chorsa),
        ask: pickNum(mr.silver_chorsa_ask, mr.silver_chorsa_1kg, mr.silver_chorsa),
        high: null,
        low: null,
      },
    },
  };

  // 3. IBJA Official (payload.ibjaBullion or /api/prices/ibja-live)
  const ibja = data.ibjaBullion || data.ibja || data.ibjaOfficial || data.IBJA || {};
  const ibjaSum = ibja.summary || data.summary || {};
  const IBJA = {
    updatedAt: ibja.lastUpdated || now,
    status: ibja.status || 'ONLINE',
    items: {
      gold995: {
        name: 'Gold 995',
        unit: '10g',
        bid: pickNum(ibjaSum.gold_995_10g, ibjaSum.official_gold_995_10g, ibja.gold_995),
        ask: pickNum(ibjaSum.gold_995_10g_gst, ibjaSum.official_gold_995_10g_gst, ibjaSum.gold_995_10g),
        high: null,
        low: null,
      },
      gold916: {
        name: '22K 916',
        unit: '10g',
        bid: pickNum(ibjaSum.gold_916_10g, ibjaSum.official_gold_916_10g, ibja.gold_916),
        ask: pickNum(ibjaSum.gold_916_10g_gst, ibjaSum.official_gold_916_10g_gst, ibjaSum.gold_916_10g),
        high: null,
        low: null,
      },
      silverPeti: {
        name: 'Silver 999',
        unit: '1KG',
        bid: pickNum(ibjaSum.silver_999_1kg, ibjaSum.official_silver_999_1kg, ibja.silver_999),
        ask: pickNum(ibjaSum.silver_999_1kg_gst, ibjaSum.official_silver_999_1kg_gst, ibjaSum.silver_999_1kg),
        high: null,
        low: null,
      },
      silverChorsa: {
        name: 'Gold 999',
        unit: '10g',
        bid: pickNum(ibjaSum.gold_999_10g, ibjaSum.official_gold_999_10g),
        ask: pickNum(ibjaSum.gold_999_10g_gst, ibjaSum.official_gold_999_10g_gst),
        high: null,
        low: null,
      },
    },
  };

  return { timestamp: now, HB, MOSUN, IBJA };
}
