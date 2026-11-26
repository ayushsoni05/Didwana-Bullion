import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function ShimmerButton({
  children,
  className,
  variant = 'gold', // 'gold' | 'outline' | 'danger'
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const variants = {
    gold: 'bg-gradient-to-r from-[#DFC18A] via-[#C8A96E] to-[#B5924C] text-[#0B0B0D] shadow-[0_10px_28px_-10px_rgba(200,169,110,0.65)] border border-[#DFC18A]/50',
    outline:
      'bg-white dark:bg-[#121216] text-[#8C6A2E] dark:text-[#DFC18A] border border-[#C8A96E]/45 hover:border-[#C8A96E]',
    danger:
      'bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/30',
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? undefined : { scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'relative overflow-hidden rounded-xl px-4 py-3 text-xs font-bold tracking-wider uppercase transition-opacity disabled:opacity-50 flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {variant === 'gold' && !disabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmerSweep_2.8s_infinite]"
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}
