// ─── Provider Types ────────────────────────────────────────────────────────────
export type Provider = 'openai' | 'anthropic' | 'github';

// ─── Unified API Usage Event ───────────────────────────────────────────────────
export interface APIUsageEvent {
  event_id: string;
  timestamp: string; // ISO 8601
  provider: Provider;
  person_id: string;
  account_id: string;
  api_key_id: string;
  model_name: string;
  endpoint: string;
  tokens_input: number;
  tokens_output: number;
  request_count: number;
  latency_ms: number;
  status_code: number;
  estimated_cost: number;
  metadata: Record<string, unknown>;
}

// ─── Identity Resolution ───────────────────────────────────────────────────────
export type IdentitySource = 'rule' | 'user' | 'system';

export interface IdentityMapping {
  mapping_id: string;
  person_id: string;
  provider: Provider;
  account_id: string;
  api_key_id: string;
  identity_value: string; // email, github username, etc.
  confidence_score: number; // 0–1
  source_of_truth: IdentitySource;
  created_at: string;
}

export interface Person {
  person_id: string;
  display_name: string;
  email?: string;
  accounts: ProviderAccount[];
}

export interface ProviderAccount {
  account_id: string;
  provider: Provider;
  display_name: string;
  api_key_id: string;
  api_key_masked: string;
}

// ─── Aggregated Metrics ────────────────────────────────────────────────────────
export interface KPIMetrics {
  total_requests: number;
  total_tokens_input: number;
  total_tokens_output: number;
  total_cost: number;
  active_persons: number;
  avg_latency_ms: number;
  requests_change_pct: number; // % change vs previous period
  cost_change_pct: number;
}

export interface ProviderMetrics {
  provider: Provider;
  request_count: number;
  tokens_input: number;
  tokens_output: number;
  estimated_cost: number;
  avg_latency_ms: number;
  error_rate: number;
}

export interface ModelMetrics {
  model_name: string;
  provider: Provider;
  request_count: number;
  tokens_input: number;
  tokens_output: number;
  estimated_cost: number;
  avg_latency_ms: number;
  cost_per_1k_tokens: number;
}

export interface PersonMetrics {
  person_id: string;
  display_name: string;
  providers: Provider[];
  request_count: number;
  tokens_input: number;
  tokens_output: number;
  estimated_cost: number;
  model_distribution: { model_name: string; count: number }[];
}

export interface AccountMetrics {
  account_id: string;
  provider: Provider;
  display_name: string;
  api_key_masked: string;
  request_count: number;
  tokens_input: number;
  tokens_output: number;
  estimated_cost: number;
  rate_limit_used_pct: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  request_count: number;
  tokens_input: number;
  tokens_output: number;
  estimated_cost: number;
  provider_breakdown: Partial<Record<Provider, number>>;
}

// ─── API Config / Keys ─────────────────────────────────────────────────────────
export interface APIKeyConfig {
  key_id: string;
  provider: Provider;
  display_name: string;
  api_key: string; // stored server-side only
  api_key_masked: string;
  created_at: string;
  last_used?: string;
  is_active: boolean;
}

export interface APIKeyInput {
  provider: Provider;
  display_name: string;
  api_key: string;
}

// ─── Dashboard Filter ──────────────────────────────────────────────────────────
export type Granularity = 'hour' | 'day' | 'month';

export interface DashboardFilter {
  from: string;
  to: string;
  providers?: Provider[];
  models?: string[];
  person_ids?: string[];
  granularity?: Granularity;
}

// ─── Overview Response ─────────────────────────────────────────────────────────
export interface OverviewResponse {
  kpi: KPIMetrics;
  by_provider: ProviderMetrics[];
  top_models: ModelMetrics[];
  recent_timeseries: TimeSeriesPoint[];
  data_source: 'live' | 'mock' | 'cached';
  last_refreshed: string;
}
