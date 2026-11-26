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
      <circle cx="50" cy="50" r="46" stroke="#B59A6C" strokeWidth="2.5" strokeOpacity="0.85" />
      <circle cx="50" cy="50" r="39" stroke="#B59A6C" strokeWidth="0.9" strokeOpacity="0.35" />
      <path
        d="M50 18L76 34V66L50 82L24 66V34L50 18Z"
        stroke="#B59A6C"
        strokeWidth="2"
        fill="#1A1712"
      />
      <path
        d="M36 44H53C58.5 44 62 47.2 62 52C62 56.8 58.5 60 53 60H36V44Z"
        stroke="#E5C99B"
        strokeWidth="2.2"
      />
      <path d="M43 37V67" stroke="#B59A6C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function SplashGate({ fadingOut }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#111111] px-6 transition-opacity duration-500 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 rounded-full p-3 shadow-[0_0_50px_rgba(181,154,108,0.18)]">
          <GoldCrest size={88} />
        </div>
        <h1 className="text-2xl font-bold tracking-[0.18em] text-[#E5C99B] uppercase">
          {APP_INFO.name}
        </h1>
        <p className="mt-1.5 text-xs font-medium tracking-[0.22em] text-zinc-400 uppercase">
          {APP_INFO.tagline}
        </p>
        <div className="mt-8 flex items-center gap-2 text-[11px] tracking-widest text-[#B59A6C]/80 uppercase">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B59A6C]" />
          <span>Connecting Live Terminals</span>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-[10px] tracking-wider text-zinc-500 uppercase">
        HB Jodhpur • Mosun &amp; Sons • IBJA Official
      </div>
    </div>
  );
}
