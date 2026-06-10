import { v4 as uuidv4 } from 'uuid';
import type { APIUsageEvent, Provider } from './types';

// Hardcoded costs to use during normalization if not provided by the API
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
  'copilot-chat':                  [0.0,     0.0],
  'copilot-completions':           [0.0,     0.0],
  'gemini-1.5-pro':                [0.0035,  0.0105],
  'gemini-1.5-flash':              [0.00035, 0.00105],
  'gemini-1.0-pro':                [0.0005,  0.0015],
};

function calcCost(model: string, tokensIn: number, tokensOut: number): number {
  const [inRate, outRate] = MODEL_COSTS[model] ?? [0.001, 0.003]; // default generic fallback
  return (tokensIn / 1000) * inRate + (tokensOut / 1000) * outRate;
}

/**
 * Normalizes OpenAI usage payload.
 * Structure assumed based on `/v1/organization/usage/completions` array of buckets.
 */
export function normalizeOpenAI(payload: any, accountId: string, personId: string, apiKeyId: string): APIUsageEvent[] {
  if (!payload || !Array.isArray(payload.data)) return [];
  
  const events: APIUsageEvent[] = [];
  
  for (const item of payload.data) {
    // Each item represents an aggregation bucket
    const ts = new Date(item.aggregation_timestamp * 1000).toISOString();
    
    // We might have multiple models in a bucket, need to adapt based on actual payload.
    // Assuming simple format: { model: string, n_context_tokens_total: int, n_generated_tokens_total: int, n_requests: int }
    const model = item.model || 'gpt-4o';
    const tokensIn = item.n_context_tokens_total || 0;
    const tokensOut = item.n_generated_tokens_total || 0;
    const reqs = item.n_requests || 1;
    
    events.push({
      event_id: uuidv4(),
      timestamp: ts,
      provider: 'openai',
      person_id: personId,
      account_id: accountId,
      api_key_id: apiKeyId,
      model_name: model,
      endpoint: '/v1/chat/completions', // inferred
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      request_count: reqs,
      latency_ms: 500, // Not provided by this endpoint typically
      status_code: 200,
      estimated_cost: calcCost(model, tokensIn, tokensOut),
      metadata: item
    });
  }
  
  return events;
}

/**
 * Normalizes Anthropic usage payload.
 */
export function normalizeAnthropic(payload: any, accountId: string, personId: string, apiKeyId: string): APIUsageEvent[] {
  if (!payload || !Array.isArray(payload.data)) return [];
  
  const events: APIUsageEvent[] = [];
  
  for (const item of payload.data) {
    const ts = new Date(item.timestamp || Date.now()).toISOString();
    const model = item.model || 'claude-3-5-sonnet-20241022';
    const tokensIn = item.input_tokens || 0;
    const tokensOut = item.output_tokens || 0;
    
    events.push({
      event_id: uuidv4(),
      timestamp: ts,
      provider: 'anthropic',
      person_id: personId,
      account_id: accountId,
      api_key_id: apiKeyId,
      model_name: model,
      endpoint: '/v1/messages',
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      request_count: item.requests || 1,
      latency_ms: item.latency || 800,
      status_code: 200,
      estimated_cost: calcCost(model, tokensIn, tokensOut),
      metadata: item
    });
  }
  
  return events;
}

/**
 * Normalizes GitHub Copilot usage payload.
 * Expected: an array of daily breakdown items.
 */
export function normalizeGitHub(payload: any, accountId: string, personId: string, apiKeyId: string): APIUsageEvent[] {
  if (!payload || !Array.isArray(payload)) return [];
  
  const events: APIUsageEvent[] = [];
  
  for (const day of payload) {
    const ts = new Date(day.day).toISOString();
    
    // Total seats
    const totalSeats = day.total_active_users || 0;
    
    // Breakdown
    if (day.breakdown && Array.isArray(day.breakdown)) {
      for (const b of day.breakdown) {
        // b.editor, b.models array
        if (b.models && Array.isArray(b.models)) {
          for (const m of b.models) {
            events.push({
              event_id: uuidv4(),
              timestamp: ts,
              provider: 'github',
              person_id: personId,
              account_id: accountId,
              api_key_id: apiKeyId,
              model_name: m.name, // e.g. "copilot-chat", "copilot-completions"
              endpoint: '/copilot',
              tokens_input: 0, // Not exposed
              tokens_output: 0, // Not exposed
              request_count: m.total_engaged_users || 1, // rough mapping
              latency_ms: 0,
              status_code: 200,
              estimated_cost: 0, // seat-based billing usually
              metadata: { editor: b.editor, language: b.language }
            });
          }
        }
      }
    } else {
      // Fallback
      events.push({
        event_id: uuidv4(),
        timestamp: ts,
        provider: 'github',
        person_id: personId,
        account_id: accountId,
        api_key_id: apiKeyId,
        model_name: 'copilot',
        endpoint: '/copilot',
        tokens_input: 0,
        tokens_output: 0,
        request_count: totalSeats,
        latency_ms: 0,
        status_code: 200,
        estimated_cost: 0,
        metadata: day
      });
    }
  }
  
  return events;
}

/**
 * Normalizes Google Gemini usage payload.
 */
export function normalizeGemini(payload: any, accountId: string, personId: string, apiKeyId: string): APIUsageEvent[] {
  if (!payload || !Array.isArray(payload.data)) return [];
  
  const events: APIUsageEvent[] = [];
  
  for (const item of payload.data) {
    const ts = new Date(item.timestamp || Date.now()).toISOString();
    const model = item.model || 'gemini-1.5-pro';
    const tokensIn = item.input_tokens || 0;
    const tokensOut = item.output_tokens || 0;
    
    events.push({
      event_id: uuidv4(),
      timestamp: ts,
      provider: 'gemini',
      person_id: personId,
      account_id: accountId,
      api_key_id: apiKeyId,
      model_name: model,
      endpoint: '/v1beta/models',
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      request_count: item.requests || 1,
      latency_ms: item.latency || 700,
      status_code: 200,
      estimated_cost: calcCost(model, tokensIn, tokensOut),
      metadata: item
    });
  }
  
  return events;
}
