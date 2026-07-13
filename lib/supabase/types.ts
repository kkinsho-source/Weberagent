/**
 * 精簡 Database 型別（手寫對齊 schema.sql）
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
}

export interface DbSupplyEdge {
  id: string;
  from_symbol: string;
  to_symbol: string;
  relation: RelationCode;
  market: MarketCode;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: DbProfile;
        Insert: Partial<DbProfile> & { id: string };
        Update: Partial<DbProfile>;
      };
      stocks: {
        Row: DbStock;
        Insert: Omit<DbStock, 'id' | 'updated_at'> & { id?: string; updated_at?: string };
        Update: Partial<DbStock>;
      };
      favorites: {
        Row: DbFavorite;
        Insert: Omit<DbFavorite, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<DbFavorite>;
      };
      watchlists: {
        Row: DbWatchlist;
        Insert: Omit<DbWatchlist, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<DbWatchlist>;
      };
      etl_logs: {
        Row: DbEtlLog;
        Insert: Omit<DbEtlLog, 'id' | 'started_at'> & {
          id?: string;
          started_at?: string;
        };
        Update: Partial<DbEtlLog>;
      };
      themes: {
        Row: DbTheme;
        Insert: Omit<DbTheme, 'id'> & { id?: string };
        Update: Partial<DbTheme>;
      };
      supply_edges: {
        Row: DbSupplyEdge;
        Insert: Omit<DbSupplyEdge, 'id'> & { id?: string };
        Update: Partial<DbSupplyEdge>;
      };
    };
  };
};
