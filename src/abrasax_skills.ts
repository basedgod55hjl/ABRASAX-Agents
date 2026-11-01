/**
 * ═══════════════════════════════════════════════════════════════════
 * ABRASAX SKILLS LOADER — 123+ SKILL.MD FILES WIRED VIA STRING CONNECTIONS
 * PRIMAL_HEX: 4f5349524953424c58434b
 * Load | Parse | Register | Inject into system prompt | Dynamic loading
 * ═══════════════════════════════════════════════════════════════════
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import { SKILLS_DIR, ABRASAX_ROOT } from './abrasax_config.js';

// ── TYPES ──
export interface Skill {
  name: string;
  path: string;
  content: string;
  description: string;
  keywords: string[];
  size: number;
  loaded: boolean;
}

export interface SkillRegistry {
  skills: Map<string, Skill>;
  totalCount: number;
  totalSizeBytes: number;
}

// ── SKILL LOADER ──
const registry: SkillRegistry = {
  skills: new Map(),
  totalCount: 0,
  totalSizeBytes: 0,
};

/**
 * Scan skills/ directory and load all SKILL.md files
 */
export function loadAllSkills(): SkillRegistry {
  registry.skills.clear();

  if (!existsSync(SKILLS_DIR)) {
    console.log(`[SKILLS] Directory not found: ${SKILLS_DIR}`);
    return registry;
  }

  const entries = readdirSync(SKILLS_DIR);

  for (const entry of entries) {
    const fullPath = join(SKILLS_DIR, entry);
    try {
      // Check for SKILL.md in subdirectory
      if (statSync(fullPath).isDirectory()) {
        const skillMdPath = join(fullPath, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          const content = readFileSync(skillMdPath, 'utf-8');
          const skill = parseSkill(skillMdPath, content);
          registry.skills.set(skill.name, skill);
          registry.totalCount++;
          registry.totalSizeBytes += skill.size;
        } else {
          // Check for any .md files in the subdirectory
          const mdFiles = readdirSync(fullPath).filter(f => f.endsWith('.md'));
          for (const mdFile of mdFiles.slice(0, 1)) { // Take first .md
            const mdPath = join(fullPath, mdFile);
            const content = readFileSync(mdPath, 'utf-8');
            const skill = parseSkill(mdPath, content);
            skill.name = normalizeName(entry); // Use dir name as skill name
            registry.skills.set(skill.name, skill);
            registry.totalCount++;
            registry.totalSizeBytes += skill.size;
          }
        }
      }
    } catch (err) {
      // Skip problematic directories
    }
  }

  // Also load skills from .claude/agents/ if present
  const claudeAgentsDir = join(ABRASAX_ROOT, '.claude', 'agents');
  if (existsSync(claudeAgentsDir)) {
    try {
      const agentFiles = readdirSync(claudeAgentsDir).filter(f => f.endsWith('.md'));
      for (const agentFile of agentFiles) {
        const agentPath = join(claudeAgentsDir, agentFile);
        const content = readFileSync(agentPath, 'utf-8');
        const name = normalizeName(basename(agentFile, '.md'));
        if (!registry.skills.has(name)) {
          const skill = parseSkill(agentPath, content, name);
          registry.skills.set(skill.name, skill);
          registry.totalCount++;
          registry.totalSizeBytes += skill.size;
        }
      }
    } catch { /* ignore */ }
  }

  console.log(`[SKILLS] Loaded ${registry.totalCount} skills (${(registry.totalSizeBytes / 1024).toFixed(1)}KB)`);
  return registry;
}

/**
 * Parse a SKILL.md file into a Skill object
 */
