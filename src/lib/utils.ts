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
    return '0';
  }

  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  };

  const formatted = new Intl.NumberFormat('pt-BR', options).format(value);
  // Se o valor for inteiro e não for para mostrar casas decimais, não adiciona `,00`
  if (decimalPlaces === 0 && value % 1 === 0) {
    return String(value);
  }
  return formatted;
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

export const maskCurrency = (value: string): string => {
    if (!value) return "";
    let v = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    v = (parseInt(v, 10) / 100).toFixed(2) + '';
    v = v.replace(".", ",");
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return 'R$ ' + v;
}

export const maskDecimal = (value: string): string => {
  if (!value) return "";

  // Permite apenas números e uma vírgula
  let v = value.replace(/[^0-9,]/g, "");

  // Garante que haja apenas uma vírgula no valor
  const commaCount = v.split(",").length - 1;
  if (commaCount > 1) {
    const firstCommaIndex = v.indexOf(",");
    v = v.substring(0, firstCommaIndex + 1) + v.substring(firstCommaIndex + 1).replace(/,/g, "");
  }
  
  // Limita o número de casas decimais a 2
  const parts = v.split(',');
  if (parts[1] && parts[1].length > 2) {
      v = `${parts[0]},${parts[1].substring(0, 2)}`;
  }

  return v;
};

export const maskDecimalWithAutoComma = (value: string): string => {
    if (!value) return "";
    let v = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (!v) return "";
    v = v.padStart(3, '0');
    v = v.slice(0, -2) + ',' + v.slice(-2);
    // Remove zeros à esquerda, exceto se for o único dígito antes da vírgula
    v = v.replace(/^(0)(\d)/, '$2');
    return v;
}

export const maskInteger = (value: string): string => {
  if (!value) return "";
  return value.replace(/[^0-9]/g, '');
}


// --- Funções de Validação de CPF e CNPJ ---

function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

export function validateCpfCnpj(doc: string): 'valid' | 'invalid' | 'incomplete' {
  if (!doc) return 'incomplete';
  const onlyNums = doc.replace(/[^\d]/g, '');
  
  if (onlyNums.length > 11) { // É CNPJ
    if (onlyNums.length < 14) return 'incomplete';
    return validateCNPJ(onlyNums) ? 'valid' : 'invalid';
  } else { // É CPF
    if (onlyNums.length < 11) return 'incomplete';
    return validateCPF(onlyNums) ? 'valid' : 'invalid';
  }
}
