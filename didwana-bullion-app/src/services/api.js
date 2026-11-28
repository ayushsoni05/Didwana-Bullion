import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { API_BASE_URL, AUTH_BASE_URL } from '../config/constants';
import { authStorage } from './storage';

let refreshPromise = null;

async function tryRefreshToken() {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = rawRequest(
      '/api/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }), timeout: 30000 },
      AUTH_BASE_URL
    )
      .then((res) => {
        if (res?.token) {
          authStorage.saveSession(
            res.token,
            res.user || authStorage.getUser(),
            authStorage.isRemembered(),
            res.refreshToken || refreshToken
          );
          return res.token;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function rawRequest(path, options = {}, baseUrl = API_BASE_URL) {
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

async function request(path, options = {}, baseUrl = API_BASE_URL) {
  try {
    return await rawRequest(path, options, baseUrl);
  } catch (err) {
    if (
      err.status === 401 &&
      baseUrl === AUTH_BASE_URL &&
      !path.includes('/login') &&
      !path.includes('/signup') &&
      !path.includes('/refresh')
    ) {
      const newToken = await tryRefreshToken();
      if (newToken) {
        return rawRequest(path, options, baseUrl);
      }
    }
    throw err;
  }
}

export const authApi = {
  warmUp() {
    return request('/health', { method: 'GET', timeout: 45000 }, AUTH_BASE_URL).catch(() => null);
  },

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
      timeout: 45000,
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
      timeout: 45000,
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

  async logout() {
    return request('/api/auth/logout', { method: 'POST' }, AUTH_BASE_URL).catch(() => null);
  },

  async logoutAll() {
    return request('/api/auth/logout-all', { method: 'POST' }, AUTH_BASE_URL);
  },

  async getSessions() {
    return request('/api/auth/sessions', { method: 'GET' }, AUTH_BASE_URL);
  },

  async revokeSession(id) {
    return request(`/api/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }, AUTH_BASE_URL);
  },

  async changePassword({ currentPassword, newPassword }) {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, AUTH_BASE_URL);
  },

  async getAuditLogs() {
    return request('/api/auth/audit-logs', { method: 'GET' }, AUTH_BASE_URL);
  },

  async deleteAccount() {
    return request('/api/auth/me', { method: 'DELETE' }, AUTH_BASE_URL);
  },

  async sendTelemetry(payload) {
    return request('/api/auth/telemetry', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, AUTH_BASE_URL);
  },

  async getNotices() {
    return request('/api/auth/notices', { method: 'GET' }, AUTH_BASE_URL);
  },

  async markNoticeRead(id) {
    return request(`/api/auth/notices/${encodeURIComponent(id)}/read`, {
      method: 'POST',
    }, AUTH_BASE_URL);
  },
};

export const newsApi = {
  async list({ category = 'ALL', search = '', limit = 50 } = {}) {
    const qs = new URLSearchParams({ category, search, limit: String(limit) }).toString();
    return request(`/api/news?${qs}`, { method: 'GET' }, AUTH_BASE_URL);
  },
  async getArticle(id) {
    return request(`/api/news/${encodeURIComponent(id)}`, { method: 'GET' }, AUTH_BASE_URL);
  },
  async recordView(id) {
    return request(`/api/news/${encodeURIComponent(id)}/view`, { method: 'POST' }, AUTH_BASE_URL).catch(() => null);
  },
};

export const siteConfigApi = {
  async getPublicConfig() {
    return request('/api/public/config', { method: 'GET', timeout: 15000 }, AUTH_BASE_URL);
  },
};

export const adminApi = {
  async getOverview() {
    return request('/api/admin/overview', { method: 'GET' }, AUTH_BASE_URL);
  },
  async getUsers({ q = '', role = 'ALL', status = 'ALL', limit = 150 } = {}) {
    const qs = new URLSearchParams({ q, role, status, limit: String(limit) }).toString();
    return request(`/api/admin/users?${qs}`, { method: 'GET' }, AUTH_BASE_URL);
  },
  async exportUsers() {
    return request('/api/admin/users/export', { method: 'GET' }, AUTH_BASE_URL);
  },
  async getUserDossier(id) {
    return request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'GET' }, AUTH_BASE_URL);
  },
  async updateUser(id, payload) {
    return request(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, AUTH_BASE_URL);
  },
  async revokeUserSessions(id) {
    return request(`/api/admin/users/${encodeURIComponent(id)}/revoke-sessions`, {
      method: 'POST',
    }, AUTH_BASE_URL);
  },
  async sendNotice(payload) {
    return request('/api/admin/notices', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, AUTH_BASE_URL);
  },
  async listNews() {
    return request('/api/admin/news', { method: 'GET' }, AUTH_BASE_URL);
  },
  async createNews(payload) {
    return request('/api/admin/news', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, AUTH_BASE_URL);
  },
  async updateNews(id, payload) {
    return request(`/api/admin/news/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, AUTH_BASE_URL);
  },
  async deleteNews(id) {
    return request(`/api/admin/news/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }, AUTH_BASE_URL);
  },
  async getSiteConfig() {
    return request('/api/admin/site-config', { method: 'GET' }, AUTH_BASE_URL);
  },
  async updateSiteConfig(payload) {
    return request('/api/admin/site-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, AUTH_BASE_URL);
  },
  async getAuditLogs() {
    return request('/api/admin/audit-logs', { method: 'GET' }, AUTH_BASE_URL);
  },
  async getAllAlerts() {
    return request('/api/admin/alerts', { method: 'GET' }, AUTH_BASE_URL);
  },
};

export const alertsApi = {
  async list() {
    return request('/api/alerts', { method: 'GET' }, AUTH_BASE_URL);
  },
  async create(payload) {
    return request('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, AUTH_BASE_URL);
  },
  async remove(id) {
    return request(`/api/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' }, AUTH_BASE_URL);
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
    const normalizedRange = String(range || '1D').toLowerCase();
    return request(`/api/prices/history?range=${encodeURIComponent(normalizedRange)}`, {
      method: 'GET',
    });
  },

  subscribeStream({ onData, onStatus }) {
    let eventSource = null;
    let closed = false;
    let retryTimer = null;
    let watchdogTimer = null;
    let lastFrameAt = Date.now();

    const clearTimers = () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (watchdogTimer) clearInterval(watchdogTimer);
      retryTimer = null;
      watchdogTimer = null;
    };

    const connect = () => {
      if (closed) return;
      clearTimers();
      eventSource?.close();
      onStatus?.('CONNECTING');

      const token = authStorage.getToken();
      const url = token
        ? `${API_BASE_URL}/api/prices/stream?token=${encodeURIComponent(token)}`
        : `${API_BASE_URL}/api/prices/stream`;

      lastFrameAt = Date.now();
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        lastFrameAt = Date.now();
        onStatus?.('LIVE');
      };

      eventSource.onmessage = (event) => {
        lastFrameAt = Date.now();
        onStatus?.('LIVE');
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
        if (!closed && !retryTimer) {
          retryTimer = setTimeout(connect, 2500);
        }
      };

      // 8-second stall watchdog for 24-hour non-stop reliability
      watchdogTimer = setInterval(() => {
        if (!closed && Date.now() - lastFrameAt > 8500) {
          onStatus?.('RECONNECTING');
          connect();
        }
      }, 3000);
    };

    connect();

    const handleResume = () => {
      if (!closed) connect();
    };
    window.addEventListener('online', handleResume);

    return () => {
      closed = true;
      clearTimers();
      window.removeEventListener('online', handleResume);
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

function findRegionalProduct(products, matcher) {
  if (!Array.isArray(products)) return null;
  return (
    products.find((p) => matcher(`${p.name || ''} ${p.displayName || ''}`.toLowerCase())) || null
  );
}

/**
 * Fixes upstream feed double-addition where flat-quoted rates (e.g. RTGS / Cash / Auction)
 * carry the full quote in `diff` while upstream mistakenly adds MCX spot on top of it.
 */
function sanitizeUpstreamRate({ bid, ask, high, low, product, refBase }) {
  let cleanAsk = ask;
  let cleanBid = bid;
  const prodDiff = pickNum(product?.diff);
  const spread = cleanAsk && cleanBid && cleanAsk > cleanBid ? cleanAsk - cleanBid : 0;

  if (cleanAsk && refBase) {
    if (
      prodDiff &&
      prodDiff > refBase * 0.55 &&
      cleanAsk > refBase * 1.55 &&
      Math.abs(cleanAsk - prodDiff - refBase) < refBase * 0.05
    ) {
      cleanAsk = prodDiff;
      cleanBid = spread && spread < cleanAsk ? cleanAsk - spread : cleanBid;
    } else if (cleanAsk > refBase * 1.55) {
      cleanAsk = cleanAsk - refBase;
      if (cleanBid && cleanBid > refBase * 1.55) {
        cleanBid = cleanBid - refBase;
      } else if (spread && spread < cleanAsk) {
        cleanBid = cleanAsk - spread;
      }
    }
  }

  const rawHigh = pickNum(high, product?.high);
  const rawLow = pickNum(low, product?.low);
  const cleanHigh = rawHigh && (!refBase || rawHigh <= refBase * 1.55) ? rawHigh : null;
  const cleanLow = rawLow && (!refBase || rawLow <= refBase * 1.55) ? rawLow : null;

  return { bid: cleanBid, ask: cleanAsk, high: cleanHigh, low: cleanLow };
}

/**
 * Normalizes live payloads across all three bullion desks:
 * - Jodhpur Bullion Desk
 * - Sujangarh Bullion Desk
 * - Official IBJA Benchmark
 */
export function normalizeBullionPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw.payload || raw.data || raw.rates || raw;
  const now = data.updatedAt || data.lastUpdated || data.timestamp || raw.timestamp || new Date().toISOString();

  // 1. Jodhpur Desk — Gold & Silver Ready/TDS rates
  const hb = data.himanshuBullion || data.hb || data.HB || {};
  const hbProds = hb.products || [];
  const hbGold995 = findProduct(hbProds, (n) => n.includes('995') && !n.includes('tds'));
  const hbTdsGold = findProduct(hbProds, (n) => n.includes('tds') && n.includes('995') && !n.includes('100gm'));
  const hbSilverPeti = findProduct(hbProds, (n) => n.includes('peti') || n.includes('999.9'));
  const hbSilverChorsa = findProduct(hbProds, (n) => n.includes('chorsa') && !n.includes('tds'));

  const hbList = [
    {
      key: 'gold995',
      name: 'Gold 995 Ready',
      tag: '3% GST • JDR',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(hbGold995?.bid, data.sellRates?.gold_995, hbGold995?.ask),
      ask: pickNum(hbGold995?.ask, data.buyRates?.gold_995),
      high: pickNum(hbGold995?.high, data.market?.highPrice),
      low: pickNum(hbGold995?.low, data.market?.lowPrice),
    },
    {
      key: 'gold995_tds',
      name: 'TDS Gold 995 Imp',
      tag: 'TDS • JDR',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(hbTdsGold?.bid, data.sellRates?.gold_995),
      ask: pickNum(hbTdsGold?.ask, data.buyRates?.gold_995),
      high: pickNum(hbTdsGold?.high),
      low: pickNum(hbTdsGold?.low),
    },
    {
      key: 'gold24k',
      name: 'Gold 24K (999)',
      tag: '24K • Pure',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(data.sellRates?.gold_24k_10g, data.gold_10g_24k),
      ask: pickNum(data.buyRates?.gold_24k_10g, data.gold_10g_24k),
      high: null,
      low: null,
    },
    {
      key: 'gold916',
      name: 'Gold 22K (916)',
      tag: '22K • HUID',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(data.sellRates?.gold_22k_10g, data.gold_10g_22k),
      ask: pickNum(data.buyRates?.gold_22k_10g, data.gold_10g_22k),
      high: null,
      low: null,
    },
    {
      key: 'gold20k',
      name: 'Gold 20K (833)',
      tag: '20K • HUID',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(data.sellRates?.gold_20k_10g, data.gold_10g_20k),
      ask: pickNum(data.buyRates?.gold_20k_10g, data.gold_10g_20k),
      high: null,
      low: null,
    },
    {
      key: 'gold18k',
      name: 'Gold 18K (750)',
      tag: '18K • HUID',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(data.sellRates?.gold_18k_10g, data.gold_10g_18k),
      ask: pickNum(data.buyRates?.gold_18k_10g, data.gold_10g_18k),
      high: null,
      low: null,
    },
    {
      key: 'gold14k',
      name: 'Gold 14K (585)',
      tag: '14K • HUID',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(data.sellRates?.gold_14k_10g, data.gold_10g_14k),
      ask: pickNum(data.buyRates?.gold_14k_10g, data.gold_10g_14k),
      high: null,
      low: null,
    },
    {
      key: 'silverPeti',
      name: 'Silver Bank Peti 999.9',
      tag: '3% GST • 1KG',
      metal: 'silver',
      unit: '1KG',
      bid: pickNum(hbSilverPeti?.bid, data.sellRates?.silver_1kg, hbSilverPeti?.ask),
      ask: pickNum(hbSilverPeti?.ask, data.buyRates?.silver_1kg, data.silver_1kg),
      high: pickNum(hbSilverPeti?.high),
      low: pickNum(hbSilverPeti?.low),
    },
    {
      key: 'silverChorsa',
      name: 'Silver Chorsa 98.00',
      tag: '3% GST • 1KG',
      metal: 'silver',
      unit: '1KG',
      bid: pickNum(hbSilverChorsa?.bid, data.sellRates?.silver_chorsa_1kg, hbSilverChorsa?.ask),
      ask: pickNum(hbSilverChorsa?.ask, data.buyRates?.silver_chorsa_1kg, data.silver_chorsa_1kg),
      high: pickNum(hbSilverChorsa?.high),
      low: pickNum(hbSilverChorsa?.low),
    },
    {
      key: 'silver10g',
      name: 'Silver Fine (10g)',
      tag: 'Retail • 10g',
      metal: 'silver',
      unit: '10g',
      bid: pickNum(data.sellRates?.silver_10g, data.silver_10g),
      ask: pickNum(data.buyRates?.silver_10g, data.silver_10g),
      high: null,
      low: null,
    },
  ].filter((x) => x.ask || x.bid);

  const HB = {
    updatedAt: now,
    status: hb.isLive ? 'LIVE' : hb.marketState || 'LIVE',
    list: hbList,
    items: Object.fromEntries(hbList.map((i) => [i.key, i])),
  };

  // 2. Sujangarh Desk — ALL Cash, RTGS, HUID & Silver rates (with double-add guard)
  const mosun = data.mosunBullion || data.mosun || data.MOSUN || {};
  const mosunProds = mosun.products || [];
  const mr = mosun.rates || {};
  const mcxGoldRef = pickNum(mr.mcx_gold, data.mcx_gold);
  const mcxSilverRef = pickNum(mr.mcx_silver, data.mcx_silver);

  const pGold995Cash = findRegionalProduct(mosunProds, (n) => n.includes('99.50') && !n.includes('rtgs'));
  const pGold995Rtgs = findRegionalProduct(mosunProds, (n) => (n.includes('99.50') || n.includes('रेडी स्टॉक')) && n.includes('rtgs'));
  const pGold993Cash = findRegionalProduct(mosunProds, (n) => n.includes('99.30') && !n.includes('rtgs'));
  const pGold993Rtgs = findRegionalProduct(mosunProds, (n) => n.includes('99.30') && n.includes('rtgs'));
  const pGold22 = findRegionalProduct(mosunProds, (n) => n.includes('916') || n.includes('22'));
  const pGold20 = findRegionalProduct(mosunProds, (n) => n.includes('833') || n.includes('20'));
  const pGold18 = findRegionalProduct(mosunProds, (n) => n.includes('750') || n.includes('18'));
  const pSilverBankCash = findRegionalProduct(mosunProds, (n) => n.includes('silver bank') && !n.includes('rtgs'));
  const pSilverBankRtgs = findRegionalProduct(mosunProds, (n) => n.includes('silver bank') && n.includes('rtgs'));
  const pSilverChorsaCash = findRegionalProduct(mosunProds, (n) => n.includes('chorsa') && !n.includes('rtgs'));
  const pSilverChorsaRtgs = findRegionalProduct(mosunProds, (n) => n.includes('chorsa') && n.includes('rtgs'));
  const pSilverAuction = findRegionalProduct(mosunProds, (n) => n.includes('auction'));
  const pSilverJewel = findRegionalProduct(
    mosunProds,
    (n) => (n.includes('silver') || n.includes('चांदी')) && (n.includes('बर्तन') || n.includes('utensils') || n.includes('jewellery'))
  );

  const sjGold995Cash = sanitizeUpstreamRate({
    bid: pickNum(mr.gold_995_cash_bid, mr.gold_995_bid, pGold995Cash?.bid),
    ask: pickNum(mr.gold_995_cash_ask, mr.gold_995_ask, mr.gold_995, pGold995Cash?.ask),
    high: mr.gold_995_high,
    low: mr.gold_995_low,
    product: pGold995Cash,
    refBase: mcxGoldRef,
  });
  const sjGold995Rtgs = sanitizeUpstreamRate({
    bid: pickNum(mr.gold_995_rtgs_bid, pGold995Rtgs?.bid),
    ask: pickNum(mr.gold_995_rtgs_ask, mr.gold_995_rtgs, pGold995Rtgs?.ask),
    product: pGold995Rtgs,
    refBase: mcxGoldRef,
  });
  const sjGold993Cash = sanitizeUpstreamRate({
    bid: pickNum(mr.gold_993_cash_bid, pGold993Cash?.bid),
    ask: pickNum(mr.gold_993_cash_ask, mr.gold_993_cash, pGold993Cash?.ask),
    product: pGold993Cash,
    refBase: mcxGoldRef,
  });
  const sjGold993Rtgs = sanitizeUpstreamRate({
    bid: pickNum(mr.gold_993_rtgs_bid, pGold993Rtgs?.bid),
    ask: pickNum(mr.gold_993_rtgs_ask, mr.gold_993_rtgs, pGold993Rtgs?.ask),
    product: pGold993Rtgs,
    refBase: mcxGoldRef,
  });
  const sjSilverBankCash = sanitizeUpstreamRate({
    bid: pickNum(mr.silver_bank_cash_bid, pSilverBankCash?.bid),
    ask: pickNum(mr.silver_bank_cash_ask, mr.silver_bank_cash, pSilverBankCash?.ask),
    product: pSilverBankCash,
    refBase: mcxSilverRef,
  });
  const sjSilverBankRtgs = sanitizeUpstreamRate({
    bid: pickNum(mr.silver_bank_rtgs_bid, mr.silver_999_1kg_bid, pSilverBankRtgs?.bid),
    ask: pickNum(mr.silver_bank_rtgs_ask, mr.silver_bank_rtgs, mr.silver_999_1kg_ask, pSilverBankRtgs?.ask),
    product: pSilverBankRtgs,
    refBase: mcxSilverRef,
  });
  const sjSilverChorsaCash = sanitizeUpstreamRate({
    bid: pickNum(mr.silver_chorsa_bid, pSilverChorsaCash?.bid),
    ask: pickNum(mr.silver_chorsa_ask, mr.silver_chorsa, pSilverChorsaCash?.ask),
    product: pSilverChorsaCash,
    refBase: mcxSilverRef,
  });
  const sjSilverChorsaRtgs = sanitizeUpstreamRate({
    bid: pickNum(mr.silver_chorsa_rtgs_bid, pSilverChorsaRtgs?.bid),
    ask: pickNum(mr.silver_chorsa_rtgs_ask, mr.silver_chorsa_rtgs, pSilverChorsaRtgs?.ask),
    product: pSilverChorsaRtgs,
    refBase: mcxSilverRef,
  });
  const sjSilverAuction = sanitizeUpstreamRate({
    bid: pickNum(mr.silver_auction_bank_bid, pSilverAuction?.bid),
    ask: pickNum(mr.silver_auction_bank_ask, mr.silver_auction_bank, pSilverAuction?.ask),
    product: pSilverAuction,
    refBase: mcxSilverRef,
  });

  const mosunList = [
    {
      key: 'gold995_rtgs',
      name: 'Gold 99.50 RTGS',
      tag: 'RTGS • 3% GST',
      metal: 'gold',
      unit: '10g',
      ...sjGold995Rtgs,
    },
    {
      key: 'gold995',
      name: 'Gold 24K (99.50) Cash',
      tag: 'LOCAL CASH',
      metal: 'gold',
      unit: '10g',
      ...sjGold995Cash,
    },
    {
      key: 'gold993_rtgs',
      name: 'Gold 99.30 RTGS',
      tag: 'RTGS • 3% GST',
      metal: 'gold',
      unit: '10g',
      ...sjGold993Rtgs,
    },
    {
      key: 'gold993_cash',
      name: 'Gold 99.30 Cash',
      tag: 'LOCAL CASH',
      metal: 'gold',
      unit: '10g',
      ...sjGold993Cash,
    },
    {
      key: 'gold916',
      name: 'Gold 22K (916) HUID',
      tag: '22K • HUID',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(mr.gold_22k_10g_bid, pGold22?.bid),
      ask: pickNum(mr.gold_22k_10g_ask, mr.gold_22k_10g, mr.gold_22k, pGold22?.ask),
      high: pickNum(pGold22?.high),
      low: pickNum(pGold22?.low),
    },
    {
      key: 'gold20k',
      name: 'Gold 20K (833) HUID',
      tag: '20K • HUID',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(mr.gold_20k_10g_bid, pGold20?.bid),
      ask: pickNum(mr.gold_20k_10g_ask, mr.gold_20k_10g, pGold20?.ask),
      high: pickNum(pGold20?.high),
      low: pickNum(pGold20?.low),
    },
    {
      key: 'gold18k',
      name: 'Gold 18K (750) HUID',
      tag: '18K • HUID',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(mr.gold_18k_10g_bid, pGold18?.bid),
      ask: pickNum(mr.gold_18k_10g_ask, mr.gold_18k_10g, mr.gold_18k, pGold18?.ask),
      high: pickNum(pGold18?.high),
      low: pickNum(pGold18?.low),
    },
    {
      key: 'gold14k',
      name: 'Gold 14K (585) HUID',
      tag: '14K • HUID',
      metal: 'gold',
      unit: '10g',
      bid: pickNum(mr.gold_14k_10g_bid),
      ask: pickNum(mr.gold_14k_10g_ask, mr.gold_14k_10g),
      high: null,
      low: null,
    },
    {
      key: 'silverPeti_rtgs',
      name: 'Silver Bank 999 RTGS',
      tag: 'RTGS • 1KG',
      metal: 'silver',
      unit: '1KG',
      ...sjSilverBankRtgs,
    },
    {
      key: 'silverPeti',
      name: 'Silver Bank 999 Cash',
      tag: 'LOCAL CASH • 1KG',
      metal: 'silver',
      unit: '1KG',
      ...sjSilverBankCash,
    },
    {
      key: 'silverChorsa_rtgs',
      name: 'Silver Chorsa RTGS',
      tag: 'RTGS • 1KG',
      metal: 'silver',
      unit: '1KG',
      ...sjSilverChorsaRtgs,
    },
    {
      key: 'silverChorsa',
      name: 'Silver Chorsa (98.00) Cash',
      tag: 'LOCAL CASH • 1KG',
      metal: 'silver',
      unit: '1KG',
      ...sjSilverChorsaCash,
    },
    {
      key: 'silverAuction',
      name: 'Silver Auction Bank',
      tag: 'AUCTION • 1KG',
      metal: 'silver',
      unit: '1KG',
      ...sjSilverAuction,
    },
    {
      key: 'silverJewellery',
      name: 'Silver Jewellery',
      tag: 'JEWELLERY • 1KG',
      metal: 'silver',
      unit: '1KG',
      bid: pickNum(mr.silver_jewellery_bid, pSilverJewel?.bid),
      ask: pickNum(mr.silver_jewellery_ask, mr.silver_jewellery, pSilverJewel?.ask),
      high: pickNum(pSilverJewel?.high),
      low: pickNum(pSilverJewel?.low),
    },
  ].filter((x) => x.ask || x.bid);

  const MOSUN = {
    updatedAt: now,
    status: mosun.isLive ? 'LIVE' : mosun.marketState || 'LIVE',
    list: mosunList,
    items: Object.fromEntries(mosunList.map((i) => [i.key, i])),
  };

  // 3. IBJA Official — ALL Commodities
  const ibja = data.ibjaBullion || data.ibja || data.ibjaOfficial || data.IBJA || {};
  const ibjaSum = ibja.summary || data.summary || {};
  const ibjaComm = Array.isArray(ibja.commodities) ? ibja.commodities : [];

  const ibjaKeyMap = {
    gold_999: 'gold24k',
    gold_995: 'gold995',
    gold_916: 'gold916',
    gold_750: 'gold18k',
    gold_585: 'gold14k',
    silver_999: 'silverPeti',
    platinum_999: 'platinum999',
  };

  let ibjaList = ibjaComm.map((c) => ({
    key: ibjaKeyMap[c.id] || c.id,
    name: c.name,
    tag: c.fixingRate ? `Fixing ₹${Math.round(c.fixingRate).toLocaleString('en-IN')}` : c.purity,
    metal: c.id.includes('silver') ? 'silver' : 'gold',
    unit: c.unit || '10 GM',
    bid: pickNum(c.rate),
    ask: pickNum(c.rateGst, c.rate),
    high: pickNum(c.fixingRateGst, c.fixingRate),
    low: pickNum(c.prevRate),
  }));

  if (ibjaList.length === 0) {
    ibjaList = [
      {
        key: 'gold24k',
        name: 'Gold 999 (24K Pure)',
        tag: 'OFFICIAL IBJA',
        metal: 'gold',
        unit: '10 GM',
        bid: pickNum(ibjaSum.gold_999_10g, ibjaSum.official_gold_999_10g),
        ask: pickNum(ibjaSum.gold_999_10g_gst, ibjaSum.official_gold_999_10g_gst, ibjaSum.gold_999_10g),
      },
      {
        key: 'gold995',
        name: 'Gold 995 (24K Bullion)',
        tag: 'OFFICIAL IBJA',
        metal: 'gold',
        unit: '10 GM',
        bid: pickNum(ibjaSum.gold_995_10g, ibjaSum.official_gold_995_10g),
        ask: pickNum(ibjaSum.gold_995_10g_gst, ibjaSum.official_gold_995_10g_gst, ibjaSum.gold_995_10g),
      },
      {
        key: 'gold916',
        name: 'Gold 916 (22K BIS)',
        tag: 'OFFICIAL IBJA',
        metal: 'gold',
        unit: '10 GM',
        bid: pickNum(ibjaSum.gold_916_10g, ibjaSum.official_gold_916_10g),
        ask: pickNum(ibjaSum.gold_916_10g_gst, ibjaSum.official_gold_916_10g_gst, ibjaSum.gold_916_10g),
      },
      {
        key: 'silverPeti',
        name: 'Silver 999 (1 KG)',
        tag: 'OFFICIAL IBJA',
        metal: 'silver',
        unit: '1 KG',
        bid: pickNum(ibjaSum.silver_999_1kg, ibjaSum.official_silver_999_1kg),
        ask: pickNum(ibjaSum.silver_999_1kg_gst, ibjaSum.official_silver_999_1kg_gst, ibjaSum.silver_999_1kg),
      },
    ].filter((x) => x.ask || x.bid);
  }

  const IBJA = {
    updatedAt: ibja.lastUpdated || now,
    status: ibja.status || 'ONLINE',
    list: ibjaList,
    items: Object.fromEntries(ibjaList.map((i) => [i.key, i])),
  };

  const spot = {
    xauUsd: pickNum(mr.xau_usd),
    xagUsd: pickNum(mr.xag_usd),
    usdInr: pickNum(mr.usd_inr),
    mcxGold: pickNum(mr.mcx_gold),
    mcxSilver: pickNum(mr.mcx_silver),
  };

  return { timestamp: now, HB, MOSUN, IBJA, spot };
}

export function applySiteRateOffsets(norm, siteConfig) {
  if (!norm || !siteConfig) return norm;
  const hbGoldOff = Number(siteConfig.hbGoldOffset || 0);
  const hbSilverOff = Number(siteConfig.hbSilverOffset || 0);
  const mosunGoldOff = Number(siteConfig.mosunGoldOffset || 0);
  const mosunSilverOff = Number(siteConfig.mosunSilverOffset || 0);
  const ibjaGoldOff = Number(siteConfig.ibjaGoldOffset || 0);

  if (!hbGoldOff && !hbSilverOff && !mosunGoldOff && !mosunSilverOff && !ibjaGoldOff) {
    return norm;
  }

  const adjustTerm = (term, goldOff, silverOff) => {
    if (!term?.list?.length) return term;
    const list = term.list.map((item) => {
      const off = item.metal === 'silver' ? silverOff : goldOff;
      if (!off) return item;
      return {
        ...item,
        bid: item.bid ? item.bid + off : item.bid,
        ask: item.ask ? item.ask + off : item.ask,
      };
    });
    return {
      ...term,
      list,
      items: Object.fromEntries(list.map((i) => [i.key, i])),
    };
  };

  return {
    ...norm,
    HB: adjustTerm(norm.HB, hbGoldOff, hbSilverOff),
    MOSUN: adjustTerm(norm.MOSUN, mosunGoldOff, mosunSilverOff),
    IBJA: adjustTerm(norm.IBJA, ibjaGoldOff, 0),
  };
}
