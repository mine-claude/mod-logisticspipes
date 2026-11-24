// @ts-check
import { writeTransit, PIPE_SECONDS, MAX_TRANSIT_PIPES } from './pipe-transit.ts';
import { providerAllows, supplierTargets } from './lp-config.ts';
import { scheduleDelivery, pendingFor } from './deliveries.ts';

/**
 * Direction offsets and their opposite faces for 6-axis adjacency.
 */
export const DIRECTIONS = Object.freeze([
  { dx: 0, dy: 1, dz: 0, face: 'up', opp: 'down' },
  { dx: 0, dy: -1, dz: 0, face: 'down', opp: 'up' },
  { dx: 0, dy: 0, dz: 1, face: 'south', opp: 'north' },
  { dx: 0, dy: 0, dz: -1, face: 'north', opp: 'south' },
  { dx: 1, dy: 0, dz: 0, face: 'east', opp: 'west' },
  { dx: -1, dy: 0, dz: 0, face: 'west', opp: 'east' },
]);

/**
 * The item name of one entry of `storage.list()`. The engine's storages give the item as a resource object
 * (`{ item: 'mineclaude:iron_ingot', ... }`, with components when it has any); a plain name is accepted too.
 * @param {any} entry
 * @returns {string | null}
 */
export function itemNameOf(entry) {
  const it = entry?.item;
  if (typeof it === 'string') return it;
  return typeof it?.item === 'string' ? it.item : null;
}

/**
 * Checks if a block name belongs to a Logistics Pipes pipe.
 * @param {string|null} block
 * @returns {boolean}
 */
export function isPipe(block) {
  return typeof block === 'string' && block.startsWith('logisticspipes:pipe_');
}

/**
 * Key for coordinate map: "x,y,z"
 * @param {{ x: number, y: number, z: number }} pos
 */
export function posKey(pos) {
  return `${pos.x},${pos.y},${pos.z}`;
}

/**
 * Discovers the full interconnected pipe network starting from startPos using BFS.
 * @param {any} world Server world instance
 * @param {{ x: number, y: number, z: number }} startPos
 * @param {number} maxNodes Maximum pipes to scan
 */
export function scanNetwork(world, startPos, maxNodes = 512) {
  const start = nodeAt(world, startPos);
  if (!start) return null;

  const visitedPipes = new Map();
  const queue = [{ pos: { ...startPos }, node: start, dist: 0 }];
  visitedPipes.set(posKey(startPos), { pos: { ...startPos }, block: start.block, dist: 0, parent: null });

  const providers = [];
  const sinks = [];
  const suppliers = [];
  const craftingPipes = [];
  const requestPipes = [];
  const chassisPipes = [];

  // The walk goes through the kept pipes (nodeAt): only a pipe never seen, or marked by a neighbour change, is read
  // from the world. The settings of each pipe with a role are read on every walk: they change without any block changing.
  for (let qi = 0; qi < queue.length && visitedPipes.size < maxNodes; qi++) {
    const current = queue[qi], currBlock = current.node.block;
    for (const n of current.node.nbrs) {
      const nKey = posKey(n.pos);
      if (visitedPipes.has(nKey)) continue;
      const node = nodeAt(world, n.pos);
      if (!node) continue;
      visitedPipes.set(nKey, { pos: n.pos, block: node.block, dist: current.dist + 1, parent: posKey(current.pos) });
      queue.push({ pos: n.pos, node, dist: current.dist + 1 });
    }
    if (!current.node.stores.length) continue;
    const role = roleOf(currBlock);
    if (!role) continue;
    const currData = world.getBlockData ? world.getBlockData(current.pos) : null;
    for (const st of current.node.stores) {
      const entry = { pipePos: current.pos, pipeBlock: currBlock, pipeData: currData, storagePos: st.pos, storageBlock: st.block, face: st.face, storage: st.storage };
      if (role === 'provider') providers.push({ ...entry, maxExtract: currBlock.endsWith('mk2') ? 64 : (currData?.max_extract ?? 16) });
      else if (role === 'sink') sinks.push({ ...entry, isDefault: currData?.is_default_route === true });
      else if (role === 'supplier') suppliers.push({ ...entry, targetItem: currData?.target_item ?? '', targetCount: currData?.target_count ?? 64 });
      else if (role === 'crafting') craftingPipes.push({ ...entry, recipeOut: currData?.recipe_out ?? '', recipeCount: currData?.recipe_count ?? 1 });
      else if (role === 'request') requestPipes.push(entry);
      else if (role === 'chassis') chassisPipes.push(entry);
    }
  }

  return {
    pipes: visitedPipes,
    providers,
    sinks,
    suppliers,
    craftingPipes,
    requestPipes,
    chassisPipes,
  };
}

