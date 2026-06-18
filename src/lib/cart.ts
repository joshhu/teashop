import type { CartLine } from "@/types/database";

/**
 * 計算購物車小計（新台幣，整數）。
 */
export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce(
    (sum, line) => sum + line.product.price * Math.max(line.quantity, 0),
    0,
  );
}
