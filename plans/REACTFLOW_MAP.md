# React Flow 互動式供應鏈地圖 — 執行計劃

> **For Hermes:** 逐步執行（subagent-driven 精神，但本 session 由威柏直接執行並逐步確認）
> **目標產品:** 複製並優化 aistockmap.com
> **當前模組:** Phase 0 收尾 — 靜態 MapPlaceholder → React Flow 互動地圖

**Goal:** 用 React Flow 把現有靜態地圖 placeholder 換成可拖動、縮放、點擊高亮的供應鏈節點圖。

**Architecture:** 資料層維持 `lib/data/mock.ts`（股對股 supplyEdges）→ `lib/data/graph.ts` 轉 React Flow nodes/edges（依產業分層 layout）→ `components/map/SupplyChainGraph.tsx`（client, React Flow 渲染 + 點擊高亮）→ `components/map/MapView.tsx`（dynamic import ssr:false wrapper）→ 首頁/題材頁接入。

**Tech Stack:** Next.js 15 App Router · @xyflow/react v12 · TypeScript · Tailwind

**檔案位置約束:** 所有檔案位於 `D:\weberanent\aistockmap-project\`

---

## Task 1 — 重構 supplyEdges 為股對股（資料層）
- `lib/data/mock.ts`: 把 `supplyEdges` 從 `theme→stock` 改為 `stock→stock`（製程流向 source=前段, target=後段）
- 邊語意: 設計(0)→代工(1)→封測(2)→組裝(3)→PCB/CCL(4)

## Task 2 — 新增 graph 轉換函式
- `lib/data/graph.ts`: `toFlowNodes()`（依 industry 分層自動 layout）、`toFlowEdges()`
- `lib/data/graph.test.ts`: 驗證 nodes 數=stocks 數、edges 端點都存在

## Task 3 — React Flow 元件
- `components/map/SupplyChainGraph.tsx` ('use client'): ReactFlow + 自訂 stock node + 點擊高亮上下游
- `components/map/MapView.tsx` ('use client'): dynamic import ssr:false 包裝（避免 SSR window 錯）

## Task 4 — 接入頁面 + build 驗證
- `app/page.tsx`: 首頁用 MapView 取代 MapPlaceholder
- `app/themes/[slug]/page.tsx`: 題材頁用該題材子圖
- `npm run build` 必須通過

---

## 驗證方式
- Task 2: `npx tsx lib/data/graph.test.ts` → 輸出 `OK: 20 nodes, N edges`
- Task 4: `npm run build` → 7 路由編譯成功；`npm run dev` 手動點擊確認互動
