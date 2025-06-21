"use client";

import { useTextTheme } from "@/contexts/text-theme-provider";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Corresponds to classes in globals.css
const textColors = [
  { name: "preto", label: "Preto", className: "text-preto", colorClass: "bg-black" },
  { name: "branco", label: "Branco", className: "text-branco", colorClass: "bg-white border" },
  { name: "vermelho", label: "Vermelho", className: "text-vermelho", colorClass: "bg-red-500" },
  { name: "laranja", label: "Laranja", className: "text-laranja", colorClass: "bg-orange-500" },
  { name: "amarelo", label: "Amarelo", className: "text-amarelo", colorClass: "bg-yellow-400" },
  { name: "verde", label: "Verde", className: "text-verde", colorClass: "bg-green-600" },
  { name: "azul", label: "Azul", className: "text-azul", colorClass: "bg-blue-700" },
  { name: "roxo", label: "Roxo", className: "text-roxo", colorClass: "bg-purple-500" },
  { name: "marrom", label: "Marrom", className: "text-marrom", colorClass: "bg-yellow-900" },
  { name: "cinza-claro", label: "Cinza Claro", className: "text-cinza-claro", colorClass: "bg-gray-300" },
  { name: "cinza-escuro", label: "Cinza Escuro", className: "text-cinza-escuro", colorClass: "bg-gray-500" },
] as const;

export function ThemeCustomizer() {
  const { textTheme, setTextTheme } = useTextTheme();

  return (
    <div className="flex flex-wrap gap-2">
      {textColors.map((t) => (
        <button
          key={t.name}
          onClick={() => setTextTheme(t.className)}
          className={cn(
            `w-8 h-8 rounded-full flex items-center justify-center transition-all ring-offset-background ring-offset-2 focus:outline-none focus:ring-2 focus:ring-ring`,
            t.colorClass
          )}
          aria-label={`Mudar para texto ${t.label}`}
          title={t.label}
        >
          {textTheme === t.className && <Check className="w-5 h-5 text-gray-800 mix-blend-difference" />}
        </button>
      ))}
    </div>
  );
}
