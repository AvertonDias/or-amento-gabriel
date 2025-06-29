
// src/components/theme-toggle.tsx
"use client";

import { useUnifiedTheme } from "@/contexts/unified-theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { mode, setMode } = useUnifiedTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setMode(mode === "dark" ? "light" : "dark")}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
