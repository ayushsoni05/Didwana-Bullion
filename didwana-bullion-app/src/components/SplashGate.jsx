import React from 'react';
import { motion } from 'framer-motion';
import { APP_INFO } from '../config/constants';
import dbLogoHdr from '../assets/db-logo-hdr.png';

const WEBFLOW_EASE = [0.16, 1, 0.3, 1];

export function GoldCrest({ size = 40, className = '' }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-2xl border border-[#C5A358]/50 bg-[#0D111A] shadow-[0_8px_24px_-6px_rgba(232,201,122,0.35)] ${className}`}
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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#0A0A0A] to-[#121212] px-6 py-10 safe-top safe-bottom ${
        fadingOut ? 'pointer-events-none' : ''
      }`}
    >
      {/* Behance Faint Concentric Golden Line-Art Watermark */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -bottom-28 left-1/2 h-[420px] w-[420px] -translate-x-1/2 opacity-15"
      >
        {[80, 115, 150, 185].map((r) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r}
            fill="none"
            stroke="#C5A358"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Top Micro-Hallmark */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15, ease: WEBFLOW_EASE }}
        className="relative z-10 rounded-full border border-[#C5A358]/35 bg-[#C5A358]/10 px-4 py-1 text-[10px] font-semibold tracking-[0.22em] text-[#E8C97A] uppercase"
      >
        24K • 999.9 Purest Bullion
      </motion.div>

      {/* Center Stage (Behance 01 Layout) */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.78, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          style={{ willChange: 'transform, opacity' }}
          className="relative mb-5 overflow-hidden rounded-3xl border border-[#E8C97A]/55 bg-[#0D111A] p-1.5 shadow-[0_20px_60px_-12px_rgba(232,201,122,0.45)]"
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

        {/* Thin Horizontal Gold Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.2, ease: WEBFLOW_EASE }}
          className="mb-4 h-px w-28 bg-gradient-to-r from-transparent via-[#E8C97A] to-transparent"
        />

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25, ease: WEBFLOW_EASE }}
          className="text-2xl font-bold tracking-[0.22em] text-[#E8C97A] uppercase"
        >
          {APP_INFO.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35, ease: WEBFLOW_EASE }}
          className="mt-1.5 text-[11px] font-medium tracking-[0.22em] text-[#C5A358] uppercase"
        >
          New Monika Jewellers • Didwana
        </motion.p>

        <div className="mt-7 h-0.5 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#C9A452] via-[#E8C97A] to-[#C9A452] animate-splash-bar" />
        </div>
      </div>

      {/* Bottom Live Status Pill */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.42, ease: WEBFLOW_EASE }}
        className="relative z-10 w-full max-w-xs rounded-full border border-[#C5A358]/35 bg-[#1A1A1A]/90 px-4 py-2.5 text-center shadow-xl"
      >
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#EDEDED] uppercase">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Jodhpur • Sujangarh • IBJA 24H Live
        </div>
      </motion.div>
    </motion.div>
  );
}
