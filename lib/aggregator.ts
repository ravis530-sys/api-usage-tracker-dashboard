import { format, startOfDay, startOfHour, subDays } from 'date-fns';
import type { 
  APIUsageEvent, OverviewResponse, KPIMetrics, ProviderMetrics, 
  ModelMetrics, TimeSeriesPoint, Provider, PersonMetrics, AccountMetrics 
} from './types';
import { readKeys } from '@/lib/configStore';

export function aggregateEventsForOverview(events: APIUsageEvent[], dataSource: 'live' | 'mock' | 'cached'): OverviewResponse {
  const now = new Date();
  const prev = events.filter(e => new Date(e.timestamp) < subDays(now, 15));
  const curr = events.filter(e => new Date(e.timestamp) >= subDays(now, 15));

  const totalReqs = events.reduce((s, e) => s + e.request_count, 0);
  const totalIn   = events.reduce((s, e) => s + e.tokens_input, 0);
  const totalOut  = events.reduce((s, e) => s + e.tokens_output, 0);
  const totalCost = events.reduce((s, e) => s + e.estimated_cost, 0);
  const avgLat    = events.length > 0 ? events.reduce((s, e) => s + e.latency_ms, 0) / events.length : 0;
  const persons   = new Set(events.map(e => e.person_id)).size;

  const prevReqs = prev.reduce((s, e) => s + e.request_count, 0);
  const currReqs = curr.reduce((s, e) => s + e.request_count, 0);
  const prevCost = prev.reduce((s, e) => s + e.estimated_cost, 0);
  const currCost = curr.reduce((s, e) => s + e.estimated_cost, 0);

  const kpi: KPIMetrics = {
    total_requests: totalReqs,
    total_tokens_input: totalIn,
    total_tokens_output: totalOut,
    total_cost: totalCost,
    active_persons: persons,
    avg_latency_ms: Math.round(avgLat),
    requests_change_pct: prevReqs ? ((currReqs - prevReqs) / prevReqs) * 100 : 0,
    cost_change_pct: prevCost ? ((currCost - prevCost) / prevCost) * 100 : 0,
  };

  // Provider breakdown
  const providerMap = new Map<Provider, ProviderMetrics>();
  for (const e of events) {
    const p = providerMap.get(e.provider) ?? {
      provider: e.provider, request_count: 0, tokens_input: 0,
      tokens_output: 0, estimated_cost: 0, avg_latency_ms: 0, error_rate: 0,
    };
    p.request_count += e.request_count;
    p.tokens_input  += e.tokens_input;
    p.tokens_output += e.tokens_output;
    p.estimated_cost += e.estimated_cost;
    p.avg_latency_ms += e.latency_ms;
    if (e.status_code !== 200) p.error_rate++;
    providerMap.set(e.provider, p);
  }
  const by_provider = Array.from(providerMap.values()).map(p => ({
    ...p,
    avg_latency_ms: p.request_count > 0 ? Math.round(p.avg_latency_ms / p.request_count) : 0,
    error_rate: p.request_count > 0 ? p.error_rate / p.request_count : 0,
  }));

  // Model breakdown
  const modelMap = new Map<string, ModelMetrics>();
  for (const e of events) {
    const m = modelMap.get(e.model_name) ?? {
      model_name: e.model_name, provider: e.provider, request_count: 0,
      tokens_input: 0, tokens_output: 0, estimated_cost: 0, avg_latency_ms: 0, cost_per_1k_tokens: 0,
    };
    m.request_count  += e.request_count;
    m.tokens_input   += e.tokens_input;
    m.tokens_output  += e.tokens_output;
    m.estimated_cost += e.estimated_cost;
    m.avg_latency_ms += e.latency_ms;
    modelMap.set(e.model_name, m);
  }
  const top_models = Array.from(modelMap.values())
    .map(m => ({
      ...m,
      avg_latency_ms: m.request_count > 0 ? Math.round(m.avg_latency_ms / m.request_count) : 0,
      cost_per_1k_tokens: m.tokens_input + m.tokens_output > 0
        ? (m.estimated_cost / ((m.tokens_input + m.tokens_output) / 1000))
        : 0,
    }))
    .sort((a, b) => b.request_count - a.request_count)
    .slice(0, 8);

  // Time series (last 30 days, daily)
  const tsMap = new Map<string, TimeSeriesPoint>();
  for (const e of events) {
    const day = format(startOfDay(new Date(e.timestamp)), 'yyyy-MM-dd');
    const pt = tsMap.get(day) ?? {
      timestamp: day, request_count: 0, tokens_input: 0,
      tokens_output: 0, estimated_cost: 0, provider_breakdown: {},
    };
    pt.request_count  += e.request_count;
    pt.tokens_input   += e.tokens_input;
    pt.tokens_output  += e.tokens_output;
    pt.estimated_cost += e.estimated_cost;
    pt.provider_breakdown[e.provider] = (pt.provider_breakdown[e.provider] ?? 0) + e.request_count;
    tsMap.set(day, pt);
  }
  const recent_timeseries = Array.from(tsMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    kpi,
    by_provider,
    top_models,
    recent_timeseries,
    data_source: dataSource,
    last_refreshed: new Date().toISOString(),
  };
}

