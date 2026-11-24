// @ts-check
// The textures of the solid machines, painted by code (`ctx.textures.paint`), one picture per PIECE instead of one
// map of the cell. The declared block model (machine-model.js, docs/sdk-block-models.md) names a texture and a UV
// rectangle per face, so the casing plate, the lid, the walls of the sunk panels, the panel itself and every part on
// the lid read their own picture, at their own resolution — no symmetry is required of them any more, and the lid no
// longer borrows the plate of the sides.
//
// How each one is read (the rectangles are declared in machine-model.js):
//   machine_plate    the casing ring, side faces by their footprint (horizontal, y) and the rails' underside (x, z):
//                    a plate framed by a bevel at the cell's edge and a groove where it meets the sunk panel, so the
//                    same picture fits the rails (rows 12..16), the corner posts (columns 0..4, 12..16) and the lid band
//   machine_lid      the whole top of the lid, [0, 0, 16, 16]: tread plate, bolts and a seam — its own picture
//   machine_inner    the walls of the five recesses, by footprint: one dark brushed surface read in small patches
//   <machine>_panel  the face of the sunk panel, the whole texture on each of the five 8x8 panels
//   <machine>_front  the panel the player faces: a readout with a bezel, in place of the plain panel
//   crafting_tray    the top of the workbench lid; crafting_rim the rail around it (a frame picture)
//   solder_bench     the bench on the lid, with the solder tile in the middle (…_active: the tile lit)
//   solder_frame     the column and the gantry; solder_head the head that comes down on the bench
//   junction_drum    the wrap of the transformer drum; …_end its cap; junction_terminal the tilted terminal
//
// Provisional art ("a arte podemos regerar depois"): every texel is opaque, so no face can vanish in the alpha test
// of the opaque terrain.

/** Casing: the bevel at the very edge of the cell, the brushed plate and the groove next to the sunk panel. */
const BEVEL = '#aeb6c0', PLATE = '#8d949e', PLATE_DARK = '#848b95', PLATE_LINE = '#787f88', GROOVE = '#3f454c', RIVET = '#d6dde5';
/** The lid: a lighter tread plate, so the top never reads as the side. */
const LID = '#9ba3ad', LID_DARK = '#848b95', LID_SEAM = '#5d646d';
/** The recesses: dark, with just enough noise to read as metal in shadow. */
const INNER = '#3a4046', INNER_DARK = '#2c3137', INNER_LIGHT = '#474e55';
/** Parts on the lid. */
const IRON = '#565d66', IRON_DARK = '#3d434a', IRON_LIGHT = '#6e757e';
const COPPER = '#b5793a', COPPER_DARK = '#8a5724', COPPER_LIGHT = '#d79a57';
const BOARD = '#2b3038', BOARD_LINE = '#4f8f6a';
const GLASS = '#1b1f26', GLASS_DIM = '#2a3a46';
const HOT = '#ff9b2a', HOT_CORE = '#ffe6a8';

/** One accent colour per machine; it tints that machine's panel and its readout. */
export const MACHINE_ACCENTS = Object.freeze({
  crafting_table: '#b07a3a',
  soldering_station: '#8a6a4a',
  power_junction: '#3a8ab0',
  frame: '#767d86',
});

/**
 * @param {string} color '#rrggbb'
 * @param {number} k below 1 darkens, above 1 lightens
 * @returns {[number, number, number]}
 */
function shade(color, k) {
  const channel = (/** @type {number} */ i) => Math.max(0, Math.min(255, Math.round(parseInt(color.slice(i, i + 2), 16) * k)));
  return [channel(1), channel(3), channel(5)];
}