/** @param {string} block */
function roleOf(block) {
  if (block === 'logisticspipes:pipe_provider' || block === 'logisticspipes:pipe_provider_mk2') return 'provider';
  if (block === 'logisticspipes:pipe_basic') return 'sink';
  if (block === 'logisticspipes:pipe_supplier') return 'supplier';
  if (block.startsWith('logisticspipes:pipe_crafting')) return 'crafting';
  if (block.startsWith('logisticspipes:pipe_request')) return 'request';
  if (block.startsWith('logisticspipes:pipe_chassis')) return 'chassis';
  return null;
}

// ---- Each pipe kept between walks (server only: installNetworkCache) ------------------------------------------------
// A kept pipe is { block, nbrs (the pipes next to it), stores (the inventories next to it) }: what reading its six
// neighbours from the world gives. A network is the walk over kept pipes, so a change costs ONE pipe re-read, however
// big the network: the pipe that hears the change (onNeighborUpdate in blocks.ts -> pipeChanged) is dropped and read
// again the next time a walk passes it, and so is a changed cell that was or became a pipe. Kept per dimension
// (world.dimension(): ctx.dimensions.world gives a new object each call). Safety nets: a kept pipe older than
// maxAgeMs, or with an inventory that is no longer valid, is read again.

/** @type {{ dims: Map<string, Map<string, any>>, maxAgeMs: number, now: () => number, reads: number, hits: number } | null} */
let cache = null;

/** @param {{ maxAgeMs?: number, now?: () => number }} [o] */
export function installNetworkCache({ maxAgeMs = 60_000, now = () => Date.now() } = {}) {
  cache = { dims: new Map(), maxAgeMs, now, reads: 0, hits: 0 };
}
export function uninstallNetworkCache() { cache = null; }
/** Forget every kept pipe (all dimensions). */
export function invalidateNetworks() { if (cache) cache.dims.clear(); }
export const networkCacheStats = () => (cache ? { reads: cache.reads, hits: cache.hits, kept: [...cache.dims.values()].reduce((n, m) => n + m.size, 0) } : null);

/** @param {any} world */
function keptOf(world) {
  let dim = '';
  try { dim = typeof world.dimension === 'function' ? String(world.dimension()) : ''; } catch { /* a world without it: one map */ }
  let m = cache.dims.get(dim);
  if (!m) cache.dims.set(dim, (m = new Map()));
  return m;
}

/**
 * A block next to the pipe at `pos` changed: that pipe is read again on the next walk, and so is any changed cell that
 * was or became a pipe (a pipe placed, a pipe broken).
 * @param {any} world @param {{ x: number, y: number, z: number }} pos @param {ReadonlyArray<any>} [changes]
 */
export function pipeChanged(world, pos, changes = []) {
  if (!cache) return;
  const m = keptOf(world);
  m.delete(posKey(pos));
  for (const c of changes ?? []) if (c?.pos && (isPipe(c.before?.block ?? null) || isPipe(c.after?.block ?? null))) m.delete(posKey(c.pos));
}

/** The pipe at `pos`, read from the world: null when it is not a pipe. @param {any} world @param {{ x: number, y: number, z: number }} pos */
function readNode(world, pos) {
  const block = world.getBlock(pos);
  if (!isPipe(block)) return null;
  const nbrs = [], stores = [];
  for (const dir of DIRECTIONS) {
    const nPos = { x: pos.x + dir.dx, y: pos.y + dir.dy, z: pos.z + dir.dz };
    const nBlock = world.getBlock(nPos);
    if (isPipe(nBlock)) nbrs.push({ pos: nPos });
    else if (nBlock && nBlock !== 'mineclaude:air') {
      // an item storage next to it (chest, hopper, modded machine)
      const storage = world.getItemStorage ? (world.getItemStorage(nPos, dir.opp) ?? world.getItemStorage(nPos)) : null;
      if (storage) stores.push({ pos: nPos, block: nBlock, face: dir.opp, storage });
    }
  }
  return { block, nbrs, stores, at: cache ? cache.now() : 0 };
}

