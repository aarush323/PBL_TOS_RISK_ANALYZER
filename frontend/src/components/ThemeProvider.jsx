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

    // Get click coordinates (fallback to center of viewport)
    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;

    // Calculate the max radius needed to cover the entire viewport from the click point
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // ─── Path 1: View Transitions API (Chrome 111+, Edge 111+) ───
    if (document.startViewTransition) {
      document.documentElement.style.setProperty('--ripple-x', `${x}px`);
      document.documentElement.style.setProperty('--ripple-y', `${y}px`);
      document.documentElement.style.setProperty('--ripple-radius', `${maxRadius}px`);

      const transition = document.startViewTransition(() => {
        setTheme(nextTheme);
      });

      return; // CSS handles the animation via ::view-transition pseudo-elements
    }

    // ─── Path 2: Clip-path overlay fallback (Safari, Firefox) ───
    const overlay = document.createElement('div');
    overlay.className = 'theme-ripple-overlay';
    // Apply the NEXT theme's colors to the overlay
    overlay.setAttribute('data-theme', nextTheme);
    overlay.style.setProperty('--ripple-x', `${x}px`);
    overlay.style.setProperty('--ripple-y', `${y}px`);
    overlay.style.setProperty('--ripple-radius', `${maxRadius}px`);
    document.body.appendChild(overlay);

    // Force a reframe so the browser registers the starting clip-path
    overlay.offsetHeight; // eslint-disable-line no-unused-expressions

    // Start the expansion
    overlay.classList.add('expanding');

    // After the animation ends, swap the real theme and remove overlay
    const onEnd = () => {
      setTheme(nextTheme);
      // Small delay to ensure the theme swap paints before we remove the overlay
      requestAnimationFrame(() => {
        overlay.remove();
      });
    };

    overlay.addEventListener('animationend', onEnd, { once: true });

    // Safety timeout in case animationend doesn't fire
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
