'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
  dismissable?: boolean;
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  children,
  title,
  dismissable = true,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={dismissable ? onClose : undefined}
          />
          <motion.div
            className={`relative w-full ${maxWidth} rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl`}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
                {dismissable && (
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
