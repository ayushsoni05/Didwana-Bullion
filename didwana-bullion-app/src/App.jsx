import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Bell, LineChart, Moon, Share2, Sun, UserCircle2 } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { APP_INFO } from './config/constants';
import { alertsApi, authApi, normalizeBullionPayload, pricesApi } from './services/api';
import { authStorage, consentStorage, ratesCache } from './services/storage';
import { playTickSound } from './services/sound';
import SplashGate from './components/SplashGate';
import AuthScreens from './components/AuthScreens';
import LiveRatesTab from './components/LiveRatesTab';
import { CalculatorModal, PriceAlertsModal } from './components/BullionModals';
const ChartsTab = lazy(() => import('./components/ChartsTab'));
const AccountTab = lazy(() => import('./components/AccountTab'));
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

  const [activeTab, setActiveTab] = useState('rates');
  const [prefs, setPrefs] = useState(() => consentStorage.getFunctionalPrefs());
  const [activeTerminal, setActiveTerminal] = useState(() =>
    prefs.defaultTerminal === 'ALL' ? 'HB' : prefs.defaultTerminal || 'HB'
  );

  const [cookiePrefs, setCookiePrefs] = useState(() => consentStorage.getCookiePrefs());
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcPreset, setCalcPreset] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
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
      StatusBar.setBackgroundColor({ color: resolvedDark ? '#0B0B0D' : '#F8F6F1' });
      StatusBar.setStyle({ style: resolvedDark ? Style.Dark : Style.Light });
    } catch {
      // Ignore on web
    }
  }, [resolvedDark]);

  const applyNormalizedRates = useCallback((normalized) => {
    if (!normalized) return;
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
          if (userObj) setUser(userObj);
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
    <div className="min-h-screen bg-[#F8F6F1] dark:bg-[#0B0B0D] text-zinc-900 dark:text-[#F4EFE6] transition-colors duration-200">
      {booting && <SplashGate fadingOut={fadingSplash} />}

      {!isAuthenticated ? (
        <AuthScreens
          onAuthenticated={(loggedInUser) => {
            setUser(loggedInUser);
            setIsAuthenticated(true);
          }}
          onOpenDoc={setLegalDoc}
        />
      ) : (
        <div className="mx-auto max-w-lg px-4 pt-3 safe-top">
          {/* Minimalist 3-Part Behance Header */}
          <header className="mb-5 flex items-center justify-between">
            <button
              type="button"
              aria-label="Share Live Rates"
              onClick={handleShareRates}
              className="rounded-full border border-zinc-200 dark:border-[#C5A358]/35 bg-white dark:bg-[#161616] p-2.5 text-zinc-700 dark:text-[#E8C97A] shadow-sm"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <h1 className="font-serif-luxury text-base font-bold tracking-wide text-[#9A7422] dark:text-[#E6CB94]">
                {APP_INFO.name}
              </h1>
              <p className="text-[9px] tracking-[0.2em] text-zinc-500 uppercase">
                {APP_INFO.tagline}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Toggle Light/Dark Mode"
                onClick={() => handleUpdatePrefs({ theme: resolvedDark ? 'light' : 'dark' })}
                className="rounded-full border border-zinc-200 dark:border-[#C5A358]/35 bg-white dark:bg-[#161616] p-2.5 text-zinc-700 dark:text-[#E8C97A] shadow-sm"
              >
                {resolvedDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="Price Alerts"
                onClick={() => setShowAlerts(true)}
                className="relative rounded-full border border-zinc-200 dark:border-[#C5A358]/35 bg-white dark:bg-[#161616] p-2.5 text-zinc-700 dark:text-[#E8C97A] shadow-sm"
              >
                <Bell className="h-4 w-4" />
                {alerts.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            </div>
          </header>

          {triggeredBanner && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-[#D4AF37]/50 bg-[#111520] px-3.5 py-2.5 text-xs font-semibold text-[#E6CB94] shadow-lg">
              <span>🔔 {triggeredBanner}</span>
              <button type="button" onClick={() => setTriggeredBanner(null)} className="text-zinc-400">
                ✕
              </button>
            </div>
          )}

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
              unit={prefs.unit || '10g'}
              onUnitChange={(unit) => handleUpdatePrefs({ unit })}
              watchlist={prefs.watchlist || []}
              onToggleWatchlist={handleToggleWatchlist}
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

          {activeTab === 'account' && (
            <Suspense fallback={<div className="py-12 text-center text-xs text-zinc-500">Loading Account...</div>}>
              <AccountTab
                user={user}
                prefs={prefs}
                onUpdatePrefs={handleUpdatePrefs}
                onOpenDoc={setLegalDoc}
                onOpenCookiePrefs={() => setShowCookieModal(true)}
                onSignOut={handleSignOut}
              />
            </Suspense>
          )}

          {/* Floating Behance Pill Bottom Navigation Dock (1px gold outline + sliding underline) */}
          <nav className="fixed inset-x-0 bottom-3 z-30 mx-auto max-w-md px-5 safe-bottom">
            <div className="grid grid-cols-3 rounded-full border border-[#C5A358]/40 bg-white/95 dark:bg-[#121212]/95 px-2 py-1.5 shadow-2xl backdrop-blur-md">
              {[
                { id: 'rates', label: 'live', Icon: Activity },
                { id: 'charts', label: 'charts', Icon: LineChart },
                { id: 'account', label: 'profile', Icon: UserCircle2 },
              ].map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold lowercase transition-colors ${
                      active
                        ? 'text-[#8C6A2E] dark:text-[#E8C97A]'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    {active && (
                      <motion.span
                        layoutId="behance-nav-underline"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="mt-0.5 h-[2px] w-7 rounded-full bg-[#8C6A2E] dark:bg-[#E8C97A]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
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
    </div>
  );
}
