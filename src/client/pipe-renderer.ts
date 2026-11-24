// @ts-check
// The item passing inside a pipe. The server sends each trip ONCE as a compact route (lp_trip, pipe-transit.ts:
// encodeTrip); this browser rebuilds the trip of every pipe and keeps it here by position, with the moment it arrived,
// and each pipe places the item by its own clock. A trip written into the pipe's data (the old way, still used where
// no server sends lp_trip) is read too. A pipe with no item on its way holds no object and does nothing.
import { BlockEntityRenderer } from '../mineclaude-sdk.js';
import { PIPE_ACCENTS } from '../pipe-body.ts';
import { decodeTransit, transitPosition, decodeTrip } from '../pipe-transit.ts';

/** @typedef {{ trip: import('../pipe-transit.ts').Transit, t0: number }} Sent */
/** @type {Map<string, Sent[]>} trips received, by pipe position: one order sends several batches down the same pipes */
const trips = new Map();
const over = (/** @type {Sent} */ s, /** @type {number} */ t) => t - s.t0 >= s.trip.delay + s.trip.secs;
const keyOf = (/** @type {{ x: number, y: number, z: number }} */ p) => `${p.x},${p.y},${p.z}`;
const now = () => performance.now() / 1000;

/** A trip from the server: every pipe of it gets its part, from now. @param {unknown} msg */
export function receiveTrip(msg) {
  const parts = decodeTrip(msg);
  if (!parts) return 0;
  const t0 = now();
  for (const { pos, transit } of parts) {
    const k = keyOf(pos), list = (trips.get(k) ?? []).filter((s) => !over(s, t0));
    list.push({ trip: transit, t0 });
    trips.set(k, list);
  }
  // trips of pipes that never came into view are forgotten
  if (trips.size > 4096) for (const [k, list] of trips) if (list.every((s) => over(s, t0))) trips.delete(k);
  return parts.length;
}
/** (tests) the trips kept for a pipe, in the order they were sent @param {{ x: number, y: number, z: number }} pos */
export const tripsAt = (pos) => trips.get(keyOf(pos)) ?? [];
/** (tests) the first trip kept for a pipe @param {{ x: number, y: number, z: number }} pos */
export const tripAt = (pos) => trips.get(keyOf(pos))?.[0] ?? null;
/**
 * Which of a pipe's trips is inside it at time `t` and where: { item, at } or null.
 * @param {Sent[]} list @param {number} t
 */
export function activeTrip(list, t) {
  for (const s of list) { const at = transitPosition(s.trip, t - s.t0); if (at) return { item: s.trip.item, at }; }
  return null;
}

/** @typedef {{ transit: string }} PipeData */
/** @typedef {{ trip: import('../pipe-transit.ts').Transit | null, shown: any, item?: string | null }} PipeStore */
/** @typedef {import('../../../packages/cli/types/mineclaude-mod').BlockEntityView<PipeData, PipeStore>} View */

/** The item fits inside the frame (the opening between the bars is 6/16 wide). */
const ITEM_SCALE = 0.34;

/** @extends {BlockEntityRenderer<PipeData, PipeStore>} */
export class PipeItemRenderer extends BlockEntityRenderer {
  maxDistance = 40;

  /** @param {View} e */
  create(e) { this.read(e); }

  /** @param {View} e */
  update(e) { if (e.changed.data) this.read(e); }

  /** @param {View} e */
  render(e) {
    // trips sent by the server for this pipe (several batches of one order pass one after the other)
    const k = keyOf(e.pos), list = trips.get(k);
    if (list) {
      const t = now(), live = list.filter((s) => !over(s, t));
      if (!live.length) { trips.delete(k); this.clear(e); return; }
      if (live.length !== list.length) trips.set(k, live);
      e.store.trip = null; // the trips sent take over from anything in the pipe's data
      const cur = activeTrip(live, t);
      if (!cur) { if (e.store.shown) e.store.shown.visible = false; return; } // the next batch has not reached this pipe yet
      this.show(e, cur.item, cur.at);
      return;
    }
    // the old way: a trip written into the pipe's data
    const { trip } = e.store;
    if (!trip) { if (e.store.shown) this.clear(e); return; }
    const at = transitPosition(trip, e.dataAge);
    if (!at) {
      // Not here yet: wait. Already gone (or the data came with the chunk, with no push time): forget the trip.
      if (e.store.shown) e.store.shown.visible = false;
      if (!(e.dataAge < trip.delay)) this.clear(e);
      return;
    }
    this.show(e, trip.item, at);
  }

  /** @param {View} e @param {string} item @param {[number, number, number]} at */
  show(e, item, at) {
    if (e.store.shown && e.store.item !== item) { e.display.remove(e.store.shown); e.store.shown = null; }
    if (!e.store.shown) { e.store.shown = e.display.item(item, { position: at, scale: ITEM_SCALE, billboard: true }); e.store.item = item; } // seen from any side, like a dropped item
    if (!e.store.shown) return; // an item this client does not know
    e.store.shown.visible = true;
    e.display.place(e.store.shown, { position: at });
  }

  /** @param {View} e */
  read(e) {
    this.clear(e);
    e.store.trip = decodeTransit(e.data.transit);
  }

  /** @param {View} e */
  clear(e) {
    if (e.store.shown) e.display.remove(e.store.shown);
    e.store.shown = null;
    e.store.trip = null;
    e.store.item = null;
  }
}

/**
 * One renderer serves every pipe type.
 * @param {import('../../../packages/cli/types/mineclaude-mod').ModContext} ctx
 */
export function registerPipeRenderers(ctx) {
  const renderer = new PipeItemRenderer();
  for (const pipe of Object.keys(PIPE_ACCENTS)) ctx.render.blockEntity(pipe, renderer);
  if (ctx.isClient()) ctx.net.on('lp_trip', (/** @type {unknown} */ msg) => { receiveTrip(msg); });
}
