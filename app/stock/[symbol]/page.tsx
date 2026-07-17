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
    bundle.supplyEdges
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">{stock.symbol}</div>
          <h1 className="text-2xl font-bold text-slate-800">{stock.name}</h1>
          <div className="text-sm text-slate-500">{stock.industry}</div>
          <div className="mt-1 text-[11px] text-slate-400">
            資料源：{bundle.dataSource}
            {bundle.meta?.asOf ? ` · ${bundle.meta.asOf}` : ''}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <FavoriteButton symbol={stock.symbol} market={stock.market} />
          <div className={`text-right text-2xl font-bold ${up ? 'text-up' : 'text-down'}`}>
            {stock.price.toLocaleString()}
            <span className="ml-2 text-base">
              {up ? '+' : ''}
              {stock.changePct.toFixed(2)}%
            </span>
          </div>
          {(stock.asOf || bundle.meta?.asOf) && (
            <div className="text-[11px] text-slate-400">
              報價日 {stock.asOf || bundle.meta?.asOf}
              {bundle.meta?.quoteSource === 'stock_prices' ? ' · 對齊日K' : ''}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">走勢</TabsTrigger>
          <TabsTrigger value="industry">產業分析</TabsTrigger>
          <TabsTrigger value="supply">供應鏈</TabsTrigger>
          <TabsTrigger value="basic">基本資料</TabsTrigger>
          <TabsTrigger value="etf">ETF</TabsTrigger>
          <TabsTrigger value="news">消息</TabsTrigger>
          <TabsTrigger value="financials">財務分析</TabsTrigger>
          <TabsTrigger value="ai">AI 分析</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{stock.name} 日 K 線</CardTitle>
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
              <CardTitle>{stock.name} 產業分析</CardTitle>
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
              title={`${stock.name} 上下游供應鏈`}
            />
          </PanelErrorBoundary>
          <p className="mt-2 text-xs text-slate-400">
            點節點高亮 · 側欄詳情 · 左上角 +/- 置中 · 桌機 Ctrl+滾輪縮放 · 手機雙指縮放
          </p>
        </TabsContent>

        <TabsContent value="basic" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{stock.name} 基本資料</CardTitle>
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
              <CardTitle>{stock.name} 相關 ETF</CardTitle>
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
              <CardTitle>{stock.name} 消息</CardTitle>
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
              <CardTitle>{stock.name} 財務分析</CardTitle>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary title="財務分析">
                <FinancialsPanel symbol={stock.symbol} />
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{stock.name} AI 洞察</CardTitle>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary title="AI 分析">
                <AiInsightsPanel symbol={stock.symbol} />
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
