// @ts-check
// What a solid machine DRAWS: the declared block model (docs/sdk-block-models.md), elements in cell pixels with a
// texture and a UV rectangle per face. The boxes of machine-shape.js keep answering for collision, mira, support and
// occlusion, as the doc asks; nothing here is sampled by the position of a box in the cell any more.
//
// Why it changed: with `geometry` alone every face took its texels from where its box sat in the cell, so the casing
// had to be one symmetric map of the cell and the piece on the lid read the same plate as the sides. The owner's
// complaint ("the texture is not on the object") is exactly that. Now each face names its own picture:
//
//   the casing ring   `#plate` by the face's own footprint, so the bevel at the cell's edge and the groove next to
//                     the panel line up across the rails, the corner posts and the lid's band
//   the recesses      `#inner`, also by footprint: one dark surface read in small patches
//   the sunk panels   `#panel` whole ([0, 0, 16, 16]) on each 8x8 panel, and `#front` on the one the player faces
//   the lid's top     its own picture, whole — never the plate of the sides
//   each part on it   its own texture and rectangle (tray, rim, bench, column, gantry, head, drum, terminal)
//
// The front of a machine is its +z face: `states.placement.facing = 'horizontal_facing'` sets `facing` to the way the
// player LOOKS, so a block placed while looking north ('n') shows the player its south side. The model turns with the
// state exactly like the boxes (`geometry.rotate`), so everything here is written for facing 'n'.

import { INSET, LID_FLOOR } from './machine-shape.ts';

/** The whole texture, for a face that gets a picture of its own. */
export const FULL = /** @type {[number, number, number, number]} */ ([0, 0, 16, 16]);

/** The two axes a face's UV runs along, as the engine reads them (shared/block-model.js FACE_AXES). */
const FACE_AXES = { west: [2, 1], east: [2, 1], down: [0, 2], up: [0, 2], north: [0, 1], south: [0, 1] };

/**
 * The rectangle a face would sample without `uv`: its own footprint on the texture, with v measured from the top.
 * Written out instead of omitted so the probe checks a declaration, not a default.
 * @param {'west' | 'east' | 'down' | 'up' | 'north' | 'south'} face
 * @param {number[]} from
 * @param {number[]} to
 * @returns {[number, number, number, number]}
 */
export function fit(face, from, to) {
  const [au, av] = FACE_AXES[face];
  const clamp = (/** @type {number} */ v) => Math.max(0, Math.min(16, v));
  return [clamp(from[au]), clamp(16 - to[av]), clamp(to[au]), clamp(16 - from[av])];
}

/**
 * One element: the faces named, each with a texture and a rectangle. `by` lists the faces that take their footprint
 * of one texture (the continuous surfaces), `faces` the ones with a rectangle of their own.
 * @param {[number, number, number]} from
 * @param {[number, number, number]} to
 * @param {{ by?: Record<string, string>, faces?: Record<string, { texture: string, uv: [number, number, number, number], rotation?: 0 | 90 | 180 | 270 }>, cull?: string[], rotation?: { axis: 'x' | 'y' | 'z', angle: number, origin?: [number, number, number] } }} spec
 * @returns {import('../../packages/cli/types/mineclaude-mod').BlockModelElement}
 */
function element(from, to, { by = {}, faces = {}, cull = [], rotation }) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const [face, texture] of Object.entries(by)) out[face] = { texture, uv: fit(face as any, from, to) };
  for (const [face, declared] of Object.entries(faces)) out[face] = { ...(declared as any) };
  for (const face of cull) if (out[face]) out[face].cullface = face;
  return { from, to, ...(rotation && { rotation }), faces: out };
}

/**
 * The casing, drawn: the four bottom rails, the four corner posts, the core that floors the five sunk panels and the
 * lid. Only the faces that can be seen are declared — the model is not a union, so a face buried against another
 * element would fight it for the same pixels.
 *
 * @param {object} opts
 * @param {number} opts.lid height of the top of the lid, in cell pixels (16 = the plain casing)
 * @param {string} [opts.top] texture of the lid's top face (default the lid plate)
 * @param {string} [opts.front] texture of the panel the player faces (default the plain panel)
 * @returns {import('../../packages/cli/types/mineclaude-mod').BlockModelElement[]}
 */
