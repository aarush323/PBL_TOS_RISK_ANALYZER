import React from 'react';
import { motion } from 'framer-motion';

export default function SkeletonList({ rows = 5 }) {
  return (
    <div className="history-skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, idx) => (
        <motion.div
          key={idx}
          className="history-skeleton-row"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: idx * 0.08, ease: 'easeInOut' }}
        >
          <div className="history-skeleton-main" />
          <div className="history-skeleton-sub" />
        </motion.div>
      ))}
    </div>
  );
}