/** The pipe at `pos`: the kept one while fresh, else read now (and kept). @param {any} world @param {{ x: number, y: number, z: number }} pos */
function nodeAt(world, pos) {
  if (!cache) return readNode(world, pos);
  const m = keptOf(world), k = posKey(pos), kept = m.get(k);
  if (kept && cache.now() - kept.at < cache.maxAgeMs && !kept.stores.some((st) => st.storage?.isValid?.() === false)) { cache.hits++; return kept; }
  cache.reads++;
  const node = readNode(world, pos);
  if (node) m.set(k, node); else m.delete(k);
  return node;
}

/**
 * The pipes from `from` back to the pipe the scan started at, in order (the scan keeps the parent of each pipe).
 * @param {{ pipes: Map<string, { pos: { x: number, y: number, z: number }, parent: string | null }> }} net
 * @param {{ x: number, y: number, z: number }} from
 */
export function routeToStart(net, from) {
  const route = [];
  for (let node = net.pipes.get(posKey(from)); node && route.length <= net.pipes.size; node = node.parent === null ? undefined : net.pipes.get(node.parent)) route.push(node.pos);
  return route;
}

/**
 * Lists all items and quantities available across all providers in the network.
 * @param {any} world
 * @param {{ x: number, y: number, z: number }} startPos
 */
export function listNetworkItems(world, startPos) {
  const net = scanNetwork(world, startPos);
  if (!net) return { items: new Map(), net: null };

  const itemTotals = new Map();

  for (const prov of net.providers) {
    try {
      const list = prov.storage.list();
      for (const entry of list) {
        const name = itemNameOf(entry);
        if (!name || !(entry.amount > 0)) continue;
        if (!providerAllows(prov.pipeData, name)) continue; // the provider's filters (its screen)
        itemTotals.set(name, (itemTotals.get(name) ?? 0) + entry.amount);
      }
    } catch {
      // Storage access error
    }
  }

  // Also check chassis with provider modules
  for (const chassis of net.chassisPipes) {
    const chassisInv = world.getItemStorage ? world.getItemStorage(chassis.pipePos) : null;
    if (chassisInv) {
      const modules = chassisInv.list();
      const hasProvider = modules.some(m => itemNameOf(m) === 'logisticspipes:module_provider' || itemNameOf(m) === 'logisticspipes:module_provider_mk2');
      if (hasProvider) {
        try {
          for (const entry of chassis.storage.list()) {
            const name = itemNameOf(entry);
            if (!name || !(entry.amount > 0)) continue;
            itemTotals.set(name, (itemTotals.get(name) ?? 0) + entry.amount);
          }
        } catch {}
      }
    }
  }

  return { items: itemTotals, net };
}

/**
 * Fulfills a request for items from the network and delivers them to destPos.
 * @param {any} world
 * @param {{ x: number, y: number, z: number }} destPipePos
 * @param {string} itemId
 * @param {number} count
 * @param {any} [player]
 * @returns {{ success: boolean, extracted: number, message: string }}
 */
