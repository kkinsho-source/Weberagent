import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'AI 智慧產業地圖',
  description: '探索全球關鍵產業鏈，深入了解供應鏈與投資機會',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <QueryProvider>
          <AuthProvider>
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
            <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400">
              本網站僅供參考，非投資建議。資料為示意，正式版將接入即時來源。
            </footer>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
