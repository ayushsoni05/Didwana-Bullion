import React from 'react';
import {
  User,
  ShieldCheck,
  LogOut,
  Volume2,
  Phone,
  MapPin,
  Lock,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { APP_INFO, TERMINALS } from '../config/constants';
import { LegalComplianceCards } from './LegalScreens';

export default function AccountTab({
  user,
  prefs,
  onUpdatePrefs,
  onOpenDoc,
  onOpenCookiePrefs,
  onSignOut,
}) {
  const themeOptions = [
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-4 pb-28">
      {/* User Profile Card */}
      <div className="rounded-2xl border border-[#C8A96E]/35 bg-white dark:bg-gradient-to-br dark:from-[#18181D] dark:to-[#121216] p-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C8A96E]/20 text-[#8C6A2E] dark:text-[#DFC18A]">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-zinc-900 dark:text-[#F4EFE6]">
              {user?.name || 'Bullion Member'}
            </h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {user?.email || 'Authenticated User'}
            </p>
            {user?.phone && (
              <p className="text-xs font-medium text-[#8C6A2E] dark:text-[#C8A96E]">
                {user.phone}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            Verified
          </span>
        </div>
      </div>

      {/* Appearance (Light / Dark / System) */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] p-4 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold tracking-wider text-[#8C6A2E] dark:text-[#DFC18A] uppercase">
          Appearance
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = (prefs.theme || 'dark') === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdatePrefs({ theme: opt.id })}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
                  active
                    ? 'bg-gradient-to-r from-[#DFC18A] to-[#C8A96E] text-[#0B0B0D]'
                    : 'border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0B0D] text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Terminal & Audio Preferences */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] p-4 space-y-3.5 shadow-sm">
        <h3 className="text-xs font-bold tracking-wider text-[#8C6A2E] dark:text-[#DFC18A] uppercase">
          Terminal Preferences
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Volume2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                Live Tick Audio Chime
              </div>
              <div className="text-[11px] text-zinc-500">Play subtle tone on rate change</div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.tickAudio}
            onClick={() => onUpdatePrefs({ tickAudio: !prefs.tickAudio })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.tickAudio ? 'bg-[#C8A96E]' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#0B0B0D] transition-transform ${
                prefs.tickAudio ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="border-t border-zinc-100 dark:border-white/5 pt-3">
          <label className="mb-1.5 block text-xs text-zinc-500 dark:text-zinc-400">
            Default Terminal View
          </label>
          <select
            value={prefs.defaultTerminal}
            onChange={(e) => onUpdatePrefs({ defaultTerminal: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0B0D] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-200 focus:border-[#C8A96E] focus:outline-none"
          >
            {TERMINALS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legal & Privacy */}
      <div className="space-y-2">
        <h3 className="px-1 text-xs font-bold tracking-wider text-[#8C6A2E] dark:text-[#DFC18A] uppercase">
          Legal &amp; Privacy
        </h3>
        <LegalComplianceCards onOpenDoc={onOpenDoc} onOpenCookiePrefs={onOpenCookiePrefs} />
      </div>

      {/* Security & Showroom Info */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] p-4 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400 shadow-sm">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-200 font-semibold">
          <Lock className="h-4 w-4 text-[#8C6A2E] dark:text-[#C8A96E]" />
          Security &amp; Showroom Support
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <span>New Monika Jewellers, {APP_INFO.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <span>Support &amp; Account Deletion: {APP_INFO.contactPhone}</span>
        </div>
      </div>

      {/* Sign Out */}
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 text-sm font-bold text-red-600 dark:text-red-300 active:bg-red-500/20"
      >
        <LogOut className="h-4 w-4" />
        Sign Out Securely
      </button>
    </div>
  );
}