export function fulfillRequest(world, destPipePos, itemId, count, player = null) {
  const net = scanNetwork(world, destPipePos);
  if (!net) return { success: false, extracted: 0, message: 'Nenhuma rede de canos encontrada aqui.' };

  // Where the items go, like the original mod: the inventory next to the request pipe; without one, the inventory of
  // the nearest basic pipe marked as default route; without that either, they come out of the request pipe and drop.
  let target = destPipePos, routeNet = net, sentToDefault = false;
  let { storage: destStorage, pos: destStoragePos } = adjacentStorage(world, destPipePos);
  if (!destStorage) {
    const sink = defaultRouteSink(net);
    if (sink) {
      target = sink.pipePos; sentToDefault = true;
      routeNet = scanNetwork(world, target) ?? net;
      ({ storage: destStorage, pos: destStoragePos } = adjacentStorage(world, target));
    }
  }

  let remaining = count;
  let totalExtracted = 0;
  const key = posKey(destPipePos);

  // Like the original mod: the items leave the provider now and reach the destination when they arrive at the end of the
  // route (deliveries.ts; the pipes show them travelling meanwhile, pipe-transit.ts). A provider sends the whole order in
  // BATCHES of its max extract (16 for Mk1, 64 for Mk2), one after the other (BATCH_GAP apart): the max extract is the
  // size of each batch, not a cap on the order. The destination's room is checked once for the whole order, so what
  // cannot fit is not taken out of the provider (and anything that finds no room on arrival drops, never lost).
  if (destStorage && typeof world.simulate === 'function') {
    try { remaining = Math.min(remaining, Number(world.simulate((tx) => destStorage.insert(itemId, remaining, tx))) || 0); } catch { remaining = 0; }
  }
  let batch = 0;
  for (const prov of net.providers) {
    if (remaining <= 0 || batch >= MAX_BATCHES) break;
    if (!providerAllows(prov.pipeData, itemId)) continue;
    const route = routeToStart(routeNet, prov.pipePos);
    const secs = Math.min(route.length, MAX_TRANSIT_PIPES) * PIPE_SECONDS;
    while (remaining > 0 && batch < MAX_BATCHES) {
      const want = Math.min(remaining, prov.maxExtract ?? 64);
      let took = 0;
      try {
        world.transact((tx) => { took = prov.storage.extract(itemId, want, tx); });
      } catch {
        break; // provider locked
      }
      if (!(took > 0)) break; // this provider has no more of it
      totalExtracted += took;
      remaining -= took;
      const wait = batch * BATCH_GAP;
      batch++;
      showTrip(world, route, itemId, { source: prov.storagePos, target: destStoragePos }, wait);
      const amount = took;
      const to = target;
      scheduleDelivery(wait + secs, { key, item: itemId, amount }, () => deliverArrival(world, to, itemId, amount, player));
    }
  }

  if (totalExtracted > 0) {
    if (player) {
      const where = adjacentStorage(world, destPipePos).storage ? '' : sentToDefault ? ' (para a rota padrão)' : ' (sai do cano de pedido)';
      player.message(`§a[Logistics Pipes]§r A caminho: §e${totalExtracted}x ${itemId}§r${where}`);
    }
    return { success: true, extracted: totalExtracted, message: `Sucesso: ${totalExtracted}x ${itemId} a caminho.` };
  }

  return { success: false, extracted: 0, message: destStorage ? `Item "${itemId}" não disponível nos provedores da rede, ou sem espaço no destino.` : `Item "${itemId}" não disponível nos provedores da rede.` };
}

/** Seconds between two batches of one order leaving the providers (a stream of stacks, as in the original). */
export const BATCH_GAP = PIPE_SECONDS;
/** Batches one order may send: 64 x 16 already covers the largest order the screen asks for (256). */
export const MAX_BATCHES = 64;

/** @type {((world: any, route: any[], item: string, ends: any, wait?: number) => void) | null} */
let tripSink = null;
/**
 * How the trip is shown. The server installs a sink that sends the route ONCE to the browsers near it (lp_trip,
 * server/logic.ts); without one (tests, tools) it is written into each pipe's data as before (writeTransit).
 * @param {((world: any, route: any[], item: string, ends: any) => void) | null} fn
 */
export function setTripSink(fn) { tripSink = fn; }
/** @param {any} world @param {any[]} route @param {string} item @param {any} ends @param {number} [wait] seconds before it leaves */
function showTrip(world, route, item, ends, wait = 0) {
  try {
    if (tripSink) tripSink(world, route, item, ends, wait);
    else writeTransit(world, route, item, ends, wait);
  } catch { /* the items already left the provider: this is only the picture */ }
}

/**
 * The first inventory next to a pipe: { storage, pos } (both null when there is none).
 * @param {any} world @param {{ x: number, y: number, z: number }} pipePos
 */
export function adjacentStorage(world, pipePos) {
  for (const dir of DIRECTIONS) {
    const adj = { x: pipePos.x + dir.dx, y: pipePos.y + dir.dy, z: pipePos.z + dir.dz };
    const st = world.getItemStorage ? (world.getItemStorage(adj, dir.opp) ?? world.getItemStorage(adj)) : null;
    if (st) return { storage: st, pos: adj };
  }
  return { storage: null, pos: null };
}

/**
 * The nearest basic pipe marked as default route that has an inventory next to it (the scan's distance), or null.
 * @param {{ sinks: any[], pipes: Map<string, { dist: number }> }} net
 */
export function defaultRouteSink(net) {
  let best = null, bestDist = Infinity;
  for (const s of net.sinks) {
    if (!s.isDefault) continue;
    const d = net.pipes.get(posKey(s.pipePos))?.dist ?? Infinity;
    if (d < bestDist) { best = s; bestDist = d; }
  }
  return best;
}

/**
 * Where an item coming out of a pipe lands: the centre of a free neighbour cell (a side first, then above), or the
 * top of the pipe when it is walled in.
 * @param {any} world @param {{ x: number, y: number, z: number }} pipePos
 */
