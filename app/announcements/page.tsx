import { MopsAnnouncementsPanel } from '@/components/mops/MopsAnnouncementsPanel';

export const metadata = {
  title: '重大訊息｜AI 智慧產業地圖',
  description: '公開資訊觀測站 / 證交所重大訊息彙整',
};

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">重大訊息</h1>
        <p className="mt-1 text-sm text-slate-500">
          資料來自證交所 OpenAPI（每日全市場）與 MOPS 公司年度列表。非投資建議。
        </p>
      </div>
      <MopsAnnouncementsPanel />
    </div>
  );
}