/**
 * Drawing in art units: 16 x 16 whatever the texture's real size, so the same painter works at 16 or 32 px.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
function pen(t) {
  const k = Math.max(1, t.S / 16);
  /** One art pixel. */
  const set = (/** @type {number} */ x, /** @type {number} */ y, /** @type {any} */ c) => {
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const px = Math.round(x * k) + dx, py = Math.round(y * k) + dy;
      if (px >= 0 && py >= 0 && px < t.S && py < t.S) t.set(px, py, c, 255);
    }
  };
  /** A real pixel, for detail finer than the art grid (only drawn when the texture is bigger than 16). */
  const fine = (/** @type {number} */ x, /** @type {number} */ y, /** @type {any} */ c) => {
    if (x >= 0 && y >= 0 && x < t.S && y < t.S) t.set(x, y, c, 255);
  };
  const box = (/** @type {number} */ x0, /** @type {number} */ y0, /** @type {number} */ x1, /** @type {number} */ y1, /** @type {any} */ c) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, c);
  };
  const frame = (/** @type {number} */ x0, /** @type {number} */ y0, /** @type {number} */ x1, /** @type {number} */ y1, /** @type {any} */ c) => {
    for (let x = x0; x < x1; x++) { set(x, y0, c); set(x, y1 - 1, c); }
    for (let y = y0; y < y1; y++) { set(x0, y, c); set(x1 - 1, y, c); }
  };
  return { k, set, fine, box, frame };
}

// ---------------------------------------------------------------- the casing

/**
 * The casing plate. Written as a function of the distance to the nearest edge on each axis, so the one picture fits
 * every strip of the ring the model cuts out of it: the bevel at ring 0, the groove at ring 3 (where the casing meets
 * the sunk panel) and the brushed plate with a rivet between them.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function machinePlate(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const a = Math.min(x, 15 - x), b = Math.min(y, 15 - y), near = Math.min(a, b);
    if (near === 0) p.set(x, y, BEVEL);
    else if (near === 3) p.set(x, y, GROOVE);
    // Brushed, not chequered: one darker streak every third column, so a 4 px strip of it still reads as metal.
    else p.set(x, y, x % 3 === 1 ? PLATE_LINE : y % 4 === 2 ? PLATE_DARK : PLATE);
  }
  // A rivet in each corner of the ring, where two posts and two rails meet.
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) p.set(x, y, RIVET);
}

/**
 * The top of the lid: tread plate with a diagonal hatch, a seam across the middle and a bolt in each corner. Read
 * whole ([0, 0, 16, 16]) by the lid's up face, so it is the one face that is nothing like the sides.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function machineLid(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x + y) % 4 < 2 ? LID : LID_DARK);
  p.frame(0, 0, 16, 16, BEVEL);
  p.frame(1, 1, 15, 15, LID_SEAM);
  for (let x = 2; x < 14; x++) p.set(x, 8, LID_SEAM);          // the hatch seam
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) { p.box(x, y, x + 1, y + 1, RIVET); p.set(x, y, RIVET); }
}

/**
 * The walls of the five sunk panels: dark brushed metal, uniform enough that any small patch of it (a rail's top, a
 * post's inner face, the lid's underside) reads the same.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function machineInner(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y % 4 === 0 ? INNER_LIGHT : y % 2 === 0 ? INNER : INNER_DARK);
}

// ---------------------------------------------------------------- the sunk panel and the readout

/** The glyph of each machine on its panel, 10 x 10 art pixels: '#' the mark, '.' the field. */
const GLYPHS = Object.freeze({
  crafting_table: ['##.##.##..', '##.##.##..', '..........', '##.##.##..', '##.##.##..', '..........', '##.##.##..', '##.##.##..', '..........', '..........'],
  soldering_station: ['....##....', '....##....', '....##....', '...####...', '...####...', '..######..', '..######..', '...####...', '....##....', '..........'],
  power_junction: ['......##..', '.....##...', '....##....', '...#####..', '..######..', '.....##...', '....##....', '...##.....', '..##......', '..........'],
  frame: ['##......##', '#........#', '..........', '..........', '..........', '..........', '..........', '..........', '#........#', '##......##'],
});

/**
 * The face of a sunk panel: a rim, bolts in the corners, the machine's accent field shaded towards the middle and its
 * glyph. The whole texture lands on the 8x8 panel, so the art is drawn at the panel's own resolution.
 * @param {string} accent
 * @param {keyof typeof GLYPHS} glyph
 * @returns {(t: import('../../packages/cli/types/mineclaude-mod').PainterTools) => void}
 */
