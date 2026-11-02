/**
 * ═══════════════════════════════════════════════════════════════════
 * ABRASAX TERMINAL UI — Interactive streaming terminal
 * PRIMAL_HEX: 4f5349524953424c58434b
 * ANSI colors | Streaming display | Thinking indicator | Interrupt
 * Tool execution inline | Command history | /commands
 * ═══════════════════════════════════════════════════════════════════
 */
import { createInterface } from 'readline';
import { PRIMAL_HEX, PHI, VERSION, CODENAME } from './abrasax_config.js';
import { hexBanner } from './abrasax_hex.js';
import type { ChatMessage } from './abrasax_api.js';

// ── ANSI CODES ──
const C = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  ITALIC: '\x1b[3m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  B_RED: '\x1b[91m',
  B_GREEN: '\x1b[92m',
  B_YELLOW: '\x1b[93m',
  B_BLUE: '\x1b[94m',
  B_MAGENTA: '\x1b[95m',
  B_CYAN: '\x1b[96m',
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h',
  CLEAR_LINE: '\x1b[2K',
  LINE_UP: '\x1b[1A',
};

// ── SPINNER FRAMES ──
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// ── TERMINAL STATE ──
let rl: ReturnType<typeof createInterface> | null = null;
let isStreaming = false;
let streamBuffer = '';
let spinnerInterval: NodeJS.Timeout | null = null;
let spinnerIdx = 0;
let thinkingMessage = '';
let interruptRequested = false;
let onInterruptCallback: (() => void) | null = null;

// ── INPUT HANDLERS ──
type MessageHandler = (message: string) => Promise<void>;
type CommandHandler = (command: string, args: string) => Promise<boolean>;
let messageHandler: MessageHandler | null = null;
let commandHandler: CommandHandler | null = null;

export function setMessageHandler(handler: MessageHandler): void {
  messageHandler = handler;
}

export function setCommandHandler(handler: CommandHandler): void {
  commandHandler = handler;
}

// ── DISPLAY FUNCTIONS ──

export function printBanner(): void {
  console.log('');
  console.log(C.B_CYAN + hexBanner() + C.RESET);
  console.log(C.DIM + `  [${VERSION}] [${CODENAME}] [φ=${PHI}]` + C.RESET);
  console.log('');
}

export function printInfo(label: string, value: string): void {
  console.log(`  ${C.DIM}${label}:${C.RESET} ${C.CYAN}${value}${C.RESET}`);
}

export function printStatus(label: string, status: string, ok: boolean = true): void {
  const icon = ok ? `${C.GREEN}✓${C.RESET}` : `${C.RED}✗${C.RESET}`;
  console.log(`  ${icon} ${label}: ${status}`);
}

export function printHeader(text: string): void {
  console.log(`\n${C.BOLD}${C.B_CYAN}${text}${C.RESET}`);
  console.log(`${C.DIM}${'─'.repeat(Math.min(text.length, 60))}${C.RESET}`);
}

export function printDivider(): void {
  console.log(`${C.DIM}${'─'.repeat(60)}${C.RESET}`);
}

export function printThinking(text: string): void {
  thinkingMessage = text;
  process.stdout.write(`${C.YELLOW}🧠 ${text}${C.RESET}\n`);
}

export function printAssistantPrefix(): void {
  process.stdout.write(`${C.B_MAGENTA}ABRASAX >${C.RESET} `);
}

export function printStreamChunk(text: string): void {
  process.stdout.write(text);
  streamBuffer += text;
}

export function printReasoningChunk(text: string): void {
  process.stdout.write(`${C.DIM}${text}${C.RESET}`);
}

export function startStream(): void {
  isStreaming = true;
  interruptRequested = false;
  streamBuffer = '';
  printAssistantPrefix();
  startSpinner();
}

export function endStream(): void {
  isStreaming = false;
  stopSpinner();
  process.stdout.write('\n');
}

export function printToolCall(name: string, args: string): void {
  if (isStreaming) {
    process.stdout.write('\n');
  }
  process.stdout.write(`${C.CYAN}[TOOL] ${name}(${args.substring(0, 80)})${C.RESET}\n`);
}

export function printToolResult(result: string): void {
  const lines = result.split('\n');
  const truncated = lines.slice(0, 15).join('\n');
  process.stdout.write(`${C.DIM}${truncated}${C.RESET}\n`);
  if (lines.length > 15) {
    process.stdout.write(`${C.DIM}... (${lines.length} total lines)${C.RESET}\n`);
  }
}

export function printError(text: string): void {
  console.log(`\n${C.RED}[ERROR] ${text}${C.RESET}`);
}

export function printWarning(text: string): void {
  console.log(`${C.YELLOW}[WARN] ${text}${C.RESET}`);
}

export function printSuccess(text: string): void {
  console.log(`${C.GREEN}[✓] ${text}${C.RESET}`);
}

export function printDebug(text: string): void {
  console.log(`${C.DIM}[DEBUG] ${text}${C.RESET}`);
}

