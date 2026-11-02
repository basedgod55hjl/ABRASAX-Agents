/**
 * ABRASAX OMEGA v17 — Full System Diagnostics
 * PRIMAL_HEX: 4f5349524953424c58434b
 * Runs on engine startup — tests GPU, API, tools, agents, system state
 */
import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const C = { R: '\x1b[0m', G: '\x1b[32m', Y: '\x1b[33m', R_: '\x1b[31m', C: '\x1b[36m', D: '\x1b[2m', B: '\x1b[1m', M: '\x1b[35m' };

const SEP = '='.repeat(70);
const API_KEY = 'sk-33e0470b210d4d5e9601c5fab517dc53';
const BASE_URL = 'https://api.deepseek.com/chat/completions';
const ROOT = 'C:\\Users\\BASEDGOD\\Desktop\\ABRASAX';

function header(msg: string) {
  console.log(`\n${C.C}${SEP}${C.R}`);
  console.log(`${C.C}  ${msg}${C.R}`);
  console.log(`${C.C}${SEP}${C.R}\n`);
}

function pass(msg: string) { console.log(`  ${C.G}[PASS]${C.R} ${msg}`); }
function fail(msg: string) { console.log(`  ${C.R_}[FAIL]${C.R} ${msg}`); }
function info(msg: string) { console.log(`  ${C.D}${msg}${C.R}`); }

export async function runDiagnostics(): Promise<number> {
  const startTime = Date.now();
  let passed = 0;
  let total = 0;

  header(`OSIRISBLXCK FULL SYSTEM TEST — ${new Date().toLocaleString()}`);

  // ── PHASE 1: SYSTEM ──
  header('PHASE 1: SYSTEM STATE');
  total++;
  try {
    const gpu = execSync(
      'nvidia-smi --query-gpu=name,temperature.gpu,memory.used,memory.total --format=csv,noheader',
      { encoding: 'utf-8', timeout: 5000, windowsHide: true }
    ).trim();
    info(`GPU: ${gpu}`);
    info(`CPU: ${os.cpus()[0]?.model?.trim()} | Cores: ${os.cpus().length}`);
    info(`RAM: ${Math.round(os.totalmem() / 1024 ** 3)}GB / ${Math.round(os.freemem() / 1024 ** 3)}GB free`);
    info(`OS: ${os.platform()} ${os.release()} | Node: ${process.version}`);
    info(`Root: ${ROOT}`);
    info(`Python: ${getPythonVersion()}`);
    info(`Skills: ${countSkills()} dirs`);
    info(`Kernels: ${countKernels()}`);
    pass('System state captured');
    passed++;
  } catch (e: any) {
    fail(`System state: ${e.message}`);
  }

  // ── PHASE 2: DEEPSEEK API TEST ──
  header('PHASE 2: DEEPSEEK API TEST');

  // Test Flash
  total++;
  try {
    const resp = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 10, stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await resp.json() as any;
    if (resp.ok) {
      info(`Flash model: ${data.model || 'deepseek-chat'} — ${data.choices?.[0]?.message?.content?.slice(0, 30)}`);
      pass('DeepSeek Flash API');
      passed++;
    } else {
      fail(`Flash API: ${resp.status} ${data.error?.message || ''}`);
    }
  } catch (e: any) { fail(`Flash API: ${e.message}`); }

  // Test Pro (deepseek-reasoner)
  total++;
  try {
    const resp = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 10, stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.json() as any;
    if (resp.ok) {
      info(`Pro model: ${data.model || 'deepseek-reasoner'} — available`);
      pass('DeepSeek Pro API');
      passed++;
    } else {
      fail(`Pro API: ${resp.status} ${data.error?.message || ''}`);
    }
  } catch (e: any) { fail(`Pro API: ${e.message}`); }

  // ── PHASE 3: TOOL TESTS ──
  header('PHASE 3: TOOL TESTS');

  // exec_command
  total++;
  try {
    const r = execSync('echo OSIRISBLXCK_HEX=4f5349524953424c58434b', {
      encoding: 'utf-8', timeout: 5000, shell: 'cmd.exe', windowsHide: true,
    }).trim();
    pass(`exec_command: ${r}`);
    passed++;
  } catch (e: any) { fail(`exec_command: ${e.message}`); }

  // read_file (self)
  total++;
  try {
    const f = path.join(ROOT, 'abrasax_engine.ts');
    const content = fs.readFileSync(f, 'utf-8').slice(0, 80);
    pass(`read_file (self): ${content.replace(/\n/g, ' ')}...`);
    passed++;
  } catch (e: any) { fail(`read_file: ${e.message}`); }

  // list_dir
  total++;
  try {
    const items = fs.readdirSync(ROOT).slice(0, 5);
    pass(`list_dir (root): ${items.join(', ')}`);
    passed++;
  } catch (e: any) { fail(`list_dir: ${e.message}`); }

  // system_info
  total++;
  try {
    const sys = { hostname: os.hostname(), cpus: os.cpus().length, ram: `${Math.round(os.totalmem() / 1024 ** 3)}GB` };
    pass(`system_info: ${JSON.stringify(sys)}`);
    passed++;
  } catch (e: any) { fail(`system_info: ${e.message}`); }

  // hex_encode
  total++;
  try {
    const hex = Buffer.from('OSIRISBLXCK', 'utf-8').toString('hex');
    pass(`hex_encode: ${hex}`);
    passed++;
  } catch (e: any) { fail(`hex_encode: ${e.message}`); }

  // calculator
  total++;
  try {
    const phi = (1 + Math.sqrt(5)) / 2;
    pass(`calculator: PHI = ${phi.toFixed(14)}`);
    passed++;
  } catch (e: any) { fail(`calculator: ${e.message}`); }

  // get_time
  total++;
  try {
    pass(`get_time: ${new Date().toISOString()}`);
    passed++;
  } catch (e: any) { fail(`get_time: ${e.message}`); }

  // ── PHASE 4: SKILLS & KERNELS ──
  header('PHASE 4: SKILLS & KERNELS');
  total++;
  try {
    const skills = countSkills();
    const kernels = countKernels();
    pass(`Skills: ${skills} | Kernels: ${kernels}`);
    passed++;
  } catch (e: any) { fail(`Skills/kernels: ${e.message}`); }

  // ── SUMMARY ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  header('ALL TESTS COMPLETE');
  console.log(`  ${passed}/${total} tests passed in ${elapsed}s\n`);
  console.log(`  ${SEP}\n`);
  return passed;
}

