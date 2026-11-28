import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { APP_INFO } from '../config/constants';
import dbLogoHdr from '../assets/db-logo-hdr.png';
import splashBullVideo from '../assets/splash-bull-intro.mp4';
import splashBullPoster from '../assets/splash-bull-poster.jpg';

// Pure deterministic molten-gold ember coordinates for ambient bull breakout overlay
const MOLTEN_SPARKS = [
  { id: 1, left: '14%', bottom: '36%', size: 4, delay: 0.2, duration: 2.1, dx: 42, dy: -90 },
  { id: 2, left: '22%', bottom: '42%', size: 3, delay: 0.45, duration: 1.9, dx: 64, dy: -115 },
  { id: 3, left: '30%', bottom: '38%', size: 5, delay: 0.7, duration: 2.3, dx: 55, dy: -120 },
  { id: 4, left: '41%', bottom: '45%', size: 3, delay: 1.0, duration: 2.0, dx: 70, dy: -135 },
  { id: 5, left: '53%', bottom: '48%', size: 4, delay: 1.25, duration: 2.2, dx: 84, dy: -140 },
  { id: 6, left: '64%', bottom: '52%', size: 5, delay: 1.5, duration: 1.85, dx: 75, dy: -125 },
  { id: 7, left: '72%', bottom: '58%', size: 3, delay: 1.75, duration: 2.05, dx: 60, dy: -110 },
  { id: 8, left: '80%', bottom: '63%', size: 4, delay: 2.0, duration: 2.25, dx: 48, dy: -95 },
];

/**
 * Unified matte-obsidian DB monogram + rising trend arrow crest (matches launcher icon).
 */
export function GoldCrest({ size = 44, className = '' }) {
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#090909] shadow-[0_2px_10px_rgba(212,175,55,0.18)] ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={dbLogoHdr}
        alt="Didwana Bullion DB Logo"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

/**
 * Full-screen ultra-luxury #090909 3D sculpted Golden Bull commercial animated splash screen.
 * Plays bundled intro video with instant poster, specular light sweep fallback, and Skip control.
 */
export default function SplashGate({ fadingOut, rates, onFinish }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [localExit, setLocalExit] = useState(false);
  const videoRef = useRef(null);
  const exitTimerRef = useRef(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
      vid.play().catch(() => {
        // Fallback smoothly to animated poster/crest sequence if autoplay is blocked
      });
    }
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const triggerExit = () => {
    if (localExit) return;
    setLocalExit(true);
    exitTimerRef.current = setTimeout(() => {
      onFinish?.();
    }, 280);
  };

  const goldBid = rates?.gold?.bid || rates?.goldCosting?.bid;
  const isFading = fadingOut || localExit;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden bg-[#090909] transition-opacity duration-500 ${
        isFading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Subtle dark radial studio backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 46%, rgba(212,175,55,0.11) 0%, rgba(16,13,9,0.75) 45%, #090909 82%)',
        }}
      />

      {/* Top Bar: Safe-Area Live Indicator & Skip Button */}
      <div className="safe-top relative z-20 flex w-full items-center justify-between px-5 pt-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#090909]/80 px-3 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4AF37]" />
          <span className="text-[10px] font-semibold tracking-[0.18em] text-[#E5C158] uppercase">
            {goldBid ? `Spot Gold ₹${goldBid}` : 'Live Bullion Desk'}
          </span>
        </div>

        <button
          type="button"
          onClick={triggerExit}
          className="rounded-full border border-[#D4AF37]/30 bg-[#14110C]/85 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-[#E5C158] uppercase backdrop-blur-sm transition hover:border-[#D4AF37]/70 hover:bg-[#1E1911] active:scale-95"
        >
          Skip &rarr;
        </button>
      </div>

      {/* Center Commercial 3D Charging Bull Stage */}
      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center px-3">
        <div className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-[#090909]">
          {!videoFailed ? (
            <video
              ref={videoRef}
              src={splashBullVideo}
              poster={splashBullPoster}
              muted
              autoPlay
              playsInline
              preload="auto"
              onEnded={triggerExit}
              onError={() => setVideoFailed(true)}
              className="aspect-[9/16] max-h-[70vh] w-full rounded-2xl bg-[#090909] object-contain"
            />
          ) : (
            <div className="relative flex flex-col items-center justify-center py-6">
              <motion.img
                src={splashBullPoster}
                alt="3D Charging Golden Bull"
                initial={{ opacity: 0, scale: 0.92, x: -24 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="max-h-[42vh] w-full rounded-2xl object-contain"
              />
              <motion.img
                src={dbLogoHdr}
                alt="DB Didwana Bullion"
                initial={{ opacity: 0, y: 18, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.7 }}
                className="mt-4 h-36 w-36 object-contain"
              />
            </div>
          )}

          {/* Edge vignette to seamlessly melt video edges into #090909 obsidian */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              boxShadow: 'inset 0 0 38px 18px #090909',
            }}
          />

          {/* Diagonal Specular Light Sweep Overlay */}
          <motion.div
            aria-hidden="true"
            initial={{ x: '-140%', opacity: 0 }}
            animate={{ x: '180%', opacity: [0, 0.35, 0] }}
            transition={{ delay: 2.6, duration: 1.5, ease: 'easeInOut' }}
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[#F6E299]/25 to-transparent"
          />

          {/* Molten Gold Spark Embers */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {MOLTEN_SPARKS.map((spark) => (
              <motion.span
                key={spark.id}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                animate={{
                  opacity: [0, 0.9, 0],
                  x: spark.dx,
                  y: spark.dy,
                  scale: [0.6, 1.15, 0.3],
                }}
                transition={{
                  delay: spark.delay,
                  duration: spark.duration,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  ease: 'easeOut',
                }}
                className="absolute rounded-full bg-[#F5D36A] shadow-[0_0_8px_#D4AF37]"
                style={{
                  left: spark.left,
                  bottom: spark.bottom,
                  width: spark.size,
                  height: spark.size,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Luxury Brand Lockup Footer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7 }}
        className="safe-bottom relative z-20 flex w-full flex-col items-center gap-1.5 px-6 pb-6 text-center"
      >
        <div className="flex items-center gap-2.5">
          <GoldCrest size={28} />
          <span className="font-serif-luxury text-xs font-bold tracking-[0.22em] text-[#E5C158] uppercase">
            {APP_INFO.name}
          </span>
        </div>
        <p className="text-[10px] font-medium tracking-[0.2em] text-[#9A8C72] uppercase">
          New Monika Jewellers &bull; Jodhpur &bull; Sujangarh &bull; IBJA
        </p>
        <div className="mt-1 h-[2px] w-28 overflow-hidden rounded-full bg-[#241E15]">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: 4.8, ease: 'linear' }}
            className="h-full w-full rounded-full bg-gradient-to-r from-[#9C7A2C] via-[#F3D27A] to-[#D4AF37]"
          />
        </div>
      </motion.div>
    </div>
  );
}
