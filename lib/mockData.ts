import { v4 as uuidv4 } from 'uuid';
import { subDays, subHours, format, startOfDay, startOfHour } from 'date-fns';
import type {
  APIUsageEvent,
  Provider,
  OverviewResponse,
  KPIMetrics,
  ProviderMetrics,
  ModelMetrics,
  PersonMetrics,
  AccountMetrics,
  TimeSeriesPoint,
  IdentityMapping,
  Person,
} from './types';

// ─── Seed Data ────────────────────────────────────────────────────────────────

const PERSONS = [
  { person_id: 'person-001', display_name: 'Alice Chen', email: 'alice@acme.com' },
  { person_id: 'person-002', display_name: 'Bob Patel', email: 'bob@acme.com' },
  { person_id: 'person-003', display_name: 'Carol Smith', email: 'carol@acme.com' },
  { person_id: 'person-004', display_name: 'David Kim', email: 'david@acme.com' },
];

const ACCOUNTS = [
  { account_id: 'acc-oai-001', provider: 'openai' as Provider, person_id: 'person-001', display_name: 'Alice (OpenAI)', api_key_id: 'key-oai-001', api_key_masked: 'sk-***...abc1' },
  { account_id: 'acc-oai-002', provider: 'openai' as Provider, person_id: 'person-002', display_name: 'Bob (OpenAI)', api_key_id: 'key-oai-002', api_key_masked: 'sk-***...abc2' },
  { account_id: 'acc-ant-001', provider: 'anthropic' as Provider, person_id: 'person-001', display_name: 'Alice (Anthropic)', api_key_id: 'key-ant-001', api_key_masked: 'sk-ant-***...def1' },
  { account_id: 'acc-ant-002', provider: 'anthropic' as Provider, person_id: 'person-003', display_name: 'Carol (Anthropic)', api_key_id: 'key-ant-002', api_key_masked: 'sk-ant-***...def2' },
  { account_id: 'acc-gh-001', provider: 'github' as Provider, person_id: 'person-002', display_name: 'Bob (GitHub)', api_key_id: 'key-gh-001', api_key_masked: 'ghp_***...xyz1' },
  { account_id: 'acc-gh-002', provider: 'github' as Provider, person_id: 'person-004', display_name: 'David (GitHub)', api_key_id: 'key-gh-002', api_key_masked: 'ghp_***...xyz2' },
  { account_id: 'acc-oai-003', provider: 'openai' as Provider, person_id: 'person-004', display_name: 'David (OpenAI)', api_key_id: 'key-oai-003', api_key_masked: 'sk-***...abc3' },
  { account_id: 'acc-ant-003', provider: 'anthropic' as Provider, person_id: 'person-004', display_name: 'David (Anthropic)', api_key_id: 'key-ant-003', api_key_masked: 'sk-ant-***...def3' },
];

const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-embedding-3-small'];
const ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307', 'claude-3-5-haiku-20241022'];
const GITHUB_MODELS = ['copilot-chat', 'copilot-completions'];

