import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" className="nightcity">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#120814] font-sans text-fuchsia-50">
        <div className="cyber-breathe" aria-hidden />
        <div className="cyber-scan" aria-hidden />
        <QueryProvider>
          <AuthProvider>
            <Header />
            <main className="relative z-10 mx-auto max-w-6xl px-4 py-6">{children}</main>
            <footer className="relative z-10 mx-auto max-w-6xl px-4 py-8 text-center font-cyber text-[11px] text-fuchsia-200/50">
              本網站僅供參考，非投資建議。行情與財報來自公開資料（TWSE / TPEx / MOPS 等），請自行交叉驗證。
            </footer>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
