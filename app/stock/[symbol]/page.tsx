import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDataBundle } from '@/lib/data/source';
import { subgraphFor } from '@/lib/data/graph';
import { MapView } from '@/components/map/MapView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FavoriteButton } from '@/components/stock/FavoriteButton';
import { StockPriceChart } from '@/components/chart/StockPriceChart';
import { FinancialsPanel } from '@/components/stock/FinancialsPanel';
import { AiInsightsPanel } from '@/components/stock/AiInsightsPanel';
import { BasicInfoPanel } from '@/components/stock/BasicInfoPanel';
import { NewsPanel } from '@/components/stock/NewsPanel';
import { EtfPanel } from '@/components/stock/EtfPanel';
import { IndustryAnalysisPanel } from '@/components/stock/IndustryAnalysisPanel';
import { PanelErrorBoundary } from '@/components/ui/PanelErrorBoundary';

export const revalidate = 60;

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const bundle = await getDataBundle();
  const stock = bundle.stocks.find((s) => s.symbol === symbol);
  if (!stock) notFound();

  const up = stock.changePct >= 0;
  const subgraph = subgraphFor(
    [stock.symbol],
    true,
    bundle.stocks,
    bundle.supplyEdges,
  );
  const theme = bundle.themes.find((t) => t.slug === stock.themeSlug);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm tabular-nums text-slate-400">{stock.symbol}</div>
          <h1 className="font-cyber text-2xl font-bold text-slate-800">{stock.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {stock.industry ? <span>{stock.industry}</span> : null}
            {theme ? (
              <>
                <span className="text-slate-300">·</span>
                <Link
                  href={`/themes/${theme.slug}`}
                  className="text-brand-600 hover:underline"
                >
                  題材：{theme.title}
                </Link>
              </>
            ) : null}
          </div>
          {(stock.asOf || bundle.meta?.asOf) && (
            <div className="mt-1 text-[11px] text-slate-400">
              報價日 {stock.asOf || bundle.meta?.asOf}
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <FavoriteButton symbol={stock.symbol} market={stock.market} />
          <div className={`text-2xl font-bold ${up ? 'text-up' : 'text-down'}`}>
            {stock.price.toLocaleString()}
            <span className="ml-2 text-base">
              {up ? '+' : ''}
              {stock.changePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="chart">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="chart">走勢</TabsTrigger>
          <TabsTrigger value="news">消息</TabsTrigger>
          <TabsTrigger value="financials">財務</TabsTrigger>
          <TabsTrigger value="supply">供應鏈</TabsTrigger>
          <TabsTrigger value="basic">基本</TabsTrigger>
          <TabsTrigger value="industry">產業</TabsTrigger>
          <TabsTrigger value="etf">ETF</TabsTrigger>
          <TabsTrigger value="ai">洞察</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>股價走勢</CardTitle>
              <p className="text-xs font-normal text-slate-400">
                可切日／週／月，並勾選均線、布林等指標
              </p>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary title="走勢">
                <StockPriceChart symbol={stock.symbol} name={stock.name} />
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="industry" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>產業與定位</CardTitle>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary title="產業分析">
                <IndustryAnalysisPanel symbol={stock.symbol} />
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supply" className="mt-4">
          <PanelErrorBoundary title="供應鏈">
            <MapView
              nodes={subgraph.nodes}
              edges={subgraph.edges}
              title={`${stock.name} 上下游`}
            />
          </PanelErrorBoundary>
          <p className="mt-2 text-xs text-slate-400">
            點節點可切換個股。桌機可用滾輪縮放，手機雙指縮放。
          </p>
        </TabsContent>

        <TabsContent value="basic" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>基本資料</CardTitle>
              <p className="text-xs font-normal text-slate-400">公司概況與今日行情摘要</p>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary title="基本資料">
                <BasicInfoPanel
                  symbol={stock.symbol}
                  industry={stock.industry}
                  themeSlug={stock.themeSlug}
                />
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="etf" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>相關 ETF</CardTitle>
              <p className="text-xs font-normal text-slate-400">
                公開可得的成分／關聯（有資料才顯示）
              </p>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary title="ETF">
                <EtfPanel symbol={stock.symbol} />
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>消息</CardTitle>
              <p className="text-xs font-normal text-slate-400">
                官方公告與媒體外鏈分區；外鏈僅標題與來源
              </p>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary title="消息">
                <NewsPanel symbol={stock.symbol} name={stock.name} />
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>財務</CardTitle>
              <p className="text-xs font-normal text-slate-400">月營收與季報摘要</p>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary title="財務">
                <FinancialsPanel symbol={stock.symbol} />
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>規則洞察</CardTitle>
              <p className="text-xs font-normal text-slate-400">
                依公開數據的規則整理，非投顧建議
              </p>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary title="洞察">
                <AiInsightsPanel symbol={stock.symbol} />
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
