'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, themes, ThemeName } from '@/lib/themes';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as ThemeName;
    if (savedTheme && themes[savedTheme]) {
      setThemeName(savedTheme);
    } else {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeName(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme', themeName);
      
      // Apply theme to document
      const theme = themes[themeName];
      const root = document.documentElement;
      
      // Set CSS custom properties
      root.style.setProperty('--color-primary', theme.colors.primary);
      root.style.setProperty('--color-secondary', theme.colors.secondary);
      root.style.setProperty('--color-accent', theme.colors.accent);
      root.style.setProperty('--color-background', theme.colors.background);
      root.style.setProperty('--color-surface', theme.colors.surface);
      root.style.setProperty('--color-text-primary', theme.colors.text.primary);
      root.style.setProperty('--color-text-secondary', theme.colors.text.secondary);
      root.style.setProperty('--color-text-muted', theme.colors.text.muted);
      root.style.setProperty('--color-border', theme.colors.border);
      root.style.setProperty('--color-success', theme.colors.success);
      root.style.setProperty('--color-warning', theme.colors.warning);
      root.style.setProperty('--color-error', theme.colors.error);
      root.style.setProperty('--color-info', theme.colors.info);
      
      // Set gradients
      root.style.setProperty('--gradient-primary', theme.gradients.primary);
      root.style.setProperty('--gradient-secondary', theme.gradients.secondary);
      root.style.setProperty('--gradient-hero', theme.gradients.hero);
      
      // Set shadows
      root.style.setProperty('--shadow-sm', theme.shadows.sm);
      root.style.setProperty('--shadow-md', theme.shadows.md);
      root.style.setProperty('--shadow-lg', theme.shadows.lg);
      root.style.setProperty('--shadow-xl', theme.shadows.xl);
      
      // Set border radius
      root.style.setProperty('--radius-sm', theme.borderRadius.sm);
      root.style.setProperty('--radius-md', theme.borderRadius.md);
      root.style.setProperty('--radius-lg', theme.borderRadius.lg);
      root.style.setProperty('--radius-xl', theme.borderRadius.xl);
      
      // Set data attribute for CSS selectors
      document.documentElement.setAttribute('data-theme', themeName);
    }
  }, [themeName, mounted]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeName(newTheme);
  };

  const toggleTheme = () => {
    setThemeName(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ 
      theme: themes[themeName], 
      themeName, 
      setTheme, 
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}