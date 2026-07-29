import { MopsAnnouncementsPanel } from '@/components/mops/MopsAnnouncementsPanel';

export const metadata = {
  title: '重大訊息',
  description: '公開資訊觀測站 / 證交所重大訊息彙整',
};

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">重大訊息</h1>
        <p className="mt-1 text-sm text-slate-500">
          公司公告與公開資訊彙整。僅供查閱，非投資建議。
        </p>
      </div>
      <MopsAnnouncementsPanel />
    </div>
  );
}
