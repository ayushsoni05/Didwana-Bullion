import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, LineChart, UserCircle2 } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { APP_INFO } from './config/constants';
import { authApi, normalizeBullionPayload, pricesApi } from './services/api';
import { authStorage, consentStorage } from './services/storage';
import { playTickSound } from './services/sound';
import SplashGate, { GoldCrest } from './components/SplashGate';
import AuthScreens from './components/AuthScreens';
import LiveRatesTab from './components/LiveRatesTab';
import ChartsTab from './components/ChartsTab';
import AccountTab from './components/AccountTab';
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

  const [activeTab, setActiveTab] = useState('rates'); // 'rates' | 'charts' | 'account'
  const [prefs, setPrefs] = useState(() => consentStorage.getFunctionalPrefs());
  const [activeTerminal, setActiveTerminal] = useState(() => prefs.defaultTerminal || 'ALL');

  const [cookiePrefs, setCookiePrefs] = useState(() => consentStorage.getCookiePrefs());
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null); // 'terms' | 'privacy' | 'cookies' | null

  const [rates, setRates] = useState(null);
  const [prevRates, setPrevRates] = useState(null);
  const [ticks, setTicks] = useState({});
  const [streamStatus, setStreamStatus] = useState('CONNECTING');
  const [refreshing, setRefreshing] = useState(false);

  const ratesRef = useRef(null);
  const tickTimerRef = useRef(null);
  const tickAudioRef = useRef(prefs.tickAudio);
  useEffect(() => {
    tickAudioRef.current = prefs.tickAudio;
  }, [prefs.tickAudio]);

  const applyNormalizedRates = useCallback((normalized) => {
    if (!normalized) return;
    const prev = ratesRef.current;
    if (prev) {
      const nextTicks = {};
      let playedSound = false;
      ['HB', 'MOSUN', 'IBJA'].forEach((termId) => {
        ['gold995', 'gold916', 'silverPeti', 'silverChorsa'].forEach((prodKey) => {
          const curBid = normalized[termId]?.items?.[prodKey]?.bid;
          const oldBid = prev[termId]?.items?.[prodKey]?.bid;
          const curAsk = normalized[termId]?.items?.[prodKey]?.ask;
          const oldAsk = prev[termId]?.items?.[prodKey]?.ask;
          const curVal = curBid || curAsk;
          const oldVal = oldBid || oldAsk;
          if (curVal && oldVal && curVal !== oldVal) {
            const dir = curVal > oldVal ? 'up' : 'down';
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
    setRates(normalized);
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
      // Stream will keep retrying
    } finally {
      setRefreshing(false);
    }
  }, [applyNormalizedRates]);

  // Boot sequence: StatusBar + SplashScreen + JWT validation
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await StatusBar.setBackgroundColor({ color: '#111111' });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        // Not running in native Android container
      }

      const token = authStorage.getToken();
      if (token) {
        try {
          const me = await authApi.getMe();
          if (mounted) {
            const userObj = me?.user || me?.data || me;
            setUser(userObj);
            setIsAuthenticated(true);
          }
        } catch (err) {
          if (mounted && (err.status === 401 || err.status === 403)) {
            authStorage.clearSession();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }

      await new Promise((r) => setTimeout(r, 900));
      if (!mounted) return;

      try {
        await SplashScreen.hide();
      } catch {
        // Ignore on web
      }

      setFadingSplash(true);
      setTimeout(() => {
        if (mounted) setBooting(false);
      }, 450);
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Android Hardware Back Button handling
  useEffect(() => {
    let listener = null;
    const setupBack = async () => {
      try {
        listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (legalDoc) {
            setLegalDoc(null);
          } else if (showCookieModal) {
            setShowCookieModal(false);
          } else if (activeTab !== 'rates' && isAuthenticated) {
            setActiveTab('rates');
          } else if (!canGoBack) {
            CapApp.exitApp();
          }
        });
      } catch {
        // Ignore on web
      }
    };
    setupBack();
    return () => {
      listener?.remove?.();
    };
  }, [legalDoc, showCookieModal, activeTab, isAuthenticated]);

  // Subscribe to 0s SSE stream when authenticated (+ safety fallback poll if SSE drops)
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    fetchLatestOnce();
    let currentStatus = 'CONNECTING';
    const unsubscribe = pricesApi.subscribeStream({
      onStatus: (s) => {
        currentStatus = s;
        setStreamStatus(s);
      },
      onData: (raw) => {
        const norm = normalizeBullionPayload(raw);
        if (norm) applyNormalizedRates(norm);
      },
    });
    const fallbackInterval = setInterval(() => {
      if (currentStatus !== 'LIVE') {
        fetchLatestOnce();
      }
    }, 2500);
    return () => {
      unsubscribe();
      clearInterval(fallbackInterval);
    };
  }, [isAuthenticated, fetchLatestOnce, applyNormalizedRates]);

  const handleUpdatePrefs = (partial) => {
    const updated = consentStorage.saveFunctionalPrefs(partial);
    setPrefs(updated);
    if (partial.defaultTerminal) {
      setActiveTerminal(partial.defaultTerminal);
    }
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
    <div className="min-h-screen bg-[#111111] text-zinc-100">
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
                <h1 className="text-sm font-bold tracking-[0.14em] text-[#E5C99B] uppercase">
                  {APP_INFO.name}
                </h1>
                <p className="text-[10px] tracking-wider text-zinc-500 uppercase">
                  {APP_INFO.tagline}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#B59A6C]/30 bg-[#B59A6C]/10 px-2.5 py-1 text-[10px] font-semibold text-[#E5C99B]">
              LIVE ONLY
            </span>
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
            <ChartsTab
              rates={rates}
              initialRange={prefs.chartRange}
              onRangeChange={(chartRange) => handleUpdatePrefs({ chartRange })}
            />
          )}

          {activeTab === 'account' && (
            <AccountTab
              user={user}
              prefs={prefs}
              onUpdatePrefs={handleUpdatePrefs}
              onOpenDoc={setLegalDoc}
              onOpenCookiePrefs={() => setShowCookieModal(true)}
              onSignOut={handleSignOut}
            />
          )}

          {/* Floating Mobile Bottom Navigation (3 Focused Tabs) */}
          <nav className="fixed inset-x-0 bottom-3 z-30 mx-auto max-w-md px-4 safe-bottom">
            <div className="grid grid-cols-3 rounded-2xl border border-white/10 bg-[#181818]/95 p-1.5 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveTab('rates')}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
                  activeTab === 'rates'
                    ? 'bg-[#B59A6C] text-[#111111]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Activity className="h-4 w-4" />
                Live Rates
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('charts')}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
                  activeTab === 'charts'
                    ? 'bg-[#B59A6C] text-[#111111]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LineChart className="h-4 w-4" />
                Charts
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
                  activeTab === 'account'
                    ? 'bg-[#B59A6C] text-[#111111]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserCircle2 className="h-4 w-4" />
                Account
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* First-Launch Cookie & Legal Consent Banner */}
      {!booting && !cookiePrefs.decided && (
        <FirstLaunchConsentBanner
          onAcceptAll={() => handleSaveCookiePrefs(true)}
          onManage={() => setShowCookieModal(true)}
          onOpenDoc={setLegalDoc}
        />
      )}

      {/* Cookie Preferences Modal */}
      <CookiePreferencesModal
        open={showCookieModal}
        cookiePrefs={cookiePrefs}
        onSave={handleSaveCookiePrefs}
        onClose={() => setShowCookieModal(false)}
        onOpenDoc={setLegalDoc}
      />

      {/* Terms / Privacy / Cookies Reader Modal */}
      <LegalDocumentModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  );
}