export function machinePanel(accent, glyph) {
  return (t) => {
    const p = pen(t);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const near = Math.min(x, 15 - x, y, 15 - y);
      p.set(x, y, near === 0 ? GROOVE : near === 1 ? shade(accent, 1.25) : shade(accent, near >= 4 ? 0.82 : 0.95));
    }
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) p.set(x, y, RIVET);
    const rows = GLYPHS[glyph];
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === '#') { p.set(3 + x, 3 + y, shade(accent, 0.45)); }
    }
  };
}

/** The readout of each machine: the bars its screen lights up, 10 wide. */
const READOUTS = Object.freeze({
  crafting_table: [3, 6, 9, 5, 8],
  soldering_station: [2, 4, 3, 6, 4],
  power_junction: [9, 8, 9, 7, 9],
});

/**
 * The panel the player faces: a bezel, a dark screen with a bar graph, a lamp and a label strip in the accent.
 * `lit` turns the screen on (the station while it solders).
 * @param {string} accent
 * @param {keyof typeof READOUTS} kind
 * @param {boolean} [lit]
 * @returns {(t: import('../../packages/cli/types/mineclaude-mod').PainterTools) => void}
 */
export function machineFront(accent, kind, lit = false) {
  return (t) => {
    const p = pen(t);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const near = Math.min(x, 15 - x, y, 15 - y);
      p.set(x, y, near === 0 ? GROOVE : near === 1 ? shade(accent, 1.2) : shade(accent, 0.9));
    }
    p.box(2, 2, 14, 11, lit ? GLASS_DIM : GLASS);                 // the screen
    p.frame(2, 2, 14, 11, IRON_DARK);
    const bars = READOUTS[kind];
    for (let i = 0; i < bars.length; i++) {
      for (let h = 0; h < bars[i]; h++) p.set(3 + i * 2, 10 - h, lit ? HOT : BOARD_LINE);
      for (let h = 0; h < bars[i]; h++) p.set(4 + i * 2, 10 - h, lit ? HOT_CORE : shade(BOARD_LINE, 0.7));
    }
    for (let x = 2; x < 14; x++) p.set(x, 12, IRON_DARK);         // the label strip
    for (let x = 3; x < 13; x += 2) p.set(x, 13, shade(accent, 1.35));
    p.set(12, 3, lit ? HOT_CORE : '#7d3030');                     // the lamp
    for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) p.set(x, y, RIVET);
  };
}

// ---------------------------------------------------------------- the parts on the lid

/**
 * The top of the workbench: a board with a 3x3 of recessed slots and a tool groove along the front.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function craftingTray(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x * 3 + y * 5) % 7 < 3 ? '#6b4a26' : '#5d4021');
  p.frame(0, 0, 16, 16, '#3f2a15');
  for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
    const x0 = 2 + sx * 4, y0 = 1 + sy * 4;
    p.box(x0, y0, x0 + 3, y0 + 3, '#2f2114');
    p.frame(x0, y0, x0 + 3, y0 + 3, '#8a6334');
  }
  for (let x = 1; x < 15; x++) p.set(x, 14, '#3f2a15');          // the groove along the front
}

/**
 * The rail around the workbench, painted as a frame: the model reads its top band for the back rail and its left and
 * right bands for the side rails, so each one gets a rail that runs the right way.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function craftingRim(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, '#4a3a22');
  for (let i = 0; i < 16; i++) {
    p.set(i, 0, '#8a6334'); p.set(i, 1, '#6b4a26'); p.set(i, 14, '#6b4a26'); p.set(i, 15, '#8a6334');
    p.set(0, i, '#8a6334'); p.set(1, i, '#6b4a26'); p.set(14, i, '#6b4a26'); p.set(15, i, '#8a6334');
  }
  for (const [x, y] of [[0, 7], [15, 7], [7, 0], [7, 15]]) p.set(x, y, RIVET);
}

/**
 * The bench of the soldering station: a dark board with copper traces and the solder tile in the middle. `hot` lights
 * the tile, which is what the player sees while the station works.
 * @param {boolean} [hot]
 * @returns {(t: import('../../packages/cli/types/mineclaude-mod').PainterTools) => void}
 */
