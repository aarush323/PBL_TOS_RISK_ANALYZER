import React from 'react';
import { motion } from 'framer-motion';

export default function TypingDots() {
  return (
    <span className="typing-dots" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="typing-dot"
          initial={{ y: 0, opacity: 0.3 }}
          animate={{ y: [0, -3, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

