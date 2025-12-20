
'use client';

import { useEffect, useState } from 'react';

// Este componente está atualmente vazio, pois sua funcionalidade principal
// de gerenciar diálogos de PWA/notificações foi movida para o componente de layout principal
// para melhor integração com o ciclo de vida da aplicação.
// Ele é mantido para evitar erros de importação em outras partes do código
// que possam referenciá-lo e para futuras implementações de PWA.

export function PwaManager() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Retorna null pois não há UI a ser renderizada por este componente no momento.
  if (!mounted) return null;

  return null;
}
