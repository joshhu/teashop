# 茶葉小舖

茶葉小舖是使用 Next.js App Router、TypeScript、Tailwind CSS 與 Supabase 製作的線上商店前台。使用者可以搜尋茶葉、依分類篩選商品、加入購物車、調整數量、查看小計，並填寫姓名、Email、電話送出訂單。

## 技術

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Supabase JavaScript client
- Supabase Postgres + RLS

## 本機設定

1. 安裝套件：

```bash
npm install
```

2. 建立 `.env.local`，填入 Supabase 連線資訊：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase 專案網址
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
```

3. 到 Supabase SQL Editor 執行：

```bash
supabase/schema.sql
```

4. 啟動開發伺服器：

```bash
npm run dev
```

開啟 http://localhost:3000。

## 資料庫設計

SQL 位於 `supabase/schema.sql`，包含三張資料表：

- `products`：商品資料，公開可讀。
- `orders`：訂單主檔，公開可新增，不公開讀取。
- `order_items`：訂單明細，公開可新增，不公開讀取。

因 Supabase 自 2026-04-28 起新表可能不會自動暴露到 Data API，SQL 內已明確加入 `GRANT`，並啟用 RLS 與對應 policy。

## 驗證

```bash
npm run lint
npm run build
```
