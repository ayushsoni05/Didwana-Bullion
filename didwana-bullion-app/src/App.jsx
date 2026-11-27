import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, LineChart, Moon, Sun, UserCircle2 } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { APP_INFO } from './config/constants';
import { authApi, normalizeBullionPayload, pricesApi } from './services/api';
import { authStorage, consentStorage, ratesCache } from './services/storage';
import { playTickSound } from './services/sound';
import SplashGate, { GoldCrest } from './components/SplashGate';
import AuthScreens from './components/AuthScreens';
import LiveRatesTab from './components/LiveRatesTab';
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
  const [activeTerminal, setActiveTerminal] = useState(() => prefs.defaultTerminal || 'ALL');

  const [cookiePrefs, setCookiePrefs] = useState(() => consentStorage.getCookiePrefs());
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);

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

  // Zero-Blocking Instant Boot: hide native splash immediately, show 1.35s 3-Act SplashGate,
  // and verify JWT silently in background so cold start never hangs on sleeping backend
  useEffect(() => {
    let mounted = true;
    SplashScreen.hide().catch(() => {});

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

  const handleSaveCookiePrefs = (functionalEnabled) => {
    const next = consentStorage.saveCookiePrefs(functionalEnabled);
    setCookiePrefs(next);
    setShowCookieModal(false);
  };

  const handleSignOut = () => {
    authStorage.clearSession();
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('rates');
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
          {/* App Header */}
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <GoldCrest size={34} />
              <div>
                <h1 className="text-sm font-bold tracking-[0.14em] text-[#8C6A2E] dark:text-[#DFC18A] uppercase">
                  {APP_INFO.name}
                </h1>
                <p className="text-[10px] tracking-wider text-zinc-500 uppercase">
                  {APP_INFO.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Toggle Light/Dark Mode"
                onClick={() => handleUpdatePrefs({ theme: resolvedDark ? 'light' : 'dark' })}
                className="rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] p-2 text-zinc-700 dark:text-[#DFC18A] shadow-sm"
              >
                {resolvedDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <span className="rounded-full border border-[#C8A96E]/40 bg-[#C8A96E]/10 px-2.5 py-1 text-[10px] font-bold text-[#8C6A2E] dark:text-[#DFC18A]">
                24H LIVE
              </span>
            </div>
          </header>

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

          {/* Floating Mobile Bottom Navigation (3 Focused Tabs with 21st.dev Spring Pill) */}
          <nav className="fixed inset-x-0 bottom-3 z-30 mx-auto max-w-md px-4 safe-bottom">
            <div className="grid grid-cols-3 rounded-2xl border border-zinc-200 dark:border-[#9E7D47]/30 bg-white/95 dark:bg-[#121216]/95 p-1.5 shadow-2xl backdrop-blur-md">
              {[
                { id: 'rates', label: 'Live Rates', Icon: Activity },
                { id: 'charts', label: 'Charts', Icon: LineChart },
                { id: 'account', label: 'Account', Icon: UserCircle2 },
              ].map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`relative z-10 flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold transition-colors ${
                      active ? 'text-[#0B0B0D]' : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="bottom-nav-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#DFC18A] via-[#C8A96E] to-[#B5924C] shadow-sm"
                      />
                    )}
                    <Icon className="h-4 w-4" />
                    {label}
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
    </div>
  );
}
