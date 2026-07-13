# 階段性進度總結

## 已完成
- [x] Next.js 15 + TS + Tailwind + React Flow 地圖
- [x] TWSE ETL + snapshot 真實行情
- [x] Supabase schema / clients / BFF / push 腳本
- [x] **Auth 登入/註冊 + favorites 自選股**
  - `@supabase/ssr` + middleware session refresh
  - `/login` 登入註冊、`/favorites` 自選頁
  - 個股頁 `FavoriteButton`（雲端 favorites / 本機 fallback）
  - API `GET/POST/DELETE /api/v1/favorites`
  - Header：自選 / 使用者 / 登出

## 待你操作（需憑證）
- [ ] 建立 Supabase 專案 + 執行 schema.sql
- [ ] 填 `.env.local` 三個 key
- [ ] Auth：關閉 Confirm email（開發）+ 設定 Redirect URL
- [ ] `npm run etl:all` 寫入真實行情
- [ ] GitHub remote + push

## 建議下一階段
1. 你填憑證 → 端到端驗證 Auth + 收藏 + ETL
2. 或 MOPS 爬蟲

## 環境約束
- 所有檔案存於 D:\weberanent\
