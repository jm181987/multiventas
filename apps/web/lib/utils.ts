import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(value: number | string, currency = 'UYU') {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency }).format(Number(value));
}
