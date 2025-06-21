
import { useState, useEffect } from 'react';

/**
 * useLocalStorage<T>
 * Hook personalizado para ler e escrever dados no localStorage de forma tipada e segura.
 *
 * @param key          A chave sob a qual o valor será salvo no localStorage.
 * @param initialValue Valor inicial (usado caso não exista nada salvo ainda).
 * @returns            [valorAtual, funçãoParaAtualizarOValor]
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Estado interno que representa o valor salvo
  const [storedValue, setStoredValue] = useState<T>(() => {
    // SSR safety: se não houver window, retorna valor inicial
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`Erro ao ler a chave localStorage “${key}”:`, error);
      return initialValue;
    }
  });

  // Função para atualizar o estado e o localStorage
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      // Permite atualização baseada no valor anterior
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Atualiza o estado React
      setStoredValue(valueToStore);
      // Grava no localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Erro ao gravar a chave localStorage “${key}”:`, error);
    }
  };

  return [storedValue, setValue] as const;
}
