// @ts-check
// The SHAPE of a solid machine of this mod, as `geometry` boxes: the silhouette the engine uses for physics, mira,
// support and occlusion (docs/sdk-block-geometry.md). What is DRAWN is the declared model of machine-model.js
// (docs/sdk-block-models.md), which is where the textures and their UV live now.
//
// The casing is a shell with an 8x8 panel sunk 4 deep on the four sides and on the bottom and a flat lid on top — the
// same proportions the original mod draws for every one of its solid blocks (resources/logisticspipes/models/
// BlockModel_result.obj: a full cell plus an outer and an inner 8x8 plate per side, at 25/100 and 75/100 of the cell,
// which is exactly this inset of 4 in sixteenths; one model for every machine, the texture told them apart). Each
// machine then adds a part of its own on the lid, so they can be told apart in the world by the silhouette alone.
//
// Boxes are written in sixteenths, declared facing north, and the engine turns them with the block's `facing`.
// Collision, selection and occlusion are declared apart, which is what raises the model's budget from 16 to 48
// boxes: the first two are the whole cell, because a machine is a solid box to walk on and to aim at, while occlusion
// keeps the shell, so a neighbour's face stays visible through the sunk panels.

const P = 1 / 16;
/**
 * One box in sixteenths.
 * @returns {import('../../packages/cli/types/mineclaude-mod').BlockBox}
 */
const box = (x0, y0, z0, x1, y1, z1) => [x0 * P, y0 * P, z0 * P, x1 * P, y1 * P, z1 * P];

/** The whole cell: what a machine collides and is aimed at as. */
export const FULL_CELL = [box(0, 0, 0, 16, 16, 16)];

/** How deep the panels are sunk and how wide the border around them is. */
export const INSET = 4;
/** Height of the floor of the lid: the top of the sunk panels, where each machine's own lid starts. */
export const LID_FLOOR = 16 - INSET;

/**
 * The casing without its lid: the bottom rails, the four corner posts and the inner core that floors every sunk panel.
 * The lid is left to each machine, which lowers it to make room for its own part.
 */
const SHELL = [
  box(0, 0, 0, INSET, INSET, 16), box(16 - INSET, 0, 0, 16, INSET, 16),          // bottom rails, west and east
  box(INSET, 0, 0, 16 - INSET, INSET, INSET), box(INSET, 0, 16 - INSET, 16 - INSET, INSET, 16), // and north and south
  box(0, INSET, 0, INSET, LID_FLOOR, INSET), box(16 - INSET, INSET, 0, 16, LID_FLOOR, INSET), // corner posts
  box(0, INSET, 16 - INSET, INSET, LID_FLOOR, 16), box(16 - INSET, INSET, 16 - INSET, 16, LID_FLOOR, 16),
  box(INSET, INSET, INSET, 16 - INSET, LID_FLOOR, 16 - INSET),                   // the core: floor of the five panels
];

/**
 * The casing with a lid `16 - top` thick, plus the parts the machine puts on it. A lid at 16 is the plain casing.
 * @param {number} [top] height of the top of the lid's slab in sixteenths (16 = the plain casing's lid)
 * @param {import('../../packages/cli/types/mineclaude-mod').BlockBox[]} [parts] boxes of the machine's own part, in 0..1
 */
export function casing(top = 16, parts = []) {
  return [...SHELL, box(0, LID_FLOOR, 0, 16, top, 16), ...parts];
}

/**
 * The geometry of a machine: the silhouette plus the three roles that unlock the 48-box budget.
 * @param {import('../../packages/cli/types/mineclaude-mod').BlockBox[]} model
 * @returns {import('../../packages/cli/types/mineclaude-mod').BlockGeometry}
 */
export function machineGeometry(model) {
  return { model, collision: FULL_CELL, selection: FULL_CELL, occlusion: casing() };
}

/**
 * The parts on the lid of the soldering station: the bench, the column at the back and the sloping gantry that
 * carries the head over it. One box holds the gantry and the head in both states — the head comes down onto the
 * bench while it works, and the shape the player bumps into does not change with the state.
 */
export const SOLDERING_PARTS = [
  box(3, 13, 2, 13, 14, 13),   // the bench on the lid, running back into the column
  box(6, 13, 1, 10, 16, 3),    // the column at the back
  box(7, 14, 2, 9, 16, 11),    // the gantry sloping over the bench
  box(6, 14, 11, 10, 16, 13),  // the head bolted to its far end
];

/** The parts on the lid of the power junction: the transformer drum and the terminal leaning towards the player. */
export const JUNCTION_PARTS = [
  box(5, 13, 4, 11, 16, 10),   // the drum: the same two boxes the model draws it with
  box(4, 13, 5, 12, 16, 9),
  box(5, 13, 11, 11, 16, 14),  // the terminal at the front, turned towards the player
];

/** The rail around the workbench's tray: along the back and the two sides, open at the front. */
export const CRAFTING_PARTS = [
  box(0, 15, 0, 16, 16, 2),    // rim at the back
  box(0, 15, 2, 2, 16, 16),    // and along the two sides; the front is left open
  box(14, 15, 2, 16, 16, 16),
];

export { box };
