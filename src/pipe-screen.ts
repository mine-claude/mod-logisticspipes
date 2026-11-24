// @ts-check
// Right click on a configurable pipe opens its screen. There is one screen type for every pipe (`pipe_screen`, no
// slots of its own): the browser screen (client/lp-screens.ts) draws the kind named in `data.k` and asks the server for
// the pipe's settings over ctx.net (server/logic.ts), so a long filter list never hits the 512-byte limit of `data`.
import { PIPE_SCREENS, SCREEN_TITLES } from './lp-config.ts';

export const PIPE_SCREEN = 'logisticspipes:pipe_screen';

/** @param {any} e a block interaction event (server) */
export function openPipeScreen(e) {
  const block = e.world.getBlock(e.pos), kind = PIPE_SCREENS[/** @type {keyof typeof PIPE_SCREENS} */ (block)];
  if (!kind || typeof e.player?.openScreen !== 'function') return false;
  e.player.playSound?.('logisticspipes:wrench');
  return e.player.openScreen(PIPE_SCREEN, {
    title: SCREEN_TITLES[/** @type {keyof typeof SCREEN_TITLES} */ (kind)],
    data: { k: kind, p: [e.pos.x, e.pos.y, e.pos.z], mk2: block.endsWith('_mk2') || block.endsWith('_mk3') },
  }) !== false;
}
