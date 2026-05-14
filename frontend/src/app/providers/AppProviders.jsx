import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ThemeProvider from '@/components/ThemeProvider.jsx';
import { AppProvider } from '@/context/AppContext.jsx';

export default function AppProviders({ children }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>{children}</AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
