
// src/contexts/text-theme-provider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

// Matches classes in globals.css, e.g., body.text-vermelho
const TEXT_THEMES = [
  "text-preto", "text-branco", "text-vermelho", "text-amarelo", "text-verde",
  "text-laranja", "text-azul", "text-roxo", "text-cinza-claro", "text-cinza-escuro", "text-marrom"
] as const;

type TextTheme = (typeof TEXT_THEMES)[number];

type TextThemeContextType = {
  textTheme: TextTheme;
  setTextTheme: (theme: TextTheme) => void;
  textThemes: typeof TEXT_THEMES;
};

const DEFAULT_THEME: TextTheme = "text-preto";
const STORAGE_KEY = "app-text-theme";

const TextThemeContext = createContext<TextThemeContextType | undefined>(undefined);

export function TextThemeProvider({ children }: { children: React.ReactNode }) {
  const [textTheme, setTextThemeState] = useState<TextTheme>(DEFAULT_THEME);
  const [isMounted, setIsMounted] = useState(false);

  // Apply the theme class to the body
  useEffect(() => {
    if (!isMounted) return;
    
    const body = document.body;
    // Remove all possible theme classes to avoid conflicts
    TEXT_THEMES.forEach((t) => {
       if(body.classList.contains(t)) {
            body.classList.remove(t);
        }
    });
    // Add the new theme class
    body.classList.add(textTheme);
  }, [textTheme, isMounted]);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as TextTheme | null;
      if (savedTheme && TEXT_THEMES.includes(savedTheme)) {
        setTextThemeState(savedTheme);
      }
    } catch (error) {
      console.warn("Failed to access localStorage for text theme", error);
    }
    setIsMounted(true);
  }, []);

  const setTextTheme = (newTheme: TextTheme) => {
    if (!TEXT_THEMES.includes(newTheme)) {
      console.warn(`Theme "${newTheme}" is not a valid text theme.`);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      setTextThemeState(newTheme);
    } catch (error) {
       console.warn("Failed to save text theme to localStorage", error);
    }
  };
  
  const value = useMemo(() => ({ textTheme, setTextTheme, textThemes: TEXT_THEMES }), [textTheme]);

  return (
    <TextThemeContext.Provider value={value}>
      {children}
    </TextThemeContext.Provider>
  );
}

export function useTextTheme() {
  const context = useContext(TextThemeContext);
  if (context === undefined) {
    throw new Error("useTextTheme must be used within a TextThemeProvider");
  }
  return context;
}
