import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Calculator, CheckCircle2, Landmark, Plus, Trash2 } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { APP_INFO } from '../config/constants';
import { BottomSheetModal } from './ui/BottomSheetModal';
import { LuxurySelect } from './ui/LuxurySelect';
import { ShimmerButton } from './ui/ShimmerButton';

function formatINR(num) {
  if (!Number.isFinite(Number(num)) || Number(num) <= 0) return '—';
  return `₹${Math.round(Number(num)).toLocaleString('en-IN')}`;
}

export function CalculatorModal({ open, onClose, rates, preset }) {
  const [terminal, setTerminal] = useState(preset?.terminal || 'HB');
  const [metalKey, setMetalKey] = useState(preset?.metalKey || 'gold995');
  const [weight, setWeight] = useState('10');
  const [weightUnit, setWeightUnit] = useState('g'); // 'g' | 'tola' | 'kg'
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
  const rawWeight = Math.max(0, Number(weight) || 0);
  const weightInGrams =
    weightUnit === 'kg' ? rawWeight * 1000 : weightUnit === 'tola' ? rawWeight * 11.664 : rawWeight;
  const baseTotal = liveAsk > 0 ? (liveAsk / baseUnitGrams) * weightInGrams : 0;
  const gstAmount = includeGst ? baseTotal * 0.03 : 0;
  const grandTotal = baseTotal + gstAmount;

  return (
    <BottomSheetModal open={open} onClose={onClose} title="Showroom Calculator" icon={Calculator}>
      <div className="space-y-4">
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
              className={`rounded-xl py-2 text-xs font-bold transition ${
                terminal === t.id
                  ? 'bg-gradient-to-r from-[#E6CB94] to-[#C9A452] text-[#0B0907]'
                  : 'border border-zinc-200 dark:border-white/10 text-zinc-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <LuxurySelect
          label="Bullion Product"
          value={selectedProd?.key || metalKey}
          onChange={setMetalKey}
          options={termList.map((p) => ({
            value: p.key,
            label: p.name,
            hint: `${p.tag} • ${p.unit}`,
          }))}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Quantity
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="font-mono-price w-full rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#0B0907] px-3.5 py-2.5 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          <LuxurySelect
            label="Weight Unit"
            value={weightUnit}
            onChange={setWeightUnit}
            options={[
              { value: 'g', label: 'Grams (g)' },
              { value: 'tola', label: 'Tola (11.664g)' },
              { value: 'kg', label: 'Kilogram (KG)' },
            ]}
          />
        </div>

        <label className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Include 3% GST</span>
          <input
            type="checkbox"
            checked={includeGst}
            onChange={(e) => setIncludeGst(e.target.checked)}
            className="h-4 w-4 accent-[#D4AF37]"
          />
        </label>

        <div className="rounded-2xl border border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#0B0907] p-4 space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Live Ask ({selectedProd?.unit})</span>
            <span className="font-mono-price font-bold text-zinc-900 dark:text-zinc-100">
              {formatINR(liveAsk)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Base ({weightInGrams.toFixed(2)}g)</span>
            <span className="font-mono-price font-bold text-zinc-900 dark:text-zinc-100">
              {formatINR(baseTotal)}
            </span>
          </div>
          {includeGst && (
            <div className="flex justify-between text-xs text-zinc-500">
              <span>GST (3%)</span>
              <span className="font-mono-price font-bold text-zinc-900 dark:text-zinc-100">
                {formatINR(gstAmount)}
              </span>
            </div>
          )}
          <div className="mt-2 border-t border-zinc-200 dark:border-white/10 pt-2.5 flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9A7422] dark:text-[#D4AF37]">
              Estimated Quote
            </span>
            <span className="font-mono-price text-2xl font-extrabold text-zinc-900 dark:text-[#E6CB94]">
              {formatINR(grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </BottomSheetModal>
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
  const [permState, setPermState] = useState('prompt');
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
    <BottomSheetModal open={open} onClose={onClose} title="Live Price Alerts" icon={Bell}>
      <div className="space-y-3.5">
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2 text-xs">
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
                className="rounded-lg bg-[#D4AF37] px-2.5 py-1 text-[11px] font-bold text-[#0B0907]"
              >
                Enable
              </button>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
          <div className="grid grid-cols-2 gap-2">
            <LuxurySelect
              label="Terminal"
              value={terminal}
              onChange={setTerminal}
              options={[
                { value: 'HB', label: 'Jodhpur Rates' },
                { value: 'MOSUN', label: 'Sujangarh Rates' },
                { value: 'IBJA', label: 'IBJA Rates' },
              ]}
            />
            <LuxurySelect
              label="Product"
              value={selectedProd?.key || metalKey}
              onChange={setMetalKey}
              options={termList.map((p) => ({ value: p.key, label: p.name }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <LuxurySelect
              label="Condition"
              value={condition}
              onChange={setCondition}
              options={[
                { value: 'BELOW', label: 'Drops Below (≤)' },
                { value: 'ABOVE', label: 'Rises Above (≥)' },
              ]}
            />
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                Target Ask ₹
              </label>
              <input
                type="number"
                placeholder={currentAsk ? `e.g. ${Math.round(currentAsk)}` : 'Target ₹'}
                value={targetAsk}
                onChange={(e) => setTargetAsk(e.target.value)}
                className="font-mono-price w-full rounded-xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-zinc-50 dark:bg-[#0B0907] px-3 py-2.5 text-xs font-bold text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <ShimmerButton type="submit" disabled={saving} className="w-full py-3">
            <Plus className="h-3.5 w-3.5" />
            {saving ? 'Saving Alert...' : 'Set Price Alert'}
          </ShimmerButton>
        </form>

        <div className="space-y-2 pt-2">
          {alerts.length === 0 ? (
            <p className="py-3 text-center text-xs text-zinc-500">No active price alerts yet.</p>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0B0907] px-3.5 py-2.5 text-xs"
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
                  <div className="font-mono-price text-[11px] text-[#9A7422] dark:text-[#E6CB94]">
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
    </BottomSheetModal>
  );
}

export function BankDetailsModal({ open, onClose, siteConfig }) {
  const contactPhone = siteConfig?.contactPhone || APP_INFO.contactPhone;
  const whatsappNumber = String(
    siteConfig?.whatsappNumber || APP_INFO.whatsappPhone || '919351214851'
  ).replace(/\D/g, '');

  return (
    <BottomSheetModal open={open} onClose={onClose} title="Bank Details & RTGS Desk" icon={Landmark}>
      <div className="space-y-3 text-xs">
        <div className="rounded-2xl border border-[#3D2E1A] bg-[#0B0907] p-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#E5C158]">
            New Monika Jewellers — Settlement Account
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <span className="text-zinc-400">Firm / Account Name</span>
            <span className="font-bold text-white text-right">
              {siteConfig?.bankAccountName || 'New Monika Jewellers'}
            </span>
            <span className="text-zinc-400">Showroom Branch</span>
            <span className="font-semibold text-zinc-200 text-right">
              {siteConfig?.bankBranch || 'Station Road, Didwana'}
            </span>
            <span className="text-zinc-400">RTGS / NEFT Desk</span>
            <span className="font-mono-price font-bold text-[#E5C158] text-right">
              {contactPhone}
            </span>
          </div>
          {siteConfig?.bankAccountNumber ? (
            <div className="mt-2 border-t border-[#3D2E1A] pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">A/C No.</span>
                <span className="font-mono-price font-bold text-white">
                  {siteConfig.bankAccountNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">IFSC Code</span>
                <span className="font-mono-price font-bold text-emerald-400">
                  {siteConfig.bankIfsc || '—'}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-2 border-t border-[#3D2E1A] pt-2 text-[11px] leading-relaxed text-zinc-400">
              For instant RTGS / NEFT / IMPS booking account credentials and advance margin receipts, tap WhatsApp Desk below or confirm directly on {contactPhone}.
            </p>
          )}
        </div>

        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
            'Namaste Didwana Bullion Desk, please share current RTGS Bank Details for bullion booking.'
          )}`}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center rounded-xl bg-[#148A14] py-3 text-xs font-extrabold uppercase tracking-wider text-white"
        >
          Request RTGS Details on WhatsApp
        </a>
      </div>
    </BottomSheetModal>
  );
}
