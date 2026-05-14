import React from 'react';
import { motion as Motion } from 'framer-motion';

export default function TypingDots() {
  return (
    <span className="flex items-center gap-1.5" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <Motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/60"
          initial={{ y: 0, opacity: 0.3 }}
          animate={{ y: [0, -3, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}
