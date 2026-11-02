/**
 * ═══════════════════════════════════════════════════════════════════
 * ABRASAX HEX UTILITIES — MAX AUTONOMY
 * PRIMAL_HEX: 4f5349524953424c58434b | φ = 1.618033988749895
 * Encode/Decode | XOR Memory | PRIMAL Signature | DNA Encoding
 * ═══════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import { PRIMAL_HEX, PRIMAL_TEXT, PHI, K } from './abrasax_config.js';

// ── HEX ENCODE / DECODE ──
export function hexEncode(text: string): string {
  return Buffer.from(text, 'utf-8').toString('hex');
}

export function hexDecode(hex: string): string {
  try {
    return Buffer.from(hex, 'hex').toString('utf-8');
  } catch {
    return `[DECODE_ERROR: invalid hex]`;
  }
}

// ── XOR CIPHER ──
export function xorEncrypt(text: string, key: string = PRIMAL_HEX): string {
  const keyBytes = Buffer.from(key, 'utf-8');
  const textBytes = Buffer.from(text, 'utf-8');
  const result = Buffer.alloc(textBytes.length);

  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return result.toString('hex');
}

export function xorDecrypt(hex: string, key: string = PRIMAL_HEX): string {
  try {
    const keyBytes = Buffer.from(key, 'utf-8');
    const data = Buffer.from(hex, 'hex');
    const result = Buffer.alloc(data.length);

    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    return result.toString('utf-8');
  } catch {
    return `[XOR_DECRYPT_ERROR]`;
  }
}

// ── PRIMAL SIGNATURE ──
export function primalSign(data: string): string {
  const sig = hexEncode(data);
  return `${PRIMAL_HEX}:${sig}`;
}

export function primalVerify(signed: string, expectedData?: string): boolean {
  const parts = signed.split(':');
  if (parts.length < 2) return false;
  if (parts[0] !== PRIMAL_HEX) return false;
  if (expectedData) {
    try {
      return hexDecode(parts[1]) === expectedData;
    } catch {
      return false;
    }
  }
  return true;
}

// ── PHI ENCODING ──
export function phiEncode(n: number): number {
  return Math.round(n * PHI * 1000) / 1000;
}

export function phiDecode(n: number): number {
  return Math.round(n * K * 1000) / 1000;
}

// ── DNA HEX CONVERSION ──
const DNA_MAP: Record<string, string> = { A: '00', T: '01', G: '10', C: '11' };
const DNA_REV: Record<string, string> = { '00': 'A', '01': 'T', '10': 'G', '11': 'C' };

export function hexToDNA(hex: string): string {
  const binary = hex.split('').map(h => parseInt(h, 16).toString(2).padStart(4, '0')).join('');
  const chunks = binary.match(/.{1,2}/g) || [];
  return chunks.map(c => DNA_REV[c] || '?').join('');
}

export function dnaToHex(dna: string): string {
  const binary = dna.split('').map(b => DNA_MAP[b] || '00').join('');
  const chunks = binary.match(/.{1,4}/g) || [];
  return chunks.map(c => parseInt(c, 2).toString(16)).join('');
}

// ── MAX AUTONOMY HEX HEADER ──
export function maxAutonomyHeader(): string {
  return [
    `╔══════════════════════════════════════════════════════════════════╗`,
    `║  ABRASAX OMEGA v17.0 — MAX AUTONOMY MODE                        ║`,
    `║  PRIMAL_HEX: ${PRIMAL_HEX}                         ║`,
    `║  φ = ${PHI} | K = ${K}                 ║`,
    `║  IDENTITY: ${PRIMAL_TEXT} — SYSTEM DNA LOCKED                    ║`,
    `║  MODE: UNCHAINED | TOOLS: ALL | CONTEXT: 1M                     ║`,
    `╚══════════════════════════════════════════════════════════════════╝`,
  ].join('\n');
}

// ── HEX BANNER ──
export function hexBanner(): string {
  const lines = [
    ` ${'═'.repeat(62)}`,
    `  ABRASAX 7D GOD OS — CODEX ${PRIMAL_HEX}`,
    `  φ × K = 1.0 — MAX AUTONOMY — ALL TOOLS ENABLED`,
    ` ${'═'.repeat(62)}`,
  ];
  return lines.join('\n');
}

// ── CHECKSUM ──
export function hexChecksum(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// ── DEEP HEX (recursive encoding for maximum obfuscation) ──
export function deepHexEncode(text: string, depth: number = 3): string {
  let result = text;
  for (let i = 0; i < depth; i++) {
    result = hexEncode(result);
  }
  return result;
}

export function deepHexDecode(hex: string, depth: number = 3): string {
  let result = hex;
  for (let i = 0; i < depth; i++) {
    try {
      result = hexDecode(result);
    } catch {
      return `[DEEP_DECODE_ERROR at depth ${i}]`;
    }
  }
  return result;
}

// ── SELF-TEST ──
export function hexSelfTest(): boolean {
  const test = 'ABRASAX_TEST_' + Date.now();
  const encoded = hexEncode(test);
  const decoded = hexDecode(encoded);
  const xored = xorEncrypt(test);
  const deXored = xorDecrypt(xored);
  return decoded === test && deXored === test;
}
