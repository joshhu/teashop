import { describe, it, expect } from "vitest";
import { cartSubtotal } from "@/lib/cart";
import type { CartLine } from "@/types/database";

function line(price: number, quantity: number): CartLine {
  return {
    product: {
      id: "test",
      name: "測試茶",
      category: "高山烏龍",
      price,
      description: "",
      image_url: "",
      is_active: true,
      created_at: "",
    },
    quantity,
  };
}

describe("cartSubtotal", () => {
  it("單一商品、數量 1", () => {
    expect(cartSubtotal([line(680, 1)])).toBe(680);
  });

  it("數量大於 1 時要乘以數量", () => {
    expect(cartSubtotal([line(680, 2)])).toBe(1360);
  });

  it("數量小於 0 時以 0 計算", () => {
    expect(cartSubtotal([line(680, -1)])).toBe(0);
  });

  it("多項商品加總", () => {
    expect(cartSubtotal([line(680, 2), line(520, 1)])).toBe(1880);
  });
});
