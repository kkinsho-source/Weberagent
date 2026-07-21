/** 題材圖上短標籤（避免過長擠在一起） */
export function shortThemeLabel(title: string, max = 8): string {
  let t = (title || '').trim();
  // 「IC 設計｜HPC…」→ 取｜後；「AI 伺服器組裝」保留
  if (t.includes('｜')) t = t.split('｜').pop()!.trim();
  else if (t.includes('|')) t = t.split('|').pop()!.trim();
  // 常見前綴
  t = t.replace(/^AI\s*/, 'AI');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
