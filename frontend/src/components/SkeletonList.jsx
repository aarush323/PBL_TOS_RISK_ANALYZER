import React from 'react';
import { motion as Motion } from 'framer-motion';

export default function SkeletonList({ rows = 5 }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, idx) => (
        <Motion.div
          key={idx}
          className="h-10 bg-white/5 rounded-lg"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: idx * 0.08, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
