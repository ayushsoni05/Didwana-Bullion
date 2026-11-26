import React, { useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { ARBITRAGE_PRODUCTS, TERMINALS } from '../config/constants';
import { BentoCard } from './ui/BentoCard';
import { SegmentedTabs } from './ui/SegmentedTabs';

function formatINR(num) {
  if (!Number.isFinite(Number(num)) || Number(num) <= 0) return '—';
  return `₹${Math.round(Number(num)).toLocaleString('en-IN')}`;
}

function formatDiff(val) {
  if (!Number.isFinite(Number(val))) return '—';
  const rounded = Math.round(Number(val));
  if (rounded === 0) return '₹0';
  return `${rounded > 0 ? '+' : '-'}₹${Math.abs(rounded).toLocaleString('en-IN')}`;
}

export default function LiveRatesTab({
  rates,
  prevRates,
  ticks,
  streamStatus,
  activeTerminal,
  onSelectTerminal,
  tickAudio,
  onToggleAudio,
  onManualRefresh,
  refreshing,
}) {
  const visibleTerminals = useMemo(() => {
    if (activeTerminal === 'ALL') return ['HB', 'MOSUN', 'IBJA'];
    return [activeTerminal];
  }, [activeTerminal]);

  const terminalMeta = {
    HB: {
      title: 'JODHPUR RATES',
      subtitle: 'Jodhpur Bullion Mandi',
      accent: 'border-[#C8A96E]/45 dark:border-[#C8A96E]/35',
      badge: 'bg-[#C8A96E]/15 text-[#8C6A2E] dark:text-[#DFC18A]',
    },
    MOSUN: {
      title: 'SUJANGARH RATES',
      subtitle: 'Sujangarh Bullion Mandi',
      accent: 'border-sky-500/35 dark:border-sky-500/30',
      badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    },
    IBJA: {
      title: 'IBJA RATES',
      subtitle: 'India Bullion & Jewellers Assoc.',
      accent: 'border-emerald-500/35 dark:border-emerald-500/30',
      badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    },
  };

  const getSpreadVsIbja = (termId, productKey) => {
    if (termId === 'IBJA') return null;
    const termAsk = rates?.[termId]?.items?.[productKey]?.ask || rates?.[termId]?.items?.[productKey]?.bid;
    const ibjaAsk = rates?.IBJA?.items?.[productKey]?.ask || rates?.IBJA?.items?.[productKey]?.bid;
    if (!termAsk || !ibjaAsk) return null;
    return termAsk - ibjaAsk;
  };

  const lastUpdatedText = rates?.timestamp
    ? new Date(rates.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <div className="space-y-4 pb-28">
      {/* Top 24H Status & Controls Bento Bar */}
      <BentoCard glow={false} className="px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                streamStatus === 'LIVE'
                  ? 'bg-emerald-500 animate-pulse'
                  : streamStatus === 'CONNECTING'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-zinc-900 dark:text-[#F4EFE6]">
                <Radio className="h-3 w-3 text-[#8C6A2E] dark:text-[#DFC18A]" />
                {streamStatus === 'LIVE' ? '24H Live Stream' : streamStatus}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Updated {lastUpdatedText} IST
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAudio}
              aria-label="Toggle tick audio"
              className={`rounded-xl border px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition active:scale-95 ${
                tickAudio
                  ? 'border-[#C8A96E] bg-[#C8A96E]/15 text-[#8C6A2E] dark:text-[#DFC18A]'
                  : 'border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {tickAudio ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="text-[10px] font-semibold uppercase">Tick</span>
            </button>

            <button
              type="button"
              onClick={onManualRefresh}
              aria-label="Refresh rates"
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 p-2 text-zinc-700 dark:text-zinc-300 active:scale-95 transition"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshing ? 'animate-spin text-[#8C6A2E] dark:text-[#DFC18A]' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </BentoCard>

      {/* Live 3-Way Arbitrage Ribbon */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold tracking-[0.14em] text-[#8C6A2E] dark:text-[#DFC18A] uppercase">
            Live 3-Way Arbitrage (Ask / Sell)
          </h2>
          <span className="text-[10px] text-zinc-500">Jodhpur • Sujangarh • IBJA</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {ARBITRAGE_PRODUCTS.map((prod) => {
            const hb = rates?.HB?.items?.[prod.key]?.ask || rates?.HB?.items?.[prod.key]?.bid;
            const mosun = rates?.MOSUN?.items?.[prod.key]?.ask || rates?.MOSUN?.items?.[prod.key]?.bid;
            const ibja = rates?.IBJA?.items?.[prod.key]?.ask || rates?.IBJA?.items?.[prod.key]?.bid;
            const spread = hb && mosun ? hb - mosun : null;

            return (
              <BentoCard key={prod.key} className="min-w-[218px] shrink-0 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#8C6A2E] dark:text-[#DFC18A]">
                    {prod.label}
                  </span>
                  <span className="rounded-md bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                    {prod.unit}
                  </span>
                </div>
                <div className="mt-2.5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Jodhpur Rates</span>
                    <span className="font-mono tabular-nums font-bold text-zinc-900 dark:text-[#F4EFE6]">
                      {formatINR(hb)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Sujangarh Rates</span>
                    <span className="font-mono tabular-nums font-bold text-zinc-900 dark:text-[#F4EFE6]">
                      {formatINR(mosun)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">IBJA Rates</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
                      {formatINR(ibja)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 border-t border-zinc-100 dark:border-white/5 pt-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Jodhpur vs Sujangarh</span>
                  <span
                    className={`font-mono tabular-nums font-semibold ${
                      spread > 0
                        ? 'text-amber-600 dark:text-amber-300'
                        : spread < 0
                        ? 'text-sky-600 dark:text-sky-300'
                        : 'text-zinc-400'
                    }`}
                  >
                    {formatDiff(spread)}
                  </span>
                </div>
              </BentoCard>
            );
          })}
        </div>
      </div>

      {/* Spring-Animated Segmented Terminal Switcher */}
      <SegmentedTabs
        tabs={TERMINALS}
        activeId={activeTerminal}
        onChange={onSelectTerminal}
        layoutId="terminal-pill"
        scrollable
      />

      {/* Terminal Live Rate Bento Cards — ASK / SELL IN BIG HERO FONT */}
      <div className="space-y-4">
        {visibleTerminals.map((termId) => {
          const meta = terminalMeta[termId];
          const termData = rates?.[termId];
          const items = termData?.items || {};

          return (
            <BentoCard key={termId} className={`p-3.5 ${meta.accent}`}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-zinc-900 dark:text-[#F4EFE6]">
                    {meta.title}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{meta.subtitle}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.badge}`}>
                  {termData?.status || '24H LIVE'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ARBITRAGE_PRODUCTS.map((prod) => {
                  const item = items[prod.key] || {};
                  const prevItem = prevRates?.[termId]?.items?.[prod.key] || {};
                  const tickDir = ticks?.[`${termId}_${prod.key}`];
                  const flashClass =
                    tickDir === 'up'
                      ? 'animate-tick-up'
                      : tickDir === 'down'
                      ? 'animate-tick-down'
                      : '';

                  const askVal = item.ask || item.bid;
                  const prevAskVal = prevItem.ask || prevItem.bid;
                  const diffVsPrev = askVal && prevAskVal ? askVal - prevAskVal : 0;
                  const ibjaDiff = getSpreadVsIbja(termId, prod.key);

                  return (
                    <div
                      key={prod.key}
                      className={`rounded-xl border border-zinc-200 dark:border-white/8 bg-[#FAF8F4] dark:bg-[#0B0B0D] p-3.5 transition ${flashClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {prod.label}
                          </span>
                          <span className="text-[10px] text-zinc-500">({prod.unit})</span>
                        </div>
                        {tickDir === 'up' && (
                          <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <ArrowUpRight className="h-3 w-3" />▲
                          </span>
                        )}
                        {tickDir === 'down' && (
                          <span className="flex items-center gap-0.5 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                            <ArrowDownRight className="h-3 w-3" />▼
                          </span>
                        )}
                      </div>

                      {/* PRIMARY BIG HERO FONT: ASK / SELL */}
                      <div className="mt-2.5 flex items-end justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-semibold tracking-wider uppercase text-[#8C6A2E] dark:text-[#C8A96E]">
                            Ask / Sell
                          </div>
                          <div className="font-mono tabular-nums text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-[#DFC18A]">
                            {formatINR(askVal)}
                          </div>
                        </div>

                        {/* SECONDARY SMALLER FONT: BID / BUY */}
                        <div className="text-right">
                          <div className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Bid / Buy
                          </div>
                          <div className="font-mono tabular-nums text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                            {formatINR(item.bid)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-zinc-200/80 dark:border-white/5 pt-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                        <div className="flex gap-2 tabular-nums">
                          <span>H: {formatINR(item.high)}</span>
                          <span>L: {formatINR(item.low)}</span>
                        </div>
                        {ibjaDiff !== null ? (
                          <span
                            className={`flex items-center gap-0.5 font-mono tabular-nums font-semibold ${
                              ibjaDiff >= 0
                                ? 'text-amber-600 dark:text-amber-300'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {ibjaDiff >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            vs IBJA: {formatDiff(ibjaDiff)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {diffVsPrev !== 0 ? formatDiff(diffVsPrev) : 'Official Benchmark'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </BentoCard>
          );
        })}
      </div>
    </div>
  );
}
