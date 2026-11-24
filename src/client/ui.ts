// @ts-check
import { createPipeScreens } from './lp-screens.ts';
import { registerInspect } from './inspect.ts';

/**
 * Browser-only client logic for Logistics Pipes: the pipes' screens (orderer, provider, supplier, satellite, crafting,
 * basic pipe), drawn with the game's pixel kit. The machines (soldering station, crafting table, chassis) use the
 * engine's default screen from their ScreenHandlerType.
 * @param {import('../../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx
 */
export async function registerClient(ctx) {
  ctx.screens.client('pipe_screen', createPipeScreens(ctx));
  registerInspect(ctx);
}
