import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(price)
}

export const calculateTotal = (
  basePrice: number,
  layoutModifier: number,
  optionsModifiers: number[]
): number => {
  return basePrice + layoutModifier + optionsModifiers.reduce((a, b) => a + b, 0)
}
