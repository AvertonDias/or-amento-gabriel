// src/contexts/background-theme-provider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

// Matches classes in globals.css, e.g., body.bg-vermelho
const BG_THEMES = [
  "bg-branco", "bg-preto", "bg-vermelho", "bg-amarelo", "bg-verde",
  "bg-laranja", "bg-azul", "bg-roxo", "bg-cinza-claro", "bg-cinza-escuro", "bg-marrom"
] as const;

type BgTheme = (typeof BG_THEMES)[number];

type BgThemeContextType = {
  bgTheme: BgTheme;
  setBgTheme: (theme: BgTheme) => void;
  bgThemes: typeof BG_THEMES;
};

const DEFAULT_THEME: BgTheme = "bg-branco";
const STORAGE_KEY = "app-bg-theme";

const BgThemeContext = createContext<BgThemeContextType | undefined>(undefined);

export function BackgroundThemeProvider({ children }: { children: React.ReactNode }) {
  const [bgTheme, setBgThemeState] = useState<BgTheme>(DEFAULT_THEME);
  const [isMounted, setIsMounted] = useState(false);

  // Apply the theme class to the body
  useEffect(() => {
    if (!isMounted) return;
    
    const body = document.body;
    // Remove all possible theme classes to avoid conflicts
    BG_THEMES.forEach((t) => {
        if(body.classList.contains(t)) {
            body.classList.remove(t);
        }
    });
    // Add the new theme class
    body.classList.add(bgTheme);
  }, [bgTheme, isMounted]);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as BgTheme | null;
      if (savedTheme && BG_THEMES.includes(savedTheme)) {
        setBgThemeState(savedTheme);
      }
    } catch (error) {
      console.warn("Failed to access localStorage for background theme", error);
    }
    setIsMounted(true);
  }, []);

  const setBgTheme = (newTheme: BgTheme) => {
    if (!BG_THEMES.includes(newTheme)) {
      console.warn(`Theme "${newTheme}" is not a valid background theme.`);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      setBgThemeState(newTheme);
    } catch (error) {
       console.warn("Failed to save background theme to localStorage", error);
    }
  };
  
  const value = useMemo(() => ({ bgTheme, setBgTheme, bgThemes: BG_THEMES }), [bgTheme]);

  return (
    <BgThemeContext.Provider value={value}>
      {children}
    </BgThemeContext.Provider>
  );
}

export function useBackgroundTheme() {
  const context = useContext(BgThemeContext);
  if (context === undefined) {
    throw new Error("useBackgroundTheme must be used within a BackgroundThemeProvider");
  }
  return context;
}
