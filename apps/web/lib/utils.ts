import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(value: number | string, currency = 'UYU') {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency }).format(Number(value));
}


export function contrastText(hex?: string | null) {
  const value = (hex ?? '#18181b').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return '#ffffff';
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#111827' : '#ffffff';
}