// Cost per 1K tokens (input, output) in USD
const MODEL_COSTS: Record<string, [number, number]> = {
  'gpt-4o':                        [0.0025,  0.010],
  'gpt-4o-mini':                   [0.00015, 0.0006],
  'gpt-4-turbo':                   [0.010,   0.030],
  'gpt-3.5-turbo':                 [0.0005,  0.0015],
  'text-embedding-3-small':        [0.00002, 0.0],
  'claude-3-5-sonnet-20241022':    [0.003,   0.015],
  'claude-3-opus-20240229':        [0.015,   0.075],
  'claude-3-haiku-20240307':       [0.00025, 0.00125],
  'claude-3-5-haiku-20241022':     [0.0008,  0.004],
  'copilot-chat':                  [0.0,     0.0], // seat-based
  'copilot-completions':           [0.0,     0.0],
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function calcCost(model: string, tokensIn: number, tokensOut: number): number {
  const [inRate, outRate] = MODEL_COSTS[model] ?? [0.001, 0.003];
  return (tokensIn / 1000) * inRate + (tokensOut / 1000) * outRate;
}

// ─── Event Generator ──────────────────────────────────────────────────────────

export function generateMockEvents(daysBack = 30): APIUsageEvent[] {
  const events: APIUsageEvent[] = [];
  const now = new Date();

  for (let day = daysBack; day >= 0; day--) {
    const baseDate = subDays(now, day);
    // More events on weekdays
    const isWeekend = [0, 6].includes(baseDate.getDay());
    const eventsPerDay = isWeekend ? rand(20, 80) : rand(80, 300);

    for (let i = 0; i < eventsPerDay; i++) {
      const account = ACCOUNTS[rand(0, ACCOUNTS.length - 1)];
      const provider = account.provider;

      let model: string;
      let endpoint: string;
      let tokensIn: number;
      let tokensOut: number;

      if (provider === 'openai') {
        model = OPENAI_MODELS[rand(0, OPENAI_MODELS.length - 1)];
        endpoint = model.includes('embedding') ? '/v1/embeddings' : '/v1/chat/completions';
        tokensIn = rand(100, 8000);
        tokensOut = model.includes('embedding') ? 0 : rand(50, 2000);
      } else if (provider === 'anthropic') {
        model = ANTHROPIC_MODELS[rand(0, ANTHROPIC_MODELS.length - 1)];
        endpoint = '/v1/messages';
        tokensIn = rand(200, 10000);
        tokensOut = rand(100, 4000);
      } else {
        model = GITHUB_MODELS[rand(0, GITHUB_MODELS.length - 1)];
        endpoint = model === 'copilot-chat' ? '/copilot_internal/v2/token' : '/copilot_internal/v1/completions';
        tokensIn = rand(50, 500);
        tokensOut = rand(30, 200);
      }

      const ts = subHours(baseDate, rand(0, 23));
      ts.setMinutes(rand(0, 59));

      events.push({
        event_id: uuidv4(),
        timestamp: ts.toISOString(),
        provider,
        person_id: account.person_id,
        account_id: account.account_id,
        api_key_id: account.api_key_id,
        model_name: model,
        endpoint,
        tokens_input: tokensIn,
        tokens_output: tokensOut,
        request_count: 1,
        latency_ms: rand(80, 3500),
        status_code: Math.random() > 0.03 ? 200 : (Math.random() > 0.5 ? 429 : 500),
        estimated_cost: calcCost(model, tokensIn, tokensOut),
        metadata: {},
      });
    }
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ─── Singleton events store ───────────────────────────────────────────────────

const globalForMock = globalThis as unknown as { __mockEvents?: APIUsageEvent[] };
if (!globalForMock.__mockEvents) {
  globalForMock.__mockEvents = generateMockEvents(30);
}
export const MOCK_EVENTS = globalForMock.__mockEvents;

// ─── Aggregation helpers ──────────────────────────────────────────────────────

export function getMockOverview(): OverviewResponse {
  const events = MOCK_EVENTS;
  const prev = events.filter(e => new Date(e.timestamp) < subDays(new Date(), 15));
  const curr = events.filter(e => new Date(e.timestamp) >= subDays(new Date(), 15));

  const totalReqs = events.reduce((s, e) => s + e.request_count, 0);
  const totalIn   = events.reduce((s, e) => s + e.tokens_input, 0);
  const totalOut  = events.reduce((s, e) => s + e.tokens_output, 0);
  const totalCost = events.reduce((s, e) => s + e.estimated_cost, 0);
  const avgLat    = events.reduce((s, e) => s + e.latency_ms, 0) / events.length;
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
    avg_latency_ms: Math.round(p.avg_latency_ms / p.request_count),
    error_rate: p.error_rate / p.request_count,
  }));

  // Model breakdown
  const modelMap = new Map<string, ModelMetrics>();
  for (const e of events) {
    const m = modelMap.get(e.model_name) ?? {
      model_name: e.model_name, provider: e.provider, request_count: 0,
      tokens_input: 0, tokens_output: 0, estimated_cost: 0, avg_latency_ms: 0, cost_per_1k_tokens: 0,
    };
    m.request_count  += 1;
    m.tokens_input   += e.tokens_input;
    m.tokens_output  += e.tokens_output;
    m.estimated_cost += e.estimated_cost;
    m.avg_latency_ms += e.latency_ms;
    modelMap.set(e.model_name, m);
  }
  const top_models = Array.from(modelMap.values())
    .map(m => ({
      ...m,
      avg_latency_ms: Math.round(m.avg_latency_ms / m.request_count),
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
    pt.request_count  += 1;
    pt.tokens_input   += e.tokens_input;
    pt.tokens_output  += e.tokens_output;
    pt.estimated_cost += e.estimated_cost;
    pt.provider_breakdown[e.provider] = (pt.provider_breakdown[e.provider] ?? 0) + 1;
    tsMap.set(day, pt);
  }
  const recent_timeseries = Array.from(tsMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    kpi,
    by_provider,
    top_models,
    recent_timeseries,
    data_source: 'mock',
    last_refreshed: new Date().toISOString(),
  };
}

export function getMockPersons(): PersonMetrics[] {
  const events = MOCK_EVENTS;
  const personMap = new Map<string, PersonMetrics>();

  for (const e of events) {
    const person = PERSONS.find(p => p.person_id === e.person_id);
    if (!person) continue;
    const pm = personMap.get(e.person_id) ?? {
      person_id: e.person_id,
      display_name: person.display_name,
      providers: [],
      request_count: 0,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: 0,
      model_distribution: [],
    };
    pm.request_count  += 1;
    pm.tokens_input   += e.tokens_input;
    pm.tokens_output  += e.tokens_output;
    pm.estimated_cost += e.estimated_cost;
    if (!pm.providers.includes(e.provider)) pm.providers.push(e.provider);

    const md = pm.model_distribution.find(m => m.model_name === e.model_name);
    if (md) md.count++;
    else pm.model_distribution.push({ model_name: e.model_name, count: 1 });

    personMap.set(e.person_id, pm);
  }
  return Array.from(personMap.values()).sort((a, b) => b.estimated_cost - a.estimated_cost);
}

export function getMockAccounts(): AccountMetrics[] {
  const events = MOCK_EVENTS;
  return ACCOUNTS.map(acc => {
    const accEvents = events.filter(e => e.account_id === acc.account_id);
    const totalReqs = accEvents.length;
    return {
      account_id: acc.account_id,
      provider: acc.provider,
      display_name: acc.display_name,
      api_key_masked: acc.api_key_masked,
      request_count: totalReqs,
      tokens_input:   accEvents.reduce((s, e) => s + e.tokens_input, 0),
      tokens_output:  accEvents.reduce((s, e) => s + e.tokens_output, 0),
      estimated_cost: accEvents.reduce((s, e) => s + e.estimated_cost, 0),
      rate_limit_used_pct: Math.min(99, randFloat(5, 75)),
    };
  }).sort((a, b) => b.request_count - a.request_count);
}

export function getMockModels(): ModelMetrics[] {
  const events = MOCK_EVENTS;
  const modelMap = new Map<string, ModelMetrics>();
  for (const e of events) {
    const m = modelMap.get(e.model_name) ?? {
      model_name: e.model_name, provider: e.provider, request_count: 0,
      tokens_input: 0, tokens_output: 0, estimated_cost: 0, avg_latency_ms: 0, cost_per_1k_tokens: 0,
    };
    m.request_count  += 1;
    m.tokens_input   += e.tokens_input;
    m.tokens_output  += e.tokens_output;
    m.estimated_cost += e.estimated_cost;
    m.avg_latency_ms += e.latency_ms;
    modelMap.set(e.model_name, m);
  }
  return Array.from(modelMap.values()).map(m => ({
    ...m,
    avg_latency_ms: Math.round(m.avg_latency_ms / m.request_count),
    cost_per_1k_tokens: m.tokens_input + m.tokens_output > 0
      ? (m.estimated_cost / ((m.tokens_input + m.tokens_output) / 1000))
      : 0,
  })).sort((a, b) => b.request_count - a.request_count);
}

export function getMockTimeseries(granularity: 'hour' | 'day' | 'month' = 'day'): TimeSeriesPoint[] {
  const events = MOCK_EVENTS;
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
    pt.request_count  += 1;
    pt.tokens_input   += e.tokens_input;
    pt.tokens_output  += e.tokens_output;
    pt.estimated_cost += e.estimated_cost;
    pt.provider_breakdown[e.provider] = (pt.provider_breakdown[e.provider] ?? 0) + 1;
    tsMap.set(key, pt);
  }
  return Array.from(tsMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getMockIdentityMappings(): IdentityMapping[] {
  return ACCOUNTS.map(acc => {
    const person = PERSONS.find(p => p.person_id === acc.person_id)!;
    return {
      mapping_id: uuidv4(),
      person_id: acc.person_id,
      provider: acc.provider,
      account_id: acc.account_id,
      api_key_id: acc.api_key_id,
      identity_value: person.email ?? person.display_name,
      confidence_score: 0.95,
      source_of_truth: 'rule' as const,
      created_at: new Date().toISOString(),
    };
  });
}

export function getMockPersonsWithAccounts(): Person[] {
  return PERSONS.map(p => ({
    ...p,
    accounts: ACCOUNTS
      .filter(a => a.person_id === p.person_id)
      .map(a => ({
        account_id: a.account_id,
        provider: a.provider,
        display_name: a.display_name,
        api_key_id: a.api_key_id,
        api_key_masked: a.api_key_masked,
      })),
  }));
}
