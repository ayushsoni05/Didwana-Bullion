import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Crown, Megaphone, Moon, Phone, Share2, ShieldAlert, Sun } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { APP_INFO } from './config/constants';
import {
  alertsApi,
  applySiteRateOffsets,
  authApi,
  newsApi,
  normalizeBullionPayload,
  pricesApi,
  siteConfigApi,
} from './services/api';
import { authStorage, consentStorage, ratesCache } from './services/storage';
import { playTickSound } from './services/sound';
import { captureAndSyncTelemetry } from './services/telemetry';
import SplashGate, { GoldCrest } from './components/SplashGate';
import AuthScreens from './components/AuthScreens';
import LiveRatesTab from './components/LiveRatesTab';
import { BankDetailsModal, CalculatorModal, PriceAlertsModal } from './components/BullionModals';
import { FloatingDock } from './components/ui/FloatingDock';
const ChartsTab = lazy(() => import('./components/ChartsTab'));
const AccountTab = lazy(() => import('./components/AccountTab'));
const NewsTab = lazy(() => import('./components/NewsTab'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
import {
  CookiePreferencesModal,
  FirstLaunchConsentBanner,
  LegalDocumentModal,
} from './components/LegalScreens';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [fadingSplash, setFadingSplash] = useState(false);

  const [user, setUser] = useState(() => authStorage.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(authStorage.getToken()));

  const [activeTab, setActiveTab] = useState(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.search.includes('admin') || window.location.hash.includes('admin'))
    ) {
      return 'admin';
    }
    return 'rates';
  });
  const [prefs, setPrefs] = useState(() => consentStorage.getFunctionalPrefs());
  const [activeTerminal, setActiveTerminal] = useState(() =>
    prefs.defaultTerminal === 'ALL' ? 'HB' : prefs.defaultTerminal || 'HB'
  );

  const [siteConfig, setSiteConfig] = useState(null);
  const siteConfigRef = useRef(null);
  const [unreadNewsCount, setUnreadNewsCount] = useState(0);
  const [activeNotice, setActiveNotice] = useState(null);

  const isAdmin = useMemo(() => {
    const email = String(user?.email || '').toLowerCase();
    return user?.role === 'ADMIN' || (email && email === APP_INFO.ownerAdminEmail);
  }, [user]);

  useEffect(() => {
    siteConfigRef.current = siteConfig;
  }, [siteConfig]);

  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('rates');
    }
  }, [activeTab, isAdmin]);

  const [cookiePrefs, setCookiePrefs] = useState(() => consentStorage.getCookiePrefs());
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcPreset, setCalcPreset] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [alertPreset, setAlertPreset] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [triggeredBanner, setTriggeredBanner] = useState(null);
  const triggeredAlertsRef = useRef(new Set());

  const [rates, setRates] = useState(() => ratesCache.getLastRates());
  const [prevRates, setPrevRates] = useState(null);
  const [liveBuffer, setLiveBuffer] = useState(() => {
    const cached = ratesCache.getLastRates();
    return cached ? [cached] : [];
  });
  const [ticks, setTicks] = useState({});
  const [streamStatus, setStreamStatus] = useState('CONNECTING');
  const [refreshing, setRefreshing] = useState(false);

  const ratesRef = useRef(rates);
  const tickTimerRef = useRef(null);
  const tickAudioRef = useRef(prefs.tickAudio);

  useEffect(() => {
    tickAudioRef.current = prefs.tickAudio;
  }, [prefs.tickAudio]);

  // Resolve Light / Dark theme
  const resolvedDark = useMemo(() => {
    const mode = prefs.theme || 'dark';
    if (mode === 'system') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
    }
    return mode === 'dark';
  }, [prefs.theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      StatusBar.setBackgroundColor({ color: resolvedDark ? '#0B0907' : '#F8F4EC' });
      StatusBar.setStyle({ style: resolvedDark ? Style.Dark : Style.Light });
    } catch {
      // Ignore on web
    }
  }, [resolvedDark]);

  const applyNormalizedRates = useCallback((rawNormalized) => {
    if (!rawNormalized) return;
    const cfg = siteConfigRef.current;
    if (cfg?.ratesFrozen && ratesRef.current) return;
    const normalized = applySiteRateOffsets(rawNormalized, cfg);
    const prev = ratesRef.current;
    if (prev) {
      const nextTicks = {};
      let playedSound = false;
      ['HB', 'MOSUN', 'IBJA'].forEach((termId) => {
        ['gold995', 'gold916', 'silverPeti', 'silverChorsa'].forEach((prodKey) => {
          const curAsk = normalized[termId]?.items?.[prodKey]?.ask || normalized[termId]?.items?.[prodKey]?.bid;
          const oldAsk = prev[termId]?.items?.[prodKey]?.ask || prev[termId]?.items?.[prodKey]?.bid;
          if (curAsk && oldAsk && curAsk !== oldAsk) {
            const dir = curAsk > oldAsk ? 'up' : 'down';
            nextTicks[`${termId}_${prodKey}`] = dir;
            if (!playedSound && tickAudioRef.current) {
              playTickSound(dir);
              playedSound = true;
            }
          }
        });
      });
      if (Object.keys(nextTicks).length > 0) {
        setTicks((prevTicks) => ({ ...prevTicks, ...nextTicks }));
        if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
        tickTimerRef.current = setTimeout(() => setTicks({}), 1200);
      }
      setPrevRates(prev);
    }
    ratesRef.current = normalized;
    ratesCache.saveLastRates(normalized);
    setRates(normalized);
    setLiveBuffer((buf) => [...buf.slice(-59), normalized]);
  }, []);

  const fetchLatestOnce = useCallback(async () => {
    setRefreshing(true);
    try {
      const [latestRes, ibjaRes] = await Promise.allSettled([
        pricesApi.getLatest(),
        pricesApi.getIbjaLive(),
      ]);
      const merged = {
        ...(latestRes.status === 'fulfilled' ? latestRes.value : {}),
      };
      if (ibjaRes.status === 'fulfilled' && ibjaRes.value) {
        merged.ibja = merged.ibja || ibjaRes.value.ibja || ibjaRes.value;
      }
      const norm = normalizeBullionPayload(merged);
      if (norm) applyNormalizedRates(norm);
    } catch {
      // Stream watchdog continues retrying
    } finally {
      setRefreshing(false);
    }
  }, [applyNormalizedRates]);

  // Zero-Blocking Instant Boot: hide native splash immediately, pre-warm Postgres backend,
  // show 1.35s 3-Act SplashGate, and verify JWT silently in background
  useEffect(() => {
    let mounted = true;
    SplashScreen.hide().catch(() => {});
    authApi.warmUp();

    const token = authStorage.getToken();
    if (token) {
      authApi
        .getMe()
        .then((me) => {
          if (!mounted) return;
          const userObj = me?.user || me?.data || me;
          if (userObj) {
            setUser(userObj);
            authStorage.saveSession(token, userObj, authStorage.isRemembered());
          }
        })
        .catch((err) => {
          if (mounted && (err.status === 401 || err.status === 403)) {
            authStorage.clearSession();
            setUser(null);
            setIsAuthenticated(false);
          }
        });
    }

    const fadeTimer = setTimeout(() => {
      if (mounted) setFadingSplash(true);
    }, 1250);

    const doneTimer = setTimeout(() => {
      if (mounted) setBooting(false);
    }, 1600);

    return () => {
      mounted = false;
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  // Android Hardware Back Button
  useEffect(() => {
    let listener = null;
    const setupBack = async () => {
      try {
        listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (legalDoc) setLegalDoc(null);
          else if (showCookieModal) setShowCookieModal(false);
          else if (activeTab !== 'rates' && isAuthenticated) setActiveTab('rates');
          else if (!canGoBack) CapApp.exitApp();
        });
      } catch {
        // Ignore on web
      }
    };
    setupBack();
    return () => listener?.remove?.();
  }, [legalDoc, showCookieModal, activeTab, isAuthenticated]);

  // 24-Hour Non-Stop SSE + Resume / Wake-up Reconnection
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let unsubscribe = () => {};
    let currentStatus = 'CONNECTING';

    const startStream = () => {
      unsubscribe();
      fetchLatestOnce();
      unsubscribe = pricesApi.subscribeStream({
        onStatus: (s) => {
          currentStatus = s;
          setStreamStatus(s);
        },
        onData: (raw) => {
          const norm = normalizeBullionPayload(raw);
          if (norm) applyNormalizedRates(norm);
        },
      });
    };

    startStream();

    const fallbackInterval = setInterval(() => {
      if (currentStatus !== 'LIVE') {
        fetchLatestOnce();
      }
    }, 3000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        startStream();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    let appStateListener = null;
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) startStream();
    })
      .then((l) => {
        appStateListener = l;
      })
      .catch(() => {});

    return () => {
      unsubscribe();
      clearInterval(fallbackInterval);
      document.removeEventListener('visibilitychange', onVisibility);
      appStateListener?.remove?.();
    };
  }, [isAuthenticated, fetchLatestOnce, applyNormalizedRates]);

  const handleUpdatePrefs = (partial) => {
    const updated = consentStorage.saveFunctionalPrefs(partial);
    setPrefs(updated);
    if (partial.defaultTerminal) setActiveTerminal(partial.defaultTerminal);
  };

  const handleToggleWatchlist = (watchKey) => {
    const current = prefs.watchlist || [];
    const next = current.includes(watchKey)
      ? current.filter((k) => k !== watchKey)
      : [...current, watchKey];
    handleUpdatePrefs({ watchlist: next });
  };

  const handleSaveCookiePrefs = (functionalEnabled) => {
    const next = consentStorage.saveCookiePrefs(functionalEnabled);
    setCookiePrefs(next);
    setShowCookieModal(false);
  };

  const handleSignOut = () => {
    authApi.logout();
    authStorage.clearSession();
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('rates');
  };

  // Fetch Live Site Config, Direct Notices, Unread News & Explicit-Consent Telemetry
  const refreshSiteConfig = useCallback(() => {
    siteConfigApi
      .getPublicConfig()
      .then((res) => {
        if (res?.config) setSiteConfig(res.config);
      })
      .catch(() => {});
  }, []);

  const refreshUnreadNews = useCallback(async () => {
    try {
      const res = await newsApi.list({ limit: 30 });
      const rows = res?.news || [];
      const lastSeenMs = prefs.lastReadNewsAt ? new Date(prefs.lastReadNewsAt).getTime() : 0;
      const unread = rows.filter(
        (n) => new Date(n.published_at || n.created_at).getTime() > lastSeenMs
      ).length;
      setUnreadNewsCount(unread);
    } catch {
      // Ignore offline
    }
  }, [prefs.lastReadNewsAt]);

  useEffect(() => {
    refreshSiteConfig();
    const cfgTimer = setInterval(refreshSiteConfig, 45000);
    return () => clearInterval(cfgTimer);
  }, [refreshSiteConfig]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    captureAndSyncTelemetry({ requestPermission: true });
    refreshUnreadNews();
    authApi
      .getNotices()
      .then((res) => {
        const unread = (res?.notices || []).find((n) => !n.is_read);
        if (unread) setActiveNotice(unread);
      })
      .catch(() => {});

    let resumeListener = null;
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        captureAndSyncTelemetry({ requestPermission: false });
        refreshSiteConfig();
        refreshUnreadNews();
      }
    })
      .then((l) => {
        resumeListener = l;
      })
      .catch(() => {});

    return () => resumeListener?.remove?.();
  }, [isAuthenticated, refreshSiteConfig, refreshUnreadNews]);

  // Create high-priority Android notification channel on startup
  useEffect(() => {
    LocalNotifications.createChannel({
      id: 'bullion-alerts',
      name: 'Didwana Bullion Price Alerts',
      description: 'Real-time Gold & Silver target rate alerts',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
    }).catch(() => {});
  }, []);

  // Load alerts when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    alertsApi
      .list()
      .then((res) => setAlerts(res?.alerts || []))
      .catch(() => {});
  }, [isAuthenticated]);

  // Evaluate live price alerts (Android Notification + In-App Banner + Chime)
  useEffect(() => {
    if (!rates || !alerts.length) return;
    alerts.forEach((a) => {
      if (!a.is_active || triggeredAlertsRef.current.has(a.id)) return;
      const ask =
        rates?.[a.terminal]?.items?.[a.metal_key]?.ask ||
        rates?.[a.terminal]?.items?.[a.metal_key]?.bid;
      if (!ask) return;
      const hit =
        (a.condition === 'BELOW' && ask <= Number(a.target_ask)) ||
        (a.condition === 'ABOVE' && ask >= Number(a.target_ask));
      if (hit) {
        triggeredAlertsRef.current.add(a.id);
        const termName =
          a.terminal === 'HB' ? 'Jodhpur' : a.terminal === 'MOSUN' ? 'Sujangarh' : 'IBJA';
        const msg = `${termName} ${a.metal_key} hit ₹${Math.round(ask).toLocaleString('en-IN')}`;
        setTriggeredBanner(msg);
        playTickSound('up');
        setTimeout(() => setTriggeredBanner(null), 6000);

        LocalNotifications.checkPermissions()
          .then((p) => {
            if (p.display === 'granted') {
              return LocalNotifications.schedule({
                notifications: [
                  {
                    title: 'Didwana Bullion Price Alert',
                    body: msg,
                    id: Math.floor(Math.random() * 100000),
                    channelId: 'bullion-alerts',
                  },
                ],
              });
            }
            return null;
          })
          .catch(() => {});
      }
    });
  }, [rates, alerts]);

  const handleCreateAlert = async (payload) => {
    const res = await alertsApi.create(payload);
    if (res?.alert) setAlerts((prev) => [res.alert, ...prev]);
  };

  const handleDeleteAlert = async (id) => {
    await alertsApi.remove(id).catch(() => null);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleShareRates = async () => {
    const jdrGold = Math.round(rates?.HB?.items?.gold995?.ask || 0).toLocaleString('en-IN');
    const jdrSilver = Math.round(rates?.HB?.items?.silverPeti?.ask || 0).toLocaleString('en-IN');
    const sjgGold = Math.round(rates?.MOSUN?.items?.gold995?.ask || 0).toLocaleString('en-IN');
    const ibjaGold = Math.round(rates?.IBJA?.items?.gold995?.ask || 0).toLocaleString('en-IN');
    const text = `*Didwana Bullion (New Monika Jewellers)*\nJodhpur Gold 995: ₹${jdrGold}/10g\nJodhpur Silver 1KG: ₹${jdrSilver}\nSujangarh Gold 995: ₹${sjgGold}/10g\nIBJA Gold 995: ₹${ibjaGold}/10g`;
    try {
      await Share.share({ title: 'Didwana Bullion Live Rates', text });
    } catch {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#0B0907] text-zinc-900 dark:text-[#F5F2EB] transition-colors duration-200">
      {booting && <SplashGate fadingOut={fadingSplash} rates={rates} />}

      {!isAuthenticated ? (
        <AuthScreens
          onAuthenticated={(loggedInUser) => {
            setUser(loggedInUser);
            setIsAuthenticated(true);
          }}
          onOpenDoc={setLegalDoc}
        />
      ) : (
        <div className={`mx-auto px-3.5 pt-2.5 safe-top ${activeTab === 'admin' ? 'max-w-5xl' : 'max-w-lg'}`}>
          {/* Authentic HB & Mosun Smoked Bronze Top Bar */}
          <header className="mb-3 flex items-center justify-between rounded-2xl border border-[#3D2E1A] bg-[#15100B] px-3 py-2 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <GoldCrest size={34} />
              <div className="min-w-0">
                <h1 className="font-serif-luxury truncate text-sm font-bold tracking-wide text-[#E5C158] uppercase">
                  {APP_INFO.name}
                </h1>
                <p className="truncate text-[10px] text-[#E6DFD5]/80">
                  New Monika Jewellers • डीडवाना
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${(siteConfig?.contactPhone || APP_INFO.contactPhone).replace(/\s+/g, '')}`}
                aria-label="Call Showroom Desk"
                className="rounded-xl border border-[#3D2E1A] bg-[#0B0907] p-2 text-[#E5C158]"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                aria-label="Share Live Rates"
                onClick={handleShareRates}
                className="rounded-xl border border-[#3D2E1A] bg-[#0B0907] p-2 text-[#E5C158]"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Toggle Light/Dark Mode"
                onClick={() => handleUpdatePrefs({ theme: resolvedDark ? 'light' : 'dark' })}
                className="rounded-xl border border-[#3D2E1A] bg-[#0B0907] p-2 text-[#E5C158]"
              >
                {resolvedDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                aria-label="Price Alerts"
                onClick={() => setShowAlerts(true)}
                className="relative rounded-xl border border-[#3D2E1A] bg-[#0B0907] p-2 text-[#E5C158]"
              >
                <Bell className="h-3.5 w-3.5" />
                {alerts.length > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  aria-label="Admin Panel"
                  onClick={() => setActiveTab(activeTab === 'admin' ? 'rates' : 'admin')}
                  className={`rounded-xl border p-2 transition ${
                    activeTab === 'admin'
                      ? 'border-[#E5C158] bg-[#E5C158] text-[#0B0907]'
                      : 'border-[#3D2E1A] bg-[#0B0907] text-[#E5C158]'
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </header>

          {/* Admin Live Flash Banner */}
          {siteConfig?.flashBannerEnabled && siteConfig?.flashBannerText && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-[#D4AF37]/45 bg-gradient-to-r from-[#D4AF37]/20 via-[#10141F] to-[#D4AF37]/15 px-3.5 py-2 text-xs font-semibold text-[#9A7422] dark:text-[#E6CB94] shadow-sm">
              <Megaphone className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
              <span className="flex-1">{siteConfig.flashBannerText}</span>
            </div>
          )}

          {/* Direct / Broadcast Admin Notice Pop-up */}
          {activeNotice && (
            <div className="mb-3 flex items-start justify-between gap-2 rounded-2xl border border-amber-400/50 bg-[#141926] px-3.5 py-2.5 text-xs text-zinc-100 shadow-lg">
              <div>
                <div className="font-bold text-[#E6CB94]">{activeNotice.title}</div>
                <div className="mt-0.5 text-[11px] text-zinc-300">{activeNotice.message}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  authApi.markNoticeRead(activeNotice.id).catch(() => {});
                  setActiveNotice(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {triggeredBanner && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-[#D4AF37]/50 bg-[#111520] px-3.5 py-2.5 text-xs font-semibold text-[#E6CB94] shadow-lg">
              <span>🔔 {triggeredBanner}</span>
              <button type="button" onClick={() => setTriggeredBanner(null)} className="text-zinc-400">
                ✕
              </button>
            </div>
          )}

          {siteConfig?.maintenanceMode && !isAdmin ? (
            <div className="rounded-3xl border border-rose-500/35 bg-white dark:bg-[#10141F] p-8 text-center space-y-3 shadow-lg">
              <ShieldAlert className="mx-auto h-10 w-10 text-amber-400" />
              <h2 className="font-serif-luxury text-lg font-bold text-[#E6CB94]">
                Terminal Under Maintenance
              </h2>
              <p className="text-xs text-zinc-400">
                {siteConfig.maintenanceMessage || 'Scheduled upgrade in progress.'}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'rates' && (
                <LiveRatesTab
                  rates={rates}
                  prevRates={prevRates}
                  ticks={ticks}
                  streamStatus={streamStatus}
                  activeTerminal={activeTerminal}
                  onSelectTerminal={setActiveTerminal}
                  tickAudio={prefs.tickAudio}
                  onToggleAudio={() => handleUpdatePrefs({ tickAudio: !prefs.tickAudio })}
                  onManualRefresh={fetchLatestOnce}
                  refreshing={refreshing}
                  onOpenCalculator={(preset) => {
                    setCalcPreset(preset || null);
                    setShowCalculator(true);
                  }}
                  onOpenAlertFor={(preset) => {
                    setAlertPreset(preset || null);
                    setShowAlerts(true);
                  }}
                  onOpenBankDetails={() => setShowBankDetails(true)}
                  unit={prefs.unit || '10g'}
                  onUnitChange={(unit) => handleUpdatePrefs({ unit })}
                  watchlist={prefs.watchlist || []}
                  onToggleWatchlist={handleToggleWatchlist}
                  siteConfig={siteConfig}
                />
              )}

              {activeTab === 'charts' && (
                <Suspense fallback={<div className="py-12 text-center text-xs text-zinc-500">Loading Charts...</div>}>
                  <ChartsTab
                    rates={rates}
                    liveBuffer={liveBuffer}
                    initialRange={prefs.chartRange}
                    onRangeChange={(chartRange) => handleUpdatePrefs({ chartRange })}
                  />
                </Suspense>
              )}

              {activeTab === 'news' && (
                <Suspense fallback={<div className="py-12 text-center text-xs text-zinc-500">Loading Bullion Newsroom...</div>}>
                  <NewsTab
                    rates={rates}
                    savedNewsIds={prefs.savedNewsIds || []}
                    onToggleSaveNews={(id) => {
                      const cur = prefs.savedNewsIds || [];
                      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
                      handleUpdatePrefs({ savedNewsIds: next });
                    }}
                    onNewsLoaded={() => {
                      handleUpdatePrefs({ lastReadNewsAt: new Date().toISOString() });
                      setUnreadNewsCount(0);
                    }}
                    isAdmin={isAdmin}
                    onOpenAdminNews={() => setActiveTab('admin')}
                    siteConfig={siteConfig}
                  />
                </Suspense>
              )}

              {activeTab === 'account' && (
                <Suspense fallback={<div className="py-12 text-center text-xs text-zinc-500">Loading Account...</div>}>
                  <AccountTab
                    user={user}
                    prefs={prefs}
                    onUpdatePrefs={handleUpdatePrefs}
                    onOpenDoc={setLegalDoc}
                    onOpenCookiePrefs={() => setShowCookieModal(true)}
                    onSignOut={handleSignOut}
                    isAdmin={isAdmin}
                    onOpenAdminPanel={() => setActiveTab('admin')}
                    onOpenBankDetails={() => setShowBankDetails(true)}
                    siteConfig={siteConfig}
                  />
                </Suspense>
              )}

              {activeTab === 'admin' && isAdmin && (
                <Suspense fallback={<div className="py-12 text-center text-xs text-zinc-500">Loading Admin Command Center...</div>}>
                  <AdminPanel
                    siteConfig={siteConfig}
                    onSiteConfigSaved={(nextCfg) => {
                      setSiteConfig(nextCfg);
                      fetchLatestOnce();
                    }}
                    onNewsChanged={refreshUnreadNews}
                  />
                </Suspense>
              )}
            </>
          )}

          <FloatingDock
            activeTab={activeTab}
            onSelectTab={(tab) => {
              if (tab === 'news') {
                handleUpdatePrefs({ lastReadNewsAt: new Date().toISOString() });
                setUnreadNewsCount(0);
              }
              setActiveTab(tab);
            }}
            unreadNewsCount={unreadNewsCount}
            isAdmin={isAdmin}
            rates={rates}
            streamStatus={streamStatus}
            alertsCount={alerts.length}
            unit={prefs.unit || '10g'}
            onUnitChange={(unit) => handleUpdatePrefs({ unit })}
            onOpenCalculator={() => {
              setCalcPreset(null);
              setShowCalculator(true);
            }}
            onOpenAlerts={() => {
              setAlertPreset(null);
              setShowAlerts(true);
            }}
            onOpenCompare={() => {
              setActiveTerminal('COMPARE');
              setActiveTab('rates');
            }}
            onOpenBankDetails={() => setShowBankDetails(true)}
            siteConfig={siteConfig}
          />
        </div>
      )}

      {!booting && !cookiePrefs.decided && (
        <FirstLaunchConsentBanner
          onAcceptAll={() => handleSaveCookiePrefs(true)}
          onManage={() => setShowCookieModal(true)}
          onOpenDoc={setLegalDoc}
        />
      )}

      <CookiePreferencesModal
        open={showCookieModal}
        cookiePrefs={cookiePrefs}
        onSave={handleSaveCookiePrefs}
        onClose={() => setShowCookieModal(false)}
        onOpenDoc={setLegalDoc}
      />

      <LegalDocumentModal docType={legalDoc} onClose={() => setLegalDoc(null)} />

      <CalculatorModal
        open={showCalculator}
        onClose={() => setShowCalculator(false)}
        rates={rates}
        preset={calcPreset}
      />

      <PriceAlertsModal
        open={showAlerts}
        onClose={() => setShowAlerts(false)}
        alerts={alerts}
        onCreateAlert={handleCreateAlert}
        onDeleteAlert={handleDeleteAlert}
        rates={rates}
        preset={alertPreset}
      />

      <BankDetailsModal
        open={showBankDetails}
        onClose={() => setShowBankDetails(false)}
        siteConfig={siteConfig}
      />
    </div>
  );
}