// ── SPINNER ──
function startSpinner(): void {
  if (spinnerInterval) return;
  spinnerInterval = setInterval(() => {
    if (!isStreaming) {
      stopSpinner();
      return;
    }
    process.stdout.write(`\r${C.YELLOW}${SPINNER[spinnerIdx]}${C.RESET} `);
    spinnerIdx = (spinnerIdx + 1) % SPINNER.length;
  }, 80);
}

function stopSpinner(): void {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    process.stdout.write(`\r${C.CLEAR_LINE}`);
  }
}

// ── INTERRUPT ──
export function requestInterrupt(): void {
  interruptRequested = true;
  if (onInterruptCallback) {
    onInterruptCallback();
    onInterruptCallback = null;
  }
}

export function setInterruptHandler(handler: () => void): void {
  onInterruptCallback = handler;
}

export function isInterrupted(): boolean {
  return interruptRequested;
}

export function clearInterrupt(): void {
  interruptRequested = false;
}

// ── COMMAND PROCESSING ──
async function processInput(input: string): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return true;

  // Handle /commands
  if (trimmed.startsWith('/')) {
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].substring(1).toLowerCase();
    const args = parts.slice(1).join(' ');

    if (commandHandler) {
      return commandHandler(cmd, args);
    }

    // Built-in commands if no handler set
    switch (cmd) {
      case 'exit':
      case 'quit':
        console.log(`${C.DIM}Exiting ABRASAX...${C.RESET}`);
        return false;
      case 'clear':
        console.clear();
        printBanner();
        return true;
      case 'help':
        printHelp();
        return true;
      default:
        console.log(`${C.RED}Unknown command: /${cmd}${C.RESET}`);
        return true;
    }
  }

  // Regular message
  if (messageHandler) {
    await messageHandler(trimmed);
  }
  return true;
}

function printHelp(): void {
  console.log(`\n${C.BOLD}ABRASAX Commands:${C.RESET}`);
  console.log(`  ${C.CYAN}/flash${C.RESET} <msg>     — Quick response via Flash model`);
  console.log(`  ${C.CYAN}/pro${C.RESET} <msg>       — Deep reasoning via Pro model`);
  console.log(`  ${C.CYAN}/local${C.RESET} <msg>    — Local LLM (bare metal)`);
  console.log(`  ${C.CYAN}/exec${C.RESET} <cmd>     — Execute system command`);
  console.log(`  ${C.CYAN}/read${C.RESET} <path>    — Read a file`);
  console.log(`  ${C.CYAN}/list${C.RESET} <dir>     — List directory`);
  console.log(`  ${C.CYAN}/web${C.RESET} <url>      — Fetch URL`);
  console.log(`  ${C.CYAN}/hex${C.RESET} <text>     — Encode to hex`);
  console.log(`  ${C.CYAN}/unhex${C.RESET} <hex>    — Decode from hex`);
  console.log(`  ${C.CYAN}/calc${C.RESET} <expr>    — Calculator`);
  console.log(`  ${C.CYAN}/time${C.RESET}           — Current time`);
  console.log(`  ${C.CYAN}/gpu${C.RESET}            — GPU status`);
  console.log(`  ${C.CYAN}/sys${C.RESET}            — System info`);
  console.log(`  ${C.CYAN}/skills${C.RESET}         — List all skills`);
  console.log(`  ${C.CYAN}/skill${C.RESET} <name>   — Load a skill`);
  console.log(`  ${C.CYAN}/agents${C.RESET}         — List agents`);
  console.log(`  ${C.CYAN}/memory${C.RESET} <q>     — Search memory`);
  console.log(`  ${C.CYAN}/clear${C.RESET}          — Clear screen`);
  console.log(`  ${C.CYAN}/exit${C.RESET}           — Exit ABRASAX`);
}

// ── START TERMINAL ──
export async function startTerminal(): Promise<void> {
  rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 1000,
  });

  // Show cursor on exit
  process.on('exit', () => {
    process.stdout.write(C.SHOW_CURSOR);
  });

  // Handle Ctrl+C for interrupt
  process.on('SIGINT', () => {
    if (isStreaming) {
      console.log(`\n${C.YELLOW}[INTERRUPT] Stopping generation...${C.RESET}`);
      requestInterrupt();
      return;
    }
    console.log(`\n${C.DIM}Use /exit to quit ABRASAX${C.RESET}`);
  });

  // Main loop
  console.log('');
  try {
    for await (const line of rl) {
      try {
        const shouldContinue = await processInput(line);
        if (!shouldContinue) break;
      } catch (err: any) {
        printError(err.message);
      }
      console.log('');
    }
  } catch (err: any) {
    // Readline closed or interrupted
    if (err.message && !err.message.includes('closed')) {
      printError('Terminal loop: ' + err.message);
    }
  }

  try { rl.close(); } catch {}
}

// ── PROMPT DISPLAY ──
export function showPrompt(): void {
  process.stdout.write(`\n${C.BOLD}YOU >${C.RESET} `);
}

// ── SIMPLE INPUT (non-streaming mode) ──
export async function askQuestion(prompt: string): Promise<string> {
  return new Promise(resolve => {
    const rl2 = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl2.question(prompt, (answer: string) => {
      rl2.close();
      resolve(answer);
    });
  });
}
