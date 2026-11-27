import React, { useMemo, useState } from 'react';
import {
  Bell,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Volume2,
  VolumeX,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

function formatINR(num) {
  if (!Number.isFinite(Number(num)) || Number(num) <= 0) return '—';
  return `₹${Math.round(Number(num)).toLocaleString('en-IN')}`;
}

const TERMINAL_TABS = [
  { id: 'HB', label: 'Jodhpur Rates', subtitle: 'Jodhpur Bullion Mandi' },
  { id: 'MOSUN', label: 'Sujangarh Rates', subtitle: 'Sujangarh Bullion Mandi (Cash & RTGS)' },
  { id: 'IBJA', label: 'IBJA Rates', subtitle: 'Official Benchmark (Ex-GST & +3% GST)' },
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
}) {
  const [metalFilter, setMetalFilter] = useState('ALL'); // 'ALL' | 'gold' | 'silver'
  const currentTerm = activeTerminal === 'ALL' ? 'HB' : activeTerminal;
  const termMeta = TERMINAL_TABS.find((t) => t.id === currentTerm) || TERMINAL_TABS[0];

  const rawList = rates?.[currentTerm]?.list || [];
  const filteredList = useMemo(() => {
    if (metalFilter === 'ALL') return rawList;
    return rawList.filter((item) => item.metal === metalFilter);
  }, [rawList, metalFilter]);

  const spot = rates?.spot || {};
  const lastUpdatedText = rates?.timestamp
    ? new Date(rates.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Institutional Spot & MCX Ticker Strip (HB Jodhpur / Starline Style) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111520] px-3 py-2 text-[11px] shadow-sm">
        <div className="flex shrink-0 items-center gap-1.5 pr-2 border-r border-zinc-200 dark:border-white/10">
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
          <div className="shrink-0 pr-2.5 border-r border-zinc-200 dark:border-white/10 tabular-nums">
            <span className="text-zinc-500">XAU/USD </span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              ${spot.xauUsd.toFixed(2)}
            </span>
          </div>
        )}
        {spot.xagUsd && (
          <div className="shrink-0 pr-2.5 border-r border-zinc-200 dark:border-white/10 tabular-nums">
            <span className="text-zinc-500">XAG/USD </span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              ${spot.xagUsd.toFixed(2)}
            </span>
          </div>
        )}
        {spot.usdInr && (
          <div className="shrink-0 pr-2.5 border-r border-zinc-200 dark:border-white/10 tabular-nums">
            <span className="text-zinc-500">USD/INR </span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              ₹{spot.usdInr.toFixed(2)}
            </span>
          </div>
        )}
        {spot.mcxGold && (
          <div className="shrink-0 pr-2.5 border-r border-zinc-200 dark:border-white/10 tabular-nums">
            <span className="text-zinc-500">MCX G </span>
            <span className="font-mono font-bold text-[#9A7422] dark:text-[#D4AF37]">
              {formatINR(spot.mcxGold)}
            </span>
          </div>
        )}
        {spot.mcxSilver && (
          <div className="shrink-0 tabular-nums">
            <span className="text-zinc-500">MCX S </span>
            <span className="font-mono font-bold text-[#9A7422] dark:text-[#D4AF37]">
              {formatINR(spot.mcxSilver)}
            </span>
          </div>
        )}
      </div>

      {/* 2. Terminal Switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111520] p-1 shadow-sm">
        {TERMINAL_TABS.map((tab) => {
          const active = currentTerm === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTerminal(tab.id)}
              className={`relative z-10 rounded-lg py-2 text-[11px] font-bold tracking-wide transition-colors ${
                active ? 'text-[#090B10]' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="desk-term-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-lg bg-[#D4AF37]"
                />
              )}
              {tab.label.replace(' Rates', '')}
            </button>
          );
        })}
      </div>

      {/* 3. Metal Category Filter + Audio/Refresh/Calc Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'ALL', label: `All (${rawList.length})` },
            { id: 'gold', label: 'Gold' },
            { id: 'silver', label: 'Silver' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setMetalFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                metalFilter === f.id
                  ? 'bg-[#D4AF37]/20 text-[#9A7422] dark:text-[#E6CB94] border border-[#D4AF37]/40'
                  : 'border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111520] text-zinc-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenCalculator({ terminal: currentTerm, metalKey: 'gold995' })}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111520] px-2.5 py-1.5 text-[11px] font-bold text-[#9A7422] dark:text-[#E6CB94]"
          >
            <Calculator className="h-3.5 w-3.5" />
            Calc
          </button>
          <button
            type="button"
            onClick={onToggleAudio}
            aria-label="Toggle tick sound"
            className={`rounded-lg border p-1.5 ${
              tickAudio
                ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111520] text-zinc-500'
            }`}
          >
            {tickAudio ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onManualRefresh}
            aria-label="Refresh rates"
            className="rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111520] p-1.5 text-zinc-500 dark:text-zinc-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. Institutional Market Rate Table (ALL Live Rates) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentTerm}_${metalFilter}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111520] shadow-sm"
        >
          {/* Table Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#181D2B] px-3.5 py-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-zinc-900 dark:text-[#E6CB94] uppercase">
                <Radio className="h-3 w-3 text-emerald-500" />
                {termMeta.label}
              </div>
              <div className="text-[10px] text-zinc-500">{termMeta.subtitle} • {lastUpdatedText} IST</div>
            </div>
            <div className="flex items-center gap-5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <span>Bid / Buy</span>
              <span className="text-[#9A7422] dark:text-[#D4AF37]">Ask / Sell</span>
            </div>
          </div>

          {/* All Rate Rows */}
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {filteredList.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500">
                Connecting to {termMeta.label}...
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
                const askVal = item.ask || item.bid;

                return (
                  <div
                    key={item.key}
                    onClick={() => onOpenCalculator({ terminal: currentTerm, metalKey: item.key, customAsk: askVal, label: item.name, unit: item.unit })}
                    className={`flex items-center justify-between px-3.5 py-3 transition active:bg-zinc-100 dark:active:bg-white/5 cursor-pointer ${flashClass}`}
                  >
                    {/* Left: Product Name, Purity/RTGS/Cash Tag & High/Low */}
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
                        <span className="rounded bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 font-semibold text-[#9A7422] dark:text-[#D4AF37]">
                          {item.tag}
                        </span>
                        <span>({item.unit})</span>
                        {item.high && <span className="tabular-nums">H:{formatINR(item.high)}</span>}
                        {item.low && <span className="tabular-nums">L:{formatINR(item.low)}</span>}
                      </div>
                    </div>

                    {/* Right: Secondary Bid + Primary Big Hero Ask + Alert Bell */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono tabular-nums text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {formatINR(item.bid)}
                        </div>
                        <div className="text-[9px] uppercase text-zinc-400">Bid</div>
                      </div>

                      <div className="text-right min-w-[96px]">
                        <div className="flex items-center justify-end gap-0.5">
                          {tickDir === 'up' && (
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          {tickDir === 'down' && (
                            <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                          )}
                          <span
                            className={`font-mono tabular-nums text-lg sm:text-xl font-extrabold tracking-tight ${
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
                        <div className="text-[9px] font-semibold uppercase text-[#9A7422] dark:text-[#D4AF37]/80">
                          Ask / Sell
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label={`Set alert for ${item.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAlertFor({ terminal: currentTerm, metalKey: item.key, currentAsk: askVal });
                        }}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-[#D4AF37]/15 hover:text-[#D4AF37]"
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
