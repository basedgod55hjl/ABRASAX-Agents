/**
 * ═══════════════════════════════════════════════════════════════════
 * ABRASAX MEMORY — XOR-ENCODED JSON PERSISTENCE
 * PRIMAL_HEX: 4f5349524953424c58434b
 * Conversation history | Agent state | Session management | Knowledge base
 * ═══════════════════════════════════════════════════════════════════
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { MEMORY_FILE, HISTORY_FILE, KNOWLEDGE_FILE, AGENT_STATE_FILE, SESSION_FILE, MEMORY_DIR, LOGS_DIR, ABRASAX_ROOT } from './abrasax_config.js';
import { xorEncrypt, xorDecrypt } from './abrasax_hex.js';
import { PRIMAL_HEX } from './abrasax_config.js';
import type { ChatMessage } from './abrasax_api.js';

// ── TYPES ──
export interface ConversationEntry {
  id: string;
  timestamp: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tokens?: number;
  model?: string;
}

export interface Session {
  id: string;
  created: string;
  updated: string;
  messageCount: number;
  summary: string;
  tags: string[];
}

export interface KnowledgeEntry {
  id: string;
  key: string;
  value: any;
  category: string;
  timestamp: string;
  tags: string[];
}

export interface AgentState {
  agentId: string;
  status: 'idle' | 'running' | 'error' | 'dead';
  lastActive: string;
  taskCount: number;
  memory: Record<string, any>;
}

// ── ENSURE DIRECTORIES ──
function ensureDirs() {
  [MEMORY_DIR, LOGS_DIR].forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

// ── XOR FILE I/O ──
function readXorJson<T>(filePath: string, defaultVal: T): T {
  ensureDirs();
  try {
    if (!existsSync(filePath)) return defaultVal;
    const encrypted = readFileSync(filePath, 'utf-8');
    const decrypted = xorDecrypt(encrypted, PRIMAL_HEX);
    return JSON.parse(decrypted) as T;
  } catch {
    return defaultVal;
  }
}

function writeXorJson<T>(filePath: string, data: T): void {
  ensureDirs();
  const json = JSON.stringify(data, null, 2);
  const encrypted = xorEncrypt(json, PRIMAL_HEX);
  writeFileSync(filePath, encrypted, 'utf-8');
}

// ── CONVERSATION STORE ──
export class ConversationStore {
  private entries: ConversationEntry[] = [];
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.load();
  }

  private get filePath(): string {
    return join(LOGS_DIR, `conv_${this.sessionId}.json`);
  }

  private load(): void {
    this.entries = readXorJson<ConversationEntry[]>(this.filePath, []);
  }

  save(): void {
    writeXorJson(this.filePath, this.entries);
  }

  add(role: string, content: string, model?: string): void {
    this.entries.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      role: role as any,
      content,
      model,
    });
    // Limit to 1000 entries
    if (this.entries.length > 1000) {
      this.entries = this.entries.slice(-500);
    }
    this.save();
  }

  getRecent(count: number = 50): ConversationEntry[] {
    return this.entries.slice(-count);
  }

  search(query: string, maxResults: number = 10): ConversationEntry[] {
    const q = query.toLowerCase();
    return this.entries
      .filter(e => e.content.toLowerCase().includes(q))
      .slice(-maxResults)
      .reverse();
  }

  toMessages(): ChatMessage[] {
    return this.entries.map(e => ({
      role: e.role as ChatMessage['role'],
      content: e.content,
    }));
  }

  clear(): void {
    this.entries = [];
    this.save();
  }

  get count(): number {
    return this.entries.length;
  }
}

// ── KNOWLEDGE BASE ──
export class KnowledgeBase {
  private entries: KnowledgeEntry[] = [];
  private dirty = false;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.load();
    // Auto-save every 30 seconds if dirty
    this.saveInterval = setInterval(() => this.flush(), 30000);
  }

  private load(): void {
    this.entries = readXorJson<KnowledgeEntry[]>(KNOWLEDGE_FILE, []);
  }

  private flush(): void {
    if (this.dirty) {
      writeXorJson(KNOWLEDGE_FILE, this.entries);
      this.dirty = false;
    }
  }

  save(): void {
    this.dirty = true;
    this.flush();
  }

  set(key: string, value: any, category: string = 'general', tags: string[] = []): void {
    const existing = this.entries.findIndex(e => e.key === key);
    const entry: KnowledgeEntry = {
      id: `kb_${Date.now()}`,
      key,
      value,
      category,
      timestamp: new Date().toISOString(),
      tags,
    };
    if (existing >= 0) {
      this.entries[existing] = entry;
    } else {
      this.entries.push(entry);
    }
    this.dirty = true;
  }

  get(key: string): any | undefined {
    return this.entries.find(e => e.key === key)?.value;
  }

  search(query: string, maxResults: number = 10): KnowledgeEntry[] {
    const q = query.toLowerCase();
    return this.entries
      .filter(e =>
        e.key.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        JSON.stringify(e.value).toLowerCase().includes(q)
      )
      .slice(0, maxResults);
  }

  getByCategory(category: string): KnowledgeEntry[] {
    return this.entries.filter(e => e.category === category);
  }

  searchFormatted(query: string, maxResults: number = 10): string {
    const results = this.search(query, maxResults);
    if (results.length === 0) return `No knowledge entries found for: ${query}`;
    return results.map(r =>
      `[${r.category}] ${r.key}: ${JSON.stringify(r.value).substring(0, 200)}`
    ).join('\n');
  }

  listCategories(): string[] {
    return [...new Set(this.entries.map(e => e.category))];
  }

  get stats() {
    return {
      total: this.entries.length,
      categories: this.listCategories().length,
    };
  }

  destroy(): void {
    if (this.saveInterval) clearInterval(this.saveInterval);
    this.flush();
  }
}

// ── SESSION MANAGER ──
export class SessionManager {
  private sessions: Session[] = [];

  constructor() {
    this.sessions = readXorJson<Session[]>(SESSION_FILE, []);
  }

  create(id?: string): Session {
    const session: Session = {
      id: id || `session_${Date.now()}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      messageCount: 0,
      summary: '',
      tags: [],
    };
    this.sessions.push(session);
    this.save();
    return session;
  }

  update(id: string, updates: Partial<Session>): void {
    const idx = this.sessions.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.sessions[idx] = { ...this.sessions[idx], ...updates, updated: new Date().toISOString() };
      this.save();
    }
  }

  get(id: string): Session | undefined {
    return this.sessions.find(s => s.id === id);
  }

  list(limit: number = 20): Session[] {
    return this.sessions.slice(-limit).reverse();
  }

  save(): void {
    writeXorJson(SESSION_FILE, this.sessions);
  }
}

// ── AGENT STATE MANAGER ──
export class AgentStateManager {
  private states: Map<string, AgentState> = new Map();

  constructor() {
    const loaded = readXorJson<AgentState[]>(AGENT_STATE_FILE, []);
    loaded.forEach(s => this.states.set(s.agentId, s));
  }

  register(agentId: string): AgentState {
    const state: AgentState = {
      agentId,
      status: 'idle',
      lastActive: new Date().toISOString(),
      taskCount: 0,
      memory: {},
    };
    this.states.set(agentId, state);
    this.save();
    return state;
  }

  update(agentId: string, updates: Partial<AgentState>): void {
    const current = this.states.get(agentId);
    if (current) {
      this.states.set(agentId, { ...current, ...updates, lastActive: new Date().toISOString() });
    } else {
      this.register(agentId);
      this.update(agentId, updates);
    }
    this.save();
  }

  get(agentId: string): AgentState | undefined {
    return this.states.get(agentId);
  }

  getAll(): AgentState[] {
    return Array.from(this.states.values());
  }

  save(): void {
    writeXorJson(AGENT_STATE_FILE, Array.from(this.states.values()));
  }
}

// ── HISTORY LOGGER (JSONL) ──
export function logHistory(entry: ConversationEntry): void {
  ensureDirs();
  appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n', 'utf-8');
}

// ── GLOBAL INSTANCES (initialized on engine start) ──
let _kb: KnowledgeBase | null = null;
let _sessions: SessionManager | null = null;
let _agents: AgentStateManager | null = null;

export function initMemory(): { kb: KnowledgeBase; sessions: SessionManager; agents: AgentStateManager } {
  _kb = new KnowledgeBase();
  _sessions = new SessionManager();
  _agents = new AgentStateManager();
  return { kb: _kb, sessions: _sessions, agents: _agents };
}

export function getKnowledgeBase(): KnowledgeBase {
  if (!_kb) throw new Error('KnowledgeBase not initialized');
  return _kb;
}

export function getSessions(): SessionManager {
  if (!_sessions) throw new Error('SessionManager not initialized');
  return _sessions;
}

export function getAgentStates(): AgentStateManager {
  if (!_agents) throw new Error('AgentStateManager not initialized');
  return _agents;
}
