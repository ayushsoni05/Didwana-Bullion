import React from 'react';
import { motion } from 'framer-motion';
import { APP_INFO } from '../config/constants';
import dbLogoHdr from '../assets/db-logo-hdr.png';

const WEBFLOW_EASE = [0.16, 1, 0.3, 1];

export function GoldCrest({ size = 40, className = '' }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-2xl border border-[#C8A96E]/45 bg-[#0D111A] shadow-[0_8px_24px_-6px_rgba(200,169,110,0.35)] ${className}`}
    >
      <img
        src={dbLogoHdr}
        alt="Didwana Bullion DB Logo"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export default function SplashGate({ fadingOut }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: fadingOut ? 0 : 1 }}
      transition={{ duration: 0.35, ease: WEBFLOW_EASE }}
      style={{ willChange: 'opacity, transform' }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0D111A] px-6 py-10 safe-top safe-bottom ${
        fadingOut ? 'pointer-events-none' : ''
      }`}
    >
      {/* Top Micro-Hallmark (Act 2) */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2, ease: WEBFLOW_EASE }}
        style={{ willChange: 'transform, opacity' }}
        className="rounded-full border border-[#C8A96E]/40 bg-[#C8A96E]/10 px-4 py-1 text-[10px] font-semibold tracking-[0.22em] text-[#DFC18A] uppercase"
      >
        999.9 Fine Bullion Telemetry
      </motion.div>

      {/* Center Stage: Act 1 Vault Reveal + Act 2 Editorial Typography */}
      <div className="relative flex flex-col items-center text-center">
        {/* GPU-composited Radial Gold Aura (no expensive blur repaints) */}
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            willChange: 'transform, opacity',
            background:
              'radial-gradient(circle, rgba(200,169,110,0.28) 0%, rgba(13,17,26,0) 70%)',
          }}
          className="pointer-events-none absolute -top-10 h-60 w-60 rounded-full"
        />

        {/* HDR DB Monogram with 21st.dev Shimmer Sweep */}
        <motion.div
          initial={{ scale: 0.76, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          style={{ willChange: 'transform, opacity' }}
          className="relative mb-6 overflow-hidden rounded-3xl border border-[#DFC18A]/50 bg-[#0D111A] p-1.5 shadow-[0_20px_60px_-12px_rgba(223,193,138,0.45)]"
        >
          <img
            src={dbLogoHdr}
            alt="Didwana Bullion HDR Monogram"
            className="h-32 w-32 rounded-2xl object-cover"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmerSweep_2s_infinite]"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25, ease: WEBFLOW_EASE }}
          style={{ willChange: 'transform, opacity' }}
          className="text-2xl font-bold tracking-[0.22em] text-[#DFC18A] uppercase"
        >
          {APP_INFO.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.38, ease: WEBFLOW_EASE }}
          style={{ willChange: 'transform, opacity' }}
          className="mt-1.5 text-[11px] font-semibold tracking-[0.24em] text-[#C8A96E]/90 uppercase"
        >
          New Monika Jewellers • Didwana
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.48 }}
          className="mt-1 text-[10px] tracking-[0.2em] text-zinc-400 uppercase"
        >
          PIN 341303 • Rajasthan
        </motion.p>

        {/* Act 3: 120Hz Progress Sweep */}
        <div className="mt-7 h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#9E7D47] via-[#DFC18A] to-[#9E7D47] animate-splash-bar" />
        </div>
        <span className="mt-2 text-[10px] tracking-[0.18em] text-zinc-400 uppercase">
          120Hz Live Bullion Engine
        </span>
      </div>

      {/* Bottom Live Status Pill (Act 3) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.5, ease: WEBFLOW_EASE }}
        style={{ willChange: 'transform, opacity' }}
        className="w-full max-w-xs rounded-2xl border border-[#C8A96E]/35 bg-[#121622] px-4 py-3 text-center shadow-xl"
      >
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.18em] text-[#F4EFE6] uppercase">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Jodhpur • Sujangarh • IBJA 24H Live
        </div>
        <div className="mt-1 text-[9px] tracking-widest text-zinc-400 uppercase">
          TLS 1.2+ Encrypted Vault Feed
        </div>
      </motion.div>
    </motion.div>
  );
}
