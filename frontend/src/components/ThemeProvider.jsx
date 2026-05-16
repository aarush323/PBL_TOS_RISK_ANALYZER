import React, { useState, useEffect, useCallback } from 'react';
import { ThemeContext } from './theme-context.js';

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('jurist-theme');
    if (stored) return stored;
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jurist-theme', theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => {
      if (!localStorage.getItem('jurist-theme')) {
        setTheme(e.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = useCallback((event) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;

    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    if (document.startViewTransition) {
      document.documentElement.style.setProperty('--ripple-x', `${x}px`);
      document.documentElement.style.setProperty('--ripple-y', `${y}px`);
      document.documentElement.style.setProperty('--ripple-radius', `${maxRadius}px`);

      const transition = document.startViewTransition(() => {
        setTheme(nextTheme);
      });

      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'theme-ripple-overlay';
    overlay.setAttribute('data-theme', nextTheme);
    overlay.style.setProperty('--ripple-x', `${x}px`);
    overlay.style.setProperty('--ripple-y', `${y}px`);
    overlay.style.setProperty('--ripple-radius', `${maxRadius}px`);
    document.body.appendChild(overlay);

    overlay.offsetHeight;

    overlay.classList.add('expanding');

    const onEnd = () => {
      setTheme(nextTheme);
      requestAnimationFrame(() => {
        overlay.remove();
      });
    };

    overlay.addEventListener('animationend', onEnd, { once: true });

    setTimeout(() => {
      if (document.body.contains(overlay)) {
        setTheme(nextTheme);
        overlay.remove();
      }
    }, 800);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
