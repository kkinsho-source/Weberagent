/**
 * 精簡 Database 型別（對齊 schema.sql）
 * 之後可用 `supabase gen types typescript` 取代
 */
export type MarketCode = 'tw' | 'us' | 'jp';
export type PlanCode = 'free' | 'premium';
export type EtlStatus = 'started' | 'success' | 'failed';
export type RelationCode = 'upstream' | 'downstream' | 'competitor';

export interface DbStock {
  id: string;
  symbol: string;
  market: MarketCode;
  name: string;
  industry: string | null;
  theme_slug: string | null;
  price: number | null;
  change_pct: number | null;
  market_cap: number | null;
  as_of: string | null;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: PlanCode;
  subscribed_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbFavorite {
  id: string;
  user_id: string;
  symbol: string;
  market: MarketCode;
  created_at: string;
}

export interface DbWatchlist {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface DbEtlLog {
  id: string;
  job_name: string;
  status: EtlStatus;
  source: string | null;
  records_count: number | null;
  message: string | null;
  meta: Record<string, unknown> | null;
  started_at: string;
  finished_at: string | null;
}

export interface DbTheme {
  id: string;
  market: MarketCode;
  slug: string;
  title: string;
  description: string | null;
  verified_at: string | null;
  company_count: number | null;
  /** S1+ 可選；未 migrate 前 select * 可能無此欄，mapper 會 fallback */
  tier?: number | null;
  family?: string | null;
  radar_default?: boolean | null;
}

export interface DbSupplyEdge {
  id: string;
  from_symbol: string;
  to_symbol: string;
  relation: RelationCode;
  market: MarketCode;
}

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        DbProfile,
        Partial<DbProfile> & { id: string },
        Partial<DbProfile>
      >;
      stocks: TableDef<
        DbStock,
        Omit<DbStock, 'id' | 'updated_at'> & { id?: string; updated_at?: string },
        Partial<DbStock>
      >;
      favorites: TableDef<
        DbFavorite,
        { user_id: string; symbol: string; market?: MarketCode; id?: string; created_at?: string },
        Partial<DbFavorite>
      >;
      watchlists: TableDef<
        DbWatchlist,
        { user_id: string; name?: string; id?: string; created_at?: string },
        Partial<DbWatchlist>
      >;
      etl_logs: TableDef<
        DbEtlLog,
        {
          job_name: string;
          status: EtlStatus;
          source?: string | null;
          records_count?: number | null;
          message?: string | null;
          meta?: Record<string, unknown> | null;
          id?: string;
          started_at?: string;
          finished_at?: string | null;
        },
        Partial<DbEtlLog>
      >;
      themes: TableDef<
        DbTheme,
        Omit<DbTheme, 'id'> & { id?: string },
        Partial<DbTheme>
      >;
      supply_edges: TableDef<
        DbSupplyEdge,
        Omit<DbSupplyEdge, 'id'> & { id?: string },
        Partial<DbSupplyEdge>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
