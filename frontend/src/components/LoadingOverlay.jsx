import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function LoadingOverlay({ show, title = 'Processing', detail = 'Analyzing your document…' }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="loading-overlay"
          role="status"
          aria-live="polite"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } }}
        >
          <motion.div
            className="loading-overlay-card"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: 8, scale: 0.985, transition: { duration: 0.14, ease: 'easeIn' } }}
          >
            <div className="loading-overlay-title">{title}</div>
            <div className="loading-overlay-detail">{detail}</div>
            <div className="loading-overlay-bar" aria-hidden="true">
              <motion.div
                className="loading-overlay-barFill"
                initial={{ x: '-60%' }}
                animate={{ x: '60%' }}
                transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

