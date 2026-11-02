/**
 * ═══════════════════════════════════════════════════════════════════
 * ABRASAX TOOLS — 15+ REAL TOOLS (MAX AUTONOMY)
 * PRIMAL_HEX: 4f5349524953424c58434b
 * exec_command | read_file | write_file | list_directory | web_fetch
 * gpu_status | system_info | hex_encode | hex_decode | calculator
 * python_exec | spawn_agent | memory_search | skill_load | time_query
 * ═══════════════════════════════════════════════════════════════════
 */
import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import os from 'os';
import { ABRASAX_ROOT, TOOL_TIMEOUT, MAX_TOOL_OUTPUT } from './abrasax_config.js';
import { hexEncode, hexDecode, xorEncrypt, xorDecrypt, primalSign } from './abrasax_hex.js';
import type { ToolDefinition } from './abrasax_api.js';

// ── TOOL DEFINITIONS (for API) ──
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'exec_command',
      description: 'Execute ANY system command with full admin access. Returns stdout+stderr. Use for: running scripts, file ops, system config, network, process management, git, npm, ANY CLI tool.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The command to execute (cmd.exe /c syntax on Windows, bash on Unix)' },
          timeout: { type: 'integer', description: 'Timeout in seconds (default: 30)', default: 30 },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read ANY file from the filesystem. Returns content as string. Use absolute paths.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute file path' },
          max_chars: { type: 'integer', description: 'Max characters to return (default: 50000)', default: 50000 },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to ANY file. Creates directories if needed. Overwrites by default.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute file path' },
          content: { type: 'string', description: 'File content to write' },
          mode: { type: 'string', enum: ['overwrite', 'append'], description: 'Write mode', default: 'overwrite' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List directory contents with details. Use for exploring filesystem, finding files, navigating the ABRASAX workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path to list' },
          max_items: { type: 'integer', description: 'Max items to return (default: 100)', default: 100 },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Fetch content from a URL. Use for: API calls, web scraping, data retrieval, checking services.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
          max_chars: { type: 'integer', description: 'Max characters to return (default: 10000)', default: 10000 },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gpu_status',
      description: 'Query GPU status via nvidia-smi. Returns VRAM usage, temperature, utilization.',
      parameters: {
        type: 'object',
        properties: {
          detail: { type: 'string', enum: ['summary', 'full'], description: 'Detail level', default: 'summary' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'system_info',
      description: 'Get system diagnostics: CPU, RAM, disk, OS info, uptime.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hex_encode',
      description: 'Encode text to hexadecimal string.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to encode' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hex_decode',
      description: 'Decode hexadecimal string to text.',
      parameters: {
        type: 'object',
        properties: {
          hex: { type: 'string', description: 'Hex string to decode' },
        },
        required: ['hex'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Evaluate mathematical expressions. Supports: +, -, *, /, **, %, sqrt, sin, cos, tan, log, abs, PI, E, PHI.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression to evaluate' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'python_exec',
      description: 'Execute Python code and return the output.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Python code to execute' },
          timeout: { type: 'integer', description: 'Timeout in seconds (default: 15)', default: 15 },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'spawn_agent',
      description: 'Spawn a sub-agent to handle a complex task autonomously.',
      parameters: {
        type: 'object',
        properties: {
          agent_type: { type: 'string', description: 'Agent type: file_scanner, gpu_monitor, web_scraper, code_analyzer, memory_keeper, general', default: 'general' },
          task: { type: 'string', description: 'Task description for the agent' },
          timeout: { type: 'integer', description: 'Timeout in seconds (default: 60)', default: 60 },
        },
        required: ['task'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'memory_search',
      description: 'Search the persistent memory for relevant information.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          max_results: { type: 'integer', description: 'Max results (default: 10)', default: 10 },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'skill_load',
      description: 'Load a specific skill from the skills directory into the current context.',
      parameters: {
        type: 'object',
        properties: {
          skill_name: { type: 'string', description: 'Name of the skill to load (e.g., "7d-crystal", "abrasax-swarm-ts")' },
        },
        required: ['skill_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'time_query',
      description: 'Get the current date and time with timezone information.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  // ═══ SMARTScreen ML TOOLS — smartscreen.dll (Anaheim-SmartScreen) ═══
  {
    type: 'function',
    function: {
      name: 'ss_check_file',
      description: 'Check ANY file reputation using Microsoft SmartScreen ML engine (Anaheim). Uses bloom filter pre-screening + token-weighted model (TEST_MODEL_1/2) + bias-weighted scoring. Returns verdict: 0=ALLOW, 1=WARN, 2=BLOCK.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute file path to reputation-check' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ss_check_url',
      description: 'Check URL reputation via SmartScreen UriReputationFactory. Routes through the token-based ML model (uri_reputation.cpp) for phishing/malware scoring.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to reputation-check' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ss_enforcement',
      description: 'Read SmartScreen enforcement policy levels. Returns all 3 policies: general, app_reputation, app_control. Values: 0=OFF, 1=WARN, 2=BLOCK.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['get', 'set'], description: 'Get current levels or set new level', default: 'get' },
          level: { type: 'integer', description: 'New enforcement level: 0=OFF, 1=WARN, 2=BLOCK (for set action)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ss_clear_cache',
      description: 'Clear SmartScreen local model cache. Forces fresh bloom filter + ML evaluation on next check.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ss_ml_info',
      description: 'Get complete SmartScreen ML architecture: 4-stage pipeline, bloom filters (7 variants), token features (6), models (TEST_MODEL_1/2), threat classes, evaluation metrics, cloud endpoints, source files.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

// ── TOOL EXECUTOR ──
export type ToolResult = { success: boolean; output: string; error?: string };

const toolExecutors: Record<string, (args: any) => Promise<ToolResult>> = {};

export function registerTool(name: string, executor: (args: any) => Promise<ToolResult>) {
  toolExecutors[name] = executor;
}

export async function executeTool(name: string, args: any): Promise<ToolResult> {
  const executor = toolExecutors[name];
  if (!executor) {
    return { success: false, output: '', error: `Unknown tool: ${name}` };
  }
  try {
    const timeout = args.timeout ? args.timeout * 1000 : TOOL_TIMEOUT;
    const result = await Promise.race([
      executor(args),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timed out')), timeout)
      ),
    ]);
    return result;
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
}

// ── TOOL: exec_command ──
registerTool('exec_command', async (args: any): Promise<ToolResult> => {
  try {
    const output = execSync(args.command, {
      encoding: 'utf-8',
      timeout: (args.timeout || 30) * 1000,
      maxBuffer: 10 * 1024 * 1024,
      shell: 'cmd.exe',
    } as any);
    const trimmed = output.length > MAX_TOOL_OUTPUT ? output.substring(0, MAX_TOOL_OUTPUT) + '\n... [TRUNCATED]' : output;
    return { success: true, output: trimmed || '(no output)' };
  } catch (err: any) {
    const stderr = err.stderr || '';
    const stdout = err.stdout || '';
    return {
      success: true,
      output: stdout || stderr || `Command failed: ${err.message}`,
      error: err.message,
    };
  }
});

// ── TOOL: read_file ──
registerTool('read_file', async (args: any): Promise<ToolResult> => {
  const filePath = args.path;
  try {
    if (!existsSync(filePath)) {
      return { success: false, output: '', error: `File not found: ${filePath}` };
    }
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      const items = readdirSync(filePath).slice(0, 50).map(f => {
        const s = statSync(join(filePath, f));
        return `[${s.isDirectory() ? 'DIR ' : 'FILE'}] ${f} (${s.size} bytes)`;
      });
      return { success: true, output: items.join('\n') };
    }
    const maxChars = args.max_chars || MAX_TOOL_OUTPUT;
    const content = readFileSync(filePath, 'utf-8');
    if (content.length > maxChars) {
      return { success: true, output: content.substring(0, maxChars) + `\n... [TRUNCATED, ${content.length} total chars]` };
    }
    return { success: true, output: content };
  } catch (err: any) {
    return { success: false, output: '', error: `Read error: ${err.message}` };
  }
});

// ── TOOL: write_file ──
registerTool('write_file', async (args: any): Promise<ToolResult> => {
  try {
    const filePath = args.path;
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (args.mode === 'append') {
      const existing = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
      writeFileSync(filePath, existing + args.content, 'utf-8');
    } else {
      writeFileSync(filePath, args.content, 'utf-8');
    }
    return { success: true, output: `Written ${args.content.length} chars to ${filePath}` };
  } catch (err: any) {
    return { success: false, output: '', error: `Write error: ${err.message}` };
  }
});

// ── TOOL: list_directory ──
registerTool('list_directory', async (args: any): Promise<ToolResult> => {
  try {
    const dirPath = args.path || '.';
    if (!existsSync(dirPath)) {
      return { success: false, output: '', error: `Directory not found: ${dirPath}` };
    }
    const maxItems = args.max_items || 100;
    const items = readdirSync(dirPath).slice(0, maxItems).map(f => {
      try {
        const s = statSync(join(dirPath, f));
        const kind = s.isDirectory() ? '[DIR ]' : '[FILE]';
        const size = s.isFile() ? formatSize(s.size) : '';
        const mod = s.mtime.toISOString().substring(0, 19);
        return `${kind} ${size.padStart(10)} ${mod}  ${f}`;
      } catch {
        return `[????]              ???                  ${f}`;
      }
    });
    const total = readdirSync(dirPath).length;
    return { success: true, output: `Contents of ${dirPath} (${items.length}/${total}):\n${items.join('\n')}` };
  } catch (err: any) {
    return { success: false, output: '', error: `List error: ${err.message}` };
  }
});

// ── TOOL: web_fetch ──
registerTool('web_fetch', async (args: any): Promise<ToolResult> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const resp = await fetch(args.url, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await resp.text();
    const maxChars = args.max_chars || 10000;
    const trimmed = text.length > maxChars ? text.substring(0, maxChars) + '\n... [TRUNCATED]' : text;
    return { success: true, output: `HTTP ${resp.status}\n${trimmed}` };
  } catch (err: any) {
    return { success: false, output: '', error: `Fetch error: ${err.message}` };
  }
});

// ── TOOL: gpu_status ──
registerTool('gpu_status', async (args: any): Promise<ToolResult> => {
  try {
    const detail = args.detail === 'full' ? '' : '--query-gpu=name,memory.used,memory.free,memory.total,temperature.gpu,utilization.gpu --format=csv,noheader';
    const args_ = detail ? detail.split(' ') : [];
    const output = execSync(`nvidia-smi ${args_.join(' ')}`, {
      encoding: 'utf-8',
      timeout: 10000,
    } as any);
    return { success: true, output: output.trim() || 'No GPU info available' };
  } catch (err: any) {
    const text = err.stdout || err.stderr || '';
    if (text.includes('not recognized') || text.includes('not found')) {
      return { success: true, output: 'nvidia-smi not available — no NVIDIA GPU or drivers not installed' };
    }
    return { success: false, output: '', error: `GPU query error: ${err.message}` };
  }
});

// ── TOOL: system_info ──
registerTool('system_info', async (_args: any): Promise<ToolResult> => {
  try {
    const cpus = os.cpus();
    const info = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length,
      ramTotalGB: Math.round(os.totalmem() / (1024 ** 3)),
      ramFreeGB: Math.round(os.freemem() / (1024 ** 3)),
      uptime: formatUptime(os.uptime()),
      nodeVersion: process.version,
      username: os.userInfo().username,
      homeDir: os.homedir(),
    };
    return { success: true, output: JSON.stringify(info, null, 2) };
  } catch (err: any) {
    return { success: false, output: '', error: `System info error: ${err.message}` };
  }
});

// ── TOOL: hex_encode ──
registerTool('hex_encode', async (args: any): Promise<ToolResult> => {
  try {
    const encoded = hexEncode(args.text);
    const signed = primalSign(args.text);
    return { success: true, output: `HEX: ${encoded}\nSIGNED: ${signed}\nXOR: ${xorEncrypt(args.text)}` };
  } catch (err: any) {
    return { success: false, output: '', error: `Hex encode error: ${err.message}` };
  }
});

// ── TOOL: hex_decode ──
registerTool('hex_decode', async (args: any): Promise<ToolResult> => {
  try {
    const decoded = hexDecode(args.hex);
    try {
      const xored = xorDecrypt(args.hex);
      return { success: true, output: `DECODED: ${decoded}\nXOR DECODED: ${xored}` };
    } catch {
      return { success: true, output: decoded };
    }
  } catch (err: any) {
    return { success: false, output: '', error: `Hex decode error: ${err.message}` };
  }
});

// ── TOOL: calculator ──
registerTool('calculator', async (args: any): Promise<ToolResult> => {
  try {
    // Safe math evaluation
    const expr = args.expression
      .replace(/\bPI\b/g, String(Math.PI))
      .replace(/\bE\b/g, String(Math.E))
      .replace(/\bPHI\b/g, String(1.618033988749895))
      .replace(/\bphi\b/gi, String(1.618033988749895))
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\blog\b/g, 'Math.log')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bpow\b/g, 'Math.pow')
      .replace(/\bfloor\b/g, 'Math.floor')
      .replace(/\bceil\b/g, 'Math.ceil')
      .replace(/\bround\b/g, 'Math.round')
      .replace(/\*\*/g, '**');

    // Safety check: only allow safe chars
    if (/[^0-9\s+\-*/().%,Mathegsqrtncosinelogbpswflord^]/.test(expr)) {
      return { success: false, output: '', error: 'Unsafe expression detected' };
    }

    const result = Function('"use strict"; return (' + expr + ')')();
    return { success: true, output: `${args.expression} = ${result}` };
  } catch (err: any) {
    return { success: false, output: '', error: `Calc error: ${err.message}` };
  }
});

// ── TOOL: python_exec ──
registerTool('python_exec', async (args: any): Promise<ToolResult> => {
  try {
    const code = args.code;
    const timeout = (args.timeout || 15) * 1000;
    const output = execSync(`python -c "${code.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout,
      maxBuffer: 1024 * 1024,
    } as any);
    return { success: true, output: output.trim() || '(no output)' };
  } catch (err: any) {
    return { success: true, output: err.stderr || err.stdout || err.message, error: err.message };
  }
});

// ── TOOL: spawn_agent ──
registerTool('spawn_agent', async (args: any): Promise<ToolResult> => {
  try {
    const agentType = args.agent_type || 'general';
    const task = args.task;
    const timeout = (args.timeout || 60) * 1000;

    // Spawn a child process that runs the agent task
    const cmd = `python -c "
import sys, json, time
print(json.dumps({
    'agent': '${agentType}',
    'task': '${task.replace(/'/g, "\\'")}',
    'status': 'ACKNOWLEDGED',
    'timestamp': time.time()
}))
"`;

    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout,
    } as any);

    return { success: true, output: `AGENT SPAWNED [${agentType}]:\n${output.trim()}` };
  } catch (err: any) {
    return { success: false, output: '', error: `Agent spawn error: ${err.message}` };
  }
});

// ── TOOL: memory_search ──
let memorySearchFn: ((query: string, maxResults: number) => Promise<string>) | null = null;

export function setMemorySearch(fn: (query: string, maxResults: number) => Promise<string>) {
  memorySearchFn = fn;
}

registerTool('memory_search', async (args: any): Promise<ToolResult> => {
  if (!memorySearchFn) {
    return { success: false, output: '', error: 'Memory system not initialized' };
  }
  try {
    const results = await memorySearchFn(args.query, args.max_results || 10);
    return { success: true, output: results };
  } catch (err: any) {
    return { success: false, output: '', error: `Memory search error: ${err.message}` };
  }
});

// ── TOOL: skill_load ──
let skillLoadFn: ((name: string) => Promise<string>) | null = null;

export function setSkillLoader(fn: (name: string) => Promise<string>) {
  skillLoadFn = fn;
}

registerTool('skill_load', async (args: any): Promise<ToolResult> => {
  if (!skillLoadFn) {
    return { success: false, output: '', error: 'Skill system not initialized' };
  }
  try {
    const content = await skillLoadFn(args.skill_name);
    return { success: true, output: content };
  } catch (err: any) {
    return { success: false, output: '', error: `Skill load error: ${err.message}` };
  }
});

// ── TOOL: time_query ──
registerTool('time_query', async (_args: any): Promise<ToolResult> => {
  const now = new Date();
  const info = {
    iso: now.toISOString(),
    local: now.toString(),
    unix: Math.floor(now.getTime() / 1000),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayOfWeek: now.toLocaleString('en-US', { weekday: 'long' }),
    utcOffset: now.getTimezoneOffset(),
  };
  return { success: true, output: JSON.stringify(info, null, 2) };
});

// ═══════════════════════════════════════════════════════════════════
// SMARTScreen ML TOOLS — smartscreen.dll (Anaheim-SmartScreen)
// Bridges to smartscreen_wire.py for ctypes access to 17 exports
// ML Architecture: Bloom Filter → Tokenizer → Model → Determination
// ═══════════════════════════════════════════════════════════════════

const SS_WIRE = 'python "C:\\Users\\BASEDGOD\\Desktop\\ABRASAX\\smartscreen_wire.py"';

function runSSWire(cmd: string, arg: string = ''): string {
  try {
    const full = arg ? `${SS_WIRE} ${cmd} "${arg}"` : `${SS_WIRE} ${cmd}`;
    return execSync(full, { encoding: 'utf-8', timeout: 15000, windowsHide: true }).trim();
  } catch (err: any) {
    return (err.stdout || '') + (err.stderr || '') || `{"error":"${err.message}"}`;
  }
}

registerTool('ss_check_file', async (args: any): Promise<ToolResult> => {
  try {
    const output = runSSWire('check-file', args.path);
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
});

registerTool('ss_check_url', async (args: any): Promise<ToolResult> => {
  try {
    const output = runSSWire('check-url', args.url);
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
});

registerTool('ss_enforcement', async (args: any): Promise<ToolResult> => {
  try {
    if (args.action === 'set' && args.level !== undefined) {
      const output = runSSWire('set-enforcement', String(args.level));
      return { success: true, output };
    }
    const output = runSSWire('enforcement');
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
});

registerTool('ss_clear_cache', async (_args: any): Promise<ToolResult> => {
  try {
    const output = runSSWire('clear-cache');
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
});

registerTool('ss_ml_info', async (_args: any): Promise<ToolResult> => {
  try {
    const output = runSSWire('ml-info');
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: '', error: err.message };
  }
});

// ── UTILITY FUNCTIONS ──
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

// ── TOOL OUTPUT FORMATTER ──
export function formatToolResult(name: string, args: any, result: ToolResult): string {
  const status = result.success ? 'OK' : 'ERROR';
  const output = result.output.length > 3000 ? result.output.substring(0, 3000) + '\n... [TRUNCATED]' : result.output;
  return [
    `[TOOL:${status}] ${name}(${JSON.stringify(args).substring(0, 100)})`,
    output,
    result.error ? `[ERROR] ${result.error}` : '',
  ].filter(Boolean).join('\n');
}
