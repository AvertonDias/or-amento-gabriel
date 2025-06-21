"use client";

import { useBackgroundTheme } from "@/contexts/background-theme-provider";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Corresponds to classes in globals.css
const backgroundColors = [
  { name: "branco", label: "Branco", className: "bg-branco", colorClass: "bg-white border" },
  { name: "preto", label: "Preto", className: "bg-preto", colorClass: "bg-black" },
  { name: "vermelho", label: "Vermelho", className: "bg-vermelho", colorClass: "bg-red-500" },
  { name: "laranja", label: "Laranja", className: "bg-laranja", colorClass: "bg-orange-500" },
  { name: "amarelo", label: "Amarelo", className: "bg-amarelo", colorClass: "bg-yellow-400" },
  { name: "verde", label: "Verde", className: "bg-verde", colorClass: "bg-green-600" },
  { name: "azul", label: "Azul", className: "bg-azul", colorClass: "bg-blue-700" },
  { name: "roxo", label: "Roxo", className: "bg-roxo", colorClass: "bg-purple-500" },
  { name: "marrom", label: "Marrom", className: "bg-marrom", colorClass: "bg-yellow-900" },
  { name: "cinza-claro", label: "Cinza Claro", className: "bg-cinza-claro", colorClass: "bg-gray-300" },
  { name: "cinza-escuro", label: "Cinza Escuro", className: "bg-cinza-escuro", colorClass: "bg-gray-500" },
];

export function BackgroundColorPicker() {
  const { bgTheme, setBgTheme } = useBackgroundTheme();

  return (
    <div className="flex flex-wrap gap-2">
      {backgroundColors.map((t) => (
         <button
          key={t.name}
          onClick={() => setBgTheme(t.className)}
          className={cn(
            `w-8 h-8 rounded-full flex items-center justify-center transition-all ring-offset-background ring-offset-2 focus:outline-none focus:ring-2 focus:ring-ring`,
            t.colorClass
          )}
          aria-label={`Mudar para fundo ${t.label}`}
          title={t.label}
        >
          {bgTheme === t.className && <Check className="w-5 h-5 text-gray-800 mix-blend-difference" />}
        </button>
      ))}
    </div>
  )
}
