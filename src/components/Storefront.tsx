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
    <main className="min-h-screen bg-[#f6f0e5] text-[#1d241e]">
      <section
        className="relative min-h-[78vh] overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/tea-hero.png')" }}
      >
        <div className="absolute inset-0 bg-[#102018]/48" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07110c]/82 via-[#15241a]/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f6f0e5] to-transparent" />
        <div className="relative mx-auto flex min-h-[78vh] w-full max-w-7xl items-center px-5 py-14 sm:px-8 lg:py-20">
          <div className="max-w-3xl text-white">
            <p className="text-xs font-semibold tracking-[0.28em] text-[#e7c98e] sm:text-sm">
              TAIWAN TEA SHOP
            </p>
            <h1 className="font-serif-brand mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-wide sm:text-6xl lg:text-7xl">
              山霧裡的台灣茶香
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-white/86 sm:text-xl">
              精選高山烏龍、蜜香紅茶與冷泡茶款，以乾淨工序保留茶湯層次，為日常留一席溫潤。
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3 text-sm font-medium text-white">
              <a
                href="#products"
                className="rounded-full bg-[#d6a85b] px-6 py-3 font-semibold text-[#18231b] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#e5bd78] focus:outline-none focus:ring-2 focus:ring-white/80"
              >
                瀏覽精選
              </a>
              <span className="rounded-full border border-white/30 bg-white/12 px-4 py-2 backdrop-blur-sm">
                今日商品 {products.length} 款
              </span>
              <span className="rounded-full border border-white/30 bg-white/12 px-4 py-2 backdrop-blur-sm">
                購物車 {itemCount} 件
              </span>
              <span className="rounded-full border border-white/30 bg-white/12 px-4 py-2 backdrop-blur-sm">
                小計 {currency.format(subtotal)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="products"
        className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_400px] lg:items-start lg:py-20"
      >
        <div>
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-[#8a5a1f]">
                SELECTED TEA
              </p>
              <h2 className="font-serif-brand mt-2 text-4xl font-semibold tracking-wide text-[#17241d]">
                精選茶款
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#686154]">
                依香氣、焙度與飲用情境挑選，結帳前可自由調整數量。
              </p>
            </div>
            <p className="shrink-0 rounded-full border border-[#d9c9ad] bg-[#fffaf2] px-4 py-2 text-sm font-semibold text-[#2b5c45]">
              符合 {filteredProducts.length} 筆
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-[#e1d2b8] bg-[#fffaf2]/95 p-5 shadow-sm shadow-[#6f5b3d]/8">
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
              className="mt-2 h-12 w-full rounded-xl border border-[#cbb99f] bg-white px-4 text-[#1d2620] placeholder:text-[#8a938b] focus:outline-none focus:ring-2 focus:ring-[#c99345]"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("")}
                className={`h-10 rounded-full border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#c99345] ${
                  selectedCategory === ""
                    ? "border-[#263a30] bg-[#263a30] text-white"
                    : "border-[#cbb99f] bg-[#f6f0e5] text-[#526056] hover:border-[#8a5a1f] hover:text-[#263a30]"
                }`}
              >
                全部
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-10 rounded-full border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#c99345] ${
                    selectedCategory === category
                      ? "border-[#263a30] bg-[#263a30] text-white"
                      : "border-[#cbb99f] bg-[#f6f0e5] text-[#526056] hover:border-[#8a5a1f] hover:text-[#263a30]"
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
                <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <article
                      key={product.id}
                      className="group flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-[#e1d2b8] bg-[#fffaf2] shadow-[0_18px_45px_rgba(73,55,32,0.08)] transition duration-300 hover:-translate-y-1.5 hover:border-[#c7a66c] hover:shadow-[0_26px_65px_rgba(73,55,32,0.16)]"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-3xl bg-[#efe7db]">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 90vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold tracking-[0.2em] text-[#9b6a2e]">
                              {product.category}
                            </p>
                            <h3 className="font-serif-brand mt-2 text-2xl font-semibold tracking-wide text-[#17241d]">
                              {product.name}
                            </h3>
                          </div>
                          <p className="whitespace-nowrap text-xl font-bold text-[#2b5c45]">
                            {currency.format(product.price)}
                          </p>
                        </div>
                        <p className="mt-4 flex-1 text-[15px] leading-7 text-[#686154]">
                          {product.description}
                        </p>
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="mt-7 h-12 w-full rounded-full bg-[#263a30] px-5 text-sm font-semibold text-white shadow-lg shadow-[#263a30]/15 transition hover:bg-[#345642] hover:shadow-xl hover:shadow-[#263a30]/22 focus:outline-none focus:ring-2 focus:ring-[#c99345]"
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

        <aside className="sticky top-4 rounded-3xl border border-[#e1d2b8] bg-[#fffaf2] p-6 shadow-[0_22px_70px_rgba(73,55,32,0.13)]">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#9b6a2e]">
            CART
          </p>
          <h2 className="font-serif-brand mt-2 text-3xl font-semibold text-[#17241d]">
            購物車
          </h2>
          <div className="mt-5 space-y-4">
            {cartLines.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#cbb99f] bg-white/70 p-5 text-sm leading-6 text-[#667268]">
                尚未加入商品。從左側商品列表挑選喜歡的茶葉。
              </p>
            ) : (
              cartLines.map((line) => (
                <div
                  key={line.product.id}
                  className="rounded-2xl border border-[#eadfce] bg-white/75 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#17241d]">
                        {line.product.name}
                      </p>
                      <p className="mt-1 text-sm text-[#667268]">
                        {currency.format(line.product.price)} / 份
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.product.id, 0)}
                      className="rounded-full px-2 py-1 text-sm font-semibold text-[#9a3d2f] hover:bg-[#fff1e8] hover:text-[#6f2118]"
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
                        className="ml-3 h-10 w-20 rounded-xl border border-[#cbb99f] bg-white px-3 text-[#1d2620] focus:outline-none focus:ring-2 focus:ring-[#c99345]"
                      />
                    </label>
                    <p className="font-semibold text-[#2b5c45]">
                      {currency.format(line.product.price * line.quantity)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#d8c8ad] pt-5">
            <span>小計</span>
            <span className="text-2xl font-bold text-[#2b5c45]">
              {currency.format(subtotal)}
            </span>
          </div>

          <form onSubmit={submitOrder} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold" htmlFor="customer_name">
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
                className="mt-2 h-12 w-full rounded-xl border border-[#cbb99f] bg-white px-4 focus:outline-none focus:ring-2 focus:ring-[#c99345]"
              />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="customer_email">
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
                className="mt-2 h-12 w-full rounded-xl border border-[#cbb99f] bg-white px-4 focus:outline-none focus:ring-2 focus:ring-[#c99345]"
              />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="customer_phone">
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
                className="mt-2 h-12 w-full rounded-xl border border-[#cbb99f] bg-white px-4 focus:outline-none focus:ring-2 focus:ring-[#c99345]"
              />
            </div>

            <button
              type="submit"
              disabled={checkoutState === "submitting" || cartLines.length === 0}
              className="h-12 w-full rounded-full bg-[#d6a85b] px-4 font-semibold text-[#17241d] shadow-lg shadow-[#9b6a2e]/16 transition hover:bg-[#e5bd78] focus:outline-none focus:ring-2 focus:ring-[#263a30] disabled:cursor-not-allowed disabled:bg-[#d9d1c4] disabled:text-[#756d62]"
            >
              {checkoutState === "submitting" ? "送出中..." : "送出訂單"}
            </button>

            {checkoutMessage ? (
              <p
                className={`border p-3 text-sm leading-6 ${
                  checkoutState === "success"
                    ? "rounded-2xl border-[#98b894] bg-[#f3fbef] text-[#2d5e36]"
                    : "rounded-2xl border-[#c07166] bg-[#fff8f3] text-[#8a2f24]"
                }`}
              >
                {checkoutMessage}
              </p>
            ) : null}
          </form>
        </aside>
      </section>

      <footer className="border-t border-[#dfd0b8] bg-[#17241d] px-5 py-10 text-[#efe6d6] sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-serif-brand text-2xl font-semibold">茶葉小舖</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#d8c9ad]">
              從台灣山林與茶席出發，挑選適合日常、款待與冷泡的風味茶款。
            </p>
          </div>
          <p className="text-sm text-[#c7b897]">
            © 2026 茶葉小舖. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
