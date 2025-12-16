'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function PwaRegistry() {
  useEffect(() => {
    // ❌ Nunca registrar Service Worker dentro do APK
    if (Capacitor.isNativePlatform()) return;

    // ✅ Apenas em produção
    if (process.env.NODE_ENV !== 'production') return;

    // ✅ Verifica suporte
    if (!('serviceWorker' in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log(
          '[PWA] Service Worker registrado com sucesso:',
          registration.scope
        );

        // 🔁 Detecta nova versão do SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('[PWA] Nova versão disponível.');
              // Aqui você pode:
              // - mostrar toast
              // - pedir refresh
              // - atualizar automaticamente
            }
          });
        });
      } catch (error) {
        console.error('[PWA] Falha ao registrar Service Worker:', error);
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}
