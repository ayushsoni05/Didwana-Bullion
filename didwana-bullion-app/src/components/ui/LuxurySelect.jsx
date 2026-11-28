import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export function LuxurySelect({
  value,
  onChange,
  options = [],
  label,
  placeholder = 'Select',
  className,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {label && (
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-[#3D2E1A] bg-white dark:bg-[#0B0907] text-left transition hover:border-[#D4AF37]/60 focus:outline-none',
          compact ? 'px-3 py-1.5 text-[11px]' : 'px-3.5 py-2.5 text-xs'
        )}
      >
        <span className="truncate font-semibold text-zinc-900 dark:text-[#F5F2EB]">
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-[#9A7422] dark:text-[#D4AF37] transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-[#4A371E] bg-white/98 dark:bg-[#15100B]/98 p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.75)] backdrop-blur-xl"
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition',
                    active
                      ? 'bg-[#D4AF37]/15 font-bold text-[#9A7422] dark:text-[#E8C97A]'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{opt.label}</div>
                    {opt.hint && (
                      <div className="truncate text-[10px] text-zinc-400">{opt.hint}</div>
                    )}
                  </div>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
