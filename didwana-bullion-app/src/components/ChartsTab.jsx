import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, RefreshCw, Radio } from 'lucide-react';
import { pricesApi } from '../services/api';

const RANGES = ['LIVE', '1D', '1W', '1M', '1Y'];
const METALS = [
  { id: 'gold995', label: 'Gold 995 (10g)' },
  { id: 'gold916', label: '22K 916 (10g)' },
  { id: 'silverPeti', label: 'Silver (1KG)' },
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
      // Seed 2 points from current rates while live buffer builds
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
    const pad = Math.max(40, (rawMax - rawMin) * 0.14);
    return { minVal: rawMin - pad, maxVal: rawMax + pad, rawMin, rawMax, avg };
  }, [series]);

  const W = 320;
  const H = 160;

  const getPoints = (key) => {
    if (!series.length) return [];
    return series.map((pt, idx) => {
      const x = (idx / Math.max(1, series.length - 1)) * W;
      const val = pt[key] || stats.minVal;
      const y = H - ((val - stats.minVal) / Math.max(1, stats.maxVal - stats.minVal)) * H;
      return { x, y };
    });
  };

  const hbPoints = useMemo(() => getPoints('HB'), [series, stats]);
  const mosunPoints = useMemo(() => getPoints('MOSUN'), [series, stats]);
  const ibjaPoints = useMemo(() => getPoints('IBJA'), [series, stats]);

  const toPolyline = (pts) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const toArea = (pts) => {
    if (!pts.length) return '';
    const line = toPolyline(pts);
    return `0,${H} ${line} ${W},${H}`;
  };

  const handlePointer = (clientX) => {
    if (!svgRef.current || !series.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const idx = Math.round(ratio * (series.length - 1));
    setHoverIdx(idx);
  };

  const activeIndex = hoverIdx !== null && series[hoverIdx] ? hoverIdx : series.length - 1;
  const activePoint = series[activeIndex] || {};
  const activeX = hbPoints[activeIndex]?.x ?? W;
  const spread = activePoint.HB && activePoint.IBJA ? activePoint.HB - activePoint.IBJA : 0;

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-[#8C6A2E] dark:text-[#DFC18A]" />
          <h2 className="text-sm font-bold tracking-wide text-zinc-900 dark:text-[#F4EFE6] uppercase">
            3-Terminal Interactive Chart
          </h2>
        </div>
        <button
          type="button"
          onClick={() => loadHistory(range)}
          className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] p-2 text-zinc-600 dark:text-zinc-300"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#8C6A2E] dark:text-[#DFC18A]' : ''}`}
          />
        </button>
      </div>

      {/* Metal Selector */}
      <div className="grid grid-cols-3 gap-2">
        {METALS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMetal(m.id);
              setHoverIdx(null);
            }}
            className={`rounded-xl py-2.5 px-2 text-[11px] font-bold transition ${
              metal === m.id
                ? 'bg-gradient-to-r from-[#DFC18A] to-[#C8A96E] text-[#0B0B0D]'
                : 'border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timeframe Selector */}
      <div className="grid grid-cols-5 gap-1 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] p-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setRange(r);
              setHoverIdx(null);
              onRangeChange?.(r);
            }}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition ${
              range === r
                ? 'bg-[#C8A96E]/20 text-[#8C6A2E] dark:text-[#DFC18A]'
                : 'text-zinc-500'
            }`}
          >
            {r === 'LIVE' && <Radio className="h-2.5 w-2.5 text-emerald-500 animate-pulse" />}
            {r}
          </button>
        ))}
      </div>

      {/* Interactive SVG Comparison Chart */}
      <div className="rounded-2xl border border-zinc-200 dark:border-[#9E7D47]/25 bg-white dark:bg-[#121216] p-4 shadow-sm">
        {/* Live / Crosshair HUD */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-[#8C6A2E] dark:text-[#DFC18A] tabular-nums">
              <span className="h-2 w-2 rounded-full bg-[#C8A96E]" />
              Jodhpur: ₹{Math.round(activePoint.HB || 0).toLocaleString('en-IN')}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-300 tabular-nums">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Sujangarh: ₹{Math.round(activePoint.MOSUN || 0).toLocaleString('en-IN')}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-300 tabular-nums">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              IBJA: ₹{Math.round(activePoint.IBJA || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] font-medium text-zinc-500">{activePoint.label || range}</span>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-xl bg-[#FAF8F4] dark:bg-[#0B0B0D] p-3 border border-zinc-200/80 dark:border-white/5 touch-none"
          onPointerMove={(e) => handlePointer(e.clientX)}
          onPointerDown={(e) => handlePointer(e.clientX)}
          onPointerLeave={() => setHoverIdx(null)}
        >
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-48 w-full overflow-visible">
            <defs>
              <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C8A96E" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#C8A96E" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {[0, 40, 80, 120, 160].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2={W}
                y2={y}
                stroke="currentColor"
                className="text-zinc-200 dark:text-white/5"
                strokeWidth="1"
              />
            ))}

            {hbPoints.length > 0 && (
              <polygon fill="url(#goldAreaGrad)" points={toArea(hbPoints)} />
            )}

            <polyline
              fill="none"
              stroke="#C8A96E"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points={toPolyline(hbPoints)}
            />
            <polyline
              fill="none"
              stroke="#0EA5E9"
              strokeWidth="2"
              strokeLinejoin="round"
              points={toPolyline(mosunPoints)}
            />
            <polyline
              fill="none"
              stroke="#10B981"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              strokeLinejoin="round"
              points={toPolyline(ibjaPoints)}
            />

            {/* Crosshair Line */}
            {series.length > 0 && (
              <line
                x1={activeX}
                y1="0"
                x2={activeX}
                y2={H}
                stroke="#C8A96E"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}
          </svg>

          <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
            <span>{series[0]?.label || 'Start'}</span>
            <span>Drag chart to inspect</span>
            <span>{series[series.length - 1]?.label || 'Now'}</span>
          </div>
        </div>
      </div>

      {/* High / Low / Avg Pills */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] p-3 text-center">
          <div className="text-[10px] uppercase text-zinc-500">Range Low</div>
          <div className="mt-0.5 font-mono tabular-nums text-xs font-bold text-zinc-900 dark:text-[#F4EFE6]">
            ₹{stats.rawMin.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] p-3 text-center">
          <div className="text-[10px] uppercase text-zinc-500">Average</div>
          <div className="mt-0.5 font-mono tabular-nums text-xs font-bold text-[#8C6A2E] dark:text-[#DFC18A]">
            ₹{stats.avg.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121216] p-3 text-center">
          <div className="text-[10px] uppercase text-zinc-500">Range High</div>
          <div className="mt-0.5 font-mono tabular-nums text-xs font-bold text-zinc-900 dark:text-[#F4EFE6]">
            ₹{stats.rawMax.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Spread Summary Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-[#9E7D47]/25 bg-white dark:bg-[#121216] p-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-xs font-bold text-zinc-900 dark:text-[#F4EFE6]">
            Jodhpur vs IBJA Spread
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            Selected point differential
          </div>
        </div>
        <div className="font-mono tabular-nums text-base font-extrabold text-[#8C6A2E] dark:text-[#DFC18A]">
          {spread >= 0 ? '+' : '-'}₹{Math.abs(Math.round(spread)).toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
}
