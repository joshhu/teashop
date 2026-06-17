"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { CartLine, CheckoutForm, Product } from "@/types/database";

const currency = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

const initialForm: CheckoutForm = {
  customer_name: "",
  customer_email: "",
  customer_phone: "",
};

const categories = [
  "高山烏龍",
  "台灣紅茶",
  "蜜香烏龍",
  "焙火茶",
  "冷泡茶",
] as const;

type CheckoutState = "idle" | "submitting" | "success" | "error";

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .select(
            "id,name,category,price,description,image_url,is_active,created_at",
          )
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (error) {
          throw error;
        }

        if (isMounted) {
          setProducts((data ?? []) as Product[]);
          setLoadError("");
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "商品載入失敗，請稍後再試。",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const subtotal = useMemo(
    () =>
      cartLines.reduce(
        (sum, line) => sum + line.product.price * line.quantity,
        0,
      ),
    [cartLines],
  );
  const itemCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.quantity, 0),
    [cartLines],
  );
  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase("zh-TW");

    return products.filter((product) => {
      const matchesKeyword =
        keyword.length === 0 ||
        product.name.toLocaleLowerCase("zh-TW").includes(keyword);
      const matchesCategory =
        selectedCategory.length === 0 || product.category === selectedCategory;

      return matchesKeyword && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  function addToCart(product: Product) {
    setCheckoutState("idle");
    setCheckoutMessage("");
    setCart((current) => {
      const existing = current[product.id];
      return {
        ...current,
        [product.id]: {
          product,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      };
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((current) => {
      if (quantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }

      return {
        ...current,
        [productId]: {
          ...current[productId],
          quantity,
        },
      };
    });
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutState("submitting");
    setCheckoutMessage("");

    if (cartLines.length === 0) {
      setCheckoutState("error");
      setCheckoutMessage("購物車目前是空的，請先加入茶葉。");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const orderId = crypto.randomUUID();
      const { error: orderError } = await supabase
        .from("orders")
        .insert({
          id: orderId,
          customer_name: form.customer_name.trim(),
          customer_email: form.customer_email.trim(),
          customer_phone: form.customer_phone.trim(),
          total_amount: subtotal,
        });

      if (orderError) {
        throw orderError;
      }

      const orderItems = cartLines.map((line) => ({
        order_id: orderId,
        product_id: line.product.id,
        product_name: line.product.name,
        unit_price: line.product.price,
        quantity: line.quantity,
        line_total: line.product.price * line.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        throw itemsError;
      }

      setCart({});
      setForm(initialForm);
      setCheckoutState("success");
      setCheckoutMessage("訂單已送出，我們會盡快與您確認。");
    } catch (error) {
      setCheckoutState("error");
      setCheckoutMessage(
        error instanceof Error ? error.message : "訂單送出失敗，請稍後再試。",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d2620]">
      <section
        className="relative min-h-[72vh] overflow-hidden border-b border-[#dfd5c5] bg-cover bg-center"
        style={{ backgroundImage: "url('/tea-hero.png')" }}
      >
        <div className="absolute inset-0 bg-[#0d1f18]/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06150f]/70 via-[#06150f]/35 to-[#06150f]/10" />
        <div className="relative mx-auto flex min-h-[72vh] w-full max-w-7xl items-center px-5 py-12 sm:px-8 lg:py-16">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-semibold tracking-[0.18em] text-[#f2d8a5]">
              TAIWAN TEA SHOP
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              茶葉小舖
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/88">
              精選台灣高山烏龍、紅玉紅茶與冷泡茶，從商品挑選到送出訂單都在同一頁完成。
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-white">
              <span className="border border-white/35 bg-white/14 px-4 py-2 backdrop-blur-sm">
                今日商品 {products.length} 款
              </span>
              <span className="border border-white/35 bg-white/14 px-4 py-2 backdrop-blur-sm">
                購物車 {itemCount} 件
              </span>
              <span className="border border-white/35 bg-white/14 px-4 py-2 backdrop-blur-sm">
                小計 {currency.format(subtotal)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_390px] lg:items-start lg:py-16">
        <div>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.16em] text-[#8a5a1f]">
                SELECTED TEA
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#17241d]">
                精選茶款
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#667268]">
                依香氣、焙度與飲用情境挑選，結帳前可自由調整數量。
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-[#2b5c45]">
              符合 {filteredProducts.length} 筆
            </p>
          </div>

          <div className="mb-6 rounded-lg border border-[#e3d6c3] bg-white/90 p-4 shadow-sm shadow-[#6f5b3d]/5">
            <label
              className="block text-sm font-semibold text-[#263a30]"
              htmlFor="product_search"
            >
              搜尋茶葉
            </label>
            <input
              id="product_search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="輸入茶葉名稱關鍵字"
              className="mt-2 h-11 w-full border border-[#cbb99f] bg-[#fffdf9] px-3 text-[#1d2620] placeholder:text-[#8a938b] focus:outline-none focus:ring-2 focus:ring-[#c99345]"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("")}
                className={`h-10 border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#c99345] ${
                  selectedCategory === ""
                    ? "border-[#263a30] bg-[#263a30] text-white"
                    : "border-[#cbb99f] bg-[#f8f5ef] text-[#526056] hover:border-[#8a5a1f] hover:text-[#263a30]"
                }`}
              >
                全部
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-10 border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#c99345] ${
                    selectedCategory === category
                      ? "border-[#263a30] bg-[#263a30] text-white"
                      : "border-[#cbb99f] bg-[#f8f5ef] text-[#526056] hover:border-[#8a5a1f] hover:text-[#263a30]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="border border-[#d8c8ad] bg-white p-8 text-[#526056]">
              商品載入中...
            </div>
          ) : loadError ? (
            <div className="border border-[#c07166] bg-[#fff8f3] p-8 text-[#8a2f24]">
              {loadError}
            </div>
          ) : products.length === 0 ? (
            <div className="border border-[#d8c8ad] bg-white p-8 text-[#526056]">
              目前沒有上架商品，請先在 Supabase 匯入範例資料。
            </div>
          ) : (
            <>
              {filteredProducts.length === 0 ? (
                <div className="border border-dashed border-[#cbb99f] bg-white p-8 text-[#526056]">
                  沒有符合條件的茶葉，請調整搜尋關鍵字或分類。
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <article
                      key={product.id}
                      className="group flex h-full min-h-[460px] flex-col overflow-hidden rounded-xl border border-[#e0d4c2] bg-white shadow-sm shadow-[#7b6a4f]/10 transition duration-300 hover:-translate-y-1 hover:border-[#c7a66c] hover:shadow-2xl hover:shadow-[#6f5b3d]/18"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-[#efe7db]">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 90vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold tracking-[0.16em] text-[#9b6a2e]">
                              {product.category}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#17241d]">
                              {product.name}
                            </h3>
                          </div>
                          <p className="whitespace-nowrap text-lg font-semibold text-[#2b5c45]">
                            {currency.format(product.price)}
                          </p>
                        </div>
                        <p className="mt-4 flex-1 text-[15px] leading-7 text-[#5f6b62]">
                          {product.description}
                        </p>
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="mt-6 h-12 w-full rounded-lg bg-[#263a30] px-4 text-sm font-semibold text-white transition hover:bg-[#355a46] focus:outline-none focus:ring-2 focus:ring-[#c99345]"
                        >
                          加入購物車
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <aside className="sticky top-4 border border-[#d8c8ad] bg-white p-5 shadow-xl shadow-[#7b6a4f]/10">
          <h2 className="text-2xl font-semibold">購物車</h2>
          <div className="mt-5 space-y-4">
            {cartLines.length === 0 ? (
              <p className="border border-dashed border-[#cbb99f] p-5 text-sm leading-6 text-[#667268]">
                尚未加入商品。從左側商品列表挑選喜歡的茶葉。
              </p>
            ) : (
              cartLines.map((line) => (
                <div
                  key={line.product.id}
                  className="border-b border-[#eadfce] pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{line.product.name}</p>
                      <p className="mt-1 text-sm text-[#667268]">
                        {currency.format(line.product.price)} / 份
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.product.id, 0)}
                      className="text-sm font-semibold text-[#9a3d2f] hover:text-[#6f2118]"
                    >
                      移除
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="text-sm text-[#667268]">
                      數量
                      <input
                        min={1}
                        type="number"
                        value={line.quantity}
                        onChange={(event) =>
                          updateQuantity(
                            line.product.id,
                            Number(event.target.value),
                          )
                        }
                        className="ml-3 h-10 w-20 border border-[#cbb99f] px-3 text-[#1d2620] focus:outline-none focus:ring-2 focus:ring-[#c99345]"
                      />
                    </label>
                    <p className="font-semibold">
                      {currency.format(line.product.price * line.quantity)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#d8c8ad] pt-5 text-lg font-semibold">
            <span>小計</span>
            <span>{currency.format(subtotal)}</span>
          </div>

          <form onSubmit={submitOrder} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="customer_name">
                姓名
              </label>
              <input
                id="customer_name"
                required
                value={form.customer_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customer_name: event.target.value,
                  }))
                }
                className="mt-2 h-11 w-full border border-[#cbb99f] px-3 focus:outline-none focus:ring-2 focus:ring-[#c99345]"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="customer_email">
                Email
              </label>
              <input
                id="customer_email"
                required
                type="email"
                value={form.customer_email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customer_email: event.target.value,
                  }))
                }
                className="mt-2 h-11 w-full border border-[#cbb99f] px-3 focus:outline-none focus:ring-2 focus:ring-[#c99345]"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="customer_phone">
                電話
              </label>
              <input
                id="customer_phone"
                required
                inputMode="tel"
                value={form.customer_phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customer_phone: event.target.value,
                  }))
                }
                className="mt-2 h-11 w-full border border-[#cbb99f] px-3 focus:outline-none focus:ring-2 focus:ring-[#c99345]"
              />
            </div>

            <button
              type="submit"
              disabled={checkoutState === "submitting" || cartLines.length === 0}
              className="h-12 w-full bg-[#c99345] px-4 font-semibold text-[#1d2620] transition hover:bg-[#d7a35b] focus:outline-none focus:ring-2 focus:ring-[#263a30] disabled:cursor-not-allowed disabled:bg-[#d9d1c4] disabled:text-[#756d62]"
            >
              {checkoutState === "submitting" ? "送出中..." : "送出訂單"}
            </button>

            {checkoutMessage ? (
              <p
                className={`border p-3 text-sm leading-6 ${
                  checkoutState === "success"
                    ? "border-[#98b894] bg-[#f3fbef] text-[#2d5e36]"
                    : "border-[#c07166] bg-[#fff8f3] text-[#8a2f24]"
                }`}
              >
                {checkoutMessage}
              </p>
            ) : null}
          </form>
        </aside>
      </section>
    </main>
  );
}
