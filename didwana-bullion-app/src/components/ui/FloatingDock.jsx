import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  LineChart,
  Newspaper,
  UserCircle2,
  Plus,
  Calculator,
  Bell,
  GitCompareArrows,
  Phone,
  MessageCircle,
  Crown,
  X,
} from 'lucide-react';
import { APP_INFO } from '../../config/constants';
import { BottomSheetModal } from './BottomSheetModal';

export function FloatingDock({
  activeTab,
  onSelectTab,
  unreadNewsCount = 0,
  isAdmin = false,
  rates,
  streamStatus,
  alertsCount = 0,
  unit = '10g',
  onUnitChange,
  onOpenCalculator,
  onOpenAlerts,
  onOpenCompare,
  siteConfig,
}) {
  const [quickOpen, setQuickOpen] = useState(false);

  const gold995 = rates?.HB?.items?.gold995?.ask || rates?.MOSUN?.items?.gold995?.ask || 0;
  const silverPeti = rates?.HB?.items?.silverPeti?.ask || rates?.MOSUN?.items?.silverPeti?.ask || 0;
  const contactPhone = siteConfig?.contactPhone || APP_INFO.contactPhone;
  const whatsappNumber =
    String(siteConfig?.whatsappNumber || APP_INFO.whatsappPhone || '919351214851').replace(/\D/g, '');

  const showNews = siteConfig?.enableNews !== false;
  const showCharts = siteConfig?.enableCharts !== false;
  const showCalculator = siteConfig?.enableCalculator !== false;
  const showAlerts = siteConfig?.enableAlerts !== false;

  const navItemsLeft = [
    { id: 'rates', label: 'Live', Icon: Activity },
    ...(showCharts ? [{ id: 'charts', label: 'Charts', Icon: LineChart }] : []),
  ];

  const navItemsRight = [
    ...(showNews ? [{ id: 'news', label: 'News', Icon: Newspaper, badge: unreadNewsCount }] : []),
    { id: 'account', label: isAdmin ? 'Admin' : 'Profile', Icon: UserCircle2, adminDot: isAdmin },
  ];

  const NavButton = ({ id, label, Icon, badge = 0, adminDot = false }) => {
    const active = activeTab === id || (id === 'account' && activeTab === 'admin');
    return (
      <button
        key={id}
        type="button"
        onClick={() => onSelectTab(id)}
        className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-bold tracking-wide transition-colors ${
          active
            ? 'text-[#9A7422] dark:text-[#E6CB94]'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
        }`}
      >
        <div className="relative">
          <Icon className="h-4 w-4" />
          {badge > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
          {adminDot && !badge && (
            <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-[#D4AF37] ring-2 ring-white dark:ring-[#10141F]" />
          )}
        </div>
        <span>{label}</span>
        {active && (
          <motion.span
            layoutId="behance-nav-underline"
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className="mt-0.5 h-[2px] w-6 rounded-full bg-[#9A7422] dark:bg-[#E6CB94]"
          />
        )}
      </button>
    );
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-3 z-30 mx-auto flex max-w-md flex-col items-center gap-2 px-4 safe-bottom pointer-events-none">
        {/* Live Mini-Ticker Pill docked smoothly above the nav bar on secondary tabs */}
        <AnimatePresence>
          {activeTab !== 'rates' && (gold995 > 0 || silverPeti > 0) && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              onClick={() => onSelectTab('rates')}
              className="pointer-events-auto flex items-center gap-3 rounded-full border border-[#D4AF37]/35 bg-white/95 dark:bg-[#10141F]/95 px-3.5 py-1.5 text-[11px] shadow-xl backdrop-blur-md"
            >
              <span className="flex items-center gap-1.5 font-bold text-zinc-600 dark:text-zinc-300">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    streamStatus === 'LIVE' ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                LIVE
              </span>
              {gold995 > 0 && (
                <span className="font-mono-price font-bold text-[#9A7422] dark:text-[#E6CB94]">
                  Au 995 ₹{Math.round(gold995).toLocaleString('en-IN')}
                </span>
              )}
              {silverPeti > 0 && (
                <span className="font-mono-price font-semibold text-zinc-600 dark:text-zinc-300">
                  Ag ₹{Math.round(silverPeti).toLocaleString('en-IN')}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* 5-Slot Luxury Floating Command Bar */}
        <nav className="pointer-events-auto relative w-full rounded-full border border-[#D4AF37]/40 bg-white/95 dark:bg-[#0D111A]/95 px-2.5 py-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="grid grid-cols-5 items-center">
            {navItemsLeft.map((item) => (
              <NavButton key={item.id} {...item} />
            ))}
            {navItemsLeft.length < 2 && <div />}

            {/* Center Elevated Gold Vault Action Button */}
            <div className="flex justify-center">
              <button
                type="button"
                aria-label="Quick Bullion Actions"
                onClick={() => setQuickOpen(true)}
                className="flex h-11 w-11 -mt-4 items-center justify-center rounded-full border-2 border-[#07090F] bg-gradient-to-br from-[#F3DFAA] via-[#D4AF37] to-[#9A7422] text-[#07090F] shadow-[0_8px_22px_rgba(212,175,55,0.45)] active:scale-95 transition-transform"
              >
                {quickOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5 stroke-[2.5]" />}
              </button>
            </div>

            {navItemsRight.map((item) => (
              <NavButton key={item.id} {...item} />
            ))}
            {navItemsRight.length < 2 && <div />}
          </div>
        </nav>
      </div>

      {/* Quick Bullion Vault Bottom Sheet */}
      <BottomSheetModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        title="Bullion Quick Vault"
      >
        <div className="space-y-4">
          {/* Quick Unit Switcher */}
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Display Weight Unit
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '10g', label: '10 Grams' },
                { id: '1g', label: '1 Gram' },
                { id: 'tola', label: '1 Tola (11.66g)' },
              ].map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onUnitChange?.(u.id)}
                  className={`rounded-xl py-2 text-[11px] font-bold transition ${
                    unit === u.id
                      ? 'bg-gradient-to-r from-[#E6CB94] to-[#C9A452] text-[#07090F]'
                      : 'border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#07090F] text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {showCalculator && (
              <button
                type="button"
                onClick={() => {
                  setQuickOpen(false);
                  onOpenCalculator?.();
                }}
                className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#07090F] p-3 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Calculator</div>
                  <div className="text-[10px] text-zinc-500">Weight &amp; 3% GST</div>
                </div>
              </button>
            )}

            {showAlerts && (
              <button
                type="button"
                onClick={() => {
                  setQuickOpen(false);
                  onOpenAlerts?.();
                }}
                className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#07090F] p-3 text-left"
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                  <Bell className="h-4 w-4" />
                  {alertsCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {alertsCount}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Price Alerts</div>
                  <div className="text-[10px] text-zinc-500">{alertsCount} active target(s)</div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setQuickOpen(false);
                onOpenCompare?.();
              }}
              className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#07090F] p-3 text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                <GitCompareArrows className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Compare Desk</div>
                <div className="text-[10px] text-zinc-500">JDR vs SJG vs IBJA</div>
              </div>
            </button>

            {showNews && (
              <button
                type="button"
                onClick={() => {
                  setQuickOpen(false);
                  onSelectTab('news');
                }}
                className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#07090F] p-3 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Newspaper className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Bullion News</div>
                  <div className="text-[10px] text-zinc-500">Market insights</div>
                </div>
              </button>
            )}
          </div>

          {/* Direct Trade Desk */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <a
              href={`tel:${contactPhone.replace(/\s+/g, '')}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 py-2.5 text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]"
            >
              <Phone className="h-3.5 w-3.5" />
              Call Trade Desk
            </a>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Desk
            </a>
          </div>

          {/* Dedicated Admin Shortcut */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setQuickOpen(false);
                onSelectTab('admin');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E6CB94] via-[#D4AF37] to-[#B8892D] py-3 text-xs font-bold uppercase tracking-wider text-[#07090F] shadow-lg"
            >
              <Crown className="h-4 w-4" />
              Open Dedicated Admin Panel
            </button>
          )}
        </div>
      </BottomSheetModal>
    </>
  );
}