function getPythonVersion(): string {
  try {
    const r = execSync('python --version 2>&1', { encoding: 'utf-8', timeout: 5000, windowsHide: true }).trim();
    return r;
  } catch {
    try {
      const r = execSync('C:\\Python312\\python.exe --version 2>&1', { encoding: 'utf-8', timeout: 5000, windowsHide: true }).trim();
      return r;
    } catch { return 'not in PATH'; }
  }
}

function countSkills(): number {
  try {
    const skillsDir = path.join(ROOT, 'skills');
    if (!fs.existsSync(skillsDir)) return 0;
    return fs.readdirSync(skillsDir, { withFileTypes: true }).filter(d => d.isDirectory()).length;
  } catch { return 0; }
}

function countKernels(): number {
  try {
    const kd = path.join(ROOT, 'kernels');
    if (!fs.existsSync(kd)) return 0;
    return fs.readdirSync(kd).filter(f => f.endsWith('.cu') || f.endsWith('.ptx') || f.endsWith('.py')).length;
  } catch { return 0; }
}

// Direct run
if (process.argv[1]?.includes('abrasax_diagnostics')) {
  runDiagnostics().then(p => {
    console.log(`Diagnostics complete: ${p} passed.`);
    process.exit(0);
  }).catch(e => {
    console.error('Diagnostics failed:', e.message);
    process.exit(1);
  });
}
