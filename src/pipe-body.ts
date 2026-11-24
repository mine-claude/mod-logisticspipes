// @ts-check
// The texture of a pipe in the world, painted by code. Faces take their texels from where they sit in the cell, so the
// tile is a map of the model (pipe-shape.js) seen from one side: the frame bars are two lines 2 texels wide crossing
// the whole tile, the corner pieces are where they cross, and the core of a routed pipe is the 4x4 in the middle.
// Every texel a bar or the core samples is opaque; the rest is the glass and stays transparent. The atlas squeezes the
// UVs a fraction of a texel towards the centre of the tile, so a bar 2 texels wide also reads a sliver of the next
// texel inwards: that third texel repeats the bar (BLEED), or the sliver would be a crack along every bar. The tile is
// the same mirrored or turned a quarter, so it does not matter which way a face reads it.
import { TUBE_MIN, BAR, CORE_MIN } from './pipe-shape.ts';

/** One accent color per pipe; the texture is registered as `<pipe>_body`. No accent: no core (plain transport). */
export const PIPE_ACCENTS = Object.freeze({
  pipe_transport_basic: '#8d99a6',
  pipe_basic: '#3f7fd0',
  pipe_provider: '#3fae5a',
  pipe_provider_mk2: '#2f8f8a',
  pipe_request: '#d0a23f',
  pipe_request_mk2: '#d07a2f',
  pipe_supplier: '#b04fc0',
  pipe_crafting: '#c9c23f',
  pipe_crafting_mk2: '#c9963f',
  pipe_crafting_mk3: '#c96a3f',
  pipe_satellite: '#5fc0d0',
  pipe_remote_orderer: '#d04f6a',
  pipe_chassis_mk1: '#7a7f8a',
  pipe_chassis_mk2: '#6f8fb0',
  pipe_chassis_mk3: '#6fb08a',
  pipe_chassis_mk4: '#b0a36f',
  pipe_chassis_mk5: '#b06f6f',
});

/** The pipe without a core. */
export const UNROUTED = 'pipe_transport_basic';

// A bar across its two texels, from the outside of the tube in.
const BAR_OUTER = '#2c3138', BAR_INNER = '#4d5560';
// A corner piece, where two bars cross: outer texel, the two beside it, inner texel.
const CORNER = ['#59626e', '#858f9c', '#b4bec9'];
const CLEAR = '#000000';
/** Texels a bar takes in the tile: its own plus the one the squeezed UVs spill into. */
const BLEED = BAR + 1;

/**
 * @param {string} color
 * @param {number} k below 1 darkens, above 1 lightens
 * @returns {[number, number, number]}
 */
function shade(color, k) {
  const channel = (/** @type {number} */ i) => Math.max(0, Math.min(255, Math.round(parseInt(color.slice(i, i + 2), 16) * k)));
  return [channel(1), channel(3), channel(5)];
}

/**
 * The color of one texel, or null for glass. `a` and `b` are the distances to the nearest edge of the tile on each
 * axis (0..7), which is what makes the tile symmetric.
 * @param {number} a
 * @param {number} b
 * @param {string} accent
 * @param {boolean} routed
 * @returns {string | [number, number, number] | null}
 */
function texel(a, b, accent, routed) {
  const onA = a >= TUBE_MIN && a < TUBE_MIN + BLEED, onB = b >= TUBE_MIN && b < TUBE_MIN + BLEED;
  const depth = (/** @type {number} */ v) => Math.min(v - TUBE_MIN, BAR - 1); // 0 on the outer texel of a bar
  if (onA && onB) return CORNER[depth(a) + depth(b)];
  if (onA || onB) {
    const across = TUBE_MIN + depth(onA ? a : b), along = onA ? b : a;
    // The first texel of an arm, at the edge of the cell: the joint with the next pipe, in the color of this one.
    if (along === 0) return shade(accent, across === TUBE_MIN ? .55 : .8);
    return across === TUBE_MIN ? BAR_OUTER : BAR_INNER;
  }
  if (routed && a >= CORE_MIN && b >= CORE_MIN) return a === CORE_MIN || b === CORE_MIN ? shade(accent, .72) : shade(accent, 1.3);
  return null;
}

/**
 * @param {string} accent
 * @param {boolean} [routed] paint the core in the middle
 * @returns {(t: import('../../packages/cli/types/mineclaude-mod').PainterTools) => void}
 */
export function pipeBodyPainter(accent, routed = true) {
  return (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const color = texel(Math.min(x, 15 - x), Math.min(y, 15 - y), accent, routed);
      if (color) t.set(x, y, color); else t.set(x, y, CLEAR, 0);
    }
  };
}
