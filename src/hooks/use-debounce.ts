
'use client';

import { useState, useEffect } from 'react';

/**
 * useDebounce
 * Hook que atrasa a atualização de um valor, útil para evitar
 * execuções excessivas de funções pesadas (como buscas em API)
 * a cada letra digitada.
 *
 * @param value O valor a ser "debounceado".
 * @param delay O tempo de atraso em milissegundos.
 * @returns O valor após o atraso.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configura um timer para atualizar o valor debounced
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o timer se o valor mudar antes do delay terminar
    // ou se o componente for desmontado.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Recria o timer apenas se o valor ou o delay mudarem

  return debouncedValue;
}
