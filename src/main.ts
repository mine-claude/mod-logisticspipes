// @ts-check
import { ModInitializer } from './mineclaude-sdk.js';
import { registerTextures } from './textures.ts';
import { registerSounds } from './sounds.ts';
import { registerItems } from './items.ts';
import { registerBlocks } from './blocks.ts';
import { registerRecipes } from './recipes.ts';
import { registerCommands } from './commands.ts';
import { registerPipeRenderers } from './client/pipe-renderer.ts';
import { SolderingStationScreen, LogisticsCraftingScreen, ChassisScreen, PipeConfigScreen } from './screens.ts';

export default class LogisticsPipesMod extends ModInitializer {
  /**
   * Initializes all contents of the Logistics Pipes mod.
   * @param {import('../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx
   */
  async onInitialize(ctx) {
    // 1. Textures & Sounds
    registerTextures(ctx);
    registerSounds(ctx);

    // 2. Screens
    ctx.screens.register('soldering_station_screen', new SolderingStationScreen());
    ctx.screens.register('crafting_table_screen', new LogisticsCraftingScreen());
    ctx.screens.register('chassis_screen', new ChassisScreen());
    ctx.screens.register('pipe_screen', new PipeConfigScreen());

    // 3. Items & Blocks
    registerItems(ctx);
    registerBlocks(ctx);
    // The item seen passing inside a pipe (the registration is accepted everywhere and only runs in the browser)
    registerPipeRenderers(ctx);

    // 4. Crafting Recipes
    registerRecipes(ctx);

    // 5. Commands
    registerCommands(ctx);

    // 6. Environment-specific entrypoints
    if (ctx.isServer()) {
      const { registerServer } = await import('./server/logic.ts');
      await registerServer(ctx);
    }

    if (ctx.isClient()) {
      const { registerClient } = await import('./client/ui.ts');
      await registerClient(ctx);
    }
  }
}
