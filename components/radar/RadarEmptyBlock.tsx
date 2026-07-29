/** R8：空狀態／提示用白話元件 */

export function RadarEmptyBlock({
  title,
  children,
  tone = 'neutral',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'warn';
}) {
  const box =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50/70 text-amber-950'
      : 'border-slate-200 bg-slate-50 text-slate-600';
  return (
    <div className={`rounded-xl border border-dashed px-4 py-8 text-center ${box}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mx-auto mt-2 max-w-md text-xs leading-relaxed opacity-90">{children}</div>
    </div>
  );
}
