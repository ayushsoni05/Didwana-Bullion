import React from 'react';
import { APP_INFO } from '../config/constants';

export function GoldCrest({ size = 72 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Didwana Bullion Crest"
    >
      <circle cx="50" cy="50" r="46" stroke="#C8A96E" strokeWidth="2.4" strokeOpacity="0.9" />
      <circle cx="50" cy="50" r="39" stroke="#C8A96E" strokeWidth="0.9" strokeOpacity="0.4" />
      <path
        d="M50 18L76 34V66L50 82L24 66V34L50 18Z"
        stroke="#C8A96E"
        strokeWidth="2"
        className="fill-[#18181D] dark:fill-[#18181D]"
      />
      <path
        d="M36 44H53C58.5 44 62 47.2 62 52C62 56.8 58.5 60 53 60H36V44Z"
        stroke="#DFC18A"
        strokeWidth="2.3"
      />
      <path d="M43 37V67" stroke="#C8A96E" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export default function SplashGate({ fadingOut }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#F8F6F1] dark:bg-[#0B0B0D] px-6 py-10 transition-opacity duration-500 safe-top safe-bottom ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top Micro-Hallmark */}
      <div className="rounded-full border border-[#9E7D47]/35 bg-[#C8A96E]/10 px-3.5 py-1 text-[10px] font-semibold tracking-[0.22em] text-[#8C6A2E] dark:text-[#DFC18A] uppercase">
        999.9 Fine Bullion Telemetry
      </div>

      {/* Center Stage */}
      <div className="relative flex flex-col items-center text-center">
        <div className="pointer-events-none absolute -top-10 h-52 w-52 rounded-full bg-[#C8A96E]/15 blur-3xl" />
        <div className="relative mb-5 rounded-full p-2.5 shadow-[0_16px_45px_-12px_rgba(200,169,110,0.3)]">
          <GoldCrest size={92} />
        </div>
        <h1 className="text-2xl font-bold tracking-[0.2em] text-[#8C6A2E] dark:text-[#DFC18A] uppercase">
          {APP_INFO.name}
        </h1>
        <p className="mt-1.5 text-[11px] font-semibold tracking-[0.24em] text-zinc-600 dark:text-[#C8A96E]/80 uppercase">
          New Monika Jewellers • Didwana
        </p>
        <p className="mt-1 text-[10px] tracking-[0.2em] text-zinc-400 dark:text-zinc-500 uppercase">
          PIN 341303 • Rajasthan
        </p>

        {/* Progress Bar */}
        <div className="mt-8 h-0.5 w-44 overflow-hidden rounded-full bg-zinc-300 dark:bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#9E7D47] via-[#DFC18A] to-[#9E7D47] animate-splash-bar" />
        </div>
        <span className="mt-2.5 text-[10px] tracking-[0.18em] text-zinc-500 dark:text-zinc-400 uppercase">
          Connecting 24H Live Terminals
        </span>
      </div>

      {/* Bottom Live Status Pill */}
      <div className="w-full max-w-xs rounded-2xl border border-[#9E7D47]/30 bg-white/80 dark:bg-[#121216]/90 px-4 py-3 text-center shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.18em] text-zinc-800 dark:text-[#F4EFE6] uppercase">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Jodhpur • Sujangarh • IBJA 24H Live
        </div>
        <div className="mt-1 text-[9px] tracking-widest text-zinc-500 uppercase">
          TLS 1.2+ Encrypted Vault Feed
        </div>
      </div>
    </div>
  );
}
