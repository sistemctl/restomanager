import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | { toString(): string },
  symbol = "$"
): string {
  const numericAmount = typeof amount === "number" ? amount : Number(amount.toString());
  if (isNaN(numericAmount)) return `${symbol} 0`;

  return `${symbol} ${numericAmount.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