export function solderBench(hot = false) {
  return (t) => {
    const p = pen(t);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x + y) % 2 === 0 ? BOARD : shade(BOARD, 0.85));
    p.frame(0, 0, 16, 16, IRON_DARK);
    for (let x = 2; x < 14; x++) { p.set(x, 3, BOARD_LINE); p.set(x, 12, BOARD_LINE); }
    for (let y = 3; y < 13; y++) { p.set(3, y, BOARD_LINE); p.set(12, y, BOARD_LINE); }
    p.box(6, 6, 10, 10, hot ? HOT : COPPER_DARK);                 // the solder tile
    p.frame(6, 6, 10, 10, hot ? HOT_CORE : COPPER);
    if (hot) { p.set(7, 7, HOT_CORE); p.set(8, 8, HOT_CORE); }
    for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) p.set(x, y, IRON_LIGHT);
  };
}

/**
 * The column and the gantry: a steel beam with bolts along it, so a thin strip of it reads as a beam either way.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function solderFrame(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, x % 4 === 0 || y % 4 === 0 ? IRON_DARK : (x + y) % 2 === 0 ? IRON : shade(IRON, 0.9));
  for (let i = 0; i < 16; i += 4) { p.set(i + 2, 2, IRON_LIGHT); p.set(2, i + 2, IRON_LIGHT); p.set(i + 2, 13, IRON_LIGHT); p.set(13, i + 2, IRON_LIGHT); }
}

/**
 * The soldering head: a dark holder down to a copper tip, read with the tip at the bottom of the texture.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function solderHead(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x + y) % 2 === 0 ? IRON : IRON_DARK);
  p.frame(0, 0, 16, 16, IRON_DARK);
  for (let y = 9; y < 16; y++) {
    const w = Math.max(1, 6 - (y - 9));
    for (let x = 8 - w; x < 8 + w; x++) p.set(x, y, y > 12 ? COPPER_LIGHT : COPPER);
  }
  for (let x = 4; x < 12; x++) p.set(x, 8, COPPER_DARK);
  for (const [x, y] of [[2, 2], [13, 2]]) p.set(x, y, IRON_LIGHT);
}

// ---------------------------------------------------------------- the power junction

/**
 * The wrap of the transformer drum: copper windings around a steel core, read as horizontal bands so a band of any
 * height reads as windings.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function junctionDrum(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) {
    const band = y % 3;
    for (let x = 0; x < 16; x++) p.set(x, y, band === 0 ? COPPER_LIGHT : band === 1 ? COPPER : COPPER_DARK);
  }
  for (let y = 0; y < 16; y++) { p.set(0, y, IRON_DARK); p.set(15, y, IRON_DARK); }
  for (let y = 2; y < 14; y += 5) for (let x = 2; x < 14; x += 5) p.set(x, y, IRON_LIGHT);
}

/**
 * The cap of the drum: concentric rings around a bolt in the middle.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function junctionDrumEnd(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.round(Math.hypot(x - 7.5, y - 7.5));
    p.set(x, y, d >= 7 ? IRON_DARK : d % 2 === 0 ? COPPER : COPPER_DARK);
  }
  p.box(7, 7, 9, 9, IRON_LIGHT);
  p.set(7, 7, RIVET);
}

/**
 * The terminal at the front of the junction: three screw posts on a dark block, with a live strip above them.
 * @param {import('../../packages/cli/types/mineclaude-mod').PainterTools} t
 */
export function junctionTerminal(t) {
  const p = pen(t);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x + y) % 2 === 0 ? IRON_DARK : shade(IRON_DARK, 0.85));
  p.frame(0, 0, 16, 16, IRON);
  for (let x = 2; x < 14; x++) p.set(x, 2, '#3a8ab0');
  for (const cx of [3, 7, 11]) {
    p.box(cx, 5, cx + 3, 12, COPPER_DARK);
    p.frame(cx, 5, cx + 3, 12, COPPER);
    p.set(cx + 1, 8, COPPER_LIGHT);
  }
  for (let x = 1; x < 15; x++) p.set(x, 14, IRON);
}
