import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Calculator, CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';

function formatINR(num) {
  if (!Number.isFinite(Number(num)) || Number(num) <= 0) return '—';
  return `₹${Math.round(Number(num)).toLocaleString('en-IN')}`;
}

export function CalculatorModal({ open, onClose, rates, preset }) {
  const [terminal, setTerminal] = useState(preset?.terminal || 'HB');
  const [metalKey, setMetalKey] = useState(preset?.metalKey || 'gold995');
  const [weight, setWeight] = useState('10');
  const [includeGst, setIncludeGst] = useState(true);

  useEffect(() => {
    if (preset?.terminal) setTerminal(preset.terminal);
    if (preset?.metalKey) setMetalKey(preset.metalKey);
  }, [preset]);

  const termList = rates?.[terminal]?.list || [];
  const selectedProd = useMemo(
    () => termList.find((p) => p.key === metalKey) || termList[0] || { name: 'Gold 995', unit: '10g' },
    [termList, metalKey]
  );

  const liveAsk = selectedProd?.ask || selectedProd?.bid || preset?.customAsk || 0;
  const baseUnitGrams = String(selectedProd?.unit || '').toLowerCase().includes('kg') ? 1000 : 10;
  const weightNum = Math.max(0, Number(weight) || 0);
  const baseTotal = liveAsk > 0 ? (liveAsk / baseUnitGrams) * weightNum : 0;
  const gstAmount = includeGst ? baseTotal * 0.03 : 0;
  const grandTotal = baseTotal + gstAmount;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-white dark:bg-[#111520] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#9A7422] dark:text-[#E6CB94]">
            <Calculator className="h-5 w-5" />
            <h3 className="text-base font-bold">Showroom Bullion Calculator</h3>
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
                    ? 'bg-[#D4AF37] text-[#090B10]'
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
                Product
              </label>
              <select
                value={selectedProd?.key || metalKey}
                onChange={(e) => setMetalKey(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#090B10] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
              >
                {termList.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
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
                className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#090B10] px-3 py-2 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Include 3% GST</span>
            <input
              type="checkbox"
              checked={includeGst}
              onChange={(e) => setIncludeGst(e.target.checked)}
              className="h-4 w-4 accent-[#D4AF37]"
            />
          </label>

          <div className="rounded-2xl border border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#090B10] p-4">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Live Ask ({selectedProd?.unit})</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {formatINR(liveAsk)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Subtotal ({weightNum}g)</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {formatINR(baseTotal)}
              </span>
            </div>
            {includeGst && (
              <div className="mt-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>GST (3%)</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatINR(gstAmount)}
                </span>
              </div>
            )}
            <div className="mt-2.5 border-t border-zinc-200 dark:border-white/10 pt-2 flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase text-[#9A7422] dark:text-[#D4AF37]">
                Estimated Total
              </span>
              <span className="font-mono text-2xl font-extrabold text-zinc-900 dark:text-[#E6CB94]">
                {formatINR(grandTotal)}
              </span>
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
  preset,
}) {
  const [terminal, setTerminal] = useState(preset?.terminal || 'HB');
  const [metalKey, setMetalKey] = useState(preset?.metalKey || 'gold995');
  const [condition, setCondition] = useState('BELOW');
  const [targetAsk, setTargetAsk] = useState('');
  const [saving, setSaving] = useState(false);
  const [permState, setPermState] = useState('prompt'); // 'granted' | 'denied' | 'prompt'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (preset?.terminal) setTerminal(preset.terminal);
    if (preset?.metalKey) setMetalKey(preset.metalKey);
    if (preset?.currentAsk) setTargetAsk(String(Math.round(preset.currentAsk)));
  }, [preset]);

  useEffect(() => {
    if (!open) return;
    LocalNotifications.checkPermissions()
      .then((res) => setPermState(res.display || 'prompt'))
      .catch(() => setPermState('granted'));
  }, [open]);

  if (!open) return null;

  const termList = rates?.[terminal]?.list || [];
  const selectedProd = termList.find((p) => p.key === metalKey) || termList[0];
  const currentAsk = selectedProd?.ask || selectedProd?.bid || 0;

  const requestNotifPermission = async () => {
    try {
      const res = await LocalNotifications.requestPermissions();
      setPermState(res.display || 'prompt');
      return res.display === 'granted';
    } catch {
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!Number(targetAsk) || saving) {
      setErrorMsg('Enter a valid target Ask price.');
      return;
    }
    setSaving(true);
    try {
      // Request notification permission explicitly when user sets an alert
      if (permState !== 'granted') {
        await requestNotifPermission();
      }
      await onCreateAlert({
        terminal,
        metalKey: selectedProd?.key || metalKey,
        condition,
        targetAsk: Number(targetAsk),
      });
      setTargetAsk('');
    } catch (err) {
      setErrorMsg(err.message || 'Could not save alert.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/30 bg-white dark:bg-[#111520] p-5 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#9A7422] dark:text-[#E6CB94]">
            <Bell className="h-5 w-5" />
            <h3 className="text-base font-bold">Live Price Alerts</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notification Permission Status Banner */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#090B10] px-3 py-2 text-xs">
          {permState === 'granted' ? (
            <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              System Notifications Enabled
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <BellRing className="h-4 w-4" />
                Allow alerts on your phone
              </span>
              <button
                type="button"
                onClick={requestNotifPermission}
                className="rounded-lg bg-[#D4AF37] px-2.5 py-1 text-[11px] font-bold text-[#090B10]"
              >
                Enable
              </button>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5">
          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={terminal}
              onChange={(e) => setTerminal(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#090B10] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="HB">Jodhpur Rates</option>
              <option value="MOSUN">Sujangarh Rates</option>
              <option value="IBJA">IBJA Rates</option>
            </select>
            <select
              value={selectedProd?.key || metalKey}
              onChange={(e) => setMetalKey(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#090B10] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            >
              {termList.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#090B10] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="BELOW">Drops Below (≤)</option>
              <option value="ABOVE">Rises Above (≥)</option>
            </select>
            <input
              type="number"
              placeholder={currentAsk ? `e.g. ${Math.round(currentAsk)}` : 'Target ₹'}
              value={targetAsk}
              onChange={(e) => setTargetAsk(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#090B10] px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] py-2.5 text-xs font-bold text-[#090B10]"
          >
            <Plus className="h-3.5 w-3.5" />
            {saving ? 'Saving Alert...' : 'Set Price Alert'}
          </button>
        </form>

        <div className="mt-4 flex-1 overflow-y-auto space-y-2">
          {alerts.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-500">No active price alerts yet.</p>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#181D2B] px-3 py-2.5 text-xs"
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
                  <div className="text-[11px] text-[#9A7422] dark:text-[#E6CB94] font-mono">
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