export function casingElements({ lid, top = '#lid', front = '#panel' }) {
  const I = INSET, M = 16, F = LID_FLOOR;
  const plate = '#plate', inner = '#inner', panel = '#panel';
  return /** @type {any} */ ([
    // The bottom rails. Their outer faces and underside are the casing; their top is the floor of the side recess and
    // their inner face the wall of the bottom one.
    element([0, 0, 0], [I, I, M], ({ by: { west: plate, down: plate, north: plate, south: plate, up: inner, east: inner }, cull: ['west', 'down', 'north', 'south'] } as any)),
    element([M - I, 0, 0], [M, I, M], ({ by: { east: plate, down: plate, north: plate, south: plate, up: inner, west: inner }, cull: ['east', 'down', 'north', 'south'] } as any)),
    element([I, 0, 0], [M - I, I, I], ({ by: { north: plate, down: plate, up: inner, south: inner }, cull: ['north', 'down'] } as any)),
    element([I, 0, M - I], [M - I, I, M], ({ by: { south: plate, down: plate, up: inner, north: inner }, cull: ['south', 'down'] } as any)),
    // The four corner posts: two faces of the casing outside, two walls of a recess inside.
    element([0, I, 0], [I, F, I], ({ by: { west: plate, north: plate, east: inner, south: inner }, cull: ['west', 'north'] } as any)),
    element([M - I, I, 0], [M, F, I], ({ by: { east: plate, north: plate, west: inner, south: inner }, cull: ['east', 'north'] } as any)),
    element([0, I, M - I], [I, F, M], ({ by: { west: plate, south: plate, east: inner, north: inner }, cull: ['west', 'south'] } as any)),
    element([M - I, I, M - I], [M, F, M], ({ by: { east: plate, south: plate, west: inner, north: inner }, cull: ['east', 'south'] } as any)),
    // The core: the face of a sunk panel on each side and underneath, each taking the whole picture of the panel.
    element([I, I, I], [M - I, F, M - I], ({ faces: {
      north: { texture: panel, uv: FULL }, south: { texture: front, uv: FULL },
      east: { texture: panel, uv: FULL }, west: { texture: panel, uv: FULL }, down: { texture: panel, uv: FULL },
    } } as any)),
    // The lid: its own picture on top, the plate's band on the sides and the dark surface under it, over the recesses.
    element([0, F, 0], [M, lid, M], ({
      by: { north: plate, south: plate, east: plate, west: plate, down: inner },
      faces: { up: { texture: top, uv: FULL } },
      cull: ['north', 'south', 'east', 'west', ...(lid === M ? ['up'] : [])],
    } as any)),
  ]);
}

/** key -> registered texture of every machine: the casing, plus the panel and the readout of this one. */
const casingTextures = (/** @type {string} */ machine) => ({
  plate: 'logisticspipes:machine_plate',
  lid: 'logisticspipes:machine_lid',
  inner: 'logisticspipes:machine_inner',
  panel: `logisticspipes:${machine}_panel`,
});

// ---------------------------------------------------------------- one model per machine

/** The bare casing: the shell, nothing on the lid, the same panel on all five sides. */
export const frameModel = () => ({
  textures: casingTextures('frame'),
  elements: casingElements({ lid: 16 }),
});

/**
 * The workbench: the lid is the tray and a rail runs around it, open at the front where the player stands. The rail
 * is painted as a frame, so the back rail reads its top band and each side rail the band on its own side.
 */
export const craftingTableModel = () => ({
  textures: { ...casingTextures('crafting_table'), front: 'logisticspipes:crafting_table_front', tray: 'logisticspipes:crafting_tray', rim: 'logisticspipes:crafting_rim' },
  elements: [
    ...casingElements({ lid: 15, top: '#tray', front: '#front' }),
    // The rail at the back: its cap is the frame's top band and its ends are the corners of that band.
    element([0, 15, 0], [16, 16, 2], ({ by: { north: '#plate', south: '#plate', east: '#plate', west: '#plate' },
      faces: { up: { texture: '#rim', uv: [0, 0, 16, 2] } }, cull: ['north'] } as any)),
    // and along the two sides: the left and the right band of the same frame, so the rail runs the long way.
    element([0, 15, 2], [2, 16, 16], ({ by: { west: '#plate', east: '#plate', south: '#plate' },
      faces: { up: { texture: '#rim', uv: [0, 2, 2, 16] } }, cull: ['west'] } as any)),
    element([14, 15, 2], [16, 16, 16], ({ by: { east: '#plate', west: '#plate', south: '#plate' },
      faces: { up: { texture: '#rim', uv: [14, 2, 16, 16] } }, cull: ['east'] } as any)),
  ],
});

/**
 * The soldering station: a bench on the lid, a column at the back and a gantry over the bench carrying the head.
 * `active` brings the head down onto the bench and lights the solder tile and the readout.
 * @param {boolean} [active]
 */
