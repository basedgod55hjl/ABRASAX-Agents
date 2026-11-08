/**
 * ABRASAX TS RUNTIME — Node F1 (Hex TypeScript) live server.
 *
 * Zero-dependency TypeScript runtime for the F-logic entanglement bridge.
 * Run directly with node >= 23 (native type stripping):
 *   node abrasax_ts_runtime.ts
 *
 * Serves on 127.0.0.1:4200 (the port _3NODE_F_LOGIC_ENTANGLE.py probes):
 *   GET /health  -> { status, node, phi, hex, ts }
 *   GET /state   -> live f_entanglement_state.json (from memory/)
 *   GET /hex     -> PRIMAL_HEX encode/decode demo of "OSIRISBLXCK"
 *   GET /        -> runtime banner
 *
 * PRIMAL_HEX: 4f5349524953424c58434b | φ: 1.618033988749895
 */
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";

const PHI = 1.618033988749895;
const K = 0.618033988749895;
const PRIMAL_HEX = "4f5349524953424c58434b";
const PRIMAL_TEXT = "OSIRISBLXCK";
const PORT = 4200;
const ROOT = process.env.ABRASAX_ROOT ?? "C:\\abrasax";
const STATE_FILE = path.join(ROOT, "memory", "f_entanglement_state.json");

function hexEncode(s: string): string {
  return [...s].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}
function hexDecode(h: string): string {
  const out: string[] = [];
  for (let i = 0; i + 1 < h.length; i += 2) {
    out.push(String.fromCharCode(parseInt(h.slice(i, i + 2), 16)));
  }
  return out.join("");
}

function readState(): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function json(res: http.ServerResponse, code: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "X-PRIMAL-HEX": PRIMAL_HEX,
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";
  if (url === "/health") {
    json(res, 200, {
      status: "alive",
      node: "F1",
      runtime: "hex-typescript",
      phi: PHI,
      k: K,
      hex: PRIMAL_HEX,
      ts: new Date().toISOString(),
    });
    return;
  }
  if (url === "/state") {
    const state = readState();
    json(res, state ? 200 : 503, state ?? { error: "no entanglement state yet", phi: PHI, hex: PRIMAL_HEX });
    return;
  }
  if (url === "/hex") {
    json(res, 200, {
      text: PRIMAL_TEXT,
      encoded: hexEncode(PRIMAL_TEXT),
      decoded: hexDecode(PRIMAL_HEX),
      primal_hex: PRIMAL_HEX,
    });
    return;
  }
  json(res, 200, {
    name: "ABRASAX TS RUNTIME — Node F1",
    primal_hex: PRIMAL_HEX,
    phi: PHI,
    endpoints: ["/health", "/state", "/hex"],
    ts: new Date().toISOString(),
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[F1-TS] ABRASAX TS runtime on 127.0.0.1:${PORT} — HEX ${PRIMAL_HEX}`);
});
