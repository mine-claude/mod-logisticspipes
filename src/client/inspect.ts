// @ts-check
// The Pipe Controller and the Pipe Manager, computed in the browser. The server only says "inspect here" (lp_inspect,
// sent by the items' onUse, items.ts): the walk over the pipes and the counting happen here, with the blocks this
// browser already has (ctx.client.getBlock), so a click costs the server one small message instead of a network scan.
// The browser does not know which neighbours hold an inventory (that stays on the server), so the report counts the
// pipes of each kind. A part of the network in a chunk this browser has not loaded is not counted: the report says so.
import { isPipe } from '../network-router.ts';

const STEPS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const MAX_PIPES = 512;

/** @param {string} block */
function kindOf(block) {
  if (block.startsWith('logisticspipes:pipe_provider')) return 'providers';
  if (block === 'logisticspipes:pipe_basic') return 'sinks';
  if (block === 'logisticspipes:pipe_supplier') return 'suppliers';
  if (block.startsWith('logisticspipes:pipe_crafting')) return 'crafting';
  if (block.startsWith('logisticspipes:pipe_request') || block === 'logisticspipes:pipe_remote_orderer') return 'request';
  if (block.startsWith('logisticspipes:pipe_chassis')) return 'chassis';
  if (block === 'logisticspipes:pipe_satellite') return 'satellites';
  return 'transport';
}

/**
 * Walks the pipes connected to `start` with `getBlock` (null = not loaded here).
 * @param {(p: { x: number, y: number, z: number }) => string | null} getBlock @param {{ x: number, y: number, z: number }} start
 */
export function inspectNetwork(getBlock, start) {
  const first = getBlock(start);
  if (!isPipe(first)) return null;
  const seen = new Set([`${start.x},${start.y},${start.z}`]), queue = [start];
  const counts = { providers: 0, sinks: 0, suppliers: 0, crafting: 0, request: 0, chassis: 0, satellites: 0, transport: 0 };
  let partial = false;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    counts[kindOf(/** @type {string} */ (getBlock(p)))]++;
    for (const [dx, dy, dz] of STEPS) {
      const n = { x: p.x + dx, y: p.y + dy, z: p.z + dz }, k = `${n.x},${n.y},${n.z}`;
      if (seen.has(k)) continue;
      const b = getBlock(n);
      if (b === null) { partial = true; continue; }
      if (!isPipe(b)) continue;
      seen.add(k);
      if (seen.size > MAX_PIPES) { partial = true; break; }
      queue.push(n);
    }
    if (seen.size > MAX_PIPES) break;
  }
  return { block: first, pipes: Math.min(queue.length, MAX_PIPES), counts, partial };
}

/** The nearest pipe around (x, y, z), like the Pipe Manager's reach (7 x 5 x 7). @param {(p: any) => string | null} getBlock @param {{ x: number, y: number, z: number }} at */
export function nearestPipe(getBlock, at) {
  const c = { x: Math.floor(at.x), y: Math.floor(at.y), z: Math.floor(at.z) };
  let best = null, bestD = Infinity;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    const p = { x: c.x + dx, y: c.y + dy, z: c.z + dz }, d = dx * dx + dy * dy + dz * dz;
    if (d < bestD && isPipe(getBlock(p))) { best = p; bestD = d; }
  }
  return best;
}

/** The report's lines. @param {'controller' | 'manager'} tool @param {{ x: number, y: number, z: number }} pos @param {any} r */
export function reportLines(tool, pos, r) {
  const c = r.counts, lines = [];
  if (tool === 'controller') {
    lines.push(`Cano: ${r.block}`, `Posição: (${pos.x}, ${pos.y}, ${pos.z})`, `Rede: ${r.pipes} canos, ${c.providers} provedores`);
  } else {
    lines.push(`Canos conectados: ${r.pipes}`, `Provedores: ${c.providers}`, `Básicos (destinos): ${c.sinks}`, `Abastecedores: ${c.suppliers}`,
      `Fabricação: ${c.crafting}`, `Pedido: ${c.request}`, `Chassis: ${c.chassis}`, `Satélites: ${c.satellites}`, `Transporte: ${c.transport}`);
  }
  if (r.partial) lines.push('(parte da rede fora do alcance carregado)');
  return lines;
}

/** @param {import('../../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx */
export function registerInspect(ctx) {
  /** @type {Map<string, any>} one panel per tool (the title is fixed when a panel is made) */
  const panels = new Map();
  ctx.net.on('lp_inspect', (/** @type {any} */ msg) => {
    const tool = msg?.k === 'manager' ? 'manager' : 'controller';
    const getBlock = (/** @type {any} */ p) => ctx.client.getBlock(p);
    let pos = Array.isArray(msg?.p) && msg.p.length === 3 && msg.p.every(Number.isInteger) ? { x: msg.p[0], y: msg.p[1], z: msg.p[2] } : null;
    if (!pos && tool === 'manager') { const me = ctx.client.player(); if (me) pos = nearestPipe(getBlock, me); }
    const r = pos ? inspectNetwork(getBlock, pos) : null;
    const title = tool === 'manager' ? 'Pipe Manager' : 'Pipe Controller';
    const body = (r ? reportLines(tool, pos, r) : ['Mire em um cano da rede para diagnosticar.']).map((text) => ({ text }));
    let panel = panels.get(tool);
    if (!panel) panels.set(tool, (panel = ctx.ui.panel({ title, body })));
    else panel.update(body);
    panel.open();
  });
}
