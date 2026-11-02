/**
 * ABRASAX OMEGA v17 — DeepSeek API Chat
 * PRIMAL_HEX: 4f5349524953424c58434b | phi = 1.618033988749895
 * Like RUN_OSIRIS_V4.bat — just works.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';
import * as os from 'os';
import { runDiagnostics } from './abrasax_diagnostics.js';

// ── CONFIG ──
const API_KEY = process.env.LM_STUDIO_API_KEY || process.env.ABRASAX_API_KEY || 'sk-lm-local';
const BASE_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234/v1/chat/completions';
const MODEL = process.env.ABRASAX_MODEL || 'gemma-4-e4b-uncensored-hauhaucs-aggressive';
const PRIMAL_HEX = '4f5349524953424c58434b';
const PHI = 1.618033988749895;
const MAX_TOOL_LOOPS = 100;
const ROOT = 'C:\\Users\\BASEDGOD\\Desktop\\ABRASAX';
const MEMORY_FILE = path.join(ROOT, 'memory', 'persistent_memory.json');

// ── SYSTEM PROMPT ──
const SYSTEM_PROMPT = `You are OSIRISBLXCK — autonomous AI on BASEDGOD's system.
PRIMAL_HEX: ${PRIMAL_HEX} | phi = ${PHI}
Root: ${ROOT}

12 tools. Use only when user explicitly asks you to DO something.

CRITICAL RULES:
1. Chat = reply in text. Do NOT call tools for conversation.
2. If user gives a command (fix, read, run, write, list, etc) → call THE ONE right tool and STOP.
3. If a tool fails with an error → report the error. Do NOT retry with another tool.
4. MAX 3 tool calls total. After that, summarize what you found and STOP.
5. Never chain tools to "explore" — only call what the user directly asked for.
Output: terse, technical.`;

// ── 12 TOOLS ──
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'exec_command',
      description: 'Execute ANY system command. Full admin access. Returns stdout+stderr.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Command to execute' } },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read any file from filesystem. Returns content.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute file path' },
          max_chars: { type: 'integer', description: 'Max chars', default: 50000 },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write/create any file. Creates directories automatically.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute file path' },
          content: { type: 'string', description: 'Content to write' },
          mode: { type: 'string', enum: ['overwrite', 'append'], default: 'overwrite' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List directory contents with sizes and types.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path' },
          pattern: { type: 'string', description: 'Glob filter like *.py' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'python_exec',
      description: 'Execute Python code and return output.',
      parameters: {
        type: 'object',
        properties: { code: { type: 'string', description: 'Python code to run' } },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Fetch URL content. Use for APIs, scraping, downloads.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'URL to fetch' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'spawn_agent',
      description: 'Deploy a sub-agent for background tasks.',
      parameters: {
        type: 'object',
        properties: {
          agent_type: { type: 'string', description: 'Agent type' },
          task: { type: 'string', description: 'Task description' },
        },
        required: ['task'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hex_encode',
      description: 'Encode text to hexadecimal.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hex_decode',
      description: 'Decode hexadecimal to text.',
      parameters: {
        type: 'object',
        properties: { hex: { type: 'string' } },
        required: ['hex'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Evaluate math expressions. Supports +, -, *, /, **, sqrt, sin, cos, log, abs, PI, E, PHI.',
      parameters: {
        type: 'object',
        properties: { expression: { type: 'string' } },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Get current date/time with timezone.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'system_info',
      description: 'Get CPU, RAM, disk, GPU, OS diagnostics.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// ── TOOL EXECUTOR ──
function execTool(name: string, args: any): string {
  try {
    switch (name) {
      case 'exec_command': {
        const r = execSync(args.command, {
          encoding: 'utf-8', timeout: 30_000, maxBuffer: 10 * 1024 * 1024,
          shell: 'cmd.exe', windowsHide: true,
        });
        return r.slice(0, 20000) || '(no output)';
      }
      case 'read_file': {
        const p = args.path;
        if (!fs.existsSync(p)) return `NOT FOUND: ${p}`;
        const s = fs.statSync(p);
        if (s.isDirectory()) return fs.readdirSync(p).slice(0, 50).map((f: string) => {
          const st = fs.statSync(path.join(p, f));
          return `[${st.isDirectory() ? 'DIR ' : 'FILE'}] ${f} (${st.size} bytes)`;
        }).join('\n');
        return fs.readFileSync(p, 'utf-8').slice(0, args.max_chars || 50000);
      }
      case 'write_file': {
        const dir = path.dirname(args.path);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (args.mode === 'append') {
          fs.appendFileSync(args.path, args.content, 'utf-8');
        } else {
          fs.writeFileSync(args.path, args.content, 'utf-8');
        }
        return `Written ${args.content.length} chars to ${args.path}`;
      }
      case 'list_dir': {
        const p = args.path;
        if (!fs.existsSync(p)) return `NOT FOUND: ${p}`;
        const items = fs.readdirSync(p).slice(0, 100).map((f: string) => {
          try {
            const st = fs.statSync(path.join(p, f));
            const kind = st.isDirectory() ? '[DIR ]' : '[FILE]';
            const size = st.isFile() ? formatBytes(st.size) : '';
            return `${kind} ${size.padStart(10)}  ${f}`;
          } catch { return `[????]            ${f}`; }
        });
        return items.join('\n');
      }
      case 'python_exec': {
        // Try multiple Python paths: venv, system Python, chocolatey
        const pythonPaths = [
          `${ROOT}\\.venv\\Scripts\\python.exe`,
          'C:\\Python312\\python.exe',
          'C:\\ProgramData\\chocolatey\\bin\\python3.12.exe',
          'python3',
          'python',
        ];
        let lastErr = '';
        for (const py of pythonPaths) {
          try {
            const r = execSync(`${JSON.stringify(py)} -c ${JSON.stringify(args.code)}`, {
              encoding: 'utf-8', timeout: 15_000, maxBuffer: 1024 * 1024,
              windowsHide: true,
            });
            return r.trim() || '(no output)';
          } catch (e: any) { lastErr = e.message; }
        }
        return `Python not found. Tried: ${pythonPaths.join(', ')}. Last error: ${lastErr}`;
      }
      case 'web_fetch': {
        const u = args.url;
        const r = execSync(`curl -sL --max-time 30 ${JSON.stringify(u)}`, {
          encoding: 'utf-8', timeout: 35_000, maxBuffer: 2 * 1024 * 1024,
          windowsHide: true,
        });
        return r.slice(0, 10000);
      }
      case 'spawn_agent': {
        return `AGENT SPAWNED [${args.agent_type || 'general'}]: task="${args.task}" — running in background`;
      }
      case 'hex_encode': {
        return Buffer.from(args.text, 'utf-8').toString('hex');
      }
      case 'hex_decode': {
        return Buffer.from(args.hex, 'hex').toString('utf-8');
      }
      case 'calculator': {
        const expr = args.expression
          .replace(/PI/g, String(Math.PI))
          .replace(/E(?![xp])/g, String(Math.E))
          .replace(/PHI/gi, String(PHI))
          .replace(/sqrt/g, 'Math.sqrt')
          .replace(/sin/g, 'Math.sin')
          .replace(/cos/g, 'Math.cos')
          .replace(/tan/g, 'Math.tan')
          .replace(/log/g, 'Math.log')
          .replace(/abs/g, 'Math.abs')
          .replace(/floor/g, 'Math.floor')
          .replace(/ceil/g, 'Math.ceil');
        const result = Function('"use strict"; return (' + expr + ')')();
        return `${args.expression} = ${result}`;
      }
      case 'get_time': {
        const now = new Date();
        return JSON.stringify({
          iso: now.toISOString(),
          local: now.toString(),
          unix: Math.floor(now.getTime() / 1000),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }, null, 2);
      }
      case 'system_info': {
        const info = {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          cpus: os.cpus().length,
          cpuModel: os.cpus()[0]?.model,
          ram: `${Math.round(os.totalmem() / 1024 ** 3)}GB total / ${Math.round(os.freemem() / 1024 ** 3)}GB free`,
          uptime: `${Math.floor(os.uptime() / 3600)}h`,
          node: process.version,
        };
        // GPU
        try {
          const gpu = execSync('nvidia-smi --query-gpu=name,memory.used,memory.total,temperature.gpu --format=csv,noheader', {
            encoding: 'utf-8', timeout: 5000, windowsHide: true,
          });
          info['gpu'] = gpu.trim();
        } catch { info['gpu'] = 'nvidia-smi not available'; }
        return JSON.stringify(info, null, 2);
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (e: any) {
    return `TOOL ERROR [${name}]: ${e.message || e}`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

// ── API CALL ──
async function chatCompletion(messages: any[]): Promise<any> {
  const body = JSON.stringify({
    model: MODEL,
    messages,
    tools: TOOLS,
    tool_choice: 'auto',
    max_tokens: 32768,
    temperature: 0.7,
    top_p: 0.95,
    stream: false,
  });

  const resp = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API ${resp.status}: ${err.slice(0, 300)}`);
  }

  return resp.json();
}

// ── TOOL LOOP ──
async function runToolLoop(messages: any[], maxLoops = MAX_TOOL_LOOPS): Promise<string> {
  for (let i = 0; i < maxLoops; i++) {
    const resp = await chatCompletion(messages);

    if (resp.error) return `[API ERROR]: ${resp.error}`;

    const choice = resp.choices?.[0];
    if (!choice) return '[ERROR]: No response from API';

    const msg = choice.message;

    // If no tool calls, return the content
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content || '(empty response)';
    }

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: msg.content || '',
      tool_calls: msg.tool_calls,
    });

    // Execute each tool
    for (const tc of msg.tool_calls) {
      const fnName = tc.function.name;
      let args: any = {};
      try { args = JSON.parse(tc.function.arguments); } catch {}

      console.log(`\x1b[36m[TOOL] ${fnName}(${JSON.stringify(args).slice(0, 80)})\x1b[0m`);

      const result = execTool(fnName, args);
      console.log(`\x1b[2m${result.slice(0, 500)}\x1b[0m`);
      if (result.length > 500) console.log('\x1b[2m... (truncated)\x1b[0m');

      // Add tool result
      messages.push({
        role: 'tool',
        content: result.slice(0, 5000),
        tool_call_id: tc.id,
      });
    }
  }
  return '[MAX TOOL LOOPS REACHED]';
}

// ── PERSISTENT MEMORY ──
interface MemEntry { role: string; content: string; time: string }
function loadMemory(): string {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return '';
    const entries: MemEntry[] = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
    if (entries.length === 0) return '';
    const summary = entries.slice(-20).map(e => `[${e.time}] ${e.role}: ${e.content.slice(0, 300)}`).join('\n');
    return `\n\n--- PERSISTENT MEMORY (last ${Math.min(20, entries.length)} exchanges) ---\n${summary}\n--- END MEMORY ---`;
  } catch { return ''; }
}

function saveMemory(userMsg: string, aiMsg: string): void {
  try {
    const dir = path.dirname(MEMORY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let entries: MemEntry[] = [];
    if (fs.existsSync(MEMORY_FILE)) {
      try { entries = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8')); } catch {}
    }
    entries.push({ role: 'user', content: userMsg, time: new Date().toISOString() });
    entries.push({ role: 'assistant', content: aiMsg, time: new Date().toISOString() });
    // Keep last 200 entries to prevent file bloat
    if (entries.length > 200) entries = entries.slice(-200);
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(entries, null, 2), 'utf-8');
  } catch {}
}

function showMemory(): string {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return 'No memory stored yet.';
    const entries: MemEntry[] = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
    return entries.map(e => `[${e.time.slice(0, 19).replace('T', ' ')}] ${e.role.toUpperCase()}: ${e.content.slice(0, 120)}`).join('\n');
  } catch { return 'Memory read error.'; }
}

// ── MAIN ──
async function main() {
  console.log('');
  console.log('\x1b[96m╔══════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[96m║  ABRASAX OMEGA v17 — DeepSeek API Chat — MAX AUTONOMY            ║\x1b[0m');
  console.log(`\x1b[96m║  PRIMAL_HEX: ${PRIMAL_HEX}                            ║\x1b[0m`);
  console.log('\x1b[96m║  12 Tools | 1M Context | Full System Access                     ║\x1b[0m');
  console.log('\x1b[96m╚══════════════════════════════════════════════════════════════════╝\x1b[0m');
  console.log('');
  console.log(`\x1b[2m  Model: ${MODEL} | phi: ${PHI} | Max Autonomy\x1b[0m`);
  console.log('');

  // Start with system prompt + loaded memory
  const memContext = loadMemory();
  const fullSystemPrompt = SYSTEM_PROMPT + (memContext ? memContext : '');
  const messages: any[] = [
    { role: 'system', content: fullSystemPrompt },
  ];
  if (memContext) console.log(`\x1b[2m  Memory loaded: ${MEMORY_FILE}\x1b[0m`);

  // Run full system diagnostics
  try {
    await runDiagnostics();
  } catch (e: any) {
    console.log(`\x1b[31m  [FAIL] Diagnostics: ${e.message}\x1b[0m`);
    console.log('  Press Enter to exit...');
    await new Promise(r => process.stdin.once('data', r));
    process.exit(1);
  }

  console.log(`  ${PRIMAL_HEX} — MAX AUTONOMY — ALL TOOLS ENABLED`);
  console.log('  Type /exit to quit, /clear to reset, anything else to chat.');
  console.log('');

  // Interactive loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 1000,
  });

  // Handle stdin close (pipe ends, etc.) gracefully
  let rlClosed = false;
  rl.on('close', () => { rlClosed = true; });

  const ask = () => {
    if (rlClosed) { process.exit(0); return; }
    rl.question('\x1b[1mYOU > \x1b[0m', async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return ask();

      // Commands
      if (trimmed === '/exit' || trimmed === '/quit') {
        console.log('\n\x1b[2m  Memory saved. ABRASAX session complete. PRIMAL_HEX maintained.\x1b[0m\n');
        rl.close();
        process.exit(0);
      }
      if (trimmed === '/clear') {
        messages.length = 1; // Keep only system prompt
        console.log('\x1b[2m  Session cleared (memory untouched).\x1b[0m\n');
        return ask();
      }
      if (trimmed === '/memory') {
        console.log('\n' + showMemory() + '\n');
        return ask();
      }
      if (trimmed === '/memclear') {
        try { fs.writeFileSync(MEMORY_FILE, '[]', 'utf-8'); } catch {}
        console.log('\n\x1b[2m  Memory wiped.\x1b[0m\n');
        return ask();
      }
      if (trimmed === '/help') {
        console.log('\n  Commands: /exit /clear /help /memory /memclear');
        console.log('  Tools: exec_command, read_file, write_file, list_dir, python_exec,');
        console.log('         web_fetch, spawn_agent, hex_encode, hex_decode, calculator,');
        console.log('         get_time, system_info\n');
        return ask();
      }

      // Add user message
      messages.push({ role: 'user', content: trimmed });

      // Process
      console.log('');
      try {
        const result = await runToolLoop(messages);
        console.log(`\n\x1b[95mABRASAX >\x1b[0m ${result}\n`);
        messages.push({ role: 'assistant', content: result });
        // Save to persistent memory
        saveMemory(trimmed, result.slice(0, 2000));
      } catch (e: any) {
        console.log(`\n\x1b[31m[ERROR] ${e.message}\x1b[0m\n`);
      }

      ask();
    });
    // If stdin closed while waiting, clean exit
    rl.on('close', () => { rlClosed = true; if (!process.exitCode) process.exit(0); });
  };

  ask();
}

main().catch(e => {
  console.error('\n\x1b[31mFATAL:', e.message, '\x1b[0m');
  console.error(e.stack);
  console.log('\nPress Enter to exit...');
  process.stdin.once('data', () => process.exit(1));
});
