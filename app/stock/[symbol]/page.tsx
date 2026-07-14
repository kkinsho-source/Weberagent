import { notFound } from 'next/navigation';
import { getDataBundle } from '@/lib/data/source';
import { subgraphFor } from '@/lib/data/graph';
import { MapView } from '@/components/map/MapView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FavoriteButton } from '@/components/stock/FavoriteButton';
import { MopsAnnouncementsPanel } from '@/components/mops/MopsAnnouncementsPanel';
import { StockPriceChart } from '@/components/chart/StockPriceChart';
import { FinancialsPanel } from '@/components/stock/FinancialsPanel';
import { AiInsightsPanel } from '@/components/stock/AiInsightsPanel';

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
        </div>
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">走勢</TabsTrigger>
          <TabsTrigger value="supply">供應鏈</TabsTrigger>
          <TabsTrigger value="overview">概覽</TabsTrigger>
          <TabsTrigger value="mops">重大訊息</TabsTrigger>
          <TabsTrigger value="financials">財務分析</TabsTrigger>
          <TabsTrigger value="ai">AI 分析</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{stock.name} 日 K 線</CardTitle>
            </CardHeader>
            <CardContent>
              <StockPriceChart symbol={stock.symbol} name={stock.name} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supply" className="mt-4">
          <MapView
            nodes={subgraph.nodes}
            edges={subgraph.edges}
            title={`${stock.name} 上下游供應鏈`}
          />
          <p className="mt-2 text-xs text-slate-400">
            點擊節點可高亮其直接上下游連線；拖動可重新排版，滾輪/雙指縮放。
          </p>
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>公司資訊</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-400">市值</dt>
                  <dd className="font-medium text-slate-800">
                    {stock.marketCap.toLocaleString()} 億
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">產業</dt>
                  <dd className="font-medium text-slate-800">{stock.industry}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">今日漲跌</dt>
                  <dd className={`font-medium ${up ? 'text-up' : 'text-down'}`}>
                    {up ? '+' : ''}
                    {stock.changePct.toFixed(2)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">股價</dt>
                  <dd className="font-medium text-slate-800">{stock.price.toLocaleString()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mops" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{stock.name} 重大訊息</CardTitle>
            </CardHeader>
            <CardContent>
              <MopsAnnouncementsPanel initialSymbol={stock.symbol} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{stock.name} 財務分析</CardTitle>
            </CardHeader>
            <CardContent>
              <FinancialsPanel symbol={stock.symbol} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{stock.name} AI 洞察</CardTitle>
            </CardHeader>
            <CardContent>
              <AiInsightsPanel symbol={stock.symbol} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