export function dropPointOf(world, pipePos) {
  const free = (p) => { const b = world.getBlock?.(p); return b === 'mineclaude:air' || b === null || b === undefined; };
  for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) {
    const p = { x: pipePos.x + dx, y: pipePos.y + dy, z: pipePos.z + dz };
    if (free(p)) return { x: p.x + 0.5, y: p.y + 0.1, z: p.z + 0.5 };
  }
  return { x: pipePos.x + 0.5, y: pipePos.y + 1.1, z: pipePos.z + 0.5 };
}

/**
 * The items of one trip reach the destination pipe: into the inventory next to it (looked up now, it may have changed
 * while they travelled); what has no room comes out of the pipe and drops on the ground, as in the original mod.
 * @param {any} world @param {{ x: number, y: number, z: number }} pipePos @param {string} item @param {number} amount @param {any} [player]
 */
export function deliverArrival(world, pipePos, item, amount, player = null) {
  let left = amount;
  const { storage } = adjacentStorage(world, pipePos);
  if (storage) {
    try { world.transact((tx) => { left -= storage.insert(item, left, tx); }); } catch { left = amount; }
  }
  if (left > 0) world.dropItem?.(dropPointOf(world, pipePos), item, left);
  if (player) { try { player.playSound('logisticspipes:pipe_insert'); } catch { /* offline */ } }
}

/**
 * Handles supplier pipe ticking logic: for each target of its screen, counts it in the connected inventory and orders
 * what is missing. Partial mode (0) orders whatever the network has, up to 16 per tick; complete mode (1) orders only
 * when the network can send the whole deficit at once (up to 64).
 * @param {any} world
 * @param {{ x: number, y: number, z: number }} pipePos
 */
export function tickSupplierPipe(world, pipePos) {
  // the pace (server only: installSupplierPacing): every tick_interval ticks, and a longer wait after the network had
  // none of what was missing, so a supplier asking for an item nobody has does not scan the network 20 times a second
  const pk = posKey(pipePos), now = pacing ? pacing.now() : 0;
  if (pacing) {
    if ((nextSupply.get(pk) ?? -Infinity) > now) return;
    nextSupply.set(pk, now + pacing.intervalMs);
  }
  const data = world.getBlockData ? world.getBlockData(pipePos) : null;
  const targets = supplierTargets(data);
  if (!targets.length) return;

  // the connected inventory
  let st = null;
  for (const dir of DIRECTIONS) {
    const adj = { x: pipePos.x + dir.dx, y: pipePos.y + dir.dy, z: pipePos.z + dir.dz };
    st = world.getItemStorage ? (world.getItemStorage(adj, dir.opp) ?? world.getItemStorage(adj)) : null;
    if (st) break;
  }
  if (!st) return;
  const have = new Map();
  for (const it of st.list()) { const name = itemNameOf(it); if (name) have.set(name, (have.get(name) ?? 0) + it.amount); }

  // the same item in two slots of the screen adds up to one target
  const wanted = new Map();
  for (const t of targets) wanted.set(t.item, (wanted.get(t.item) ?? 0) + t.count);
  const complete = data?.supply_mode === 1;
  const stock = complete ? listNetworkItems(world, pipePos).items : null;
  let missing = false, got = false;
  for (const [item, count] of wanted) {
    // what is already travelling here counts as had: it is not ordered again while it is on its way
    const deficit = count - (have.get(item) ?? 0) - pendingFor(pk, item);
    if (deficit <= 0) continue;
    missing = true;
    if (complete) {
      const n = Math.min(deficit, 64);
      if ((stock?.get(item) ?? 0) >= n && fulfillRequest(world, pipePos, item, n).extracted > 0) got = true;
    } else if (fulfillRequest(world, pipePos, item, Math.min(deficit, 16)).extracted > 0) got = true;
  }
  if (pacing && missing && !got) nextSupply.set(pk, now + pacing.backoffMs);
}

/** @type {{ intervalMs: number, backoffMs: number, now: () => number } | null} */
let pacing = null;
const nextSupply = new Map();
/**
 * Paces the suppliers (server): `tickInterval` game ticks (50 ms) between checks, `backoffMs` after a check where
 * the network had none of what was missing. Without it (tests) every call checks.
 * @param {{ tickInterval?: number, backoffMs?: number, now?: () => number }} [o]
 */
export function installSupplierPacing({ tickInterval = 10, backoffMs = 5000, now = () => Date.now() } = {}) {
  pacing = { intervalMs: Math.max(1, Math.floor(tickInterval)) * 50, backoffMs, now };
  nextSupply.clear();
}
export function uninstallSupplierPacing() { pacing = null; nextSupply.clear(); }
