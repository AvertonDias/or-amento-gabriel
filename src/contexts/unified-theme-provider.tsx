// src/contexts/unified-theme-provider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface ThemeProviderState {
  mode: 'light' | 'dark';
  palette: string;
  setMode: (mode: 'light' | 'dark') => void;
  setPalette: (palette: string) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

// As paletas que possuem classes CSS definidas em globals.css
const PALETTE_CLASSES = [
    "theme-green", 
    "theme-violet",
    "theme-rose",
    "theme-vibrant-red",
    "theme-magenta",
    "theme-orange-intense",
    "theme-cyan-electric",
    "theme-wine",
    "theme-terracota"
];

export function UnifiedThemeProvider({ children }: { children: React.ReactNode }) {
  // Define o modo e a paleta padrão
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [palette, setPalette] = useState(''); // "" representa o tema padrão

  // Efeito para aplicar as classes ao elemento <html>
  useEffect(() => {
    // Este efeito deve rodar apenas no cliente
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;

    // Limpa as classes antigas
    root.classList.remove('light', 'dark');
    root.classList.add(mode);

    root.classList.remove(...PALETTE_CLASSES);
    if (palette && PALETTE_CLASSES.includes(palette)) { // Adiciona a classe da paleta apenas se não for a padrão
      root.classList.add(palette);
    }

  }, [mode, palette]);

  // Efeito para carregar as preferências do usuário do localStorage no início
  useEffect(() => {
    // Este efeito deve rodar apenas no cliente
    if (typeof window === 'undefined') return;

    try {
      const savedMode = localStorage.getItem('app-mode') as 'light' | 'dark' | null;
      const savedPalette = localStorage.getItem('app-palette');
      if (savedMode) {
        setMode(savedMode);
      }
      // Verifica se a paleta salva é válida
      if (savedPalette && (PALETTE_CLASSES.includes(savedPalette) || savedPalette === "")) {
        setPalette(savedPalette);
      }
    } catch (e) {
      console.error("Falha ao acessar o localStorage para as configurações de tema.", e);
    }
  }, []);
  
  const handleSetMode = useCallback((newMode: 'light' | 'dark') => {
    try {
      localStorage.setItem('app-mode', newMode);
    } catch(e) {
       console.error("Falha ao salvar o modo no localStorage.", e);
    }
    setMode(newMode);
  }, []);
  
  const handleSetPalette = useCallback((newPalette: string) => {
    try {
      localStorage.setItem('app-palette', newPalette);
    } catch(e) {
      console.error("Falha ao salvar a paleta no localStorage.", e);
    }
    setPalette(newPalette);
  }, []);


  const value = {
    mode,
    palette,
    setMode: handleSetMode,
    setPalette: handleSetPalette,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// Nosso hook UNIFICADO customizado
export const useUnifiedTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useUnifiedTheme deve ser usado dentro de um UnifiedThemeProvider");
  }
  return context;
};
