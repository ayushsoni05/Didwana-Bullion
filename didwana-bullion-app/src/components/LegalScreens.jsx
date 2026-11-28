import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Cookie,
  X,
  ChevronLeft,
  CheckCircle2,
  Lock,
  SlidersHorizontal,
} from 'lucide-react';
import { APP_INFO } from '../config/constants';

export function LegalDocumentModal({ docType, onClose }) {
  if (!docType) return null;

  const titles = {
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    cookies: 'Cookies & Local Storage Policy',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F6F7F9] dark:bg-[#0B0907] safe-top safe-bottom">
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 px-4 py-3.5 bg-white dark:bg-[#15100B]">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[#9A7422] dark:text-[#D4AF37]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <h2 className="font-serif-luxury text-base font-bold tracking-wide text-zinc-900 dark:text-[#E6CB94]">
          {titles[docType]}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-5">
        <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-3.5 text-xs">
          <div className="font-bold text-[#9A7422] dark:text-[#E6CB94]">
            {APP_INFO.name} ({APP_INFO.tagline})
          </div>
          <div className="mt-1 text-zinc-500 dark:text-zinc-400">
            {APP_INFO.address} • Version {APP_INFO.legalVersion}
          </div>
        </div>

        {docType === 'terms' && (
          <>
            <section className="space-y-2">
              <h3 className="text-base font-semibold text-[#E5C99B]">1. Indicative Live Rates Only</h3>
              <p>
                <strong>Didwana Bullion</strong> provides real-time indicative bullion market rates
                aggregated from <strong>Jodhpur &amp; Sujangarh regional bullion desks</strong> and{' '}
                <strong>Official IBJA Benchmarks</strong> for informational and showroom reference
                only.
              </p>
              <p>
                Final physical transaction rates, making charges, GST, and settlement terms are
                confirmed strictly in person at{' '}
                <strong>New Monika Jewellers, Station Road, Didwana (PIN 341303)</strong>.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-[#E5C99B]">2. No Trading Liability</h3>
              <p>
                While we strive for 0-second live streaming accuracy, bullion feeds depend on
                upstream mandi and benchmark availability. New Monika Jewellers is not liable for
                network delays, temporary feed interruptions, or trading decisions made solely from
                indicative screen prices.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-[#E5C99B]">3. Account &amp; Acceptable Use</h3>
              <p>
                You are responsible for keeping your login credentials confidential. Automated
                scraping, reverse engineering, or unauthorized redistribution of live rate streams
                is strictly prohibited and may result in immediate account suspension.
              </p>
            </section>
          </>
        )}

        {docType === 'privacy' && (
          <>
            <section className="space-y-2">
              <h3 className="text-base font-semibold text-[#E5C99B]">1. Data We Collect</h3>
              <p>
                To create and secure your Didwana Bullion account, we collect your{' '}
                <strong>Full Name</strong>, <strong>Email Address</strong>,{' '}
                <strong>Mobile Number (+91)</strong>, and an{' '}
                <strong>encrypted (bcrypt) password hash</strong>. We also record your legal
                consent timestamp, device diagnostics (model, OS version, app version), and — with
                your explicit OS location permission — <strong>precise GPS coordinates</strong> and
                city/state metadata (or network IP region if GPS is declined).
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-[#E5C99B]">2. How We Use Your Data</h3>
              <p>
                Your information is used strictly for account authentication, JWT session security,
                Rajasthan mandi proximity verification, fraud prevention, and delivering access to
                the live 3-terminal bullion board &amp; newsroom. We perform{' '}
                <strong>zero third-party data selling</strong> and do not run ad trackers.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-[#E5C99B]">3. Retention &amp; Account Deletion</h3>
              <p>
                Your account data is retained while your account remains active. You may delete your
                account directly inside the Profile tab or contact New Monika Jewellers at{' '}
                <strong>{APP_INFO.contactPhone}</strong>.
              </p>
            </section>
          </>
        )}

        {docType === 'cookies' && (
          <>
            <section className="space-y-2">
              <h3 className="text-base font-semibold text-[#E5C99B]">
                1. Essential Storage (Always Active)
              </h3>
              <p>
                Used strictly to store your signed <strong>JWT authentication token</strong>,
                session state, and legal consent version so you remain securely signed in and
                protected against unauthorized access.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-semibold text-[#E5C99B]">
                2. Functional Preferences (Toggleable)
              </h3>
              <p>
                Stores your optional app preferences locally on your device: live tick audio
                mute/unmute state, default terminal tab (Jodhpur / Sujangarh / IBJA / Compare), and last
                selected chart timeframe (1D / 1W / 1M / 1Y).
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export function CookiePreferencesModal({
  open,
  cookiePrefs,
  onSave,
  onClose,
  onOpenDoc,
}) {
  const [functional, setFunctional] = useState(cookiePrefs?.functional ?? true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#181818] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#E5C99B]">
            <SlidersHorizontal className="h-5 w-5" />
            <h3 className="text-base font-semibold">Cookie &amp; Storage Preferences</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          Manage how Didwana Bullion uses local storage on your device. Read our{' '}
          <button
            type="button"
            onClick={() => onOpenDoc('cookies')}
            className="text-[#B59A6C] underline"
          >
            Cookies Policy
          </button>
          .
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#111111] p-3.5">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-100">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                Essential Storage
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                JWT authentication token &amp; session security state. Required for login.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 uppercase">
              Always Active
            </span>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#111111] p-3.5">
            <div>
              <div className="text-sm font-medium text-zinc-100">Functional Preferences</div>
              <p className="mt-1 text-xs text-zinc-400">
                Tick audio mute/unmute, default terminal filter &amp; last selected chart range.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={functional}
              onClick={() => setFunctional(!functional)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                functional ? 'bg-[#B59A6C]' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-[#111111] transition-transform ${
                  functional ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => onSave(false)}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-zinc-200 active:bg-white/10"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => onSave(functional)}
            className="flex-1 rounded-xl bg-[#B59A6C] py-2.5 text-xs font-semibold text-[#111111] active:opacity-90"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

export function FirstLaunchConsentBanner({ onAcceptAll, onManage, onOpenDoc }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 safe-bottom">
      <div className="mx-auto max-w-lg rounded-2xl border border-[#B59A6C]/30 bg-[#181818]/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#B59A6C]/15 p-2 text-[#B59A6C]">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-100">
              Cookies &amp; Legal Notice
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              We use essential storage for secure JWT login and optional functional storage for
              your terminal &amp; audio preferences. View{' '}
              <button
                type="button"
                onClick={() => onOpenDoc('terms')}
                className="text-[#E5C99B] underline"
              >
                Terms
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => onOpenDoc('privacy')}
                className="text-[#E5C99B] underline"
              >
                Privacy
              </button>{' '}
              &amp;{' '}
              <button
                type="button"
                onClick={() => onOpenDoc('cookies')}
                className="text-[#E5C99B] underline"
              >
                Cookies
              </button>
              .
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onManage}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-medium text-zinc-200"
              >
                Preferences
              </button>
              <button
                type="button"
                onClick={onAcceptAll}
                className="flex-1 rounded-xl bg-[#B59A6C] py-2 text-xs font-semibold text-[#111111]"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LegalComplianceCards({ onOpenDoc, onOpenCookiePrefs }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onOpenDoc('terms')}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] px-4 py-3 text-left active:opacity-80"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-[#8C6A2E] dark:text-[#C8A96E]" />
          <span className="text-sm text-zinc-800 dark:text-zinc-200">Terms &amp; Conditions</span>
        </div>
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      </button>

      <button
        type="button"
        onClick={() => onOpenDoc('privacy')}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] px-4 py-3 text-left active:opacity-80"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-[#8C6A2E] dark:text-[#C8A96E]" />
          <span className="text-sm text-zinc-800 dark:text-zinc-200">Privacy Policy</span>
        </div>
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      </button>

      <button
        type="button"
        onClick={onOpenCookiePrefs}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] px-4 py-3 text-left active:opacity-80"
      >
        <div className="flex items-center gap-3">
          <Cookie className="h-4 w-4 text-[#8C6A2E] dark:text-[#C8A96E]" />
          <span className="text-sm text-zinc-800 dark:text-zinc-200">
            Cookies &amp; Storage Preferences
          </span>
        </div>
        <span className="text-xs font-semibold text-[#8C6A2E] dark:text-[#C8A96E]">Manage</span>
      </button>
    </div>
  );
}
