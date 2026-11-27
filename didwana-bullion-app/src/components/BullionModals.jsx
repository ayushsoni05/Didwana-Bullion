import React, { useMemo, useState } from 'react';
import { Bell, Calculator, Plus, Trash2, X } from 'lucide-react';
import { ARBITRAGE_PRODUCTS } from '../config/constants';

function formatINR(num) {
  if (!Number.isFinite(Number(num)) || Number(num) <= 0) return '—';
  return `₹${Math.round(Number(num)).toLocaleString('en-IN')}`;
}

export function CalculatorModal({ open, onClose, rates }) {
  const [terminal, setTerminal] = useState('HB');
  const [metalKey, setMetalKey] = useState('gold995');
  const [weight, setWeight] = useState('10');
  const [includeGst, setIncludeGst] = useState(true);

  const selectedProd = useMemo(
    () => ARBITRAGE_PRODUCTS.find((p) => p.key === metalKey) || ARBITRAGE_PRODUCTS[0],
    [metalKey]
  );

  const liveAsk =
    rates?.[terminal]?.items?.[metalKey]?.ask ||
    rates?.[terminal]?.items?.[metalKey]?.bid ||
    0;

  const baseUnitGrams = selectedProd.unit === '1KG' ? 1000 : 10;
  const weightNum = Math.max(0, Number(weight) || 0);
  const baseTotal = liveAsk > 0 ? (liveAsk / baseUnitGrams) * weightNum : 0;
  const gstAmount = includeGst ? baseTotal * 0.03 : 0;
  const grandTotal = baseTotal + gstAmount;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#C5A358]/35 bg-white dark:bg-[#141414] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#8C6A2E] dark:text-[#E8C97A]">
            <Calculator className="h-5 w-5" />
            <h3 className="text-base font-bold">Bullion Showroom Calculator</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'HB', label: 'Jodhpur' },
              { id: 'MOSUN', label: 'Sujangarh' },
              { id: 'IBJA', label: 'IBJA' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTerminal(t.id)}
                className={`rounded-xl py-2 text-xs font-bold ${
                  terminal === t.id
                    ? 'bg-gradient-to-r from-[#E8C97A] to-[#C9A452] text-[#111111]'
                    : 'border border-zinc-200 dark:border-white/10 text-zinc-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-500">
                Metal
              </label>
              <select
                value={metalKey}
                onChange={(e) => setMetalKey(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
              >
                {ARBITRAGE_PRODUCTS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label} ({p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-500">
                Weight (Grams)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0A0A0A] px-3 py-2 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Include 3% GST</span>
            <input
              type="checkbox"
              checked={includeGst}
              onChange={(e) => setIncludeGst(e.target.checked)}
              className="h-4 w-4 accent-[#C9A452]"
            />
          </label>

          <div className="rounded-2xl bg-gradient-to-br from-[#E8C97A] to-[#C9A452] p-4 text-[#111111]">
            <div className="flex justify-between text-xs font-medium text-[#111111]/75">
              <span>Live Ask ({selectedProd.unit})</span>
              <span className="font-mono font-bold">{formatINR(liveAsk)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs font-medium text-[#111111]/75">
              <span>Subtotal ({weightNum}g)</span>
              <span className="font-mono font-bold">{formatINR(baseTotal)}</span>
            </div>
            {includeGst && (
              <div className="mt-1 flex justify-between text-xs font-medium text-[#111111]/75">
                <span>GST (3%)</span>
                <span className="font-mono font-bold">{formatINR(gstAmount)}</span>
              </div>
            )}
            <div className="mt-2.5 border-t border-[#111111]/20 pt-2 flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase">Estimated Total</span>
              <span className="font-mono text-2xl font-extrabold">{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PriceAlertsModal({
  open,
  onClose,
  alerts = [],
  onCreateAlert,
  onDeleteAlert,
  rates,
}) {
  const [terminal, setTerminal] = useState('HB');
  const [metalKey, setMetalKey] = useState('gold995');
  const [condition, setCondition] = useState('BELOW');
  const [targetAsk, setTargetAsk] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const currentAsk =
    rates?.[terminal]?.items?.[metalKey]?.ask ||
    rates?.[terminal]?.items?.[metalKey]?.bid ||
    0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Number(targetAsk) || saving) return;
    setSaving(true);
    try {
      await onCreateAlert({
        terminal,
        metalKey,
        condition,
        targetAsk: Number(targetAsk),
      });
      setTargetAsk('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#C5A358]/35 bg-white dark:bg-[#141414] p-5 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#8C6A2E] dark:text-[#E8C97A]">
            <Bell className="h-5 w-5" />
            <h3 className="text-base font-bold">Live Price Alerts</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={terminal}
              onChange={(e) => setTerminal(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="HB">Jodhpur Rates</option>
              <option value="MOSUN">Sujangarh Rates</option>
              <option value="IBJA">IBJA Rates</option>
            </select>
            <select
              value={metalKey}
              onChange={(e) => setMetalKey(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            >
              {ARBITRAGE_PRODUCTS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="BELOW">Drops Below (≤)</option>
              <option value="ABOVE">Rises Above (≥)</option>
            </select>
            <input
              type="number"
              placeholder={currentAsk ? `e.g. ${Math.round(currentAsk)}` : 'Target ₹'}
              value={targetAsk}
              onChange={(e) => setTargetAsk(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E8C97A] to-[#C9A452] py-2.5 text-xs font-bold text-[#111111]"
          >
            <Plus className="h-3.5 w-3.5" />
            {saving ? 'Saving Alert...' : 'Add PostgreSQL Alert'}
          </button>
        </form>

        <div className="mt-4 flex-1 overflow-y-auto space-y-2">
          {alerts.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-500">
              No active price alerts yet.
            </p>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#1A1A1A] px-3 py-2.5 text-xs"
              >
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">
                    {a.terminal === 'HB'
                      ? 'Jodhpur'
                      : a.terminal === 'MOSUN'
                      ? 'Sujangarh'
                      : 'IBJA'}{' '}
                    • {a.metal_key}
                  </div>
                  <div className="text-[11px] text-[#8C6A2E] dark:text-[#E8C97A] font-mono">
                    {a.condition === 'BELOW' ? '≤' : '≥'} {formatINR(a.target_ask)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAlert(a.id)}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