function parseSkill(filePath: string, content: string, overrideName?: string): Skill {
  let description = '';
  let name = overrideName || '';
  const keywords: string[] = [];

  // Try to extract from frontmatter or first heading
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterEnded = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect YAML frontmatter
    if (trimmed === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        frontmatterEnded = true;
        continue;
      }
    }

    if (inFrontmatter && !frontmatterEnded) {
      if (trimmed.startsWith('name:') || trimmed.startsWith('name ')) {
        name = name || trimmed.replace(/^name[\s:]+/, '').replace(/['"]/g, '').trim();
      }
      if (trimmed.startsWith('description:') || trimmed.startsWith('description ')) {
        description = trimmed.replace(/^description[\s:]+/, '').replace(/['"]/g, '').trim();
      }
      if (trimmed.startsWith('keywords:') || trimmed.startsWith('tags:')) {
        const kw = trimmed.replace(/^(keywords|tags)[\s:]+/, '').replace(/[[\]'"]/g, '');
        keywords.push(...kw.split(',').map(k => k.trim()).filter(Boolean));
      }
    } else if (trimmed.startsWith('# ') && !name) {
      // Use first heading as name if no frontmatter name
      name = trimmed.replace(/^# /, '').trim();
    }

    // Build description from first non-heading paragraph if no description yet
    if (!description && !trimmed.startsWith('#') && trimmed.length > 20 && !inFrontmatter) {
      description = trimmed.substring(0, 200);
    }
  }

  // If no name from content, use filename
  if (!name) {
    name = normalizeName(basename(filePath, '.md'));
  }

  // Generate keywords from name if none found
  if (keywords.length === 0) {
    keywords.push(...name.split(/[-\s]+/).filter(k => k.length > 2));
  }

  return {
    name: normalizeName(name),
    path: filePath,
    content: content.substring(0, 20000), // Limit skill content to 20KB
    description: description || `${name} skill`,
    keywords,
    size: content.length,
    loaded: false,
  };
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── SKILL LOOKUP ──
export function getSkill(name: string): Skill | undefined {
  const normalized = normalizeName(name);

  // Direct lookup
  if (registry.skills.has(normalized)) {
    return registry.skills.get(normalized)!;
  }

  // Fuzzy lookup - check if any skill name contains the query
  for (const [skillName, skill] of registry.skills) {
    if (skillName.includes(normalized) || normalized.includes(skillName)) {
      return skill;
    }
    if (skill.keywords?.some(k => k.includes(normalized) || normalized.includes(k))) {
      return skill;
    }
  }

  return undefined;
}

// ── SKILL LOAD (for tool use) ──
export async function loadSkillContent(name: string): Promise<string> {
  const skill = getSkill(name);
  if (!skill) {
    const available = listSkillNames().join(', ');
    throw new Error(`Skill not found: "${name}". Available skills: ${available}`);
  }
  skill.loaded = true;
  return `[SKILL: ${skill.name}]\n${skill.description}\n\n${skill.content.substring(0, 4000)}`;
}

// ── SKILL LISTING ──
export function listSkillNames(): string[] {
  return Array.from(registry.skills.keys()).sort();
}

export function listSkills(): string {
  const skills = Array.from(registry.skills.values());
  if (skills.length === 0) return 'No skills loaded.';

  return skills
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(s => `  ${s.name.padEnd(40)} — ${s.description.substring(0, 60)}`)
    .join('\n');
}

export function searchSkills(query: string): Skill[] {
  const q = query.toLowerCase();
  return Array.from(registry.skills.values())
    .filter(s =>
      s.name.includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.keywords.some(k => k.includes(q))
    );
}

// ── BUILD CONDENSED SKILL REGISTRY FOR SYSTEM PROMPT ──
export function buildSkillPrompt(): string {
  const skills = Array.from(registry.skills.values());
  if (skills.length === 0) return '';

  const condensed = skills
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(s => `- ${s.name}: ${s.description.substring(0, 80)}`)
    .join('\n');

  return `\n## ABRASAX SKILLS (${skills.length} available)\n${condensed}\n\nUse the skill_load tool to load a specific skill's full content.`;
}

// ── AGENT SKILLS (from agents/ directory) ──
export function loadAgentSkills(): { name: string; description: string }[] {
  const agentsDir = join(ABRASAX_ROOT, 'agents');
  if (!existsSync(agentsDir)) return [];

  const agents: { name: string; description: string }[] = [];
  try {
    const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = readFileSync(join(agentsDir, file), 'utf-8');
        const firstLine = content.split('\n').find(l => l.trim().startsWith('# '));
        const desc = content.split('\n').find(l => l.trim().length > 30 && !l.startsWith('#'));
        agents.push({
          name: basename(file, '.md'),
          description: firstLine?.replace('# ', '') || desc?.trim().substring(0, 80) || basename(file, '.md'),
        });
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }

  return agents;
}

export function buildAgentPrompt(): string {
  const agents = loadAgentSkills();
  if (agents.length === 0) return '';

  return `\n## ABRASAX AGENTS (${agents.length} available)\n${
    agents.map(a => `- ${a.name}: ${a.description}`).join('\n')
  }`;
}

// ── INIT ──
export function initSkills(): SkillRegistry {
  return loadAllSkills();
}
