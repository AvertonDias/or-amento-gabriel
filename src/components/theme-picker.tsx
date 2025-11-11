// src/components/theme-picker.tsx
"use client";

import { useUnifiedTheme } from "@/contexts/unified-theme-provider"; 
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const paletas = [
  { name: "Padrão", value: "", color: "#64748b" }, // Cinza ardósia
  { name: "Violeta", value: "theme-violet", color: "#8b5cf6" },
  { name: "Rosa", value: "theme-rose", color: "#f43f5e" },
  { name: "Verde", value: "theme-green", color: "#22c55e" },
  { name: "Vermelho", value: "theme-vibrant-red", color: "#FF001C" },
  { name: "Magenta", value: "theme-magenta", color: "#EA3FF7" },
  { name: "Laranja", value: "theme-orange-intense", color: "#F75E0B" },
  { name: "Ciano", value: "theme-cyan-electric", color: "#0AEEF5" },
  { name: "Vinho", value: "theme-wine", color: "#851947" },
  { name: "Terracota", value: "theme-terracota", color: "#D9795D" },
];


export function ThemePicker() {
  const { palette, setPalette } = useUnifiedTheme();

  return (
    <div className="flex flex-wrap gap-2">
        {paletas.map((p) => (
            <button
                key={p.name}
                onClick={() => setPalette(p.value)}
                className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                )}
                style={{ 
                    backgroundColor: p.color,
                    borderColor: palette === p.value ? "hsl(var(--ring))" : 'transparent'
                }}
                title={p.name}
            >
                {palette === p.value && <Check className="h-5 w-5 text-white mix-blend-difference" />}
            </button>
        ))}
    </div>
  );
}
