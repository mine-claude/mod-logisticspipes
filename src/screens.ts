// @ts-check
import { ScreenHandlerType, Slot } from './mineclaude-sdk.js';

export const SOLDER_TICKS = 60; // 3 seconds per chip

// Soldering Station Screen
export class SolderingStationScreen extends ScreenHandlerType {
  title = 'Estação de Solda';
  slots = [
    Slot.block(0, 30, 25, { label: 'Chip Bruto' }),
    Slot.block(1, 55, 25, { label: 'Metal' }),
    Slot.block(2, 80, 25, { label: 'Catalisador' }),
    Slot.block(3, 130, 25, { outputOnly: true, label: 'Resultado' }),
  ];
  properties = ['progresso', 'total'];
  bars = [{ label: 'Soldando', value: 'progresso', max: 'total' }];

  /** @param {{ world: any, pos: { x: number, y: number, z: number } }} e */
  readProperties({ world, pos }) {
    const data = world.getBlockData ? world.getBlockData(pos) : null;
    return { progresso: data?.progress ?? 0, total: SOLDER_TICKS };
  }
}

// Logistics Crafting Table Screen
export class LogisticsCraftingScreen extends ScreenHandlerType {
  title = 'Mesa de Fabricação Logística';
  crafting = /** @type {const} */ ({ size: 3, block: 'logisticspipes:crafting_table', x: 30, y: 15 });
  /** @param {{ size: number }} e */
  slots({ size }) {
    // Buffer slots displayed beneath crafting grid
    return Array.from({ length: Math.min(size, 9) }, (_, i) => Slot.block(i, 8 + i * 18, 65, { label: 'Buffer' }));
  }
}

// Chassis Pipe Screen
export class ChassisScreen extends ScreenHandlerType {
  title = 'Logistics Chassis';
  /** @param {{ size: number }} e */
  slots({ size }) {
    return Array.from({ length: size }, (_, i) => Slot.block(i, 18 + i * 19, 25, { label: `Módulo ${i + 1}` }));
  }
}

// Every configurable pipe's screen (pipe-screen.ts opens it with { k: kind, p: [x, y, z] }). No slots of its own: the
// settings are ghost copies the browser screen (client/lp-screens.ts) sends over ctx.net, like the original mod's
// dummy slots, so nothing is taken from the player.
export class PipeConfigScreen extends ScreenHandlerType {
  title = 'Logistics Pipes';
  slots = [];
}
