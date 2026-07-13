// 互動式供應鏈地圖的 placeholder / 未來接入 React Flow 的容器
export function MapPlaceholder({ title }: { title?: string }) {
  return (
    <div className="flex h-[480px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center">
      <div className="text-4xl">🗺️</div>
      <div className="mt-3 text-base font-medium text-slate-600">
        {title ?? '產業供應鏈地圖'}
      </div>
      <div className="mt-1 max-w-xs text-sm text-slate-400">
        互動式節點圖即將上線（React Flow）：點擊公司查看上下游關聯，支援拖動縮放。
      </div>
    </div>
  );
}
