// @ts-check
// The shape of a pipe: a glass tube 10/16 wide held by a frame. The glass is the empty space between the bars, so the
// frame is real geometry seen from every side: twelve bars 2/16 thick along the edges of the hub, four along each
// connected arm, and a core in the middle of the routed pipes. Collision and selection use one box per part (hitbox).

/** @typedef {[number, number, number, number, number, number]} Box */

/** A box in sixteenths of a block. @returns {Box} */
const px = (/** @type {number} */ x0, /** @type {number} */ y0, /** @type {number} */ z0, /** @type {number} */ x1, /** @type {number} */ y1, /** @type {number} */ z1) =>
  [x0 / 16, y0 / 16, z0 / 16, x1 / 16, y1 / 16, z1 / 16];

/** Where the tube starts and ends across the cell, and how thick a bar is. */
export const TUBE_MIN = 3, TUBE_MAX = 13, BAR = 2;
/** The core of a routed pipe, in sixteenths. */
export const CORE_MIN = 6, CORE_MAX = 10;

const LOW = [TUBE_MIN, TUBE_MIN + BAR], HIGH = [TUBE_MAX - BAR, TUBE_MAX], SIDES = [LOW, HIGH];
const INNER = [TUBE_MIN + BAR, TUBE_MAX - BAR];

/** The twelve bars of the hub: four posts, then the bars along x and along z between them. @type {Box[]} */
export const HUB_FRAME = [
  ...SIDES.flatMap(x => SIDES.map(z => px(x[0], TUBE_MIN, z[0], x[1], TUBE_MAX, z[1]))),
  ...SIDES.flatMap(y => SIDES.map(z => px(INNER[0], y[0], z[0], INNER[1], y[1], z[1]))),
  ...SIDES.flatMap(y => SIDES.map(x => px(x[0], y[0], INNER[0], x[1], y[1], INNER[1]))),
];

/** @type {Box} */
export const HUB_CORE = px(CORE_MIN, CORE_MIN, CORE_MIN, CORE_MAX, CORE_MAX, CORE_MAX);

/** The four bars of the arm declared for north (-z); the engine turns them to the other faces. @type {Box[]} */
export const ARM_FRAME = SIDES.flatMap(x => SIDES.map(y => px(x[0], y[0], 0, x[1], y[1], TUBE_MIN)));

/** @type {{ core: Box[], arm: Box[] }} */
const HITBOX = {
  core: [px(TUBE_MIN, TUBE_MIN, TUBE_MIN, TUBE_MAX, TUBE_MAX, TUBE_MAX)],
  arm: [px(TUBE_MIN, TUBE_MIN, 0, TUBE_MAX, TUBE_MAX, TUBE_MIN)],
};

/**
 * The `connections` of a pipe.
 * @param {boolean} routed routed pipes carry a core in the hub; the plain transport pipe is an empty tube
 * @returns {import('../../packages/cli/types/mineclaude-mod').BlockConnections}
 */
export function pipeConnections(routed) {
  return { core: routed ? [...HUB_FRAME, HUB_CORE] : [...HUB_FRAME], arm: ARM_FRAME, hitbox: HITBOX };
}
