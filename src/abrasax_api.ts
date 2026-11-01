/**
 * ═══════════════════════════════════════════════════════════════════
 * ABRASAX API CLIENT — Local LLM (Bare Metal Primary) + DeepSeek API
 * PRIMAL_HEX: 4f5349524953424c58434b
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  LOCAL_LLM_URL, LOCAL_LLM_BACKUP_URL, LOCAL_MODEL,
  DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL_FLASH, DEEPSEEK_MODEL_REASONER,
  ENGINE_MODE, API_TIMEOUT, MAX_TOKENS_FLASH, MAX_TOKENS_REASON,
  TEMPERATURE_FLASH, TEMPERATURE_REASON,
} from './abrasax_config.js';

// ── TYPES ──
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  reasoning_content?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  thinking?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high' | 'max' | 'xhigh';
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required';
  stream?: boolean;
  useLocal?: boolean;
}

export interface ChatResponse {
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  finishReason?: string;
}

// ── LOCAL LLM CHECK ──
let localAvailable = false;
let lastLocalCheck = 0;
const LOCAL_CHECK_TTL = 10_000;

export async function isLocalLLMAvailable(): Promise<boolean> {
  const now = Date.now();
  if (now - lastLocalCheck < LOCAL_CHECK_TTL) return localAvailable;

  const urls = [LOCAL_LLM_URL, LOCAL_LLM_BACKUP_URL];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const resp = await fetch(`${url}/models`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      clearTimeout(timeout);

      if (resp.ok) {
        localAvailable = true;
        lastLocalCheck = now;
        return true;
      }
    } catch {
      // Try next URL
    }
  }

  localAvailable = false;
  lastLocalCheck = now;
  return false;
}

// ── API CALL (unified) ──
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
  onChunk?: (text: string, reasoning?: string) => void,
): Promise<ChatResponse> {
  const useLocal = options.useLocal ?? (ENGINE_MODE === 'local' || ENGINE_MODE === 'hybrid');

  if (useLocal) {
    const localAvail = await isLocalLLMAvailable();
    if (localAvail) {
      return chatLocal(messages, options, onChunk);
    }
    if (ENGINE_MODE === 'local') {
      throw new Error('LOCAL_LLM_UNAVAILABLE: No local LLM found at :1234 or :8080');
    }
  }

  return chatDeepSeek(messages, options, onChunk);
}

// ── LOCAL LLM CHAT ──
async function chatLocal(
  messages: ChatMessage[],
  options: ChatOptions = {},
  onChunk?: (text: string, reasoning?: string) => void,
): Promise<ChatResponse> {
  const url = `${LOCAL_LLM_URL}/chat/completions`;
  const model = options.model || LOCAL_MODEL;
  const temperature = options.temperature ?? TEMPERATURE_FLASH;
  const maxTokens = options.maxTokens ?? MAX_TOKENS_FLASH;
  const streaming = options.stream ?? (onChunk !== undefined);

  const body: any = {
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    })),
    temperature,
    max_tokens: maxTokens,
    stream: streaming,
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice || 'auto';
  }

  // Try primary, fall back to backup
  let resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(API_TIMEOUT),
  });

  if (!resp.ok && resp.status === 404) {
    const backupUrl = `${LOCAL_LLM_BACKUP_URL}/chat/completions`;
    resp = await fetch(backupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(API_TIMEOUT),
    });
  }

  if (!resp.ok) {
    throw new Error(`LOCAL_LLM_ERROR: ${resp.status} ${resp.statusText}`);
  }

  if (streaming && resp.body) {
    return parseStream(resp.body, onChunk);
  }

  const data = await resp.json() as any;
  const choice = data.choices?.[0] || {};

  return {
    content: choice.message?.content || '',
    reasoning: choice.message?.reasoning_content || '',
    toolCalls: choice.message?.tool_calls || undefined,
    usage: data.usage,
    finishReason: choice.finish_reason,
  };
}

// ── DEEPSEEK API CHAT ──
async function chatDeepSeek(
  messages: ChatMessage[],
  options: ChatOptions = {},
  onChunk?: (text: string, reasoning?: string) => void,
): Promise<ChatResponse> {
  const url = `${DEEPSEEK_BASE_URL}/chat/completions`;
  const model = options.model || DEEPSEEK_MODEL_FLASH;
  const temperature = options.temperature ?? TEMPERATURE_FLASH;
  const maxTokens = options.maxTokens ?? MAX_TOKENS_FLASH;
  const streaming = options.stream ?? (onChunk !== undefined);
  const thinking = options.thinking ?? false;

  const body: any = {
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    })),
    temperature,
    max_tokens: maxTokens,
    stream: streaming,
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice || 'auto';
  }

  if (thinking) {
    body.thinking = { type: 'enabled' };
    if (options.reasoningEffort) {
      body.reasoning_effort = options.reasoningEffort;
    }
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(API_TIMEOUT),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`DEEPSEEK_API_ERROR ${resp.status}: ${errText.substring(0, 200)}`);
  }

  if (streaming && resp.body) {
    return parseStream(resp.body, onChunk);
  }

  const data = await resp.json() as any;
  const choice = data.choices?.[0] || {};

  return {
    content: choice.message?.content || '',
    reasoning: choice.message?.reasoning_content || '',
    toolCalls: choice.message?.tool_calls || undefined,
    usage: data.usage,
    finishReason: choice.finish_reason,
  };
}

// ── STREAM PARSER ──
async function parseStream(
  body: ReadableStream<Uint8Array>,
  onChunk?: (text: string, reasoning?: string) => void,
): Promise<ChatResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let fullReasoning = '';
  let toolCalls: ToolCall[] = [];
  let usage: any = undefined;
  let finishReason = '';

  const toolCallAccum: Map<number, { id: string; name: string; args: string }> = new Map();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta || {};
          const content = delta.content || '';
          const reasoning = delta.reasoning_content || '';

          if (content) {
            fullContent += content;
            onChunk?.(content);
          }
          if (reasoning) {
            fullReasoning += reasoning;
            onChunk?.(undefined, reasoning);
          }

          // Accumulate tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallAccum.has(idx)) {
                toolCallAccum.set(idx, { id: tc.id || '', name: '', args: '' });
              }
              const acc = toolCallAccum.get(idx)!;
              if (tc.id) acc.id = tc.id;
              if (tc.function?.name) acc.name += tc.function.name;
              if (tc.function?.arguments) acc.args += tc.function.arguments;
            }
          }

          if (parsed.usage) usage = parsed.usage;
          if (choice.finish_reason) finishReason = choice.finish_reason;
        } catch {
          // Skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Build final tool calls
  if (toolCallAccum.size > 0) {
    toolCalls = Array.from(toolCallAccum.values()).map(acc => ({
      id: acc.id,
      type: 'function' as const,
      function: {
        name: acc.name,
        arguments: acc.args,
      },
    }));
  }

  return { content: fullContent, reasoning: fullReasoning, toolCalls, usage, finishReason };
}

// ── SIMPLE NON-STREAMING CALL ──
export async function chatSync(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResponse> {
  return chat(messages, { ...options, stream: false });
}

// ── MODEL SWITCHING ──
export async function chatFlash(
  messages: ChatMessage[],
  onChunk?: (text: string) => void,
): Promise<ChatResponse> {
  return chat(messages, {
    model: DEEPSEEK_MODEL_FLASH,
    temperature: TEMPERATURE_FLASH,
    maxTokens: MAX_TOKENS_FLASH,
    thinking: false,
    useLocal: ENGINE_MODE !== 'api',
  }, onChunk);
}

export async function chatPro(
  messages: ChatMessage[],
  onChunk?: (text: string, reasoning?: string) => void,
): Promise<ChatResponse> {
  return chat(messages, {
    model: DEEPSEEK_MODEL_REASONER,
    temperature: TEMPERATURE_REASON,
    maxTokens: MAX_TOKENS_REASON,
    thinking: true,
    reasoningEffort: 'max',
    useLocal: false, // Pro always uses API for deep reasoning
  }, onChunk);
}

// ── CONNECTIVITY TEST ──
export async function connectivityTest(): Promise<{ local: boolean; api: boolean }> {
  const results = { local: false, api: false };

  try {
    results.local = await isLocalLLMAvailable();
  } catch { /* ignore */ }

  try {
    const resp = await fetch(`${DEEPSEEK_BASE_URL}/models`, {
      headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    results.api = resp.ok;
  } catch { /* ignore */ }

  return results;
}
