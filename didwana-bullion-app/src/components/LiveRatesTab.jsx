import React from 'react';
import {
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ARBITRAGE_PRODUCTS } from '../config/constants';
import { GoldCrest } from './SplashGate';

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

const TERMINAL_TABS = [
  { id: 'HB', label: 'Jodhpur Rates', subtitle: 'Jodhpur Bullion Mandi' },
  { id: 'MOSUN', label: 'Sujangarh Rates', subtitle: 'Sujangarh Bullion Mandi' },
  { id: 'IBJA', label: 'IBJA Rates', subtitle: 'Official Benchmark' },
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
}) {
  const currentTerm = activeTerminal === 'ALL' ? 'HB' : activeTerminal;
  const termMeta = TERMINAL_TABS.find((t) => t.id === currentTerm) || TERMINAL_TABS[0];
  const items = rates?.[currentTerm]?.items || {};

  const heroGold = rates?.HB?.items?.gold995?.ask || rates?.HB?.items?.gold995?.bid;
  const heroBid = rates?.HB?.items?.gold995?.bid;
  const ibjaGold = rates?.IBJA?.items?.gold995?.ask || rates?.IBJA?.items?.gold995?.bid;
  const spreadDiff = heroGold && ibjaGold ? heroGold - ibjaGold : null;

  const lastUpdatedText = rates?.timestamp
    ? new Date(rates.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <div className="space-y-5 pb-28">
      {/* 1. Clean Behance Hero Gold Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl bg-gradient-to-br from-[#E8C97A] via-[#DDB965] to-[#C9A452] p-5 text-[#111111] shadow-[0_20px_50px_-14px_rgba(232,201,122,0.4)]"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <GoldCrest size={52} />
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#111111]/80">
                <span
                  className={`h-2 w-2 rounded-full ${
                    streamStatus === 'LIVE' ? 'bg-red-600 animate-pulse' : 'bg-amber-700'
                  }`}
                />
                <span>Live Price • Gold 995</span>
              </div>
              <div className="mt-1 font-mono tabular-nums text-3xl font-extrabold tracking-tight text-[#111111]">
                {formatINR(heroGold)}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-[#111111]/75 tabular-nums">
                Bid / Buy: {formatINR(heroBid)}
              </div>
            </div>
          </div>

          <span className="rounded-full bg-[#111111] px-3 py-1 text-[10px] font-bold text-[#E8C97A]">
            24K • 999
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#111111]/15 pt-2.5 text-[10px] font-semibold text-[#111111]/75">
          <span>Jodhpur Bullion Ask / Sell</span>
          <span>{lastUpdatedText} IST</span>
        </div>
      </motion.div>

      {/* 2. Behance 2-Column Quick-Action Tiles */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onOpenCalculator}
          className="flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-[#C5A358]/25 bg-white dark:bg-[#161616] p-4 text-left shadow-sm"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8C97A]/15 text-[#8C6A2E] dark:text-[#E8C97A]">
            <Calculator className="h-4 w-4" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-zinc-900 dark:text-[#EDEDED]">
              Showroom Calculator
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500">
              Weight × Live Ask + 3% GST
            </div>
          </div>
        </motion.button>

        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-[#C5A358]/25 bg-white dark:bg-[#161616] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleAudio}
                aria-label="Toggle tick sound"
                className="rounded-full p-1.5 text-zinc-400 hover:text-[#E8C97A]"
              >
                {tickAudio ? <Volume2 className="h-3.5 w-3.5 text-[#E8C97A]" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={onManualRefresh}
                aria-label="Refresh rates"
                className="rounded-full p-1.5 text-zinc-400 hover:text-[#E8C97A]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#E8C97A]' : ''}`} />
              </button>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-bold text-zinc-900 dark:text-[#EDEDED]">
              Jodhpur vs IBJA
            </div>
            <div className="mt-0.5 font-mono tabular-nums text-xs font-bold text-[#8C6A2E] dark:text-[#E8C97A]">
              {formatDiff(spreadDiff)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Clean 3-Terminal Switcher */}
      <div className="grid grid-cols-3 gap-1.5 rounded-full border border-zinc-200 dark:border-[#C5A358]/25 bg-white dark:bg-[#141414] p-1">
        {TERMINAL_TABS.map((tab) => {
          const active = currentTerm === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTerminal(tab.id)}
              className={`relative z-10 rounded-full py-2 text-[11px] font-bold transition-colors ${
                active ? 'text-[#111111]' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="behance-term-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-[#E8C97A] to-[#C9A452]"
                />
              )}
              {tab.label.replace(' Rates', '')}
            </button>
          );
        })}
      </div>

      {/* 4. Focused Single-Terminal Airy Rate Rows (Ask / Sell Big Hero Font) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTerm}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2.5"
        >
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xs font-bold tracking-[0.14em] text-[#8C6A2E] dark:text-[#E8C97A] uppercase">
                {termMeta.label}
              </h3>
              <p className="text-[10px] text-zinc-500">{termMeta.subtitle}</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {streamStatus === 'LIVE' ? 'LIVE 24H' : streamStatus}
            </span>
          </div>

          {ARBITRAGE_PRODUCTS.map((prod, idx) => {
            const item = items[prod.key] || {};
            const tickDir = ticks?.[`${currentTerm}_${prod.key}`];
            const flashClass =
              tickDir === 'up'
                ? 'animate-tick-up'
                : tickDir === 'down'
                ? 'animate-tick-down'
                : '';

            const askVal = item.ask || item.bid;

            return (
              <motion.div
                key={prod.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className={`flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-[#C5A358]/20 bg-white dark:bg-[#161616] px-4 py-3.5 shadow-sm transition ${flashClass}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-[#EDEDED]">
                      {prod.label}
                    </span>
                    <span className="rounded-full bg-zinc-100 dark:bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
                      {prod.unit}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                    <span>Bid: {formatINR(item.bid)}</span>
                    {item.high && <span>H: {formatINR(item.high)}</span>}
                    {item.low && <span>L: {formatINR(item.low)}</span>}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {tickDir === 'up' && (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    )}
                    {tickDir === 'down' && (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-mono tabular-nums text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-[#E8C97A]">
                      {formatINR(askVal)}
                    </span>
                  </div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                    Ask / Sell
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
