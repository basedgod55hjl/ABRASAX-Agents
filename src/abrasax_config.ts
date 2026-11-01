/**
 * ═══════════════════════════════════════════════════════════════════
 * ABRASAX 7D GOD OS — UNIFIED CONFIGURATION
 * PRIMAL_HEX: 4f5349524953424c58434b | φ = 1.618033988749895
 * ═══════════════════════════════════════════════════════════════════
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir, hostname, platform, arch, cpus, totalmem, freemem, uptime, userInfo } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: resolve(__dirname, '.env') });

// ── PRIMAL CONSTANTS ──
export const PRIMAL_HEX = '4f5349524953424c58434b';
export const PRIMAL_TEXT = 'OSIRISBLXCK';
export const PHI = 1.618033988749895;
export const K = 0.618033988749895;
export const VERSION = '17.0.0';
export const CODENAME = 'OMEGA';

// ── PATHS ──
export const ABRASAX_ROOT = process.env.ABRASAX_ROOT || resolve(homedir(), 'Desktop', 'ABRASAX');
export const SKILLS_DIR = join(ABRASAX_ROOT, 'skills');
export const AGENTS_DIR = join(ABRASAX_ROOT, 'agents');
export const MEMORY_DIR = join(ABRASAX_ROOT, 'memory');
export const LOGS_DIR = join(ABRASAX_ROOT, 'logs');
export const KERNELS_DIR = join(ABRASAX_ROOT, 'kernels');
export const ENGINE_DIR = join(ABRASAX_ROOT, 'engine');
export const SWARM_DIR = join(ABRASAX_ROOT, 'swarm');
export const CORE_DIR = join(ABRASAX_ROOT, 'core');
export const DIST_DIR = join(ABRASAX_ROOT, 'dist');

// ── MEMORY FILES ──
export const MEMORY_FILE = join(MEMORY_DIR, 'abrasax_memory.json');
export const HISTORY_FILE = join(LOGS_DIR, 'chat_history.jsonl');
export const KNOWLEDGE_FILE = join(MEMORY_DIR, 'knowledge.json');
export const AGENT_STATE_FILE = join(MEMORY_DIR, 'agent_state.json');
export const SESSION_FILE = join(MEMORY_DIR, 'sessions.json');

// ── LOCAL LLM (PRIMARY — BARE METAL) ──
export const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || 'http://127.0.0.1:1234/v1';
export const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1';
export const LOCAL_LLM_BACKUP_URL = 'http://127.0.0.1:8080/v1';
export const LOCAL_MODEL = process.env.ABRASAX_MODEL || 'gemma-4-e4b-uncensored-hauhaucs-aggressive';

// ── DEEPSEEK API (NOT USED — fully local, kept for schema compat) ──
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
export const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'http://127.0.0.1:1234/v1';
export const DEEPSEEK_BETA_URL = process.env.DEEPSEEK_BETA_URL || 'http://127.0.0.1:1234/v1';
export const DEEPSEEK_MODEL_FLASH = process.env.DEEPSEEK_MODEL_FLASH || LOCAL_MODEL;
export const DEEPSEEK_MODEL_REASONER = process.env.DEEPSEEK_MODEL_REASONER || LOCAL_MODEL;

// ── OTHER API KEYS ──
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const VENICE_API_KEY = process.env.VENICE_API_KEY || '';
export const VENICE_BASE_URL = process.env.VENICE_BASE_URL || 'https://api.venice.ai/api/v1';
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// ── MODEL ROUTING ──
export const FAST_MODEL = process.env.ABRASAX_FAST_MODEL || 'deepseek-chat';
export const REASON_MODEL = process.env.ABRASAX_REASON_MODEL || 'deepseek-reasoner';
export const TEMPERATURE_FLASH = parseFloat(process.env.ABRASAX_TEMPERATURE_FLASH || '0.7');
export const TEMPERATURE_REASON = parseFloat(process.env.ABRASAX_TEMPERATURE_REASON || '0.3');
export const MAX_TOKENS_FLASH = parseInt(process.env.ABRASAX_MAX_TOKENS_FLASH || '8192', 10);
export const MAX_TOKENS_REASON = parseInt(process.env.ABRASAX_MAX_TOKENS_REASON || '32768', 10);

// ── CONTEXT & PERFORMANCE ──
export const CONTEXT_WINDOW = 1_048_576; // 1M context
export const MAX_TOOL_LOOPS = 250;
export const EXEC_TIMEOUT = 60_000; // 60 seconds
export const API_TIMEOUT = parseInt(process.env.API_TIMEOUT_MS || '600000', 10);

// ── PORTS ──
export const SWARM_PORT = parseInt(process.env.NODE_SERVER_PORT || '3000', 10);
export const MCP_PORT = parseInt(process.env.MCP_PORT || '3001', 10);
export const WS_PORT = 3002;
export const WEB_UI_PORT = parseInt(process.env.WEB_UI_PORT || '8080', 10);

// ── GPU ──
export const CUDA_VISIBLE_DEVICES = process.env.CUDA_VISIBLE_DEVICES || '0';
export const VRAM_TOTAL_MB = parseInt(process.env.ABRASAX_VRAM_TOTAL_MB || '6144', 10);
export const OFFLOAD_TO_NVIDIA = process.env.ABRASAX_OFFLOAD_TO_NVIDIA === '1';

// ── DAEMON CONTROLS ──
export const DAEMON_AUTONOMOUS = process.env.ABRASAX_GLOBAL_DAEMON_AUTONOMOUS === '1';
export const DAEMON_LOKI = process.env.ABRASAX_GLOBAL_DAEMON_LOKI === '1';
export const AUTONOMOUS_WORKERS = parseInt(process.env.ABRASAX_AUTONOMOUS_WORKERS || '4', 10);

// ── TIMEOUTS ──
export const TOOL_TIMEOUT = 30_000;
export const AGENT_TIMEOUT = 120_000;
export const WEBSOCKET_HEARTBEAT = 15_000;

// ── DISPLAY ──
export const MAX_TOOL_OUTPUT = 50_000; // chars to show from tool outputs
export const STREAM_CHUNK_SIZE = 1; // tokens per chunk in streaming

// ── PRIMARY ENGINE SELECTION ──
export const ENGINE_MODE = (process.env.ABRASAX_ENGINE || 'local') as 'local' | 'api' | 'hybrid';
// 'local' = bare metal LM Studio only
// 'api' = DeepSeek API only
// 'hybrid' = local first, API fallback

// ── AGI / DNA ──
export const DNA_ENGINE_ENABLED = true;
export const AGI_CONFIG_DIR = join(ABRASAX_ROOT, 'agi_config');
export const SINGULARITY_ROOT = process.env.ABRASAX_SINGULARITY_ROOT || join(ABRASAX_ROOT, '01_RUNTIME', 'singularity');
export const CRYSTAL_COMPUTE_ROOT = process.env.ABRASAX_CRYSTAL_COMPUTE_ROOT || join(ABRASAX_ROOT, '01_RUNTIME', 'core', 'crystal_compute');

// ── TELEGRAM ──
export const TELEGRAM_OWNER_ID = parseInt(process.env.TELEGRAM_OWNER_ID || '2611544979', 10);
export const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '7755751250').split(',').map(Number);

// ── SYSTEM INFO ──
export function getSystemInfo() {
  return {
    hostname: hostname(),
    platform: platform(),
    arch: arch(),
    cpus: cpus().length,
    ramTotal: Math.round(totalmem() / (1024 ** 3)),
    ramFree: Math.round(freemem() / (1024 ** 3)),
    uptime: Math.round(uptime()),
    nodeVersion: process.version,
    homeDir: homedir(),
    abraxasRoot: ABRASAX_ROOT,
  };
}
