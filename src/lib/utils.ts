
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined, showSymbol: boolean = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return showSymbol ? 'R$ 0,00' : '0,00';
  }

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  const formatted = new Intl.NumberFormat('pt-BR', options).format(value);
  
  return showSymbol ? formatted : formatted.replace('R$', '').trim();
}

export function formatSmallValueCurrency(value: number | null | undefined, digits: number = 5): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  };
  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat('pt-BR', options).format(0);
  }
  return new Intl.NumberFormat('pt-BR', options).format(value);
}

export function formatNumber(value: number | null | undefined, decimalPlaces: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0,00';
  }

  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  };

  return new Intl.NumberFormat('pt-BR', options).format(value);
}

export const maskTelefone = (value: string): string => {
  if (!value) return ""
  const onlyNums = value.replace(/[^\d]/g, '')
  
  if (onlyNums.length <= 10) {
    // (XX) XXXX-XXXX
    return onlyNums
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14)
  } else {
    // (XX) XXXXX-XXXX
    return onlyNums
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1') // Truncate after 4 digits of the second part
      .slice(0, 15)
  }
}

export const maskCpfCnpj = (value: string): string => {
  if (!value) return ""
  const onlyNums = value.replace(/[^\d]/g, '')

  if (onlyNums.length <= 11) {
    // CPF mask
    return onlyNums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14) // max length for CPF
  } else {
    // CNPJ mask
    return onlyNums
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .slice(0, 18) // max length for CNPJ
  }
}

export const maskCnpj = (value: string): string => {
  if (!value) return ""
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18)
}
