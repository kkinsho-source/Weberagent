# 測試產業建構

互動式產業供應鏈地圖（aistockmap 路線優化版）。

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- React Flow (@xyflow/react) 供應鏈節點圖
- TanStack Query + Zustand
- Supabase
- 部署：Vercel / Docker

## 開發
```bash
npm install
npm run dev      # 建議 PORT=3100
npm run build
```

## 品牌名稱
顯示名稱集中於 `lib/site.ts` 的 `SITE_NAME`，改名只動該檔。

## 結構
```
app/           頁面
components/    ui + map
lib/           types, data, site, store, supabase
```
