import React, { useEffect, useMemo, useState } from 'react';
import { Share } from '@capacitor/share';
import {
  Newspaper,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Bookmark,
  Share2,
  Eye,
  Clock,
  Flame,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { newsApi } from '../services/api';
import { BottomSheetModal } from './ui/BottomSheetModal';

const CATEGORIES = [
  { id: 'ALL', label: 'All News' },
  { id: 'BREAKING', label: 'Breaking' },
  { id: 'GOLD_OUTLOOK', label: 'Gold' },
  { id: 'SILVER_TREND', label: 'Silver' },
  { id: 'RBI_MACRO', label: 'RBI / Macro' },
  { id: 'MCX_COMEX', label: 'MCX / COMEX' },
  { id: 'SHOWROOM_NOTICE', label: 'Showroom' },
  { id: 'SAVED', label: 'Saved ★' },
];

function ImpactBadge({ impact }) {
  if (impact === 'BULLISH') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        Bullish
      </span>
    );
  }
  if (impact === 'BEARISH') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
        <TrendingDown className="h-3 w-3" />
        Bearish
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
      <Minus className="h-3 w-3" />
      Neutral
    </span>
  );
}

export default function NewsTab({
  rates,
  savedNewsIds = [],
  onToggleSaveNews,
  onNewsLoaded,
  isAdmin = false,
  onOpenAdminNews,
}) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const loadNews = async () => {
    setLoading(true);
    try {
      const res = await newsApi.list({ limit: 80 });
      const rows = res?.news || [];
      setArticles(rows);
      onNewsLoaded?.(rows);
    } catch {
      // Keep previous list on offline retry
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
      if (category !== 'ALL' && category !== 'SAVED' && category !== 'BREAKING' && item.category !== category) {
        return false;
      }
      if (q) {
        const hay = `${item.title} ${item.summary} ${item.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [articles, category, search, savedNewsIds]);

  const sentiment = useMemo(() => {
    const bull = articles.filter((a) => a.impact === 'BULLISH').length;
    const bear = articles.filter((a) => a.impact === 'BEARISH').length;
    return { bull, bear, total: articles.length };
  }, [articles]);

  const handleOpenArticle = (article) => {
    setSelected(article);
    newsApi.recordView(article.id);
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, views_count: (a.views_count || 0) + 1 } : a))
    );
  };

  const handleShareArticle = async (article) => {
    const text = `*${article.title}*\n\n${article.summary}\n\n— Didwana Bullion Newsroom (New Monika Jewellers)`;
    try {
      await Share.share({ title: article.title, text });
    } catch {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  };

  const gold995 = rates?.HB?.items?.gold995?.ask || 0;
  const silverPeti = rates?.HB?.items?.silverPeti?.ask || 0;

  return (
    <div className="space-y-4 pb-28">
      {/* Editorial Newsroom Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-white dark:bg-[#10141F] p-4 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6CB94]/60 to-transparent" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A7422] dark:text-[#D4AF37]">
              <Newspaper className="h-3.5 w-3.5" />
              Bullion Newsroom
            </div>
            <h2 className="font-serif-luxury mt-1 text-lg font-bold text-zinc-900 dark:text-[#E6CB94]">
              Market Intelligence &amp; Bulletins
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenAdminNews}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#E6CB94] to-[#C9A452] px-2.5 py-1 text-[10px] font-bold text-[#07090F]"
              >
                <Crown className="h-3 w-3" />
                CMS
              </button>
            )}
            <button
              type="button"
              onClick={loadNews}
              aria-label="Refresh News"
              className="rounded-full border border-zinc-200 dark:border-white/10 p-2 text-zinc-500 dark:text-zinc-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Desk Sentiment Telemetry */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#07090F] px-3 py-2 text-[11px]">
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">
            Desk Sentiment ({sentiment.total} Bulletins)
          </span>
          <div className="flex items-center gap-3 font-mono-price font-bold">
            <span className="text-emerald-600 dark:text-emerald-400">↑ {sentiment.bull} Bullish</span>
            <span className="text-rose-600 dark:text-rose-400">↓ {sentiment.bear} Bearish</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Gold, Silver, RBI policy, MCX updates..."
            className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#07090F] py-2 pl-9 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
          />
        </div>
      </div>

      {/* Category Chips */}
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
                  ? 'bg-gradient-to-r from-[#E6CB94] to-[#C9A452] text-[#07090F] shadow-sm'
                  : 'border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Articles Feed */}
      {loading && articles.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/50 dark:bg-[#10141F]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] p-8 text-center">
          <Newspaper className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-2 text-xs font-semibold text-zinc-500">
            No bullion bulletins match this filter yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isBreaking = item.priority === 'BREAKING';
            const isSaved = savedNewsIds.includes(item.id);
            return (
              <article
                key={item.id}
                onClick={() => handleOpenArticle(item)}
                className={`cursor-pointer rounded-3xl border p-4 transition active:scale-[0.99] ${
                  isBreaking
                    ? 'border-rose-500/45 bg-gradient-to-br from-rose-950/25 via-white dark:via-[#10141F] to-[#10141F] shadow-md'
                    : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isBreaking && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
                        <Flame className="h-2.5 w-2.5" />
                        Breaking
                      </span>
                    )}
                    <span className="rounded-full bg-[#D4AF37]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9A7422] dark:text-[#E6CB94]">
                      {String(item.category || '').replace(/_/g, ' ')}
                    </span>
                    <ImpactBadge impact={item.impact} />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSaveNews?.(item.id);
                    }}
                    aria-label="Bookmark article"
                    className={`rounded-lg p-1 ${
                      isSaved ? 'text-[#D4AF37]' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-[#D4AF37]' : ''}`} />
                  </button>
                </div>

                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="mt-3 h-36 w-full rounded-2xl object-cover border border-white/10"
                  />
                )}

                <h3 className="font-serif-luxury mt-2.5 text-base font-bold leading-snug text-zinc-900 dark:text-[#F4EFE6]">
                  {item.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.summary}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 dark:border-white/5 pt-2.5 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(item.published_at || item.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {item.views_count || 0}
                    </span>
                    <span className="font-bold text-[#9A7422] dark:text-[#D4AF37]">Read →</span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Full Editorial Reader Bottom Sheet */}
      <BottomSheetModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Didwana Bullion Dispatch"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#D4AF37]/15 px-2.5 py-1 text-[10px] font-bold uppercase text-[#9A7422] dark:text-[#E6CB94]">
                {String(selected.category || '').replace(/_/g, ' ')}
              </span>
              <ImpactBadge impact={selected.impact} />
              <span className="text-[10px] text-zinc-400">
                by {selected.author_name || 'New Monika Desk'}
              </span>
            </div>

            {selected.image_url && (
              <img
                src={selected.image_url}
                alt={selected.title}
                className="h-44 w-full rounded-2xl object-cover border border-white/10"
              />
            )}

            <h2 className="font-serif-luxury text-xl font-bold leading-snug text-zinc-900 dark:text-[#E6CB94]">
              {selected.title}
            </h2>

            {/* Related Live Rate Context */}
            {(gold995 > 0 || silverPeti > 0) && (
              <div className="flex items-center justify-between rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3.5 py-2 text-[11px]">
                <span className="font-bold text-[#9A7422] dark:text-[#E6CB94]">Live Market Context</span>
                <span className="font-mono-price font-bold text-zinc-900 dark:text-zinc-100">
                  {gold995 > 0 ? `Au ₹${Math.round(gold995).toLocaleString('en-IN')}` : ''}{' '}
                  {silverPeti > 0 ? `• Ag ₹${Math.round(silverPeti).toLocaleString('en-IN')}` : ''}
                </span>
              </div>
            )}

            <div className="space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
              {selected.content}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleShareArticle(selected)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E6CB94] to-[#C9A452] py-2.5 text-xs font-bold text-[#07090F]"
              >
                <Share2 className="h-4 w-4" />
                Share Bulletin
              </button>
              <button
                type="button"
                onClick={() => onToggleSaveNews?.(selected.id)}
                className="rounded-xl border border-zinc-200 dark:border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-200"
              >
                {savedNewsIds.includes(selected.id) ? 'Saved ★' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </BottomSheetModal>
    </div>
  );
}
