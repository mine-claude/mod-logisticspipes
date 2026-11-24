// @ts-check
import { listNetworkItems, fulfillRequest, isPipe, installNetworkCache, installSupplierPacing, setTripSink } from '../network-router.ts';
import { encodeTrip } from '../pipe-transit.ts';
import { setInspectSink } from '../items.ts';
import { PIPE_SCREENS, screenConfig, applyChange } from '../lp-config.ts';
import { installDeliveries } from '../deliveries.ts';

// How far (in blocks, from the player's feet to the pipe's centre) a screen may read or change a pipe. The Remote
// Orderer finds its pipe within 5 blocks around the player, so this covers it with room for the player moving a bit.
const REACH = 10;
const MAX_STOCK_ROWS = 120; // keeps stock_data well under the 4 KB of a ctx.net message

/** @param {unknown} p @returns {{ x: number, y: number, z: number } | null} */
function posOf(p) {
  const a = Array.isArray(p) ? p : p && typeof p === 'object' ? [/** @type {any} */ (p).x, /** @type {any} */ (p).y, /** @type {any} */ (p).z] : null;
  return a && a.length === 3 && a.every(Number.isInteger) ? { x: a[0], y: a[1], z: a[2] } : null;
}

/**
 * The pipe a browser screen talks about, if the player may reach it: { world, pos, block, kind } or null. `kind` is the
 * pipe's own screen (lp-config.ts), null on a pipe without one (the Remote Orderer may stand on any pipe of the network).
 * @param {any} ctx @param {any} player @param {unknown} rawPos
 */
export function reachablePipe(ctx, player, rawPos) {
  const pos = posOf(rawPos);
  if (!pos || !player?.pos) return null;
  const dx = pos.x + 0.5 - player.pos.x, dy = pos.y + 0.5 - player.pos.y, dz = pos.z + 0.5 - player.pos.z;
  if (dx * dx + dy * dy + dz * dz > REACH * REACH) return null;
  const world = ctx.dimensions.world(player.dimension);
  if (!world) return null;
  const block = world.getBlock(pos);
  if (!isPipe(block)) return null;
  return { world, pos, block, kind: PIPE_SCREENS[/** @type {keyof typeof PIPE_SCREENS} */ (block)] ?? null };
}

/** @param {any} world @param {{ x: number, y: number, z: number }} pos */
function stockOf(world, pos) {
  const { items } = listNetworkItems(world, pos);
  return [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_STOCK_ROWS);
}

/**
 * Server-only initialization for Logistics Pipes.
 * @param {import('../../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx
 */
export async function registerServer(ctx) {
  const net = /** @type {any} */ (ctx.net);
  // requested items travel through the pipes and arrive at the end of the trip (deliveries.ts)
  installDeliveries(ctx);
  // the network's map is kept until a block next to a pipe changes, and suppliers check every tick_interval ticks
  installNetworkCache();
  installSupplierPacing({ tickInterval: Number(ctx.config?.get?.('tick_interval')) || 10 });
  // the Pipe Controller / Pipe Manager: the browser walks the pipes and shows the report (client/inspect.ts)
  setInspectSink((player, msg) => net.send(player, 'lp_inspect', msg));
  // the item seen travelling: one compact message to the browsers near the route, which animate it themselves
  // (client/pipe-renderer.ts), instead of a block-data write and sync on every pipe of the route
  setTripSink((world, route, item, ends, wait) => {
    const msg = encodeTrip(route, item, ends, wait);
    if (!msg || typeof ctx.server?.playersNear !== 'function') return;
    for (const p of ctx.server.playersNear(route[0], 48 + route.length)) net.send(p, 'lp_trip', msg);
  });
  // Greet player on join with Logistics Pipes hint
  ctx.events.on('playerJoin', (e) => {
    e.player.message('§6[Logistics Pipes]§r Mod carregado! Use §e/lpkit§r para começar.');
  });

  // A screen opened: the pipe's settings (only the keys of its kind)
  net.on('lp_get', (player, data) => {
    const pipe = reachablePipe(ctx, player, data?.p);
    if (!pipe?.kind) return;
    net.send(player, 'lp_cfg', { p: [pipe.pos.x, pipe.pos.y, pipe.pos.z], k: pipe.kind, cfg: screenConfig(pipe.kind, pipe.world.getBlockData(pipe.pos)) });
  });

  // One change from a screen, checked by lp-config.ts; the answer is the pipe's settings as saved (the screen redraws from it)
  net.on('lp_set', (player, data) => {
    const pipe = reachablePipe(ctx, player, data?.p);
    if (!pipe?.kind) return;
    const patch = applyChange(pipe.kind, pipe.world.getBlockData(pipe.pos), data ?? {});
    if (patch) pipe.world.setBlockData(pipe.pos, patch);
    net.send(player, 'lp_cfg', { p: [pipe.pos.x, pipe.pos.y, pipe.pos.z], k: pipe.kind, cfg: screenConfig(pipe.kind, pipe.world.getBlockData(pipe.pos)) });
  });

  // The orderer's list: what the providers of the pipe's network can hand out, most first
  net.on('query_stock', (player, data) => {
    const pipe = reachablePipe(ctx, player, data?.p);
    if (!pipe) return;
    net.send(player, 'stock_data', { p: [pipe.pos.x, pipe.pos.y, pipe.pos.z], items: stockOf(pipe.world, pipe.pos) });
  });

  // The orderer's "Pedir": delivered to the inventory next to the request pipe, or to the player; then the new stock
  net.on('request_item', (player, data) => {
    const pipe = reachablePipe(ctx, player, data?.p);
    if (!pipe) return;
    if (typeof data?.item !== 'string' || !/^[a-z0-9_]+:[a-z0-9_./]{1,64}$/.test(data.item)) return;
    const count = Math.max(1, Math.min(256, Math.floor(Number(data.count)) || 1));
    const res = fulfillRequest(pipe.world, pipe.pos, data.item, count, player);
    if (!res.success) player.message(`§c[Logistics Pipes] ${res.message}`);
    net.send(player, 'stock_data', { p: [pipe.pos.x, pipe.pos.y, pipe.pos.z], items: stockOf(pipe.world, pipe.pos), done: res.extracted });
  });
}
