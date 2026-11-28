import React, { useEffect, useState } from 'react';
import {
  Crown,
  Users,
  Newspaper,
  Sliders,
  ShieldAlert,
  LayoutDashboard,
  Search,
  MapPin,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Pin,
  Eye,
  EyeOff,
  Save,
  Megaphone,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { LuxurySelect } from './ui/LuxurySelect';
import { UserDossierModal } from './admin/UserDossierModal';

const ADMIN_TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'users', label: 'Users & GPS', Icon: Users },
  { id: 'news', label: 'News CMS', Icon: Newspaper },
  { id: 'site', label: 'Site Control', Icon: Sliders },
  { id: 'audit', label: 'Audit & Alerts', Icon: ShieldAlert },
];

export default function AdminPanel({ siteConfig, onSiteConfigSaved, onNewsChanged }) {
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  // Overview state
  const [overview, setOverview] = useState({ stats: {}, cities: [], recentAudit: [] });

  // Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUserId, setSelectedUserId] = useState(null);

  // News CMS state
  const [newsList, setNewsList] = useState([]);
  const [newsForm, setNewsForm] = useState({
    id: null,
    title: '',
    summary: '',
    content: '',
    category: 'GOLD_OUTLOOK',
    impact: 'NEUTRAL',
    priority: 'NORMAL',
    imageUrl: '',
    isPinned: false,
    isPublished: true,
  });
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Site Config state
  const [configDraft, setConfigDraft] = useState(siteConfig || {});

  // Audit & Alerts state
  const [auditLogs, setAuditLogs] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);

  useEffect(() => {
    if (siteConfig) setConfigDraft(siteConfig);
  }, [siteConfig]);

  const loadSectionData = async (target = section) => {
    setLoading(true);
    setErrMsg('');
    try {
      if (target === 'overview') {
        const res = await adminApi.getOverview();
        setOverview(res);
      } else if (target === 'users') {
        const res = await adminApi.getUsers({
          q: userSearch,
          role: roleFilter,
          status: statusFilter,
        });
        setUsers(res.users || []);
      } else if (target === 'news') {
        const res = await adminApi.listNews();
        setNewsList(res.news || []);
      } else if (target === 'site') {
        const res = await adminApi.getSiteConfig();
        if (res?.config) setConfigDraft(res.config);
      } else if (target === 'audit') {
        const [aRes, alRes] = await Promise.all([
          adminApi.getAuditLogs(),
          adminApi.getAllAlerts(),
        ]);
        setAuditLogs(aRes.logs || []);
        setAllAlerts(alRes.alerts || []);
      }
    } catch (e) {
      setErrMsg(e.message || 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSectionData(section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const handleSearchUsers = (e) => {
    e?.preventDefault?.();
    loadSectionData('users');
  };

  const handleExportUsers = async () => {
    try {
      const res = await adminApi.exportUsers();
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `didwana-bullion-users-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg(`Exported ${res.count || 0} user profiles with location metadata.`);
    } catch (e) {
      setErrMsg(e.message || 'Export failed.');
    }
  };

  const handleSaveNews = async (e) => {
    e.preventDefault();
    if (!newsForm.title.trim() || !newsForm.content.trim()) {
      setErrMsg('Article title and content are required.');
      return;
    }
    setErrMsg('');
    setStatusMsg('');
    try {
      if (newsForm.id) {
        await adminApi.updateNews(newsForm.id, newsForm);
        setStatusMsg('Article updated live.');
      } else {
        await adminApi.createNews(newsForm);
        setStatusMsg('Bulletin published directly to News tab!');
      }
      setNewsForm({
        id: null,
        title: '',
        summary: '',
        content: '',
        category: 'GOLD_OUTLOOK',
        impact: 'NEUTRAL',
        priority: 'NORMAL',
        imageUrl: '',
        isPinned: false,
        isPublished: true,
      });
      await loadSectionData('news');
      onNewsChanged?.();
    } catch (e2) {
      setErrMsg(e2.message || 'Could not save news post.');
    }
  };

  const handleToggleNewsFlag = async (post, field, value) => {
    try {
      await adminApi.updateNews(post.id, { [field]: value });
      loadSectionData('news');
      onNewsChanged?.();
    } catch (e) {
      setErrMsg(e.message || 'Could not update article.');
    }
  };

  const handleDeleteNews = async (id) => {
    try {
      await adminApi.deleteNews(id);
      setNewsList((prev) => prev.filter((n) => n.id !== id));
      setStatusMsg('Article deleted.');
      onNewsChanged?.();
    } catch (e) {
      setErrMsg(e.message || 'Delete failed.');
    }
  };

  const handleBroadcastNotice = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    try {
      await adminApi.sendNotice({
        userId: null,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        severity: 'GOLD',
      });
      setBroadcastTitle('');
      setBroadcastMessage('');
      setStatusMsg('Broadcast pop-up alert sent to all connected users.');
    } catch (e2) {
      setErrMsg(e2.message || 'Broadcast failed.');
    }
  };

  const handleSaveSiteConfig = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setStatusMsg('');
    try {
      const payload = {
        ...configDraft,
        hbGoldOffset: Number(configDraft.hbGoldOffset || 0),
        hbSilverOffset: Number(configDraft.hbSilverOffset || 0),
        mosunGoldOffset: Number(configDraft.mosunGoldOffset || 0),
        mosunSilverOffset: Number(configDraft.mosunSilverOffset || 0),
        ibjaGoldOffset: Number(configDraft.ibjaGoldOffset || 0),
      };
      const res = await adminApi.updateSiteConfig(payload);
      if (res?.config) {
        setConfigDraft(res.config);
        onSiteConfigSaved?.(res.config);
      }
      setStatusMsg('Website & App live settings saved and pushed!');
    } catch (e2) {
      setErrMsg(e2.message || 'Unable to save site settings.');
    }
  };

  const st = overview.stats || {};

  return (
    <div className="space-y-4 pb-28">
      {/* Executive Admin Header */}
      <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/45 bg-gradient-to-br from-[#1F160D] via-[#15100B] to-[#0B0907] p-4 shadow-lg text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6CB94] to-transparent" />
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
              <Crown className="h-3.5 w-3.5" />
              Executive Command Center
            </div>
            <h2 className="font-serif-luxury mt-1 text-xl font-bold text-[#E6CB94]">
              Didwana Bullion Admin Portal
            </h2>
          </div>
          <button
            type="button"
            onClick={() => loadSectionData(section)}
            className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-2 text-[#E6CB94]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Sub-Module Switcher */}
        <div className="mt-3.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {ADMIN_TABS.map(({ id, label, Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition ${
                  active
                    ? 'bg-gradient-to-r from-[#E6CB94] to-[#C9A452] text-[#0B0907]'
                    : 'border border-white/10 bg-white/5 text-zinc-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
          ✓ {statusMsg}
        </div>
      )}
      {errMsg && (
        <div className="rounded-2xl border border-rose-500/35 bg-rose-500/15 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
          {errMsg}
        </div>
      )}

      {/* 1. OVERVIEW */}
      {section === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: 'Total Users', val: st.total_users ?? 0, tone: 'text-[#E6CB94]' },
              { label: 'Online Now (15m)', val: st.online_now ?? 0, tone: 'text-emerald-400' },
              { label: 'Active 24h', val: st.active_24h ?? 0, tone: 'text-sky-400' },
              { label: 'GPS Verified', val: st.gps_verified_users ?? 0, tone: 'text-[#D4AF37]' },
              { label: 'Active Sessions', val: st.active_sessions ?? 0, tone: 'text-zinc-200' },
              { label: 'Price Alerts', val: st.active_alerts ?? 0, tone: 'text-amber-400' },
              { label: 'Published News', val: st.published_news ?? 0, tone: 'text-emerald-400' },
              { label: 'Blocked Users', val: st.blocked_users ?? 0, tone: 'text-rose-400' },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-3.5 shadow-sm"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {kpi.label}
                </div>
                <div className={`font-mono-price mt-1 text-xl font-bold ${kpi.tone}`}>
                  {kpi.val}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Geographic Distribution */}
            <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]">
                <MapPin className="h-4 w-4" />
                User City Distribution
              </div>
              {overview.cities?.length ? (
                <div className="space-y-2">
                  {overview.cities.map((c, idx) => (
                    <div
                      key={`${c.city}-${idx}`}
                      className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {c.city}
                        {c.state ? `, ${c.state}` : ''}
                      </span>
                      <span className="font-mono-price font-bold text-[#D4AF37]">
                        {c.user_count} users
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No geographic telemetry recorded yet.</p>
              )}
            </div>

            {/* Recent Security Events */}
            <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-4 space-y-2.5">
              <div className="text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]">
                Recent Activity Feed
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {(overview.recentAudit || []).map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-[11px]"
                  >
                    <div className="flex items-center justify-between font-bold text-zinc-800 dark:text-zinc-200">
                      <span>{a.event_type}</span>
                      <span className="font-mono-price text-[10px] text-zinc-400">
                        {new Date(a.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="truncate text-zinc-500">
                      {a.user_name || a.user_email || a.ip_address || 'System'} • {a.details}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. USERS & PRECISE GPS INSPECTOR */}
      {section === 'users' && (
        <div className="space-y-3">
          <form
            onSubmit={handleSearchUsers}
            className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-4 space-y-3"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name, phone, email, city, IP..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] py-2 pl-9 pr-3 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[#E6CB94] to-[#C9A452] px-4 py-2 text-xs font-bold text-[#0B0907]"
              >
                Find
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
              <LuxurySelect
                label="Role"
                value={roleFilter}
                onChange={(v) => {
                  setRoleFilter(v);
                }}
                options={[
                  { value: 'ALL', label: 'All Roles' },
                  { value: 'USER', label: 'Users' },
                  { value: 'ADMIN', label: 'Admins' },
                ]}
              />
              <LuxurySelect
                label="Status"
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                }}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'ONLINE', label: 'Online (15m)' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'BLOCKED', label: 'Blocked' },
                ]}
              />
              <button
                type="button"
                onClick={handleExportUsers}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 py-2.5 text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </button>
            </div>
          </form>

          <div className="space-y-2.5">
            {users.map((u) => {
              const online =
                u.last_seen_at && Date.now() - new Date(u.last_seen_at).getTime() < 15 * 60 * 1000;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-3.5 text-left transition hover:border-[#D4AF37]/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            u.is_blocked
                              ? 'bg-rose-500'
                              : online
                              ? 'animate-pulse bg-emerald-400'
                              : 'bg-zinc-500'
                          }`}
                        />
                        <span className="font-serif-luxury truncate text-sm font-bold text-zinc-900 dark:text-[#F4EFE6]">
                          {u.name}
                        </span>
                        {u.role === 'ADMIN' && (
                          <span className="rounded-full bg-[#D4AF37]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#D4AF37]">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {u.phone} • {u.email}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-[#0B0907] px-2.5 py-1 text-zinc-600 dark:text-zinc-300">
                      <MapPin className="h-3 w-3 text-[#D4AF37]" />
                      {u.last_city
                        ? `${u.last_city}${u.last_state ? `, ${u.last_state}` : ''}`
                        : u.last_ip || 'No Location'}
                      {u.last_location_source ? ` (${u.last_location_source})` : ''}
                    </span>
                    {u.last_latitude && (
                      <span className="font-mono-price rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-500">
                        {Number(u.last_latitude).toFixed(3)}, {Number(u.last_longitude).toFixed(3)}
                      </span>
                    )}
                    <span className="rounded-full bg-zinc-100 dark:bg-[#0B0907] px-2 py-1 text-zinc-400">
                      Sessions: {u.active_sessions_count || 0} • Alerts: {u.active_alerts_count || 0}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. NEWSROOM CMS */}
      {section === 'news' && (
        <div className="space-y-4">
          <form
            onSubmit={handleSaveNews}
            className="rounded-3xl border border-[#D4AF37]/30 bg-white dark:bg-[#15100B] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]">
                <Plus className="h-4 w-4" />
                {newsForm.id ? 'Edit News Bulletin' : 'Publish New Bulletin to News Tab'}
              </div>
              {newsForm.id && (
                <button
                  type="button"
                  onClick={() =>
                    setNewsForm({
                      id: null,
                      title: '',
                      summary: '',
                      content: '',
                      category: 'GOLD_OUTLOOK',
                      impact: 'NEUTRAL',
                      priority: 'NORMAL',
                      imageUrl: '',
                      isPinned: false,
                      isPublished: true,
                    })
                  }
                  className="text-[11px] font-bold text-zinc-400 underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <input
              type="text"
              value={newsForm.title}
              onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
              placeholder="Headline (e.g., Gold 24K Surges After Fed Minutes)"
              className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2.5 text-xs text-zinc-900 dark:text-zinc-100"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <LuxurySelect
                label="Category"
                value={newsForm.category}
                onChange={(v) => setNewsForm({ ...newsForm, category: v })}
                options={[
                  { value: 'GOLD_OUTLOOK', label: 'Gold Outlook' },
                  { value: 'SILVER_TREND', label: 'Silver Trend' },
                  { value: 'RBI_MACRO', label: 'RBI / Macro' },
                  { value: 'MCX_COMEX', label: 'MCX / COMEX' },
                  { value: 'SHOWROOM_NOTICE', label: 'Showroom Notice' },
                ]}
              />
              <LuxurySelect
                label="Market Impact"
                value={newsForm.impact}
                onChange={(v) => setNewsForm({ ...newsForm, impact: v })}
                options={[
                  { value: 'BULLISH', label: 'Bullish (↑)' },
                  { value: 'BEARISH', label: 'Bearish (↓)' },
                  { value: 'NEUTRAL', label: 'Neutral (•)' },
                ]}
              />
              <LuxurySelect
                label="Priority"
                value={newsForm.priority}
                onChange={(v) => setNewsForm({ ...newsForm, priority: v })}
                options={[
                  { value: 'NORMAL', label: 'Standard' },
                  { value: 'FEATURED', label: 'Featured' },
                  { value: 'BREAKING', label: 'Breaking Flash' },
                ]}
              />
            </div>

            <input
              type="text"
              value={newsForm.summary}
              onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
              placeholder="Short summary (optional — auto-trimmed if left blank)"
              className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            />

            <textarea
              rows={4}
              value={newsForm.content}
              onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
              placeholder="Full article dispatch, market analysis, or showroom advisory..."
              className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            />

            <input
              type="url"
              value={newsForm.imageUrl}
              onChange={(e) => setNewsForm({ ...newsForm, imageUrl: e.target.value })}
              placeholder="Optional Cover Image URL (https://...)"
              className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            />

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newsForm.isPinned}
                  onChange={(e) => setNewsForm({ ...newsForm, isPinned: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                Pin to top of News tab
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newsForm.isPublished}
                  onChange={(e) => setNewsForm({ ...newsForm, isPublished: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                Publish immediately
              </label>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E6CB94] to-[#C9A452] py-2.5 text-xs font-bold text-[#0B0907]"
            >
              <Save className="h-4 w-4" />
              {newsForm.id ? 'Update Article' : 'Publish to News Tab'}
            </button>
          </form>

          {/* Broadcast Global Notice */}
          <form
            onSubmit={handleBroadcastNotice}
            className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-4 space-y-2.5"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]">
              <Megaphone className="h-4 w-4" />
              Broadcast Direct Pop-Up to All Users
            </div>
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Broadcast Title"
              className="w-full rounded-xl border border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs"
            />
            <textarea
              rows={2}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Message shown immediately inside every logged-in user's app..."
              className="w-full rounded-xl border border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 py-2 text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]"
            >
              <Bell className="h-3.5 w-3.5" />
              Broadcast Pop-Up Notice
            </button>
          </form>

          {/* Manage Existing Posts */}
          <div className="space-y-2">
            {newsList.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {post.priority === 'BREAKING' ? '🔥 ' : ''}
                      {post.title}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {post.category} • {post.impact} • {post.views_count || 0} views
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleNewsFlag(post, 'isPinned', !post.is_pinned)}
                      aria-label="Toggle Pin"
                      className={`rounded-lg p-1.5 ${
                        post.is_pinned ? 'text-[#D4AF37]' : 'text-zinc-400'
                      }`}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleNewsFlag(post, 'isPublished', !post.is_published)}
                      aria-label="Toggle Publish"
                      className={`rounded-lg p-1.5 ${
                        post.is_published ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      {post.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewsForm({
                          id: post.id,
                          title: post.title,
                          summary: post.summary,
                          content: post.content,
                          category: post.category,
                          impact: post.impact,
                          priority: post.priority,
                          imageUrl: post.image_url || '',
                          isPinned: Boolean(post.is_pinned),
                          isPublished: Boolean(post.is_published),
                        })
                      }
                      className="rounded-lg px-2 py-1 text-[10px] font-bold text-[#D4AF37]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNews(post.id)}
                      aria-label="Delete post"
                      className="rounded-lg p-1.5 text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FULL SITE & APP CONTROL */}
      {section === 'site' && (
        <form onSubmit={handleSaveSiteConfig} className="space-y-4">
          {/* Flash Ticker Banner */}
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9A7422] dark:text-[#E6CB94]">
              Flash Announcement Bar
            </h3>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={Boolean(configDraft.flashBannerEnabled)}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, flashBannerEnabled: e.target.checked })
                }
                className="accent-[#D4AF37]"
              />
              Show Live Announcement Banner on Home Screen
            </label>
            <input
              type="text"
              value={configDraft.flashBannerText || ''}
              onChange={(e) =>
                setConfigDraft({ ...configDraft, flashBannerText: e.target.value })
              }
              placeholder="e.g., Dhanteras Special: Zero Making on 24K Bars till 8 PM"
              className="w-full rounded-xl border border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs"
            />
          </div>

          {/* Live Rate Adjustments & Freeze */}
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9A7422] dark:text-[#E6CB94]">
              Live Rate Spreads &amp; Market Controls (₹)
            </h3>
            <label className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <input
                type="checkbox"
                checked={Boolean(configDraft.ratesFrozen)}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, ratesFrozen: e.target.checked })
                }
                className="accent-[#D4AF37]"
              />
              Freeze Live Rates Display (Hold Last Quote)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              {[
                { key: 'hbGoldOffset', label: 'Jodhpur Gold (±₹)' },
                { key: 'hbSilverOffset', label: 'Jodhpur Silver (±₹)' },
                { key: 'mosunGoldOffset', label: 'Sujangarh Gold (±₹)' },
                { key: 'mosunSilverOffset', label: 'Sujangarh Silver (±₹)' },
                { key: 'ibjaGoldOffset', label: 'IBJA Gold (±₹)' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-zinc-400">{f.label}</label>
                  <input
                    type="number"
                    value={configDraft[f.key] ?? 0}
                    onChange={(e) => setConfigDraft({ ...configDraft, [f.key]: e.target.value })}
                    className="font-mono-price w-full rounded-xl border border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-2.5 py-2 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Showroom Contacts & Feature Toggles */}
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-4 space-y-3 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9A7422] dark:text-[#E6CB94]">
              Showroom Desk, Feature Switches &amp; Maintenance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">Contact Phone</label>
                <input
                  type="text"
                  value={configDraft.contactPhone || ''}
                  onChange={(e) => setConfigDraft({ ...configDraft, contactPhone: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">WhatsApp Number</label>
                <input
                  type="text"
                  value={configDraft.whatsappNumber || ''}
                  onChange={(e) =>
                    setConfigDraft({ ...configDraft, whatsappNumber: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              {[
                { key: 'enableNews', label: 'Enable News Tab' },
                { key: 'enableCharts', label: 'Enable Charts Tab' },
                { key: 'enableCalculator', label: 'Enable Calculator' },
                { key: 'enableAlerts', label: 'Enable Price Alerts' },
                { key: 'registrationsOpen', label: 'Allow New Signups' },
                { key: 'maintenanceMode', label: 'Maintenance Mode' },
              ].map((t) => (
                <label
                  key={t.key}
                  className="flex items-center gap-2 rounded-xl bg-zinc-50 dark:bg-[#0B0907] px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(configDraft[t.key])}
                    onChange={(e) =>
                      setConfigDraft({ ...configDraft, [t.key]: e.target.checked })
                    }
                    className="accent-[#D4AF37]"
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>

            {configDraft.maintenanceMode && (
              <input
                type="text"
                value={configDraft.maintenanceMessage || ''}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, maintenanceMessage: e.target.value })
                }
                placeholder="Maintenance notice displayed to non-admin users"
                className="w-full rounded-xl border border-rose-500/30 bg-[#0B0907] px-3 py-2 text-xs"
              />
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E6CB94] to-[#C9A452] py-3 text-xs font-bold text-[#0B0907]"
            >
              <Save className="h-4 w-4" />
              Save Live Website &amp; App Config
            </button>
          </div>
        </form>
      )}

      {/* 5. GLOBAL AUDIT LOGS & ALERTS */}
      {section === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]">
              Active User Price Alerts ({allAlerts.length})
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-1.5 text-[11px]">
              {allAlerts.map((al) => (
                <div
                  key={al.id}
                  className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-[#0B0907] px-3 py-2"
                >
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {al.user_name}
                    </span>{' '}
                    <span className="text-zinc-500">({al.user_phone})</span>
                    <div className="text-[10px] text-zinc-400">
                      {al.terminal} • {al.metal_key} {al.condition} ₹
                      {Math.round(al.target_ask).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      al.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-600/20 text-zinc-400'
                    }`}
                  >
                    {al.is_active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#15100B] p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]">
              Global Security Audit Log ({auditLogs.length})
            </h3>
            <div className="max-h-72 overflow-y-auto space-y-1.5 text-[11px]">
              {auditLogs.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 dark:bg-[#0B0907] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-zinc-800 dark:text-zinc-200">
                      {l.event_type} — {l.user_name || l.user_email || 'Guest'}
                    </div>
                    <div className="truncate text-[10px] text-zinc-500">
                      {l.ip_address || '—'} • {l.details}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono-price text-[10px] text-zinc-400">
                    {new Date(l.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed User 360° + GPS Inspector Modal */}
      <UserDossierModal
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onUpdated={() => loadSectionData('users')}
      />
    </div>
  );
}
