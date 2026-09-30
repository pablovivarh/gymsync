/**
 * frontend/src/lib/utils.ts
 *
 * Utilidades globales del frontend.
 * La función cn() es el helper de clases de shadcn/ui:
 * combina clsx (clases condicionales) con tailwind-merge
 * (resuelve conflictos entre clases Tailwind como p-2 vs p-4).
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
