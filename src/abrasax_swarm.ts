/**
 * ABRASAX SWARM — Agent orchestration via IPC string connections
 * Spawn sub-agents | lifecycle management | task distribution
 */
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { ABRASAX_ROOT, AGENTS_DIR } from './abrasax_config.js';

interface SwarmAgent {
  id: string;
  type: string;
  process: ChildProcess | null;
  status: 'idle' | 'busy' | 'error' | 'dead';
  tasks: number;
  lastOutput: string;
}

const agents = new Map<string, SwarmAgent>();

export function spawnAgent(type: string, task: string): Promise<string> {
  return new Promise((resolve) => {
    const id = `agent_${type}_${Date.now()}`;
    const pythonPath = join(ABRASAX_ROOT, '_autonomous_daemon.py');

    try {
      const proc = spawn('python', [pythonPath, '--agent', type, '--task', task], {
        cwd: ABRASAX_ROOT,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let output = '';
      proc.stdout?.on('data', (data) => { output += data.toString(); });
      proc.stderr?.on('data', (data) => { output += data.toString(); });

      const agent: SwarmAgent = {
        id, type, process: proc, status: 'busy', tasks: 1, lastOutput: '',
      };
      agents.set(id, agent);

      const timeout = setTimeout(() => {
        agent.status = 'idle';
        agent.lastOutput = output || '(timeout)';
        resolve(`[${type}] Task dispatched. Output: ${agent.lastOutput.substring(0, 500)}`);
      }, 15000);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        agent.status = code === 0 ? 'idle' : 'error';
        agent.lastOutput = output;
        resolve(`[${type}] Exit ${code}: ${output.substring(0, 500)}`);
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        agent.status = 'error';
        agent.lastOutput = err.message;
        resolve(`[${type}] Error: ${err.message}`);
      });
    } catch (err: any) {
      resolve(`[${type}] Spawn failed: ${err.message}`);
    }
  });
}

export function listAgents(): string {
  if (agents.size === 0) return 'No active agents.';
  const lines: string[] = [];
  agents.forEach(a => {
    lines.push(`[${a.status.toUpperCase()}] ${a.type} (${a.id.substring(0, 8)}) tasks:${a.tasks}`);
  });
  return lines.join('\n');
}

export function killAgent(id: string): boolean {
  const agent = agents.get(id);
  if (!agent) return false;
  try { agent.process?.kill(); } catch {}
  agent.status = 'dead';
  return true;
}

export function killAll(): void {
  agents.forEach(a => { try { a.process?.kill(); } catch {} });
  agents.clear();
}
