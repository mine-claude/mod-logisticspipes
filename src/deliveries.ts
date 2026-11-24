// @ts-check
// Items on their way through the pipes. Like the original mod, a request takes the items out of the provider at once
// and the destination only gets them when they ARRIVE: the same time the pipes show them travelling (pipe-transit.ts,
// PIPE_SECONDS per pipe). Until then they are here, counted by destination so a supplier does not order them twice.
//
// The server installs the clock (serverTick, 20 Hz) in server/logic.ts. With no clock installed (unit tests, a world
// probe) a delivery happens at once, as it did before. When the server stops, everything still travelling is
// delivered first, so a restart never loses an item.

/** @typedef {{ due: number, key: string, item: string, amount: number, arrive: () => void }} Delivery */

/** @type {Delivery[]} */
const queue = [];
/** @type {(() => number) | null} */
let clock = null;

/**
 * Starts the clock: deliveries become real trips, delivered on the server tick after they are due.
 * @param {{ events: { on(name: string, fn: (e: any) => void): unknown } }} ctx
 * @param {() => number} [now]
 */
export function installDeliveries(ctx, now = () => Date.now()) {
  clock = now;
  ctx.events.on('serverTick', () => flushDeliveries());
  ctx.events.on('serverStopping', () => flushDeliveries(true));
}

/** Back to "deliver at once" (tests). */
export function uninstallDeliveries() { clock = null; flushDeliveries(true); }

/**
 * `arrive` runs after `secs` (at once without a clock). `key` + `item` + `amount` say what is travelling to where.
 * @param {number} secs @param {{ key: string, item: string, amount: number }} what @param {() => void} arrive
 */
export function scheduleDelivery(secs, what, arrive) {
  if (!clock || !(secs > 0)) { arrive(); return; }
  queue.push({ due: clock() + secs * 1000, key: what.key, item: what.item, amount: what.amount, arrive });
}

/** Delivers what is due (or everything). Returns how many trips arrived. @param {boolean} [all] */
export function flushDeliveries(all = false) {
  const now = clock ? clock() : Infinity;
  let n = 0;
  for (let i = 0; i < queue.length;) {
    if (all || queue[i].due <= now) {
      const [d] = queue.splice(i, 1);
      n++;
      try { d.arrive(); } catch (e) { console.warn(`[logisticspipes] entrega falhou: ${/** @type {Error} */ (e)?.message ?? e}`); }
    } else i++;
  }
  return n;
}

/** How many of `item` are still travelling to `key` (a destination pipe's position). @param {string} key @param {string} item */
export function pendingFor(key, item) {
  let n = 0;
  for (const d of queue) if (d.key === key && d.item === item) n += d.amount;
  return n;
}

/** Trips still travelling (tests, diagnostics). */
export const inFlight = () => queue.length;
