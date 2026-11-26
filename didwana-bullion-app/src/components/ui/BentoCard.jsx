import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function BentoCard({ children, className, glow = true, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-[#9E7D47]/25 bg-white dark:bg-[#121216] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_40px_-14px_rgba(200,169,110,0.1)]',
        className
      )}
      {...props}
    >
      {glow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#C8A96E]/8 dark:from-[#DFC18A]/7 to-transparent"
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
