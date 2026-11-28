import React from 'react';
import { motion } from 'framer-motion';
import { Crown, ShieldCheck } from 'lucide-react';
import { APP_INFO } from '../config/constants';
import dbLogoHdr from '../assets/db-logo-hdr.png';
import bullionHero from '../assets/bullion-hero.jpg';

const WEBFLOW_EASE = [0.16, 1, 0.3, 1];

export function GoldCrest({ size = 44, className = '' }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 rounded-full border-2 border-[#D4AF37]/80 bg-[#15100B] p-0.5 shadow-[0_8px_24px_-6px_rgba(212,175,55,0.45)] ${className}`}
    >
      <img
        src={dbLogoHdr}
        alt="Didwana Bullion DB Crest"
        className="h-full w-full rounded-full object-cover"
      />
    </div>
  );
}

export default function SplashGate({ fadingOut, rates }) {
  const goldAsk = rates?.HB?.items?.gold995?.ask || rates?.MOSUN?.items?.gold995?.ask || null;
  const silverAsk =
    rates?.HB?.items?.silverPeti?.ask || rates?.MOSUN?.items?.silverPeti?.ask || null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: fadingOut ? 0 : 1 }}
      transition={{ duration: 0.35, ease: WEBFLOW_EASE }}
      style={{ willChange: 'opacity, transform' }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-[#0B0907] px-6 py-8 safe-top safe-bottom ${
        fadingOut ? 'pointer-events-none' : ''
      }`}
    >
      {/* Subtle Studio Gold Bar Backdrop Vignette */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src={bullionHero}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-20 scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(21,13,6,0.68) 0%, rgba(11,9,7,0.95) 68%, #070504 100%)',
          }}
        />
      </div>

      {/* Top Heritage Tag matching HB Jodhpur */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: WEBFLOW_EASE }}
        className="relative z-10 flex flex-col items-center gap-2 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#15100B]/85 px-4 py-1 text-[10px] font-bold tracking-[0.22em] text-[#D4AF37] uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
          ESTD. 1994 • RAJASTHAN
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
        </div>
        <div className="font-serif-luxury text-xs tracking-[0.28em] text-[#E6DFD5]/80 uppercase">
          ( NEW MONIKA JEWELLERS )
        </div>
      </motion.div>

      {/* Center Crowned Coin Medallion & Typography */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 310, damping: 24 }}
          className="relative mb-5 flex flex-col items-center"
        >
          <Crown className="mb-1 h-7 w-7 text-[#E5C158] drop-shadow-[0_2px_10px_rgba(212,175,55,0.55)]" />
          <div className="relative rounded-full border-2 border-[#D4AF37]/80 bg-gradient-to-b from-[#2A1D0F] to-[#0B0907] p-2 shadow-[0_18px_55px_-10px_rgba(212,175,55,0.45)]">
            <div className="rounded-full border border-dashed border-[#D4AF37]/50 p-2">
              <img
                src={dbLogoHdr}
                alt="Didwana Bullion Monogram"
                className="h-24 w-24 rounded-full object-cover"
              />
            </div>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmerSweep_2.2s_infinite]"
            />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: WEBFLOW_EASE }}
          className="font-serif-luxury bg-gradient-to-r from-[#F5E6A3] via-[#D4AF37] to-[#C69749] bg-clip-text text-3xl font-bold tracking-[0.06em] text-transparent uppercase"
        >
          {APP_INFO.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25, ease: WEBFLOW_EASE }}
          className="mt-1.5 text-sm font-medium text-[#E6DFD5]"
        >
          न्यू मोनिका ज्वैलर्स • डीडवाना (राज.)
        </motion.p>
        <p className="mt-1 text-[10px] font-bold tracking-[0.22em] text-[#D4AF37]/85 uppercase">
          WHOLESALE GOLD &amp; SILVER SPOT DESK
        </p>

        {(goldAsk || silverAsk) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.32, ease: WEBFLOW_EASE }}
            className="mt-5 grid w-full max-w-xs grid-cols-2 gap-2.5"
          >
            <div className="rounded-xl border border-[#D4AF37]/25 bg-[#15100B]/85 px-3 py-2 text-left backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[#148A14]" />
                GOLD 995
              </div>
              <div className="font-mono-price mt-0.5 text-base font-bold text-white">
                {goldAsk ? `₹${Math.round(goldAsk).toLocaleString('en-IN')}` : 'SYNCING'}
              </div>
            </div>
            <div className="rounded-xl border border-[#D4AF37]/25 bg-[#15100B]/85 px-3 py-2 text-left backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[#148A14]" />
                SILVER PETI
              </div>
              <div className="font-mono-price mt-0.5 text-base font-bold text-white">
                {silverAsk ? `₹${Math.round(silverAsk).toLocaleString('en-IN')}` : 'SYNCING'}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Terminal Sync Strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.36, ease: WEBFLOW_EASE }}
        className="relative z-10 w-full max-w-xs space-y-2.5 text-center"
      >
        <div className="flex items-center justify-between rounded-full border border-[#3D2E1A] bg-[#15100B]/90 px-3.5 py-2 shadow-lg">
          <span className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[#F5F2EB] uppercase">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#148A14]" />
            JODHPUR • SUJANGARH • IBJA
          </span>
          <span className="rounded-full bg-[#148A14]/25 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
            LIVE FEED
          </span>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#997B28] via-[#E5C158] to-[#997B28] animate-splash-bar" />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[9px] tracking-[0.14em] text-zinc-500 uppercase">
          <ShieldCheck className="h-3 w-3 text-[#D4AF37]" />
          ONLINE TRADING: 09:10 AM TO 11:50 PM • SECURE DESK
        </div>
      </motion.div>
    </motion.div>
  );
}
