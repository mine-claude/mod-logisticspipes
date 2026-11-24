// @ts-check
// The item seen travelling inside the pipes. The network moves items in one transaction (network-router.js); what the
// players watch is a trip the server writes once per pipe of the route, in the `transit` key of the pipe's data:
//   "<n>|<item>|<from>|<to>|<delay>|<secs>"
// n      a counter, so that the same item passing twice is a new push
// item   the full name of the item
// from   the face the item comes in by, to: the face it leaves by (n e s w u d), or - for the middle of the pipe
// delay  seconds after the push until the item reaches this pipe; secs: seconds it takes to cross it
// The browser animates it by its own clock (client/pipe-renderer.js): no message per frame and no tick.

/** Seconds an item takes to cross one pipe. */
export const PIPE_SECONDS = 0.4;
/** Pipes of one route that show the trip; a longer route shows its first pipes only. */
export const MAX_TRANSIT_PIPES = 64;

/** Face letter -> the step to the neighbor on that face. */
export const FACE_STEP = Object.freeze({
  n: Object.freeze([0, 0, -1]), e: Object.freeze([1, 0, 0]), s: Object.freeze([0, 0, 1]),
  w: Object.freeze([-1, 0, 0]), u: Object.freeze([0, 1, 0]), d: Object.freeze([0, -1, 0]),
});

/** @typedef {{ x: number, y: number, z: number }} Pos */
/** @typedef {{ n: number, item: string, from: string, to: string, delay: number, secs: number }} Transit */

/**
 * The face of `a` that looks at `b`, or '-' when they are not neighbors.
 * @param {Pos} a
 * @param {Pos | null | undefined} b
 */
export function faceTowards(a, b) {
  if (!b) return '-';
  const step = [b.x - a.x, b.y - a.y, b.z - a.z];
  for (const [face, s] of Object.entries(FACE_STEP)) if (s[0] === step[0] && s[1] === step[1] && s[2] === step[2]) return face;
  return '-';
}

/** @param {Transit} t */
export function encodeTransit(t) {
  return [t.n, t.item, t.from, t.to, +t.delay.toFixed(2), +t.secs.toFixed(2)].join('|');
}

/**
 * @param {unknown} text
 * @returns {Transit | null} null for no trip or a text that is not one
 */
export function decodeTransit(text) {
  if (typeof text !== 'string' || !text) return null;
  const [n, item, from, to, delay, secs] = text.split('|');
  const face = (/** @type {string} */ f) => f === '-' || Object.prototype.hasOwnProperty.call(FACE_STEP, f);
  const trip = { n: Number(n), item, from, to, delay: Number(delay), secs: Number(secs) };
  if (!item || !face(from) || !face(to) || !Number.isFinite(trip.n) || !(trip.delay >= 0) || !(trip.secs > 0)) return null;
  return trip;
}

/**
 * Where the item is inside the cell (0..1 on each axis) `elapsed` seconds after the push, or null while it is not in
 * this pipe. It comes in by the middle of the `from` face, passes the centre and leaves by the `to` face.
 * @param {Transit} t
 * @param {number} elapsed
 * @returns {[number, number, number] | null}
 */
export function transitPosition(t, elapsed) {
  const k = (elapsed - t.delay) / t.secs;
  if (!(k >= 0 && k < 1)) return null;
  const face = k < .5 ? t.from : t.to, reach = k < .5 ? .5 - k : k - .5; // 0.5 at a face, 0 at the centre
  const step = face === '-' ? [0, 0, 0] : FACE_STEP[/** @type {keyof typeof FACE_STEP} */ (face)];
  return [.5 + step[0] * reach, .5 + step[1] * reach, .5 + step[2] * reach];
}

/**
 * Writes the trip of one item along a route. Never throws: the items were already moved, this is only the picture.
 * @param {any} world
 * @param {Pos[]} pipes the pipes of the route, in order
 * @param {string} item
 * @param {{ source?: Pos | null, target?: Pos | null }} [ends] the inventory the item left and the one it went into
 * @returns {number} how many pipes got the trip
 */
export function writeTransit(world, pipes, item, ends = {}, wait = 0) {
  let written = 0;
  const count = Math.min(pipes.length, MAX_TRANSIT_PIPES);
  for (let i = 0; i < count; i++) {
    const pos = pipes[i];
    try {
      const before = decodeTransit(world.getBlockData?.(pos)?.transit);
      const transit = encodeTransit({
        n: ((before?.n ?? 0) + 1) % 1000, item,
        from: faceTowards(pos, i === 0 ? (ends as any).source : pipes[i - 1]),
        to: faceTowards(pos, i === pipes.length - 1 ? (ends as any).target : pipes[i + 1]),
        delay: wait + i * PIPE_SECONDS, secs: PIPE_SECONDS,
      });
      if (world.setBlockData(pos, { transit }) !== false) written++;
    } catch {
      // A pipe without the key (an older save) or a world without block data: the route goes on.
    }
  }
  return written;
}

