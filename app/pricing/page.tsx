const plans = [
  { name: '免費', price: 'NT$0', features: ['基礎題材列表', '每日焦點（部分）', '個股概覽'], cta: '免費開始' },
  { name: 'Premium', price: 'NT$149/月', features: ['完整產業地圖', '法人/大戶資料', '本益比河流圖', 'AI 個股分析', '市場熱力圖'], cta: '立即升級', highlight: true },
];

export default function PricingPage() {
  return (
    <div className="py-8">
      <h1 className="text-center text-2xl font-bold text-slate-800">選擇適合您的方案</h1>
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl border p-6 ${
              p.highlight ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="text-lg font-semibold text-slate-800">{p.name}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{p.price}</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-brand-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`mt-6 w-full rounded-lg py-2 text-sm font-medium ${
                p.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
