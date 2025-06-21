'use client';

// Este componente não é ativamente utilizado quando next-pwa é configurado com register:true.
// O plugin next-pwa lida com o registro do service worker automaticamente.
// Manter este arquivo pode ser útil para futuras customizações ou se o registro automático for desabilitado.
import { useEffect } from 'react';

export default function PwaRegistry() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Se next-pwa estiver configurado para não registrar automaticamente (register: false),
      // você pode adicionar a lógica de registro aqui.
      // Exemplo: navigator.serviceWorker.register('/sw.js').then(...);
      console.log('PwaRegistry: Service worker registration is typically handled by next-pwa.');
    }
  }, []);

  return null;
}
