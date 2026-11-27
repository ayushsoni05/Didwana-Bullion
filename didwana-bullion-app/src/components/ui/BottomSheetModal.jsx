import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export function BottomSheetModal({ open, onClose, title, icon: Icon, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-[#D4AF37]/30 bg-white dark:bg-[#10141F] p-5 shadow-2xl max-h-[88vh] flex flex-col safe-bottom"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-white/15 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/10">
              <div className="flex items-center gap-2.5 text-[#9A7422] dark:text-[#E8C97A]">
                {Icon && <Icon className="h-5 w-5" />}
                <h3 className="font-serif-luxury text-lg font-bold tracking-wide">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-zinc-100 dark:bg-white/5 p-1.5 text-zinc-500 dark:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