export function aggregatePersons(events: APIUsageEvent[]): PersonMetrics[] {
  const personMap = new Map<string, PersonMetrics>();

  for (const e of events) {
    // In live mode, we might just have default person-live-1 or similar
    const pm = personMap.get(e.person_id) ?? {
      person_id: e.person_id,
      display_name: e.person_id === 'person-live-1' ? 'Live User' : e.person_id,
      providers: [],
      request_count: 0,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: 0,
      model_distribution: [],
    };
    pm.request_count  += e.request_count;
    pm.tokens_input   += e.tokens_input;
    pm.tokens_output  += e.tokens_output;
    pm.estimated_cost += e.estimated_cost;
    if (!pm.providers.includes(e.provider)) pm.providers.push(e.provider);

    const md = pm.model_distribution.find(m => m.model_name === e.model_name);
    if (md) md.count += e.request_count;
    else pm.model_distribution.push({ model_name: e.model_name, count: e.request_count });

    personMap.set(e.person_id, pm);
  }
  return Array.from(personMap.values()).sort((a, b) => b.estimated_cost - a.estimated_cost);
}

export function aggregateAccounts(events: APIUsageEvent[]): AccountMetrics[] {
  const keys = readKeys();
  const accountMap = new Map<string, AccountMetrics>();

  for (const e of events) {
    const keyConfig = keys.find(k => k.key_id === e.api_key_id);
    const displayName = keyConfig ? keyConfig.display_name : e.account_id;
    const masked = keyConfig ? keyConfig.api_key_masked : 'unknown';

    const a = accountMap.get(e.account_id) ?? {
      account_id: e.account_id,
      provider: e.provider,
      display_name: displayName,
      api_key_masked: masked,
      request_count: 0,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: 0,
      rate_limit_used_pct: Math.min(99, (Math.random() * 20)), // Simulated for live if not returned by API
    };
    
    a.request_count += e.request_count;
    a.tokens_input += e.tokens_input;
    a.tokens_output += e.tokens_output;
    a.estimated_cost += e.estimated_cost;
    accountMap.set(e.account_id, a);
  }
  
  return Array.from(accountMap.values()).sort((a, b) => b.request_count - a.request_count);
}

export function aggregateModels(events: APIUsageEvent[]): ModelMetrics[] {
  const modelMap = new Map<string, ModelMetrics>();
  for (const e of events) {
    const m = modelMap.get(e.model_name) ?? {
      model_name: e.model_name, provider: e.provider, request_count: 0,
      tokens_input: 0, tokens_output: 0, estimated_cost: 0, avg_latency_ms: 0, cost_per_1k_tokens: 0,
    };
    m.request_count  += e.request_count;
    m.tokens_input   += e.tokens_input;
    m.tokens_output  += e.tokens_output;
    m.estimated_cost += e.estimated_cost;
    m.avg_latency_ms += e.latency_ms;
    modelMap.set(e.model_name, m);
  }
  return Array.from(modelMap.values()).map(m => ({
    ...m,
    avg_latency_ms: m.request_count > 0 ? Math.round(m.avg_latency_ms / m.request_count) : 0,
    cost_per_1k_tokens: m.tokens_input + m.tokens_output > 0
      ? (m.estimated_cost / ((m.tokens_input + m.tokens_output) / 1000))
      : 0,
  })).sort((a, b) => b.request_count - a.request_count);
}

export function aggregateTimeseries(events: APIUsageEvent[], granularity: 'hour' | 'day' | 'month'): TimeSeriesPoint[] {
  const tsMap = new Map<string, TimeSeriesPoint>();
  for (const e of events) {
    let key: string;
    const d = new Date(e.timestamp);
    if (granularity === 'hour')       key = format(startOfHour(d), "yyyy-MM-dd'T'HH:00");
    else if (granularity === 'month') key = format(d, 'yyyy-MM');
    else                              key = format(startOfDay(d), 'yyyy-MM-dd');

    const pt = tsMap.get(key) ?? {
      timestamp: key, request_count: 0, tokens_input: 0,
      tokens_output: 0, estimated_cost: 0, provider_breakdown: {},
    };
    pt.request_count  += e.request_count;
    pt.tokens_input   += e.tokens_input;
    pt.tokens_output  += e.tokens_output;
    pt.estimated_cost += e.estimated_cost;
    pt.provider_breakdown[e.provider] = (pt.provider_breakdown[e.provider] ?? 0) + e.request_count;
    tsMap.set(key, pt);
  }
  return Array.from(tsMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
