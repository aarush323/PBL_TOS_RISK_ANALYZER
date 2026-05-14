import React from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';

export default function LoadingOverlay({ show, title = 'Processing', detail = 'Analyzing your document…' }) {
  return (
    <AnimatePresence>
      {show ? (
        <Motion.div
          className="fixed inset-0 z-[900] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } }}
        >
          <Motion.div
            className="w-full max-w-md mx-4 p-6 rounded-2xl"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: 8, scale: 0.985, transition: { duration: 0.14, ease: 'easeIn' } }}
          >
            <div style={{ fontFamily: 'var(--font-family-sans)', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
            <div style={{ fontFamily: 'var(--font-family-sans)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{detail}</div>
            <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '999px', overflow: 'hidden' }} aria-hidden="true">
              <Motion.div
                className="h-full rounded-full"
                style={{ width: '50%', background: 'var(--text-primary)' }}
                initial={{ x: '-60%' }}
                animate={{ x: '120%' }}
                transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
              />
            </div>
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
}
