import React from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';

export default function LoadingOverlay({ show, title = 'Processing', detail = 'Analyzing your document…' }) {
  return (
    <AnimatePresence>
      {show ? (
        <Motion.div
          className="fixed inset-0 z-[900] flex items-center justify-center pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,122,255,0.06) 0%, transparent 60%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } }}
        >
          <Motion.div
            className="glass-card p-6 w-full max-w-md mx-4"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: 8, scale: 0.985, transition: { duration: 0.14, ease: 'easeIn' } }}
          >
            <div className="text-sm font-bold text-white mb-1">{title}</div>
            <div className="text-xs text-white/60 mb-4">{detail}</div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden" aria-hidden="true">
              <Motion.div
                className="h-full w-1/2 bg-gradient-to-r from-[#007AFF] to-[#3395FF] rounded-full"
                initial={{ x: '-60%' }}
                animate={{ x: '60%' }}
                transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
              />
            </div>
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
}
