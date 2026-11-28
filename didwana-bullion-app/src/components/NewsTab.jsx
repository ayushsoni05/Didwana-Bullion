import React, { useEffect, useMemo, useState } from 'react';
import { Share } from '@capacitor/share';
import {
  Search,
  Bookmark,
  MessageCircle,
  Phone,
  Flame,
  RefreshCw,
  Crown,
  Newspaper,
} from 'lucide-react';
import { APP_INFO } from '../config/constants';
import { newsApi } from '../services/api';
import { BottomSheetModal } from './ui/BottomSheetModal';

const CATEGORIES = [
  { id: 'ALL', label: 'All News' },
  { id: 'BREAKING', label: '⚡ Breaking' },
  { id: 'GOLD_OUTLOOK', label: 'Gold Bullion' },
  { id: 'SILVER_TREND', label: 'Silver Peti' },
  { id: 'SHOWROOM_NOTICE', label: 'Showroom' },
  { id: 'SAVED', label: 'Saved ★' },
];

export default function NewsTab({
  rates,
  savedNewsIds = [],
  onToggleSaveNews,
  onNewsLoaded,
  isAdmin = false,
  onOpenAdminNews,
  siteConfig,
}) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState(null);

  const loadNews = async () => {
    setLoading(true);
    try {
      const res = await newsApi.list({ limit: 80 });
      const rows = res?.news || [];
      setArticles(rows);
      onNewsLoaded?.(rows);
    } catch {
      // Offline cache fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((item) => {
      if (category === 'SAVED' && !savedNewsIds.includes(item.id)) return false;
      if (category === 'BREAKING' && item.priority !== 'BREAKING') return false;
      if (
        category !== 'ALL' &&
        category !== 'SAVED' &&
        category !== 'BREAKING' &&
        item.category !== category
      ) {
        return false;
      }
      const dStr = (item.published_at || item.created_at || '').slice(0, 10);
      if (fromDate && dStr && dStr < fromDate) return false;
      if (toDate && dStr && dStr > toDate) return false;
      if (q) {
        const hay = `${item.title} ${item.summary} ${item.content} ${item.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [articles, category, search, fromDate, toDate, savedNewsIds]);

  const handleOpenArticle = (article) => {
    setSelected(article);
    newsApi.recordView(article.id);
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, views_count: (a.views_count || 0) + 1 } : a))
    );
  };

  const handleShareArticle = async (article) => {
    const text = `*${article.title}*\n\n${article.summary}\n\n— Didwana Bullion News (New Monika Jewellers • ${APP_INFO.contactPhone})`;
    try {
      await Share.share({ title: article.title, text });
    } catch {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  };

  const contactPhone = siteConfig?.contactPhone || APP_INFO.contactPhone;
  const whatsappNumber = String(
    siteConfig?.whatsappNumber || APP_INFO.whatsappPhone || '919351214851'
  ).replace(/\D/g, '');

  return (
    <div className="relative space-y-3 pb-32">
      {/* Live Scrolling Advisory Marquee */}
      <div className="flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-[#3D2E1A] bg-[#15100B] px-2.5 py-1.5 text-[11px] font-medium text-[#E5C158]">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#148A14]" />
          <span className="font-bold text-white text-[9px] uppercase">LIVE</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee gap-8">
            <span>कृपया अपने सौदे समय पर उठा लेवें • MCX &amp; Rajasthan Mandi Direct Dispatch</span>
            <span>कृपया अपने सौदे समय पर उठा लेवें • MCX &amp; Rajasthan Mandi Direct Dispatch</span>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAdminNews}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#E5C158] px-2 py-0.5 text-[9px] font-bold text-[#0B0907]"
          >
            <Crown className="h-2.5 w-2.5" />
            CMS
          </button>
        )}
      </div>

      {/* Crisp White Date & Search Filter Bar (Exact Mosun News Design) */}
      <div className="rounded-2xl bg-white p-3 text-[#15100B] shadow-md space-y-2">
        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-5">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-[#6E5636]">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-[#FAF7F2] px-2 py-1.5 text-[11px] font-semibold text-[#15100B] focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <div className="col-span-5">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-[#6E5636]">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-zinc-200 bg-[#FAF7F2] px-2 py-1.5 text-[11px] font-semibold text-[#15100B] focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <div className="col-span-2 flex justify-end pt-3">
            <button
              type="button"
              onClick={loadNews}
              aria-label="Refresh News"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2A1D0F] text-[#E5C158] shadow"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Gold, Silver, Mandi & Showroom notices..."
            className="w-full rounded-xl border border-zinc-200 bg-[#FAF7F2] py-1.5 pl-8 pr-3 text-xs text-[#15100B] placeholder-zinc-400 focus:border-[#D4AF37] focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition ${
                active
                  ? 'bg-gradient-to-r from-[#E5C158] to-[#C69749] text-[#0B0907] shadow'
                  : 'border border-[#3D2E1A] bg-[#15100B] text-[#E6DFD5]'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Mosun-Inspired White News Cards with Bronze Date Badges */}
      {loading && articles.length === 0 ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#15100B]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#3D2E1A] bg-[#15100B] p-8 text-center">
          <Newspaper className="mx-auto h-8 w-8 text-[#D4AF37]/60" />
          <p className="mt-2 text-xs text-zinc-400">No announcements match this date or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const dt = new Date(item.published_at || item.created_at);
            const day = dt.toLocaleDateString('en-IN', { day: '2-digit' });
            const month = dt.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
            const year = dt.getFullYear();
            const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const isBreaking = item.priority === 'BREAKING';
            const isSaved = savedNewsIds.includes(item.id);

            return (
              <article
                key={item.id}
                onClick={() => handleOpenArticle(item)}
                className="flex cursor-pointer gap-3 rounded-2xl bg-white p-3.5 text-[#15100B] shadow-md transition active:scale-[0.99]"
              >
                {/* Overlapping Dark Bronze Date Badge */}
                <div className="flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#2A1D0F] text-center shadow">
                  <span className="text-base font-extrabold leading-none text-[#E5C158]">{day}</span>
                  <span className="mt-0.5 text-[9px] font-bold tracking-wider text-white">
                    {month}
                  </span>
                  <span className="text-[8px] text-zinc-400">{year}</span>
                </div>

                {/* Article Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                        isBreaking
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-[#F5EEDB] text-[#6E5636]'
                      }`}
                    >
                      {isBreaking && <Flame className="h-2.5 w-2.5" />}
                      {isBreaking ? 'Breaking' : String(item.category || '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-medium text-zinc-500">{timeStr}</span>
                  </div>

                  <h3 className="font-serif-luxury mt-1.5 text-sm font-bold leading-snug text-[#15100B]">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-600">
                    {item.summary}
                  </p>

                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="mt-2 h-28 w-full rounded-xl object-cover"
                    />
                  )}

                  <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2">
                    <span className="rounded-md bg-[#FAF7F2] px-2 py-0.5 text-[9px] font-bold text-[#6E5636]">
                      Station Road Desk • {item.views_count || 0} views
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSaveNews?.(item.id);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-zinc-600"
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${isSaved ? 'fill-[#D4AF37] text-[#D4AF37]' : ''}`}
                        />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareArticle(item);
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
                      >
                        <MessageCircle className="h-3 w-3" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Floating WhatsApp & Call Circular FABs (Exact Mosun News Touch) */}
      <div className="fixed bottom-24 right-4 z-20 flex flex-col gap-2">
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp Trade Desk"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#148A14] text-white shadow-xl ring-2 ring-[#0B0907]"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
        <a
          href={`tel:${contactPhone.replace(/\s+/g, '')}`}
          aria-label="Call Trade Desk"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E5C158] to-[#C69749] text-[#0B0907] shadow-xl ring-2 ring-[#0B0907]"
        >
          <Phone className="h-5 w-5" />
        </a>
      </div>

      {/* Article Detail Reader */}
      <BottomSheetModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Didwana Bullion Dispatch"
      >
        {selected && (
          <div className="space-y-4">
            <h2 className="font-serif-luxury text-lg font-bold text-[#E5C158]">
              {selected.title}
            </h2>
            {selected.image_url && (
              <img
                src={selected.image_url}
                alt={selected.title}
                className="h-44 w-full rounded-xl object-cover border border-[#3D2E1A]"
              />
            )}
            <div className="rounded-xl border border-[#3D2E1A] bg-[#0B0907] px-3 py-2 text-[11px] flex justify-between">
              <span className="text-[#E5C158] font-bold">Live Gold 995</span>
              <span className="font-mono-price text-white font-bold">
                ₹{Math.round(rates?.HB?.items?.gold995?.ask || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-line">
              {selected.content}
            </p>
            <button
              type="button"
              onClick={() => handleShareArticle(selected)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#148A14] py-2.5 text-xs font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Share via WhatsApp
            </button>
          </div>
        )}
      </BottomSheetModal>
    </div>
  );
}
