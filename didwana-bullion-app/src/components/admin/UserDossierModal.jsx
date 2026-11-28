import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Send,
  ExternalLink,
  Bell,
  Clock,
  Crown,
  Save,
  Navigation,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { LuxurySelect } from '../ui/LuxurySelect';

export function UserDossierModal({ userId, onClose, onUpdated }) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [role, setRole] = useState('USER');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [showMapPreview, setShowMapPreview] = useState(false);

  const loadDossier = async () => {
    if (!userId) return;
    setLoading(true);
    setErr('');
    try {
      const res = await adminApi.getUserDossier(userId);
      setDossier(res);
      setRole(res.user?.role || 'USER');
      setIsBlocked(Boolean(res.user?.is_blocked));
      setBlockedReason(res.user?.blocked_reason || '');
      setAdminNotes(res.user?.admin_notes || '');
    } catch (e) {
      setErr(e.message || 'Unable to load user dossier.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setShowMapPreview(false);
    setMsg('');
    if (userId) loadDossier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSaveUser = async () => {
    setErr('');
    setMsg('');
    try {
      await adminApi.updateUser(userId, {
        role,
        isBlocked,
        blockedReason,
        adminNotes,
      });
      setMsg('User profile & moderation controls saved.');
      loadDossier();
      onUpdated?.();
    } catch (e) {
      setErr(e.message || 'Failed to update user.');
    }
  };

  const handleRevokeSessions = async () => {
    setErr('');
    setMsg('');
    try {
      await adminApi.revokeUserSessions(userId);
      setMsg('All active devices signed out immediately.');
      loadDossier();
      onUpdated?.();
    } catch (e) {
      setErr(e.message || 'Could not revoke sessions.');
    }
  };

  const handleSendNotice = async (e) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) return;
    setErr('');
    setMsg('');
    try {
      await adminApi.sendNotice({
        userId,
        title: noticeTitle.trim(),
        message: noticeMessage.trim(),
        severity: 'GOLD',
      });
      setNoticeTitle('');
      setNoticeMessage('');
      setMsg('Direct alert notice sent to user.');
      loadDossier();
    } catch (e2) {
      setErr(e2.message || 'Could not send notice.');
    }
  };

  const u = dossier?.user;
  const hasCoords =
    u && Number.isFinite(Number(u.last_latitude)) && Number.isFinite(Number(u.last_longitude));
  const lat = hasCoords ? Number(u.last_latitude) : null;
  const lng = hasCoords ? Number(u.last_longitude) : null;
  const dev = u?.last_device_info || {};

  return (
    <BottomSheetModal
      open={Boolean(userId)}
      onClose={onClose}
      title={u ? `User 360° • ${u.name}` : 'User 360° Inspector'}
    >
      {loading && !u ? (
        <div className="py-12 text-center text-xs text-zinc-400">Loading complete user dossier...</div>
      ) : err && !u ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          {err}
        </div>
      ) : (
        u && (
          <div className="space-y-4">
            {err && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {err}
              </div>
            )}
            {msg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {msg}
              </div>
            )}

            {/* Identity Snapshot */}
            <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-50 dark:bg-[#0B0907] p-3.5 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-serif-luxury text-base font-bold text-zinc-900 dark:text-[#E6CB94]">
                    {u.name}
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400">{u.email}</div>
                  <div className="font-mono-price font-semibold text-[#9A7422] dark:text-[#D4AF37]">
                    {u.phone}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      u.role === 'ADMIN'
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                        : 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {u.role === 'ADMIN' && <Crown className="h-3 w-3" />}
                    {u.role}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      u.is_blocked
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {u.is_blocked ? 'BLOCKED' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-white/10 text-[11px] text-zinc-500">
                <div>IP: <span className="font-mono-price text-zinc-200">{u.last_ip || 'N/A'}</span></div>
                <div>App: <span className="font-mono-price text-zinc-200">v{u.app_version || '—'}</span></div>
                <div>Joined: {new Date(u.created_at).toLocaleDateString('en-IN')}</div>
                <div>
                  Last Seen:{' '}
                  {u.last_seen_at
                    ? new Date(u.last_seen_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'}
                </div>
              </div>
            </div>

            {/* Precise GPS / Location Card */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#9A7422] dark:text-[#E6CB94]">
                  <MapPin className="h-4 w-4" />
                  Precise Location Telemetry
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    u.last_location_source === 'GPS'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {u.last_location_source || 'NONE'}
                </span>
              </div>

              {hasCoords || u.last_city ? (
                <>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                    <div>
                      <strong>City / State:</strong> {[u.last_city, u.last_state, u.last_pincode].filter(Boolean).join(', ') || 'Unknown'}
                    </div>
                    {u.last_address && (
                      <div className="mt-1 text-zinc-400">
                        <strong>Address:</strong> {u.last_address}
                      </div>
                    )}
                    {hasCoords && (
                      <div className="mt-1 font-mono-price text-[11px] text-[#D4AF37]">
                        Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                        {u.last_accuracy_m ? ` (±${Math.round(u.last_accuracy_m)}m)` : ''}
                      </div>
                    )}
                  </div>

                  {hasCoords && (
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E6CB94] to-[#C9A452] px-3 py-1.5 text-[11px] font-bold text-[#0B0907]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Google Maps
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowMapPreview(!showMapPreview)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-[11px] font-bold text-zinc-200"
                      >
                        <Navigation className="h-3.5 w-3.5 text-[#D4AF37]" />
                        {showMapPreview ? 'Hide Map' : 'Preview Pin'}
                      </button>
                    </div>
                  )}

                  {hasCoords && showMapPreview && (
                    <iframe
                      title="User GPS Map"
                      className="h-44 w-full rounded-xl border border-white/10"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${
                        lat - 0.01
                      },${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`}
                    />
                  )}
                </>
              ) : (
                <div className="text-[11px] text-zinc-500">No location telemetry recorded yet.</div>
              )}

              {/* Location Ping Trail */}
              {dossier?.locations?.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1.5 max-h-36 overflow-y-auto">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Location Ping History ({dossier.locations.length})
                  </div>
                  {dossier.locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[10px]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-zinc-200">
                          {loc.source} • {[loc.city, loc.state].filter(Boolean).join(', ') || 'Coords Only'}
                        </div>
                        <div className="font-mono-price text-zinc-400">
                          {loc.latitude ? `${Number(loc.latitude).toFixed(4)}, ${Number(loc.longitude).toFixed(4)}` : loc.ip_address}
                        </div>
                      </div>
                      <span className="shrink-0 text-zinc-500">
                        {new Date(loc.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hardware & Device Diagnostics */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] p-3.5 space-y-2 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                <Smartphone className="h-4 w-4 text-[#D4AF37]" />
                Device &amp; Hardware Specs
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-zinc-400">
                <div>Model: <span className="text-zinc-200">{dev.manufacturer ? `${dev.manufacturer} ` : ''}{dev.model || 'Unknown'}</span></div>
                <div>OS: <span className="text-zinc-200">{dev.operatingSystem || dev.platform || '—'} {dev.osVersion || ''}</span></div>
                <div>Screen: <span className="text-zinc-200">{dev.screen || '—'}</span></div>
                <div>
                  Battery:{' '}
                  <span className="text-zinc-200">
                    {dev.batteryLevel !== null && dev.batteryLevel !== undefined
                      ? `${Math.round(dev.batteryLevel * 100)}%${dev.isCharging ? ' ⚡' : ''}`
                      : '—'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-zinc-400">
                  Sessions: <strong>{dossier?.sessions?.filter((s) => !s.revoked_at).length || 0} active</strong> • Alerts: <strong>{dossier?.alerts?.length || 0}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleRevokeSessions}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-[10px] font-bold text-rose-400"
                >
                  <LogOut className="h-3 w-3" />
                  Force Logout All
                </button>
              </div>
            </div>

            {/* Admin Moderation Controls */}
            <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-50 dark:bg-[#0B0907] p-3.5 space-y-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#9A7422] dark:text-[#E6CB94]">
                <ShieldCheck className="h-4 w-4" />
                Account Control &amp; Notes
              </div>

              <div className="grid grid-cols-2 gap-2">
                <LuxurySelect
                  label="Role"
                  value={role}
                  onChange={setRole}
                  options={[
                    { value: 'USER', label: 'USER (Member)' },
                    { value: 'ADMIN', label: 'ADMIN (Owner/Staff)' },
                  ]}
                />
                <div>
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                    Access Status
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBlocked(!isBlocked)}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold ${
                      isBlocked
                        ? 'border-rose-500/40 bg-rose-500/15 text-rose-400'
                        : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {isBlocked ? 'Blocked (Tap Unblock)' : 'Active (Tap Block)'}
                  </button>
                </div>
              </div>

              {isBlocked && (
                <input
                  type="text"
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="Suspension reason shown to user"
                  className="w-full rounded-xl border border-rose-500/30 bg-white dark:bg-[#15100B] px-3 py-2 text-xs text-zinc-100"
                />
              )}

              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Private admin CRM notes (KYC / bullion desk notes)..."
                className="w-full rounded-xl border border-white/10 bg-white dark:bg-[#15100B] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
              />

              <button
                type="button"
                onClick={handleSaveUser}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E6CB94] to-[#C9A452] py-2.5 text-xs font-bold text-[#0B0907]"
              >
                <Save className="h-3.5 w-3.5" />
                Save Moderation &amp; Notes
              </button>
            </div>

            {/* Send Direct Pop-up Notice */}
            <form
              onSubmit={handleSendNotice}
              className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] p-3.5 space-y-2 text-xs"
            >
              <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                <Bell className="h-4 w-4 text-[#D4AF37]" />
                Send Direct Alert to {u.name}
              </div>
              <input
                type="text"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="Notice title (e.g., Booking Confirmation)"
                className="w-full rounded-xl border border-white/10 bg-white dark:bg-[#15100B] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
              />
              <textarea
                rows={2}
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                placeholder="Direct message delivered inside user's app..."
                className="w-full rounded-xl border border-white/10 bg-white dark:bg-[#15100B] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 py-2 text-xs font-bold text-[#D4AF37]"
              >
                <Send className="h-3.5 w-3.5" />
                Send Direct Notice
              </button>
            </form>

            {/* Recent Audit Logs */}
            {dossier?.auditLogs?.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#0B0907] p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <Clock className="h-3 w-3" />
                  User Activity Log ({dossier.auditLogs.length})
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 text-[10px]">
                  {dossier.auditLogs.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-zinc-400">
                      <span className="truncate font-medium text-zinc-200">
                        {l.event_type} {l.details ? `• ${l.details}` : ''}
                      </span>
                      <span className="shrink-0 ml-2">
                        {new Date(l.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </BottomSheetModal>
  );
}
