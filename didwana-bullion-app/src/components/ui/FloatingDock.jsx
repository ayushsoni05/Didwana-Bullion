import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  LineChart,
  Newspaper,
  Menu,
  Plus,
  Calculator,
  Bell,
  GitCompareArrows,
  Phone,
  MessageCircle,
  Landmark,
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
  onOpenBankDetails,
  siteConfig,
}) {
  const [quickOpen, setQuickOpen] = useState(false);

  const gold995 = rates?.HB?.items?.gold995?.ask || rates?.MOSUN?.items?.gold995?.ask || 0;
  const silverPeti = rates?.HB?.items?.silverPeti?.ask || rates?.MOSUN?.items?.silverPeti?.ask || 0;
  const contactPhone = siteConfig?.contactPhone || APP_INFO.contactPhone;
  const whatsappNumber = String(
    siteConfig?.whatsappNumber || APP_INFO.whatsappPhone || '919351214851'
  ).replace(/\D/g, '');

  const showNews = siteConfig?.enableNews !== false;
  const showCharts = siteConfig?.enableCharts !== false;
  const showCalculator = siteConfig?.enableCalculator !== false;
  const showAlerts = siteConfig?.enableAlerts !== false;

  const navLeft = [
    { id: 'rates', label: 'Liverate', Icon: Activity },
    ...(showCharts ? [{ id: 'charts', label: 'Charts', Icon: LineChart }] : []),
  ];

  const navRight = [
    ...(showNews ? [{ id: 'news', label: 'News', Icon: Newspaper, badge: unreadNewsCount }] : []),
    { id: 'account', label: isAdmin ? 'Admin' : 'Menu', Icon: Menu, adminDot: isAdmin },
  ];

  const NavBtn = ({ id, label, Icon, badge = 0, adminDot = false }) => {
    const active = activeTab === id || (id === 'account' && activeTab === 'admin');
    return (
      <button
        type="button"
        onClick={() => onSelectTab(id)}
        className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-bold tracking-wide transition-colors ${
          active ? 'text-[#E5C158]' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <div className="relative">
          <Icon className="h-4 w-4" />
          {badge > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#148A14] px-1 text-[8px] font-bold text-white">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
          {adminDot && !badge && (
            <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-[#E5C158] ring-2 ring-[#15100B]" />
          )}
        </div>
        <span>{label}</span>
        {active && (
          <motion.span
            layoutId="hm-nav-underline"
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className="mt-0.5 h-[2px] w-6 rounded-full bg-[#E5C158]"
          />
        )}
      </button>
    );
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-3 z-30 mx-auto flex max-w-md flex-col items-center gap-2 px-4 safe-bottom pointer-events-none">
        {/* Compact Mini Rate Ticker Pill on Secondary Tabs */}
        <AnimatePresence>
          {activeTab !== 'rates' && (gold995 > 0 || silverPeti > 0) && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => onSelectTab('rates')}
              className="pointer-events-auto flex items-center gap-3 rounded-full border border-[#4A371E] bg-[#15100B]/95 px-3.5 py-1.5 text-[11px] shadow-xl backdrop-blur-md"
            >
              <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    streamStatus === 'LIVE' ? 'animate-pulse bg-[#148A14]' : 'bg-amber-400'
                  }`}
                />
                LIVE
              </span>
              {gold995 > 0 && (
                <span className="font-mono-price font-bold text-[#E5C158]">
                  995 ₹{Math.round(gold995).toLocaleString('en-IN')}
                </span>
              )}
              {silverPeti > 0 && (
                <span className="font-mono-price font-semibold text-white">
                  Peti ₹{Math.round(silverPeti).toLocaleString('en-IN')}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Grounded Smoked Bronze 5-Slot Command Dock */}
        <nav className="pointer-events-auto relative w-full rounded-full border border-[#4A371E] bg-[#15100B]/95 px-2.5 py-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="grid grid-cols-5 items-center">
            {navLeft.map((item) => (
              <NavBtn key={item.id} {...item} />
            ))}
            {navLeft.length < 2 && <div />}

            <div className="flex justify-center">
              <button
                type="button"
                aria-label="Quick Bullion Lock & Tools"
                onClick={() => setQuickOpen(true)}
                className="flex h-11 w-11 -mt-4 items-center justify-center rounded-full border-2 border-[#0B0907] bg-gradient-to-br from-[#F5E6A3] via-[#D4AF37] to-[#997B28] text-[#0B0907] shadow-[0_8px_22px_rgba(212,175,55,0.45)] active:scale-95 transition-transform"
              >
                {quickOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5 stroke-[2.5]" />}
              </button>
            </div>

            {navRight.map((item) => (
              <NavBtn key={item.id} {...item} />
            ))}
            {navRight.length < 2 && <div />}
          </div>
        </nav>
      </div>

      {/* Quick Bullion Vault Bottom Sheet */}
      <BottomSheetModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        title="Bullion Desk Quick Tools"
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E5C158]">
              Display Unit
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
                      ? 'bg-gradient-to-r from-[#E5C158] to-[#C69749] text-[#0B0907]'
                      : 'border border-[#3D2E1A] bg-[#0B0907] text-zinc-300'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {showCalculator && (
              <button
                type="button"
                onClick={() => {
                  setQuickOpen(false);
                  onOpenCalculator?.();
                }}
                className="flex items-center gap-2.5 rounded-xl border border-[#3D2E1A] bg-[#0B0907] p-3 text-left"
              >
                <Calculator className="h-5 w-5 text-[#E5C158]" />
                <div>
                  <div className="text-xs font-bold text-white">Costing Calc</div>
                  <div className="text-[10px] text-zinc-400">Weight + 3% GST</div>
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
                className="flex items-center gap-2.5 rounded-xl border border-[#3D2E1A] bg-[#0B0907] p-3 text-left"
              >
                <Bell className="h-5 w-5 text-[#E5C158]" />
                <div>
                  <div className="text-xs font-bold text-white">Price Alerts</div>
                  <div className="text-[10px] text-zinc-400">{alertsCount} active target(s)</div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setQuickOpen(false);
                onOpenCompare?.();
              }}
              className="flex items-center gap-2.5 rounded-xl border border-[#3D2E1A] bg-[#0B0907] p-3 text-left"
            >
              <GitCompareArrows className="h-5 w-5 text-[#E5C158]" />
              <div>
                <div className="text-xs font-bold text-white">Compare Mandi</div>
                <div className="text-[10px] text-zinc-400">HB vs Mosun vs IBJA</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setQuickOpen(false);
                onOpenBankDetails?.();
              }}
              className="flex items-center gap-2.5 rounded-xl border border-[#3D2E1A] bg-[#0B0907] p-3 text-left"
            >
              <Landmark className="h-5 w-5 text-[#E5C158]" />
              <div>
                <div className="text-xs font-bold text-white">Bank Details</div>
                <div className="text-[10px] text-zinc-400">RTGS / NEFT Desk</div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={`tel:${contactPhone.replace(/\s+/g, '')}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#0B0907] py-2.5 text-xs font-bold text-[#E5C158]"
            >
              <Phone className="h-3.5 w-3.5" />
              Call Desk
            </a>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#148A14] py-2.5 text-xs font-bold text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setQuickOpen(false);
                onSelectTab('admin');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E5C158] to-[#C69749] py-3 text-xs font-extrabold uppercase tracking-wider text-[#0B0907]"
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