export const solderingStationModel = (active = false) => ({
  textures: {
    ...casingTextures('soldering_station'),
    front: `logisticspipes:soldering_station_front${active ? '_active' : ''}`,
    bench: `logisticspipes:solder_bench${active ? '_active' : ''}`,
    frame: 'logisticspipes:solder_frame',
    head: 'logisticspipes:solder_head',
  },
  elements: [
    ...casingElements({ lid: 13, front: '#front' }),
    // The bench: its top is the board with the solder tile, its sides a band of the beam texture. It runs back into
    // the column on purpose: a face buried inside another element is simply not seen, while two faces on the SAME
    // plane would fight for the pixels (the model is not a union of boxes).
    element([3, 13, 2], [13, 14, 13], ({ by: { north: '#frame', south: '#frame', east: '#frame', west: '#frame' },
      faces: { up: { texture: '#bench', uv: FULL } } } as any)),
    // The column at the back.
    element([6, 13, 1], [10, 16, 3], ({ by: { north: '#frame', south: '#frame', east: '#frame', west: '#frame', up: '#frame' }, cull: ['north'] } as any)),
    // The gantry: the strut that leaves the top of the column and SLOPES down over the bench — the piece whose shape
    // asks for a rotation (5 degrees on x around the end it hangs from, which keeps its far end clear of the bench).
    element([7, 15.2, 3], [9, 16, 11], { rotation: { axis: 'x', angle: 5, origin: [8, 16, 3] },
      by: { east: '#frame', west: '#frame', up: '#frame', down: '#frame', south: '#frame' } }),
    // The head, bolted to the gantry's far end: a holder down to a copper tip, so the texture is read with its tip at
    // the bottom. Idle it waits over the bench; working it comes down onto it — flush, so its underside is not
    // declared there (two faces on one plane would fight for the same pixels).
    element([6.5, active ? 14 : 14.8, 11], [9.5, 15.8, 12.5], ({
      faces: {
        north: { texture: '#head', uv: active ? [1, 7, 15, 16] : [1, 11, 15, 16] },
        south: { texture: '#head', uv: active ? [1, 7, 15, 16] : [1, 11, 15, 16] },
        east: { texture: '#head', uv: active ? [4, 7, 11, 16] : [4, 11, 11, 16] },
        west: { texture: '#head', uv: active ? [4, 7, 11, 16] : [4, 11, 11, 16] },
        ...(active ? {} : { down: { texture: '#head', uv: [2, 10, 14, 16] } }),
      },
    } as any)),
  ],
});

/**
 * The power junction: a transformer drum standing on the lid (two boxes, a round can at this size) and a terminal
 * tilted towards the player at the front.
 */
export const powerJunctionModel = () => ({
  textures: { ...casingTextures('power_junction'), front: 'logisticspipes:power_junction_front',
    drum: 'logisticspipes:junction_drum', cap: 'logisticspipes:junction_drum_end', terminal: 'logisticspipes:junction_terminal' },
  elements: [
    ...casingElements({ lid: 13, front: '#front' }),
    // The drum, round enough at this size out of two boxes: the windings wrap the sides (a rectangle as wide as the
    // face, so the bands never stretch) and the cap closes the top.
    element([5, 13, 4], [11, 16, 10], ({ faces: {
      north: { texture: '#drum', uv: [0, 0, 16, 8] }, south: { texture: '#drum', uv: [0, 0, 16, 8] },
      east: { texture: '#drum', uv: [0, 0, 16, 8] }, west: { texture: '#drum', uv: [0, 0, 16, 8] },
      up: { texture: '#cap', uv: FULL } } } as any)),
    // The second box stops half a pixel short of the first one's top, so the can reads as chamfered and its own top
    // face is seen only on the two lobes that stick out — never on the same plane as the cap above it.
    element([4, 13, 5], [12, 15.5, 9], ({ faces: {
      north: { texture: '#drum', uv: [0, 0, 16, 5] }, south: { texture: '#drum', uv: [0, 0, 16, 5] },
      east: { texture: '#drum', uv: [0, 0, 16, 10] }, west: { texture: '#drum', uv: [0, 0, 16, 10] },
      up: { texture: '#cap', uv: [0, 4, 16, 12] } } } as any)),
    // The terminal: a console leaning back from the front edge of the lid (25 degrees on x), with the screw posts on
    // the face it turns towards the player.
    element([5, 13.2, 12.4], [11, 15.6, 13.4], {
      rotation: { axis: 'x', angle: -25, origin: [8, 13.2, 12.9] },
      faces: {
        south: { texture: '#terminal', uv: FULL }, north: { texture: '#terminal', uv: [2, 2, 14, 14] },
        east: { texture: '#plate', uv: [4, 4, 5, 7] }, west: { texture: '#plate', uv: [4, 4, 5, 7] },
        up: { texture: '#terminal', uv: [2, 13, 14, 15] },
      },
    }),
  ],
});
