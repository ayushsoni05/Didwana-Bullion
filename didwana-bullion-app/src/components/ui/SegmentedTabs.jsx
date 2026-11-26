import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function SegmentedTabs({
  tabs,
  activeId,
  onChange,
  layoutId = 'segmented-pill',
  scrollable = false,
  className,
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-[#121216]/90 p-1 shadow-sm',
        scrollable ? 'flex gap-1 overflow-x-auto no-scrollbar' : 'grid',
        className
      )}
      style={
        !scrollable
          ? { gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold tracking-wider uppercase transition-colors',
              scrollable && 'shrink-0',
              isActive
                ? 'text-[#0B0B0D]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#DFC18A] via-[#C8A96E] to-[#B5924C] shadow-sm"
              />
            )}
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
