import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { pricesApi } from '../services/api';
import { LuxurySelect } from './ui/LuxurySelect';

const RANGES = ['LIVE', '1D', '1W', '1M', '1Y'];
const METALS = [
  { value: 'gold995', label: 'Gold 995 (10g)', hint: '24K Bullion Benchmark' },
  { value: 'gold916', label: '22K 916 (10g)', hint: 'BIS Hallmark Jewellery' },
  { value: 'silverPeti', label: 'Silver Bank Peti (1KG)', hint: 'Fine Silver Bar' },
];

function formatShortTime(iso, range) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  if (range === 'LIVE' || range === '1D') {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function ChartsTab({
  rates,
  liveBuffer = [],
  initialRange = 'LIVE',
  onRangeChange,
}) {
  const [range, setRange] = useState(initialRange);
  const [metal, setMetal] = useState('gold995');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const loadHistory = async (r) => {
    if (r === 'LIVE') return;
    setLoading(true);
    try {
      const res = await pricesApi.getHistory(r);
      const list = Array.isArray(res?.chart)
        ? res.chart
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setHistory(list);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range !== 'LIVE') {
      loadHistory(range);
    }
  }, [range]);

  const series = useMemo(() => {
    if (range === 'LIVE') {
      const pts = liveBuffer.map((snap) => ({
        label: formatShortTime(snap.timestamp, 'LIVE'),
        HB: Number(snap.HB?.items?.[metal]?.ask || snap.HB?.items?.[metal]?.bid || 0),
        MOSUN: Number(snap.MOSUN?.items?.[metal]?.ask || snap.MOSUN?.items?.[metal]?.bid || 0),
        IBJA: Number(snap.IBJA?.items?.[metal]?.ask || snap.IBJA?.items?.[metal]?.bid || 0),
      }));
      if (pts.length >= 2) return pts;
      if (rates) {
        const cur = {
          label: formatShortTime(rates.timestamp, 'LIVE'),
          HB: Number(rates.HB?.items?.[metal]?.ask || rates.HB?.items?.[metal]?.bid || 0),
          MOSUN: Number(rates.MOSUN?.items?.[metal]?.ask || rates.MOSUN?.items?.[metal]?.bid || 0),
          IBJA: Number(rates.IBJA?.items?.[metal]?.ask || rates.IBJA?.items?.[metal]?.bid || 0),
        };
        return [cur, cur];
      }
      return [];
    }

    const ibjaCurrent = Number(
      rates?.IBJA?.items?.[metal]?.ask || rates?.IBJA?.items?.[metal]?.bid || 0
    );

    return history
      .map((pt) => {
        let hbVal = 0;
        let mosunVal = 0;
        if (metal === 'gold995') {
          hbVal = Number(pt.g24_hb || pt.g24 || 0);
          mosunVal = Number(pt.g24_mosun || pt.g24 || 0);
        } else if (metal === 'gold916') {
          hbVal = Number(pt.g22_hb || pt.g22 || 0);
          mosunVal = Number(pt.g22_mosun || pt.g22 || 0);
        } else {
          hbVal = Number(pt.s10_hb || pt.s10 || 0) * 100;
          mosunVal = Number(pt.s10_mosun || pt.s10 || 0) * 100;
        }
        return {
          label: formatShortTime(pt.t || pt.label || pt.time, range),
          HB: Math.round(hbVal),
          MOSUN: Math.round(mosunVal),
          IBJA: Math.round(Number(pt.ibja || ibjaCurrent || 0)),
        };
      })
      .filter((p) => p.HB > 0 || p.MOSUN > 0);
  }, [range, liveBuffer, history, rates, metal]);

  const stats = useMemo(() => {
    const vals = series.flatMap((s) => [s.HB, s.MOSUN, s.IBJA]).filter((n) => n > 0);
    if (!vals.length) return { minVal: 0, maxVal: 100, rawMin: 0, rawMax: 0, avg: 0 };
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const pad = Math.max(40, (rawMax - rawMin) * 0.18);
    return { minVal: rawMin - pad, maxVal: rawMax + pad, rawMin, rawMax, avg };
  }, [series]);

  const W = 320;
  const H = 180;

  const { hbPoints, mosunPoints } = useMemo(() => {
    const mapKey = (key) =>
      series.map((pt, idx) => {
        const x = (idx / Math.max(1, series.length - 1)) * W;
        const val = pt[key] || stats.minVal;
        const y = H - ((val - stats.minVal) / Math.max(1, stats.maxVal - stats.minVal)) * H;
        return { x, y };
      });
    return {
      hbPoints: mapKey('HB'),
      mosunPoints: mapKey('MOSUN'),
    };
  }, [series, stats]);

  const toPolyline = (pts) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const toArea = (pts) => {
    if (!pts.length) return '';
    return `0,${H} ${toPolyline(pts)} ${W},${H}`;
  };

  const handlePointer = (clientX) => {
    if (!svgRef.current || !series.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    setHoverIdx(Math.round(ratio * (series.length - 1)));
  };

  const activeIndex = hoverIdx !== null && series[hoverIdx] ? hoverIdx : series.length - 1;
  const activePoint = series[activeIndex] || {};
  const activeNode = hbPoints[activeIndex] || { x: W, y: H / 2 };

  const spot = rates?.spot || {};
  const intlParityGold10g =
    spot.xauUsd && spot.usdInr ? Math.round(((spot.xauUsd * spot.usdInr) / 31.1035) * 10) : null;

  return (
    <div className="space-y-4 pb-28">
      {/* Editorial Price Header */}
      <div className="flex items-start justify-between px-1">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Price Trends • Jodhpur
          </div>
          <div className="font-mono-price mt-1 text-3xl font-extrabold text-zinc-900 dark:text-[#E6CB94]">
            ₹{Math.round(activePoint.HB || 0).toLocaleString('en-IN')}
          </div>
          <div className="font-mono-price mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
            <span>Sujangarh: ₹{Math.round(activePoint.MOSUN || 0).toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>IBJA: ₹{Math.round(activePoint.IBJA || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadHistory(range)}
          className="rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-white dark:bg-[#10141F] p-2 text-zinc-500 dark:text-[#E6CB94]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Custom LuxurySelect Dropdown */}
      <LuxurySelect
        label="Select Bullion Contract"
        value={metal}
        onChange={(val) => {
          setMetal(val);
          setHoverIdx(null);
        }}
        options={METALS}
      />

      {/* Interactive Chart Card */}
      <div className="rounded-3xl border border-zinc-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#10141F] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-[#9A7422] dark:text-[#E6CB94]">
              <span className="h-2 w-2 rounded-full bg-[#D4AF37]" /> Jodhpur
            </span>
            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Sujangarh
            </span>
          </div>
          <div className="font-mono-price rounded-full bg-[#D4AF37] px-3 py-0.5 text-[10px] font-bold text-[#07090F]">
            {activePoint.label || range} • ₹{Math.round(activePoint.HB || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div
          className="relative w-full overflow-hidden touch-none"
          onPointerMove={(e) => handlePointer(e.clientX)}
          onPointerDown={(e) => handlePointer(e.clientX)}
          onPointerLeave={() => setHoverIdx(null)}
        >
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-48 w-full overflow-visible">
            <defs>
              <linearGradient id="richGoldArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {hbPoints.length > 0 && (
              <polygon fill="url(#richGoldArea)" points={toArea(hbPoints)} />
            )}

            <polyline
              fill="none"
              stroke="#D4AF37"
              strokeWidth="2.2"
              strokeLinejoin="round"
              points={toPolyline(hbPoints)}
            />
            <polyline
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeOpacity="0.75"
              strokeLinejoin="round"
              points={toPolyline(mosunPoints)}
            />

            {series.length > 0 && (
              <>
                <circle cx={activeNode.x} cy={activeNode.y} r="8" fill="#D4AF37" fillOpacity="0.28" />
                <circle cx={activeNode.x} cy={activeNode.y} r="3.5" fill="#FFFFFF" stroke="#D4AF37" strokeWidth="2" />
              </>
            )}
          </svg>
        </div>

        {/* Dotted Track Timeframe Pills */}
        <div className="relative mt-4 flex items-center justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-dotted border-[#D4AF37]/40"
          />
          {RANGES.map((r) => {
            const active = range === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRange(r);
                  setHoverIdx(null);
                  onRangeChange?.(r);
                }}
                className={`relative z-10 rounded-full px-3.5 py-1 text-[11px] font-bold transition ${
                  active
                    ? 'bg-gradient-to-r from-[#E6CB94] to-[#C9A452] text-[#07090F] shadow'
                    : 'border border-[#D4AF37]/35 bg-white dark:bg-[#07090F] text-zinc-600 dark:text-[#D4AF37]'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats + International Parity */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] p-3 text-center">
          <div className="text-[10px] uppercase text-zinc-500">Low</div>
          <div className="font-mono-price mt-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
            ₹{stats.rawMin.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] p-3 text-center">
          <div className="text-[10px] uppercase text-zinc-500">Avg</div>
          <div className="font-mono-price mt-0.5 text-xs font-bold text-[#9A7422] dark:text-[#E6CB94]">
            ₹{stats.avg.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#10141F] p-3 text-center">
          <div className="text-[10px] uppercase text-zinc-500">High</div>
          <div className="font-mono-price mt-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
            ₹{stats.rawMax.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {intlParityGold10g && (
        <div className="rounded-2xl border border-zinc-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#10141F] p-4 flex items-center justify-between">
          <div>
            <div className="font-serif-luxury text-sm font-bold text-zinc-900 dark:text-[#E6CB94]">
              Intl Spot Parity (Ex-Duty 10g)
            </div>
            <div className="text-[11px] text-zinc-500">
              XAU (${spot.xauUsd}) × USD/INR (₹{spot.usdInr})
            </div>
          </div>
          <div className="font-mono-price text-base font-extrabold text-zinc-900 dark:text-zinc-100">
            ₹{intlParityGold10g.toLocaleString('en-IN')}
          </div>
        </div>
      )}
    </div>
  );
}
