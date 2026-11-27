import React, { useMemo, useState } from 'react';
import {
  Bell,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Volume2,
  VolumeX,
  RefreshCw,
  Star,
  Columns3,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { LuxurySelect } from './ui/LuxurySelect';

function scalePrice(val, itemUnit, displayUnit) {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Silver 1KG items stay 1KG when viewing 10g; scale only 10g items or when user explicitly picks 1g/tola
  const isKg = String(itemUnit || '').toLowerCase().includes('kg');
  if (displayUnit === '10g') return n;
  const perGram = isKg ? n / 1000 : n / 10;
  if (displayUnit === '1g') return perGram;
  if (displayUnit === 'tola') return perGram * 11.664;
  return n;
}

function formatINR(num) {
  if (!Number.isFinite(Number(num)) || Number(num) <= 0) return '—';
  return `₹${Math.round(Number(num)).toLocaleString('en-IN')}`;
}

const TERMINAL_TABS = [
  { id: 'HB', label: 'Jodhpur', full: 'Jodhpur Rates', subtitle: 'Jodhpur Bullion Mandi' },
  { id: 'MOSUN', label: 'Sujangarh', full: 'Sujangarh Rates', subtitle: 'Sujangarh Mandi (Cash & RTGS)' },
  { id: 'IBJA', label: 'IBJA', full: 'IBJA Rates', subtitle: 'Official Benchmark' },
  { id: 'COMPARE', label: 'Compare', full: '3-Terminal Compare', subtitle: 'Jodhpur vs Sujangarh vs IBJA' },
];

export default function LiveRatesTab({
  rates,
  ticks,
  streamStatus,
  activeTerminal,
  onSelectTerminal,
  tickAudio,
  onToggleAudio,
  onManualRefresh,
  refreshing,
  onOpenCalculator,
  onOpenAlertFor,
  unit = '10g',
  onUnitChange,
  watchlist = [],
  onToggleWatchlist,
}) {
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'gold' | 'silver' | 'RTGS' | 'CASH'
  const currentTerm = activeTerminal === 'ALL' ? 'HB' : activeTerminal;
  const termMeta = TERMINAL_TABS.find((t) => t.id === currentTerm) || TERMINAL_TABS[0];

  const rawList = rates?.[currentTerm]?.list || [];
  const filteredList = useMemo(() => {
    if (filterMode === 'ALL') return rawList;
    if (filterMode === 'gold' || filterMode === 'silver') {
      return rawList.filter((i) => i.metal === filterMode);
    }
    return rawList.filter((i) =>
      `${i.name} ${i.tag}`.toUpperCase().includes(filterMode)
    );
  }, [rawList, filterMode]);

  // Pinned Watchlist items across all 3 terminals
  const pinnedCards = useMemo(() => {
    return watchlist
      .map((entry) => {
        const [termId, key] = String(entry).split(':');
        const item = rates?.[termId]?.items?.[key];
        if (!item) return null;
        return { entry, termId, item };
      })
      .filter(Boolean);
  }, [watchlist, rates]);

  const spot = rates?.spot || {};
  const goldSilverRatio =
    spot.xauUsd && spot.xagUsd ? (spot.xauUsd / spot.xagUsd).toFixed(1) : null;

  const compareRows = [
    { key: 'gold995', label: 'Gold 995 (10g)' },
    { key: 'gold916', label: '22K 916 (10g)' },
    { key: 'gold18k', label: '18K 750 (10g)' },
    { key: 'silverPeti', label: 'Silver 1KG' },
  ];

  const lastUpdatedText = rates?.timestamp
    ? new Date(rates.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Market Pulse & Gold/Silver Ratio Ticker */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#10141F] px-3.5 py-2.5 text-[11px] shadow-sm">
        <div className="flex shrink-0 items-center gap-1.5 pr-2.5 border-r border-zinc-200 dark:border-white/10">
          <span
            className={`h-2 w-2 rounded-full ${
              streamStatus === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="font-bold tracking-wider uppercase text-zinc-900 dark:text-[#E6CB94]">
            {streamStatus === 'LIVE' ? '24H LIVE' : streamStatus}
          </span>
        </div>

        {spot.xauUsd && (
          <div className="shrink-0 pr-2.5 border-r border-zinc-200 dark:border-white/10">
            <span className="text-zinc-500">XAU </span>
            <span className="font-mono-price font-bold text-zinc-900 dark:text-zinc-100">
              ${spot.xauUsd.toFixed(2)}
            </span>
          </div>
        )}
        {spot.xagUsd && (
          <div className="shrink-0 pr-2.5 border-r border-zinc-200 dark:border-white/10">
            <span className="text-zinc-500">XAG </span>
            <span className="font-mono-price font-bold text-zinc-900 dark:text-zinc-100">
              ${spot.xagUsd.toFixed(2)}
            </span>
          </div>
        )}
        {spot.usdInr && (
          <div className="shrink-0 pr-2.5 border-r border-zinc-200 dark:border-white/10">
            <span className="text-zinc-500">USD/INR </span>
            <span className="font-mono-price font-bold text-zinc-900 dark:text-zinc-100">
              ₹{spot.usdInr.toFixed(2)}
            </span>
          </div>
        )}
        {goldSilverRatio && (
          <div className="shrink-0 pr-2.5 border-r border-zinc-200 dark:border-white/10">
            <span className="text-zinc-500">Au/Ag </span>
            <span className="font-mono-price font-bold text-[#9A7422] dark:text-[#E6CB94]">
              {goldSilverRatio}x
            </span>
          </div>
        )}
        {spot.mcxGold && (
          <div className="shrink-0">
            <span className="text-zinc-500">MCX G </span>
            <span className="font-mono-price font-bold text-[#9A7422] dark:text-[#D4AF37]">
              {formatINR(spot.mcxGold)}
            </span>
          </div>
        )}
      </div>

      {/* 2. Pinned Watchlist Carousel */}
      {pinnedCards.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[10px] font-bold tracking-[0.18em] text-[#9A7422] dark:text-[#D4AF37] uppercase">
              ★ Pinned Watchlist
            </span>
            <span className="text-[10px] text-zinc-500">{lastUpdatedText} IST</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {pinnedCards.map(({ entry, termId, item }) => {
              const askVal = scalePrice(item.ask || item.bid, item.unit, unit);
              const termLabel =
                termId === 'HB' ? 'Jodhpur' : termId === 'MOSUN' ? 'Sujangarh' : 'IBJA';
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() =>
                    onOpenCalculator({ terminal: termId, metalKey: item.key, customAsk: item.ask })
                  }
                  className="relative min-w-[165px] shrink-0 overflow-hidden rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-white dark:bg-[#10141F] p-3 text-left shadow-sm"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-[#9A7422] dark:text-[#D4AF37]">
                      {termLabel}
                    </span>
                    <span className="text-zinc-400">
                      {unit === '10g' ? item.unit : unit}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {item.name}
                  </div>
                  <div className="font-mono-price mt-1.5 text-lg font-extrabold text-zinc-900 dark:text-[#E6CB94]">
                    {formatINR(askVal)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Terminal & Compare Switcher */}
      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] p-1 shadow-sm">
        {TERMINAL_TABS.map((tab) => {
          const active = currentTerm === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTerminal(tab.id)}
              className={`relative z-10 flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold transition-colors ${
                active ? 'text-[#07090F]' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="rich-term-pill"
                  transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#E6CB94] to-[#C9A452]"
                />
              )}
              {tab.id === 'COMPARE' && <Columns3 className="h-3 w-3" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Custom Luxury Dropdowns (Filter + Unit) & Controls */}
      <div className="flex items-center gap-2">
        <LuxurySelect
          compact
          className="flex-1"
          value={filterMode}
          onChange={setFilterMode}
          options={[
            { value: 'ALL', label: `Filter: All (${rawList.length})` },
            { value: 'gold', label: 'Gold Only' },
            { value: 'silver', label: 'Silver Only' },
            { value: 'RTGS', label: 'RTGS Rates' },
            { value: 'CASH', label: 'Cash Rates' },
          ]}
        />

        <LuxurySelect
          compact
          className="w-32"
          value={unit}
          onChange={onUnitChange}
          options={[
            { value: '10g', label: 'Unit: 10g' },
            { value: '1g', label: 'Unit: 1g' },
            { value: 'tola', label: 'Unit: Tola' },
          ]}
        />

        <button
          type="button"
          onClick={() => onOpenCalculator({ terminal: currentTerm === 'COMPARE' ? 'HB' : currentTerm, metalKey: 'gold995' })}
          aria-label="Open Calculator"
          className="rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-white dark:bg-[#10141F] p-2 text-[#9A7422] dark:text-[#E6CB94]"
        >
          <Calculator className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleAudio}
          aria-label="Toggle tick sound"
          className={`rounded-xl border p-2 ${
            tickAudio
              ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
              : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] text-zinc-500'
          }`}
        >
          {tickAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onManualRefresh}
          aria-label="Refresh rates"
          className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] p-2 text-zinc-500 dark:text-zinc-300"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-[#D4AF37]' : ''}`} />
        </button>
      </div>

      {/* 5. Content: 3-Terminal Compare Matrix OR Selected Terminal All Rates */}
      <AnimatePresence mode="wait">
        {currentTerm === 'COMPARE' ? (
          <motion.div
            key="COMPARE"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {compareRows.map((row) => {
              const jdr = scalePrice(
                rates?.HB?.items?.[row.key]?.ask || rates?.HB?.items?.[row.key]?.bid,
                rates?.HB?.items?.[row.key]?.unit,
                unit
              );
              const sjg = scalePrice(
                rates?.MOSUN?.items?.[row.key]?.ask || rates?.MOSUN?.items?.[row.key]?.bid,
                rates?.MOSUN?.items?.[row.key]?.unit,
                unit
              );
              const ibja = scalePrice(
                rates?.IBJA?.items?.[row.key]?.ask || rates?.IBJA?.items?.[row.key]?.bid,
                rates?.IBJA?.items?.[row.key]?.unit,
                unit
              );
              const diff = jdr && sjg ? jdr - sjg : null;

              return (
                <div
                  key={row.key}
                  className="rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#10141F] p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-serif-luxury text-sm font-bold text-zinc-900 dark:text-[#E6CB94]">
                      {row.label}
                    </span>
                    {diff !== null && (
                      <span className="font-mono-price rounded-full bg-[#D4AF37]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#9A7422] dark:text-[#E6CB94]">
                        JDR vs SJG: {diff >= 0 ? '+' : '-'}
                        {formatINR(Math.abs(diff))}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-zinc-50 dark:bg-[#07090F] p-2.5">
                      <div className="text-[9px] font-bold uppercase text-zinc-400">Jodhpur</div>
                      <div className="font-mono-price mt-1 text-sm font-extrabold text-zinc-900 dark:text-[#E6CB94]">
                        {formatINR(jdr)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-[#07090F] p-2.5">
                      <div className="text-[9px] font-bold uppercase text-zinc-400">Sujangarh</div>
                      <div className="font-mono-price mt-1 text-sm font-extrabold text-zinc-900 dark:text-sky-300">
                        {formatINR(sjg)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-[#07090F] p-2.5">
                      <div className="text-[9px] font-bold uppercase text-zinc-400">IBJA</div>
                      <div className="font-mono-price mt-1 text-sm font-extrabold text-emerald-600 dark:text-emerald-300">
                        {formatINR(ibja)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key={`${currentTerm}_${filterMode}_${unit}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-2.5"
          >
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-serif-luxury text-base font-bold text-zinc-900 dark:text-[#E6CB94]">
                  {termMeta.full}
                </h3>
                <p className="text-[10px] text-zinc-500">{termMeta.subtitle}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Ask / Sell Hero
              </span>
            </div>

            {filteredList.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] py-10 text-center text-xs text-zinc-500">
                No matching rates for this filter.
              </div>
            ) : (
              filteredList.map((item) => {
                const tickDir = ticks?.[`${currentTerm}_${item.key}`];
                const flashClass =
                  tickDir === 'up'
                    ? 'animate-tick-up'
                    : tickDir === 'down'
                    ? 'animate-tick-down'
                    : '';
                const askVal = scalePrice(item.ask || item.bid, item.unit, unit);
                const bidVal = scalePrice(item.bid, item.unit, unit);
                const highVal = scalePrice(item.high, item.unit, unit);
                const lowVal = scalePrice(item.low, item.unit, unit);
                const watchKey = `${currentTerm}:${item.key}`;
                const isStarred = watchlist.includes(watchKey);

                return (
                  <div
                    key={item.key}
                    onClick={() =>
                      onOpenCalculator({
                        terminal: currentTerm,
                        metalKey: item.key,
                        customAsk: item.ask || item.bid,
                      })
                    }
                    className={`relative flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#10141F] px-3.5 py-3.5 shadow-sm transition active:scale-[0.99] cursor-pointer ${flashClass}`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Pin to watchlist"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(watchKey);
                          }}
                          className="shrink-0 p-0.5"
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              isStarred
                                ? 'fill-[#D4AF37] text-[#D4AF37]'
                                : 'text-zinc-400 hover:text-[#D4AF37]'
                            }`}
                          />
                        </button>
                        <span className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-5 text-[10px] text-zinc-500">
                        <span className="rounded-md bg-[#D4AF37]/12 px-1.5 py-0.5 font-semibold text-[#9A7422] dark:text-[#D4AF37]">
                          {item.tag}
                        </span>
                        {highVal && <span className="font-mono-price">H:{formatINR(highVal)}</span>}
                        {lowVal && <span className="font-mono-price">L:{formatINR(lowVal)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <div className="font-mono-price text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {formatINR(bidVal)}
                        </div>
                        <div className="text-[9px] uppercase text-zinc-400">Bid</div>
                      </div>

                      <div className="text-right min-w-[98px]">
                        <div className="flex items-center justify-end gap-0.5">
                          {tickDir === 'up' && (
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          {tickDir === 'down' && (
                            <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                          )}
                          <span
                            className={`font-mono-price text-xl font-extrabold tracking-tight ${
                              tickDir === 'up'
                                ? 'text-emerald-500'
                                : tickDir === 'down'
                                ? 'text-red-500'
                                : 'text-zinc-900 dark:text-[#E6CB94]'
                            }`}
                          >
                            {formatINR(askVal)}
                          </span>
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[#9A7422] dark:text-[#D4AF37]/80">
                          Ask / Sell
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label={`Set alert for ${item.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAlertFor({
                            terminal: currentTerm,
                            metalKey: item.key,
                            currentAsk: item.ask || item.bid,
                          });
                        }}
                        className="rounded-xl border border-zinc-200 dark:border-white/10 p-1.5 text-zinc-400 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
