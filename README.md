# AI 智慧產業地圖 (aistockmap clone +)

互動式 AI 產業供應鏈地圖，目標超越 aistockmap.com。

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- React Flow (@xyflow/react) 供應鏈節點圖
- TanStack Query + Zustand
- Supabase (Phase 1 接入)
- 部署：Vercel / Docker

## 開發
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npx tsx lib/data/graph.test.ts   # 圖資料單元測試
```

## Docker
```bash
docker compose up --build
```

## 結構
```
app/           頁面 (首頁/題材/個股/登入/定價)
components/    ui + map (React Flow)
lib/           types, data(mock), data/graph, store, supabase
plans/         執行計劃
```
