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
      accent: 'border-[#B59A6C]/40',
      badge: 'bg-[#B59A6C]/15 text-[#E5C99B]',
    },
    MOSUN: {
      title: 'SUJANGARH RATES',
      subtitle: 'Sujangarh Bullion Mandi',
      accent: 'border-sky-500/30',
      badge: 'bg-sky-500/15 text-sky-300',
    },
    IBJA: {
      title: 'IBJA RATES',
      subtitle: 'India Bullion & Jewellers Assoc.',
      accent: 'border-emerald-500/30',
      badge: 'bg-emerald-500/15 text-emerald-300',
    },
  };

  const getSpreadVsIbja = (termId, productKey) => {
    if (termId === 'IBJA') return null;
    const termBid = rates?.[termId]?.items?.[productKey]?.bid;
    const ibjaBid = rates?.IBJA?.items?.[productKey]?.bid;
    if (!termBid || !ibjaBid) return null;
    return termBid - ibjaBid;
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
      {/* Top Status & Controls Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#171717] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              streamStatus === 'LIVE'
                ? 'bg-emerald-400 animate-pulse'
                : streamStatus === 'CONNECTING'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-red-400'
            }`}
          />
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-zinc-200">
              <Radio className="h-3 w-3 text-[#B59A6C]" />
              {streamStatus === 'LIVE' ? '0s Live Stream' : streamStatus}
            </div>
            <div className="text-[10px] text-zinc-500">Updated {lastUpdatedText} IST</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAudio}
            aria-label="Toggle tick audio"
            className={`rounded-xl border px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition ${
              tickAudio
                ? 'border-[#B59A6C]/50 bg-[#B59A6C]/15 text-[#E5C99B]'
                : 'border-white/10 bg-white/5 text-zinc-400'
            }`}
          >
            {tickAudio ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="text-[10px] font-semibold uppercase">Tick</span>
          </button>

          <button
            type="button"
            onClick={onManualRefresh}
            aria-label="Refresh rates"
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 active:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#B59A6C]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live 3-Way Arbitrage Ribbon */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold tracking-[0.14em] text-[#B59A6C] uppercase">
            Live 3-Way Arbitrage Ribbon
          </h2>
          <span className="text-[10px] text-zinc-500">Jodhpur • Sujangarh • IBJA</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {ARBITRAGE_PRODUCTS.map((prod) => {
            const hb = rates?.HB?.items?.[prod.key]?.bid;
            const mosun = rates?.MOSUN?.items?.[prod.key]?.bid;
            const ibja = rates?.IBJA?.items?.[prod.key]?.bid;
            const spread = hb && mosun ? hb - mosun : null;

            return (
              <div
                key={prod.key}
                className="min-w-[205px] shrink-0 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1A1A] to-[#141414] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#E5C99B]">{prod.label}</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {prod.unit}
                  </span>
                </div>
                <div className="mt-2.5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Jodhpur Rates</span>
                    <span className="font-mono font-semibold text-zinc-100">{formatINR(hb)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Sujangarh Rates</span>
                    <span className="font-mono font-semibold text-zinc-100">{formatINR(mosun)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">IBJA Rates</span>
                    <span className="font-mono font-semibold text-emerald-300">
                      {formatINR(ibja)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 border-t border-white/5 pt-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Jodhpur vs Sujangarh</span>
                  <span
                    className={`font-mono font-semibold ${
                      spread > 0
                        ? 'text-amber-300'
                        : spread < 0
                        ? 'text-sky-300'
                        : 'text-zinc-400'
                    }`}
                  >
                    {formatDiff(spread)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Switcher Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {TERMINALS.map((t) => {
          const active = activeTerminal === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTerminal(t.id)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-bold tracking-wider uppercase transition ${
                active
                  ? 'bg-[#B59A6C] text-[#111111]'
                  : 'border border-white/10 bg-[#171717] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Real-Time Live Tick Cards per Selected Terminal */}
      <div className="space-y-4">
        {visibleTerminals.map((termId) => {
          const meta = terminalMeta[termId];
          const termData = rates?.[termId];
          const items = termData?.items || {};

          return (
            <section
              key={termId}
              className={`rounded-2xl border ${meta.accent} bg-[#161616] p-3.5 shadow-lg`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-zinc-100">{meta.title}</h3>
                  <p className="text-[11px] text-zinc-400">{meta.subtitle}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.badge}`}>
                  {termData?.status || 'LIVE'}
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

                  const diffVsPrev =
                    item.bid && prevItem.bid ? item.bid - prevItem.bid : 0;
                  const ibjaDiff = getSpreadVsIbja(termId, prod.key);

                  return (
                    <div
                      key={prod.key}
                      className={`rounded-xl border border-white/8 bg-[#111111] p-3 transition ${flashClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-200">{prod.label}</span>
                          <span className="text-[10px] text-zinc-500">({prod.unit})</span>
                        </div>
                        {tickDir === 'up' && (
                          <span className="flex items-center text-[10px] font-bold text-emerald-400">
                            <ArrowUpRight className="h-3 w-3" />▲
                          </span>
                        )}
                        {tickDir === 'down' && (
                          <span className="flex items-center text-[10px] font-bold text-red-400">
                            <ArrowDownRight className="h-3 w-3" />▼
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500">Bid / Buy</div>
                          <div className="font-mono text-lg font-bold text-[#E5C99B]">
                            {formatINR(item.bid)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-zinc-500">Ask / Sell</div>
                          <div className="font-mono text-sm font-semibold text-zinc-200">
                            {formatINR(item.ask)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5 text-[10px] text-zinc-400">
                        <div className="flex gap-2">
                          <span>H: {formatINR(item.high)}</span>
                          <span>L: {formatINR(item.low)}</span>
                        </div>
                        {ibjaDiff !== null ? (
                          <span
                            className={`flex items-center gap-0.5 font-mono font-medium ${
                              ibjaDiff >= 0 ? 'text-amber-300' : 'text-emerald-400'
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
                          <span className="text-emerald-400/90 font-medium">
                            {diffVsPrev !== 0 ? formatDiff(diffVsPrev) : 'Official Benchmark'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
