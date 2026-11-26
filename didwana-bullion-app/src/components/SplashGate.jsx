import React from 'react';
import { motion } from 'framer-motion';
import { APP_INFO } from '../config/constants';
import dbLogoHdr from '../assets/db-logo-hdr.png';

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
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0D111A] px-6 py-10 safe-top safe-bottom ${
        fadingOut ? 'pointer-events-none' : ''
      }`}
    >
      {/* Top Micro-Hallmark */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-full border border-[#C8A96E]/40 bg-[#C8A96E]/10 px-4 py-1 text-[10px] font-semibold tracking-[0.22em] text-[#DFC18A] uppercase"
      >
        999.9 Fine Bullion Telemetry
      </motion.div>

      {/* Center Stage with Framer Motion HDR Logo */}
      <div className="relative flex flex-col items-center text-center">
        {/* Pulsing Golden Aura */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.22, 0.4, 0.22] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -top-6 h-56 w-56 rounded-full bg-[#C8A96E]/30 blur-3xl"
        />

        <motion.div
          initial={{ scale: 0.72, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative mb-6 overflow-hidden rounded-3xl border border-[#DFC18A]/45 bg-[#0D111A] p-1.5 shadow-[0_20px_60px_-12px_rgba(223,193,138,0.45)]"
        >
          <img
            src={dbLogoHdr}
            alt="Didwana Bullion HDR Monogram"
            className="h-28 w-28 rounded-2xl object-cover"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmerSweep_2.5s_infinite]"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="text-2xl font-bold tracking-[0.22em] text-[#DFC18A] uppercase"
        >
          {APP_INFO.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.32 }}
          className="mt-1.5 text-[11px] font-semibold tracking-[0.24em] text-[#C8A96E]/85 uppercase"
        >
          New Monika Jewellers • Didwana
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.42 }}
          className="mt-1 text-[10px] tracking-[0.2em] text-zinc-400 uppercase"
        >
          PIN 341303 • Rajasthan
        </motion.p>

        {/* Progress Bar */}
        <div className="mt-8 h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#9E7D47] via-[#DFC18A] to-[#9E7D47] animate-splash-bar" />
        </div>
        <span className="mt-2.5 text-[10px] tracking-[0.18em] text-zinc-400 uppercase">
          Connecting 24H Live Terminals
        </span>
      </div>

      {/* Bottom Live Status Pill */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="w-full max-w-xs rounded-2xl border border-[#C8A96E]/35 bg-[#121622]/90 px-4 py-3 text-center shadow-xl backdrop-blur-md"
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
