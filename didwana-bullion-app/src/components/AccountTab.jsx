import React, { useState } from 'react';
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
  KeyRound,
  Smartphone,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { APP_INFO } from '../config/constants';
import { authApi } from '../services/api';
import { LegalComplianceCards } from './LegalScreens';
import { LuxurySelect } from './ui/LuxurySelect';

export default function AccountTab({
  user,
  prefs,
  onUpdatePrefs,
  onOpenDoc,
  onOpenCookiePrefs,
  onSignOut,
  isAdmin = false,
  onOpenAdminPanel,
  siteConfig,
}) {
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  const themeOptions = [
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwErr('');
    setPwMsg('');
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      setPwMsg(res.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwErr(err.message || 'Could not update password.');
    }
  };

  const toggleSessions = async () => {
    const next = !showSessions;
    setShowSessions(next);
    if (next) {
      try {
        const [sRes, aRes] = await Promise.allSettled([
          authApi.getSessions(),
          authApi.getAuditLogs(),
        ]);
        if (sRes.status === 'fulfilled') setSessions(sRes.value?.sessions || []);
        if (aRes.status === 'fulfilled') setAuditLogs(aRes.value?.logs || []);
      } catch {
        // Ignore
      }
    }
  };

  const handleLogoutAll = async () => {
    await authApi.logoutAll().catch(() => null);
    onSignOut();
  };

  const handleExportData = () => {
    const blob = new Blob(
      [JSON.stringify({ user, prefs, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'didwana-bullion-account-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    try {
      await authApi.deleteAccount();
      onSignOut();
    } catch {
      setConfirmDelete(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${APP_INFO.githubRepo}/releases/latest`
      );
      const data = await res.json();
      const latestTag = String(data.tag_name || '').replace(/^v/, '');
      const apkAsset = (data.assets || []).find((a) => String(a.name).endsWith('.apk'));
      setUpdateInfo({
        latest: latestTag || APP_INFO.appVersion,
        isNewer: Boolean(latestTag && latestTag !== APP_INFO.appVersion),
        url: apkAsset?.browser_download_url || data.html_url,
      });
    } catch {
      setUpdateInfo({ latest: APP_INFO.appVersion, isNewer: false });
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Rich Profile Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-white dark:bg-[#10141F] p-4 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6CB94]/60 to-transparent" />
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4AF37]/15 text-[#9A7422] dark:text-[#E6CB94]">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif-luxury truncate text-lg font-bold text-zinc-900 dark:text-[#E6CB94]">
              {user?.name || 'Bullion Member'}
            </h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {user?.email || 'Authenticated User'}
            </p>
            {user?.phone && (
              <p className="font-mono-price text-xs font-medium text-[#9A7422] dark:text-[#D4AF37]">
                {user.phone}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            v{APP_INFO.appVersion}
          </span>
        </div>
      </div>

      {/* Admin Command Center Quick Card */}
      {isAdmin && (
        <button
          type="button"
          onClick={onOpenAdminPanel}
          className="flex w-full items-center justify-between rounded-2xl border border-[#D4AF37]/45 bg-gradient-to-r from-[#171C2B] to-[#0D111A] p-4 text-left shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/20 text-[#E6CB94]">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="font-serif-luxury text-sm font-bold text-[#E6CB94]">
                Dedicated Admin Command Center
              </div>
              <div className="text-[11px] text-zinc-400">
                Users, GPS Location, Newsroom CMS &amp; Live Website Controls
              </div>
            </div>
          </div>
          <span className="rounded-full bg-[#D4AF37] px-2.5 py-1 text-[10px] font-bold text-[#07090F]">
            OPEN
          </span>
        </button>
      )}

      {/* Showroom Desk (Call & WhatsApp like HB Jodhpur) */}
      <div className="rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#10141F] p-4 space-y-3 shadow-sm">
        <h3 className="font-serif-luxury text-sm font-bold text-[#9A7422] dark:text-[#E6CB94]">
          New Monika Jewellers — Trade Desk
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:${(siteConfig?.contactPhone || APP_INFO.contactPhone).replace(/\s+/g, '')}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#07090F] py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200"
          >
            <Phone className="h-3.5 w-3.5 text-[#D4AF37]" />
            Call Desk
          </a>
          <a
            href={`https://wa.me/${String(siteConfig?.whatsappNumber || APP_INFO.whatsappPhone || '919351214851').replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600/15 border border-emerald-500/30 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp Desk
          </a>
        </div>
        <div className="flex items-start gap-2 text-[11px] text-zinc-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
          <span>{siteConfig?.showroomAddress || APP_INFO.address}</span>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] p-4 space-y-3 shadow-sm">
        <h3 className="text-[11px] font-bold tracking-[0.16em] text-[#9A7422] dark:text-[#D4AF37] uppercase">
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
                    ? 'bg-gradient-to-r from-[#E6CB94] to-[#C9A452] text-[#07090F]'
                    : 'border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#07090F] text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Dropdown Terminal & Unit Preferences */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] p-4 space-y-3.5 shadow-sm">
        <h3 className="text-[11px] font-bold tracking-[0.16em] text-[#9A7422] dark:text-[#D4AF37] uppercase">
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
              prefs.tickAudio ? 'bg-[#D4AF37]' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#07090F] transition-transform ${
                prefs.tickAudio ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <LuxurySelect
            label="Default Terminal"
            value={prefs.defaultTerminal || 'HB'}
            onChange={(val) => onUpdatePrefs({ defaultTerminal: val })}
            options={[
              { value: 'HB', label: 'Jodhpur Rates' },
              { value: 'MOSUN', label: 'Sujangarh Rates' },
              { value: 'IBJA', label: 'IBJA Rates' },
              { value: 'COMPARE', label: 'Compare All 3' },
            ]}
          />
          <LuxurySelect
            label="Default Unit"
            value={prefs.unit || '10g'}
            onChange={(val) => onUpdatePrefs({ unit: val })}
            options={[
              { value: '10g', label: '10 Grams' },
              { value: '1g', label: '1 Gram' },
              { value: 'tola', label: '1 Tola' },
            ]}
          />
        </div>
      </div>

      {/* Security Center */}
      <div className="rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#10141F] p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold tracking-[0.16em] text-[#9A7422] dark:text-[#D4AF37] uppercase">
            Security Center (FLAG_SECURE + PostgreSQL)
          </h3>
          <Lock className="h-3.5 w-3.5 text-emerald-500" />
        </div>

        <button
          type="button"
          onClick={() => setShowChangePw(!showChangePw)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
        >
          <span className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-[#D4AF37]" />
            Change Password
          </span>
          {showChangePw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showChangePw && (
          <form onSubmit={handleChangePassword} className="space-y-2.5 rounded-xl bg-zinc-50 dark:bg-[#07090F] p-3">
            {pwErr && <p className="text-xs text-red-400">{pwErr}</p>}
            {pwMsg && <p className="text-xs text-emerald-400">{pwMsg}</p>}
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] px-3 py-2 text-xs"
            />
            <input
              type="password"
              placeholder="New strong password (8+ chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[#D4AF37] py-2 text-xs font-bold text-[#07090F]"
            >
              Update Password
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={toggleSessions}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
        >
          <span className="flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-[#D4AF37]" />
            Active Devices &amp; Security Log
          </span>
          {showSessions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showSessions && (
          <div className="space-y-2 rounded-xl bg-zinc-50 dark:bg-[#07090F] p-3 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-400 uppercase">Sessions ({sessions.length})</span>
              <button
                type="button"
                onClick={handleLogoutAll}
                className="font-bold text-red-400 underline"
              >
                Sign Out All Devices
              </button>
            </div>
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-t border-white/5 pt-1.5">
                <span className="truncate max-w-[200px] text-zinc-300">
                  {s.isCurrent ? '• This Device' : s.device_name}
                </span>
                <span className="text-zinc-500">
                  {new Date(s.last_active_at).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
            {auditLogs.length > 0 && (
              <div className="border-t border-white/10 pt-2">
                <div className="mb-1 font-bold text-zinc-400 uppercase">Recent Activity</div>
                {auditLogs.slice(0, 4).map((l) => (
                  <div key={l.id} className="flex justify-between text-[10px] text-zinc-400">
                    <span>{l.event_type}</span>
                    <span>{new Date(l.created_at).toLocaleTimeString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleExportData}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
        >
          <span className="flex items-center gap-2">
            <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
            Export My Account Data (JSON)
          </span>
        </button>

        {/* In-App Update Checker */}
        <button
          type="button"
          onClick={handleCheckUpdate}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
        >
          <span className="flex items-center gap-2">
            <RefreshCw className={`h-3.5 w-3.5 text-[#D4AF37] ${checkingUpdate ? 'animate-spin' : ''}`} />
            Check for App Update (v{APP_INFO.appVersion})
          </span>
          <span className="text-[10px] text-zinc-400">In-Place APK</span>
        </button>

        {updateInfo && (
          <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-3 text-xs">
            {updateInfo.isNewer ? (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#E6CB94]">
                  New version v{updateInfo.latest} ready!
                </span>
                <a
                  href={updateInfo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-[#D4AF37] px-3 py-1 text-[11px] font-bold text-[#07090F]"
                >
                  Update Now
                </a>
              </div>
            ) : (
              <span className="text-emerald-400 font-medium">
                You are on the latest version (v{APP_INFO.appVersion}).
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legal & Privacy */}
      <div className="space-y-2">
        <h3 className="px-1 text-[11px] font-bold tracking-[0.16em] text-[#9A7422] dark:text-[#D4AF37] uppercase">
          Legal &amp; Privacy
        </h3>
        <LegalComplianceCards onOpenDoc={onOpenDoc} onOpenCookiePrefs={onOpenCookiePrefs} />
      </div>

      {/* Sign Out & Delete Account */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 text-sm font-bold text-red-600 dark:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Sign Out Securely
        </button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-1.5 py-2 text-xs text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Permanently Delete Account
          </button>
        ) : (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-center space-y-2">
            <p className="text-xs text-red-300">
              Delete your PostgreSQL account, sessions, and alerts permanently?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl border border-white/15 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-bold text-white"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
