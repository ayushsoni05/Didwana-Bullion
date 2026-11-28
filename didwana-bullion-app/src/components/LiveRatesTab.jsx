import React, { useMemo, useState } from 'react';
import {
  Bell,
  Calculator,
  Volume2,
  VolumeX,
  RefreshCw,
  Star,
  Phone,
  MessageCircle,
  Columns3,
  Landmark,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { APP_INFO } from '../config/constants';

function scalePrice(val, itemUnit, displayUnit) {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  const isKg = String(itemUnit || '').toLowerCase().includes('kg');
  if (displayUnit === '10g') return n;
  const perGram = isKg ? n / 1000 : n / 10;
  if (displayUnit === '1g') return perGram;
  if (displayUnit === 'tola') return perGram * 11.664;
  return n;
}

function formatNum(num) {
  if (!Number.isFinite(Number(num)) || Number(num) <= 0) return '--';
  return Math.round(Number(num)).toLocaleString('en-IN');
}

const TERMINAL_TABS = [
  { id: 'HB', label: 'JODHPUR', full: 'Jodhpur Bullion Rates' },
  { id: 'MOSUN', label: 'SUJANGARH', full: 'Sujangarh Bullion Rates' },
  { id: 'IBJA', label: 'IBJA', full: 'IBJA Official' },
  { id: 'COMPARE', label: 'COMPARE', full: '3-Mandi Compare' },
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
  onOpenBankDetails,
  unit = '10g',
  onUnitChange,
  watchlist = [],
  onToggleWatchlist,
  siteConfig,
}) {
  const [subView, setSubView] = useState('BULLION'); // 'BULLION' | 'JEWELLERY' | 'COINS'
  const currentTerm = activeTerminal === 'ALL' ? 'HB' : activeTerminal;

  const rawList = rates?.[currentTerm]?.list || [];
  const filteredList = useMemo(() => {
    if (subView === 'JEWELLERY') {
      return rawList.filter((i) =>
        /916|22k|20k|18k|14k|silver10g/i.test(`${i.key} ${i.name}`)
      );
    }
    return rawList;
  }, [rawList, subView]);

  const spot = rates?.spot || {};
  const gold995Ask =
    rates?.[currentTerm]?.items?.gold995_rtgs?.ask ||
    rates?.[currentTerm]?.items?.gold995?.ask ||
    rates?.HB?.items?.gold995?.ask ||
    0;
  const gold995Bid =
    rates?.[currentTerm]?.items?.gold995_rtgs?.bid ||
    rates?.[currentTerm]?.items?.gold995?.bid ||
    rates?.HB?.items?.gold995?.bid ||
    0;
  const silverPetiAsk =
    rates?.[currentTerm]?.items?.silverPeti_rtgs?.ask ||
    rates?.[currentTerm]?.items?.silverPeti?.ask ||
    rates?.HB?.items?.silverPeti?.ask ||
    0;
  const silverPetiBid =
    rates?.[currentTerm]?.items?.silverPeti_rtgs?.bid ||
    rates?.[currentTerm]?.items?.silverPeti?.bid ||
    rates?.HB?.items?.silverPeti?.bid ||
    0;

  const coinsCatalog = useMemo(() => {
    const g24 = rates?.HB?.items?.gold24k?.ask || gold995Ask || 0;
    const g22 = rates?.HB?.items?.gold916?.ask || (g24 ? g24 * 0.916 : 0);
    const s1kg = silverPetiAsk || 0;
    return [
      {
        name: 'Gold Coin 10 GMS (999.9 Mint)',
        sub: 'Pure 24K Ready Stock • 3% GST Paid',
        buy: g24 ? Math.round(g24 * 0.992) : null,
        sell: g24 ? Math.round(g24) : null,
      },
      {
        name: 'Gold Tola Bar (11.664 GMS)',
        sub: 'Traditional Marwar Bullion Tola',
        buy: g24 ? Math.round((g24 / 10) * 11.664 * 0.992) : null,
        sell: g24 ? Math.round((g24 / 10) * 11.664) : null,
      },
      {
        name: 'Gold Coin 10 GMS (22K 916 HUID)',
        sub: 'BIS Hallmarked Jewellery Coin',
        buy: g22 ? Math.round(g22 * 0.99) : null,
        sell: g22 ? Math.round(g22) : null,
      },
      {
        name: 'Silver Coin 50 GMS (999 Pure)',
        sub: 'Gift & Pooja Certified Coin',
        buy: s1kg ? Math.round((s1kg / 1000) * 50 * 0.97) : null,
        sell: s1kg ? Math.round((s1kg / 1000) * 50 * 1.03) : null,
      },
      {
        name: 'Silver Coin 10 GMS (999 Pure)',
        sub: 'Retail & Festive Ready Stock',
        buy: s1kg ? Math.round((s1kg / 1000) * 10 * 0.97) : null,
        sell: s1kg ? Math.round((s1kg / 1000) * 10 * 1.04) : null,
      },
    ];
  }, [rates, gold995Ask, silverPetiAsk]);

  const compareRows = [
    { key: 'gold995_rtgs', fallbackKey: 'gold995', label: 'GOLD 995 RTGS' },
    { key: 'gold995', label: 'GOLD 995 CASH/READY' },
    { key: 'gold916', label: '22K 916 HUID' },
    { key: 'gold18k', label: '18K 750 HUID' },
    { key: 'silverPeti', label: 'SILVER PETI 1KG' },
    { key: 'silverChorsa', label: 'SILVER CHORSA' },
  ];

  const contactPhone = siteConfig?.contactPhone || APP_INFO.contactPhone;
  const whatsappNumber = String(
    siteConfig?.whatsappNumber || APP_INFO.whatsappPhone || '919351214851'
  ).replace(/\D/g, '');

  const marqueeText =
    siteConfig?.marketStatusText
      ? `${siteConfig.marketStatusText} • ONLINE TRADING HOURS: 09:10 AM TO 11:50 PM • कृपया अपने सौदे समय पर लॉक करें • BOOKING NUMBER: ${contactPhone}`
      : `ONLINE TRADING HOURS: 09:10 AM TO 11:50 PM • कृपया अपने सौदे समय पर लॉक करें • Ready Stock (3% GST Paid) • BOOKING NUMBER: ${contactPhone}`;

  return (
    <div className="space-y-3 pb-28">
      {/* 1. Live Trading Marquee */}
      <div className="overflow-hidden rounded-xl border border-[#3D2E1A] bg-[#15100B] py-1.5 px-2 text-[11px] font-medium text-[#E5C158]">
        <div className="animate-marquee gap-10">
          <span>● {marqueeText}</span>
          <span>● {marqueeText}</span>
        </div>
      </div>

      {/* 2. Top 3-Column Comex & Spot Ticker Strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[#3D2E1A] bg-[#15100B] p-2.5">
          <div className="flex items-center justify-between text-[9px] font-bold tracking-wider text-[#E5C158] uppercase">
            <span>GOLD COMEX</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#148A14]" />
          </div>
          <div className="font-mono-price mt-1 inline-block rounded bg-[#148A14] px-1.5 py-0.5 text-sm font-bold text-white">
            {spot.xauUsd ? `$${spot.xauUsd.toFixed(2)}` : '$--'}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-zinc-400">
            <span>MCX G</span>
            <span className="text-zinc-200">{spot.mcxGold ? `₹${formatNum(spot.mcxGold)}` : '--'}</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#3D2E1A] bg-[#15100B] p-2.5">
          <div className="flex items-center justify-between text-[9px] font-bold tracking-wider text-[#E5C158] uppercase">
            <span>SILVER COMEX</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#148A14]" />
          </div>
          <div className="font-mono-price mt-1 inline-block rounded bg-[#148A14] px-1.5 py-0.5 text-sm font-bold text-white">
            {spot.xagUsd ? `$${spot.xagUsd.toFixed(2)}` : '$--'}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-zinc-400">
            <span>MCX S</span>
            <span className="text-zinc-200">{spot.mcxSilver ? `₹${formatNum(spot.mcxSilver)}` : '--'}</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#3D2E1A] bg-[#15100B] p-2.5">
          <div className="flex items-center justify-between text-[9px] font-bold tracking-wider text-[#E5C158] uppercase">
            <span>INR SPOT</span>
            <span className="rounded border border-[#D4AF37]/40 px-1 text-[8px] text-[#D4AF37]">
              {streamStatus === 'LIVE' ? 'LIVE' : 'SYNC'}
            </span>
          </div>
          <div className="font-mono-price mt-1 text-base font-extrabold text-white">
            {spot.usdInr ? `₹${spot.usdInr.toFixed(2)}` : '--'}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-zinc-400">
            <span>Au/Ag</span>
            <span className="text-[#E5C158]">
              {spot.xauUsd && spot.xagUsd ? `${(spot.xauUsd / spot.xagUsd).toFixed(1)}x` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Terminal Switcher (Jodhpur / Sujangarh / IBJA / Compare) */}
      <div className="grid grid-cols-4 gap-1 rounded-xl border border-[#3D2E1A] bg-[#15100B] p-1">
        {TERMINAL_TABS.map((tab) => {
          const active = currentTerm === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTerminal(tab.id)}
              className={`relative z-10 flex items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-bold tracking-wide transition ${
                active ? 'text-[#0B0907]' : 'text-zinc-300 hover:text-[#E5C158]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="hm-term-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-[#E5C158] to-[#C69749]"
                />
              )}
              {tab.id === 'COMPARE' && <Columns3 className="h-3 w-3" />}
              <span className="truncate px-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Category Bar (BULLION | JEWELLERY HUID | COINS) + Unit Toggle + Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-[#3D2E1A] bg-[#15100B] p-1">
          {[
            { id: 'BULLION', label: 'BULLION' },
            { id: 'JEWELLERY', label: 'JEWELLERY HUID' },
            { id: 'COINS', label: 'COINS' },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSubView(v.id)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                subView === v.id
                  ? 'bg-[#D4AF37]/20 text-[#E5C158] border border-[#D4AF37]/40'
                  : 'text-zinc-400'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex rounded-xl border border-[#3D2E1A] bg-[#15100B] p-0.5 text-[10px] font-bold">
            {['10g', '1g', 'tola'].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onUnitChange?.(u)}
                className={`rounded-lg px-2 py-1 uppercase transition ${
                  unit === u ? 'bg-[#E5C158] text-[#0B0907]' : 'text-zinc-400'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              onOpenCalculator?.({ terminal: currentTerm === 'COMPARE' ? 'HB' : currentTerm })
            }
            aria-label="Calculator"
            className="rounded-xl border border-[#3D2E1A] bg-[#15100B] p-1.5 text-[#E5C158]"
          >
            <Calculator className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleAudio}
            aria-label="Tick sound"
            className={`rounded-xl border p-1.5 ${
              tickAudio
                ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#E5C158]'
                : 'border-[#3D2E1A] bg-[#15100B] text-zinc-400'
            }`}
          >
            {tickAudio ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onManualRefresh}
            aria-label="Refresh rates"
            className="rounded-xl border border-[#3D2E1A] bg-[#15100B] p-1.5 text-zinc-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#E5C158]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5. Main Board: Compare Matrix OR Coins Catalog OR PRODUCTS | BUY | SELL Table */}
      <AnimatePresence mode="wait">
        {currentTerm === 'COMPARE' ? (
          <motion.div
            key="COMPARE"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="overflow-hidden rounded-2xl border border-[#3D2E1A] bg-[#15100B]"
          >
            <div className="grid grid-cols-4 bg-[#F5F0E6] px-3 py-2 text-[10px] font-extrabold tracking-wider text-[#0B0907] uppercase">
              <span>PRODUCT</span>
              <span className="text-right">JODHPUR</span>
              <span className="text-right">SUJANGARH</span>
              <span className="text-right">IBJA</span>
            </div>
            <div className="divide-y divide-[#2B2012]">
              {compareRows.map((row) => {
                const jdrItem = rates?.HB?.items?.[row.key] || (row.fallbackKey ? rates?.HB?.items?.[row.fallbackKey] : null);
                const sjgItem = rates?.MOSUN?.items?.[row.key] || (row.fallbackKey ? rates?.MOSUN?.items?.[row.fallbackKey] : null);
                const ibjaItem = rates?.IBJA?.items?.[row.key] || (row.fallbackKey ? rates?.IBJA?.items?.[row.fallbackKey] : null);
                const jdr = scalePrice(jdrItem?.ask || jdrItem?.bid, jdrItem?.unit, unit);
                const sjg = scalePrice(sjgItem?.ask || sjgItem?.bid, sjgItem?.unit, unit);
                const ibja = scalePrice(ibjaItem?.ask || ibjaItem?.bid, ibjaItem?.unit, unit);
                return (
                  <div key={row.key} className="grid grid-cols-4 items-center px-3 py-3 text-xs">
                    <span className="font-bold text-[#E5C158]">{row.label}</span>
                    <span className="font-mono-price text-right font-bold text-white">
                      {jdr ? `₹${formatNum(jdr)}` : '--'}
                    </span>
                    <span className="font-mono-price text-right font-bold text-emerald-400">
                      {sjg ? `₹${formatNum(sjg)}` : '--'}
                    </span>
                    <span className="font-mono-price text-right font-bold text-zinc-300">
                      {ibja ? `₹${formatNum(ibja)}` : '--'}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : subView === 'COINS' ? (
          <motion.div
            key="COINS"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="overflow-hidden rounded-2xl border border-[#3D2E1A] bg-[#15100B]"
          >
            <div className="grid grid-cols-12 bg-[#F5F0E6] px-3 py-2 text-[10px] font-extrabold tracking-wider text-[#0B0907] uppercase">
              <span className="col-span-6">COINS &amp; BARS</span>
              <span className="col-span-3 text-right">BUY</span>
              <span className="col-span-3 text-right">SELL</span>
            </div>
            <div className="divide-y divide-[#2B2012]">
              {coinsCatalog.map((c) => (
                <div key={c.name} className="grid grid-cols-12 items-center px-3 py-3">
                  <div className="col-span-6 pr-2">
                    <div className="text-xs font-bold text-[#E5C158]">{c.name}</div>
                    <div className="text-[10px] text-zinc-400">{c.sub}</div>
                  </div>
                  <div className="col-span-3 text-right font-mono-price text-sm font-bold text-zinc-200">
                    {formatNum(c.buy)}
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <span className="font-mono-price rounded-lg bg-[#148A14] px-2.5 py-1 text-sm font-extrabold text-white">
                      {formatNum(c.sell)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`${currentTerm}_${subView}_${unit}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden rounded-2xl border border-[#3D2E1A] bg-[#15100B] shadow-xl"
          >
            {/* Pale Cream Column Bar */}
            <div className="grid grid-cols-12 items-center bg-[#F5F0E6] px-3 py-2 text-[10px] font-extrabold tracking-wider text-[#0B0907] uppercase">
              <span className="col-span-6">
                PRODUCTS <span className="font-semibold lowercase opacity-70">({unit})</span>
              </span>
              <span className="col-span-3 text-right">BUY</span>
              <span className="col-span-3 text-right">SELL</span>
            </div>

            {filteredList.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-400">
                Live Rate currently updating...
              </div>
            ) : (
              <div className="divide-y divide-[#2B2012]">
                {filteredList.map((item) => {
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
                  const highlightSell =
                    tickDir === 'down'
                      ? 'bg-[#DC2626] text-white'
                      : tickDir === 'up' ||
                        /gold995|gold995_rtgs|silverPeti|silverPeti_rtgs/.test(item.key)
                      ? 'bg-[#148A14] text-white'
                      : 'border border-[#4A371E] bg-[#1F170E] text-white';

                  return (
                    <div
                      key={item.key}
                      onClick={() =>
                        onOpenCalculator?.({
                          terminal: currentTerm,
                          metalKey: item.key,
                          customAsk: item.ask || item.bid,
                        })
                      }
                      className={`grid grid-cols-12 items-center px-3 py-3 cursor-pointer active:bg-[#1E170F] transition ${flashClass}`}
                    >
                      <div className="col-span-6 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Pin rate"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWatchlist?.(watchKey);
                            }}
                            className="shrink-0"
                          >
                            <Star
                              className={`h-3 w-3 ${
                                isStarred ? 'fill-[#E5C158] text-[#E5C158]' : 'text-zinc-600'
                              }`}
                            />
                          </button>
                          <span className="truncate text-xs font-extrabold tracking-wide text-[#E5C158] uppercase">
                            {item.name}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-1.5 pl-4 text-[9px] text-zinc-400">
                          <span className="truncate">{item.tag}</span>
                          <button
                            type="button"
                            aria-label={`Alert for ${item.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAlertFor?.({
                                terminal: currentTerm,
                                metalKey: item.key,
                                currentAsk: item.ask || item.bid,
                              });
                            }}
                            className="text-zinc-500 hover:text-[#E5C158]"
                          >
                            <Bell className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>

                      <div className="col-span-3 text-right pr-1">
                        <div className="font-mono-price text-sm font-bold text-white">
                          {formatNum(bidVal)}
                        </div>
                        <div className="font-mono-price text-[9px] text-zinc-500">
                          L: {lowVal ? formatNum(lowVal) : '--'}
                        </div>
                      </div>

                      <div className="col-span-3 flex flex-col items-end">
                        <span
                          className={`font-mono-price rounded-lg px-2 py-1 text-base font-extrabold leading-none ${highlightSell}`}
                        >
                          {formatNum(askVal)}
                        </span>
                        <div className="font-mono-price mt-1 text-[9px] text-emerald-400/90">
                          H: {highVal ? formatNum(highVal) : '--'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Bottom 2-Column GOLD CURRENT & SILVER CURRENT Spot Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-[#3D2E1A] bg-[#15100B] p-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#E5C158]">
            <span>● GOLD CURRENT</span>
            <span className="text-[9px] text-zinc-400">RTGS</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-[#0B0907] py-1.5">
              <div className="text-[8px] font-bold text-zinc-400 uppercase">BID</div>
              <div className="font-mono-price text-xs font-extrabold text-white">
                {formatNum(gold995Bid)}
              </div>
            </div>
            <div className="rounded-lg bg-[#0B0907] py-1.5">
              <div className="text-[8px] font-bold text-zinc-400 uppercase">ASK</div>
              <div className="font-mono-price text-xs font-extrabold text-emerald-400">
                {formatNum(gold995Ask)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#3D2E1A] bg-[#15100B] p-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#E5C158]">
            <span>● SILVER CURRENT</span>
            <span className="text-[9px] text-zinc-400">1 KG</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-[#0B0907] py-1.5">
              <div className="text-[8px] font-bold text-zinc-400 uppercase">BID</div>
              <div className="font-mono-price text-xs font-extrabold text-white">
                {formatNum(silverPetiBid)}
              </div>
            </div>
            <div className="rounded-lg bg-[#0B0907] py-1.5">
              <div className="text-[8px] font-bold text-zinc-400 uppercase">ASK</div>
              <div className="font-mono-price text-xs font-extrabold text-emerald-400">
                {formatNum(silverPetiAsk)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Direct Booking Number Strip + Bank Details */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-[#3D2E1A] bg-[#15100B] px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="text-[9px] font-bold tracking-widest text-[#E5C158] uppercase">
            DIRECT BOOKING DESK
          </div>
          <div className="font-mono-price text-sm font-extrabold text-white">
            {contactPhone}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenBankDetails}
            aria-label="Bank Details"
            className="flex items-center gap-1 rounded-lg border border-[#D4AF37]/40 bg-[#0B0907] px-2.5 py-2 text-[10px] font-bold text-[#E5C158]"
          >
            <Landmark className="h-3.5 w-3.5" />
            Bank
          </button>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp Booking"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#148A14] text-white"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <a
            href={`tel:${contactPhone.replace(/\s+/g, '')}`}
            aria-label="Call Booking Desk"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#E5C158] to-[#C69749] text-[#0B0907]"
          >
            <Phone className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