// ---- The trip as ONE message (server -> the browsers near it) -------------------------------------------------------
// Writing the trip into every pipe of the route costs one block-data write and one sync per pipe. Instead the server
// sends the route once, compact: the first pipe, one face letter per step, the faces it enters and leaves by, and the
// item. Each browser rebuilds the pipes and the timing (tripTransits) and animates by its own clock (client/pipe-renderer.ts).
// The route is the server's (it already has it to know when the items arrive): the browsers never disagree on the path,
// and a browser missing a chunk of the route still animates the part it has.

/** @typedef {{ o: [number, number, number], f: string, s: string, d: string, i: string, w?: number }} TripMsg  w: seconds before it leaves (a later batch of the same order) */

const LETTERS = Object.keys(FACE_STEP);

/**
 * The trip of each pipe of a route (the same numbers writeTransit stores), capped at MAX_TRANSIT_PIPES.
 * @param {Pos[]} pipes @param {string} item @param {{ source?: Pos | null, target?: Pos | null }} [ends]
 * @returns {{ pos: Pos, transit: Transit }[]}
 */
export function tripTransits(pipes, item, ends: any = {}, wait = 0) {
  const out = [];
  const count = Math.min(pipes.length, MAX_TRANSIT_PIPES);
  for (let i = 0; i < count; i++) {
    const pos = pipes[i];
    out.push({ pos, transit: {
      n: 0, item,
      from: faceTowards(pos, i === 0 ? ends.source : pipes[i - 1]),
      to: faceTowards(pos, i === pipes.length - 1 ? ends.target : pipes[i + 1]),
      delay: wait + i * PIPE_SECONDS, secs: PIPE_SECONDS,
    } });
  }
  return out;
}

/**
 * The compact message of a route, or null when the route is not a chain of neighbours.
 * @param {Pos[]} pipes @param {string} item @param {{ source?: Pos | null, target?: Pos | null }} [ends]
 * @returns {TripMsg | null}
 */
export function encodeTrip(pipes, item, ends: any = {}, wait = 0) {
  const route = pipes.slice(0, MAX_TRANSIT_PIPES);
  if (!route.length) return null;
  let f = '';
  for (let i = 1; i < route.length; i++) {
    const face = faceTowards(route[i - 1], route[i]);
    if (face === '-') return null;
    f += face;
  }
  const first = route[0], last = route[route.length - 1];
  // the ends say where the item enters the first pipe and leaves the last (only whether they are neighbours matters)
  return { o: [first.x, first.y, first.z], f, s: faceTowards(first, ends.source), d: route.length === pipes.length ? faceTowards(last, ends.target) : faceTowards(last, pipes[route.length]), i: item, ...(wait > 0 && { w: Math.round(wait * 100) / 100 }) };
}

/**
 * The pipes and the trip of each, from the message; null for a message that is not a trip.
 * @param {unknown} msg
 * @returns {{ pos: Pos, transit: Transit }[] | null}
 */
export function decodeTrip(msg) {
  const m = /** @type {any} */ (msg);
  if (!m || !Array.isArray(m.o) || m.o.length !== 3 || !m.o.every(Number.isInteger) || typeof m.f !== 'string' || typeof m.i !== 'string' || !m.i) return null;
  if (m.f.length >= MAX_TRANSIT_PIPES || [...m.f].some((c) => !LETTERS.includes(c))) return null;
  const okFace = (/** @type {unknown} */ c) => c === '-' || (typeof c === 'string' && LETTERS.includes(c));
  if (!okFace(m.s) || !okFace(m.d)) return null;
  const wait = m.w === undefined ? 0 : Number(m.w);
  if (!(wait >= 0 && wait <= 120)) return null;
  const pipes = [{ x: m.o[0], y: m.o[1], z: m.o[2] }];
  for (const c of m.f) {
    const [dx, dy, dz] = FACE_STEP[/** @type {keyof typeof FACE_STEP} */ (c)], p = pipes[pipes.length - 1];
    pipes.push({ x: p.x + dx, y: p.y + dy, z: p.z + dz });
  }
  // the faces of the ends become fake neighbours so tripTransits gives them the same letters
  const step = (/** @type {Pos} */ p, /** @type {string} */ c) => (c === '-' ? null : { x: p.x + FACE_STEP[/** @type {keyof typeof FACE_STEP} */ (c)][0], y: p.y + FACE_STEP[/** @type {keyof typeof FACE_STEP} */ (c)][1], z: p.z + FACE_STEP[/** @type {keyof typeof FACE_STEP} */ (c)][2] });
  return tripTransits(pipes, m.i, { source: step(pipes[0], m.s), target: step(pipes[pipes.length - 1], m.d) }, wait);
}
