// @ts-check
import { PIPE_ACCENTS, UNROUTED, pipeBodyPainter } from './pipe-body.ts';
import {
  MACHINE_ACCENTS, machinePlate, machineLid, machineInner, machinePanel, machineFront,
  craftingTray, craftingRim, solderBench, solderFrame, solderHead, junctionDrum, junctionDrumEnd, junctionTerminal,
} from './machine-skin.ts';

/**
 * Registers all textures used by the Logistics Pipes mod.
 * @param {import('../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx
 */
export function registerTextures(ctx) {
  // Pipes (16x16)
  ctx.textures.png('pipe_transport_basic', 'textures/pipes/pipe_transport_basic.png');
  ctx.textures.png('pipe_basic', 'textures/pipes/pipe_basic.png');
  ctx.textures.png('pipe_provider', 'textures/pipes/pipe_provider.png');
  ctx.textures.png('pipe_provider_mk2', 'textures/pipes/pipe_provider_mk2.png');
  ctx.textures.png('pipe_request', 'textures/pipes/pipe_request.png');
  ctx.textures.png('pipe_request_mk2', 'textures/pipes/pipe_request_mk2.png');
  ctx.textures.png('pipe_crafting', 'textures/pipes/pipe_crafting.png');
  ctx.textures.png('pipe_crafting_mk2', 'textures/pipes/pipe_crafting_mk2.png');
  ctx.textures.png('pipe_crafting_mk3', 'textures/pipes/pipe_crafting_mk3.png');
  ctx.textures.png('pipe_satellite', 'textures/pipes/pipe_satellite.png');
  ctx.textures.png('pipe_supplier', 'textures/pipes/pipe_supplier.png');
  ctx.textures.png('pipe_remote_orderer', 'textures/pipes/pipe_remote_orderer.png');
  ctx.textures.png('pipe_chassis_mk1', 'textures/pipes/pipe_chassis_mk1.png');
  ctx.textures.png('pipe_chassis_mk2', 'textures/pipes/pipe_chassis_mk2.png');
  ctx.textures.png('pipe_chassis_mk3', 'textures/pipes/pipe_chassis_mk3.png');
  ctx.textures.png('pipe_chassis_mk4', 'textures/pipes/pipe_chassis_mk4.png');
  ctx.textures.png('pipe_chassis_mk5', 'textures/pipes/pipe_chassis_mk5.png');

  // Pipe bodies in the world (16x16, painted by code): frame bars, corner pieces and the core of the routed pipes
  for (const [pipe, accent] of Object.entries(PIPE_ACCENTS)) ctx.textures.paint(`${pipe}_body`, pipeBodyPainter(accent, pipe !== UNROUTED));

  // The solid machines in the world, painted by code (machine-skin.js), one texture per PIECE: the declared model
  // (machine-model.js) names a texture and a UV rectangle per face, so nothing is sampled by where a box sits in the
  // cell any more. The 128x128 images below are the UV sheet of the original model, which cannot be read either way;
  // they stay on disk, unused, until the art is regenerated.
  ctx.textures.paint('machine_plate', machinePlate);                 // the casing ring: rails, corner posts, lid band
  ctx.textures.paint('machine_lid', machineLid);                     // the top of the lid, its own picture
  ctx.textures.paint('machine_inner', machineInner);                 // the walls of the five sunk panels
  for (const [machine, accent] of Object.entries(MACHINE_ACCENTS)) {
    ctx.textures.paint(`${machine}_panel`, machinePanel(accent, /** @type {any} */ (machine)), { size: 32 });
  }
  // The panel the player faces, with a readout (the station has a lit one for while it works).
  ctx.textures.paint('crafting_table_front', machineFront(MACHINE_ACCENTS.crafting_table, 'crafting_table'), { size: 32 });
  ctx.textures.paint('soldering_station_front', machineFront(MACHINE_ACCENTS.soldering_station, 'soldering_station'), { size: 32 });
  ctx.textures.paint('soldering_station_front_active', machineFront(MACHINE_ACCENTS.soldering_station, 'soldering_station', true), { size: 32 });
  ctx.textures.paint('power_junction_front', machineFront(MACHINE_ACCENTS.power_junction, 'power_junction'), { size: 32 });
  // The parts on the lid of each machine.
  ctx.textures.paint('crafting_tray', craftingTray, { size: 32 });
  ctx.textures.paint('crafting_rim', craftingRim);
  ctx.textures.paint('solder_bench', solderBench(), { size: 32 });
  ctx.textures.paint('solder_bench_active', solderBench(true), { size: 32 });
  ctx.textures.paint('solder_frame', solderFrame);
  ctx.textures.paint('solder_head', solderHead);
  ctx.textures.paint('junction_drum', junctionDrum, { size: 32 });
  ctx.textures.paint('junction_drum_end', junctionDrumEnd);
  ctx.textures.paint('junction_terminal', junctionTerminal);

  // Solid Blocks (128x128)
  ctx.textures.png('crafting_table', 'textures/blocks/crafting_table.png', { size: 128 });
  ctx.textures.png('crafting_table_fuzzy', 'textures/blocks/crafting_table_fuzzy.png', { size: 128 });
  ctx.textures.png('soldering_station', 'textures/blocks/soldering_station.png', { size: 128 });
  ctx.textures.png('soldering_station_active', 'textures/blocks/soldering_station_active.png', { size: 128 });
  ctx.textures.png('power_junction', 'textures/blocks/power_junction.png', { size: 128 });
  ctx.textures.png('frame', 'textures/blocks/frame.png', { size: 128 });
  ctx.textures.png('security_station', 'textures/blocks/security_station.png', { size: 128 });
  ctx.textures.png('program_compiler', 'textures/blocks/program_compiler.png', { size: 128 });
  ctx.textures.png('statistics_table', 'textures/blocks/statistics_table.png', { size: 128 });

  // Tools & Items (16x16)
  ctx.textures.png('pipe_controller', 'textures/items/pipe_controller.png');
  ctx.textures.png('pipe_manager', 'textures/items/pipe_manager.png');
  ctx.textures.png('remote_orderer', 'textures/items/pipe_controller.png'); // remote_orderer item
  ctx.textures.png('disk', 'textures/items/disk.png');
  ctx.textures.png('guide_book', 'textures/items/guide_book.png');
  ctx.textures.png('broken_item', 'textures/items/broken_item.png');
  ctx.textures.png('hud_glasses', 'textures/items/hud_glasses.png');
  ctx.textures.png('item_card', 'textures/items/item_card.png');
  ctx.textures.png('logistics_programmer', 'textures/items/logistics_programmer.png');

  // Chips (16x16)
  ctx.textures.png('chip_basic', 'textures/chips/basic.png');
  ctx.textures.png('chip_basic_raw', 'textures/chips/basic_raw.png');
  ctx.textures.png('chip_advanced', 'textures/chips/advanced.png');
  ctx.textures.png('chip_advanced_raw', 'textures/chips/advanced_raw.png');
  ctx.textures.png('chip_fpga', 'textures/chips/fpga.png');
  ctx.textures.png('chip_fpga_raw', 'textures/chips/fpga_raw.png');

  // Modules (16x16)
  ctx.textures.png('module_blank', 'textures/modules/blank.png');
  ctx.textures.png('module_item_sink', 'textures/modules/item_sink.png');
  ctx.textures.png('module_item_sink_polymorphic', 'textures/modules/item_sink_polymorphic.png');
  ctx.textures.png('module_passive_supplier', 'textures/modules/passive_supplier.png');
  ctx.textures.png('module_active_supplier', 'textures/modules/active_supplier.png');
  ctx.textures.png('module_extractor', 'textures/modules/extractor.png');
  ctx.textures.png('module_extractor_mk2', 'textures/modules/extractor_mk2.png');
  ctx.textures.png('module_extractor_mk3', 'textures/modules/extractor_mk3.png');
  ctx.textures.png('module_provider', 'textures/modules/provider.png');
  ctx.textures.png('module_provider_mk2', 'textures/modules/provider_mk2.png');
  ctx.textures.png('module_quick_sort', 'textures/modules/quick_sort.png');
  ctx.textures.png('module_terminus', 'textures/modules/terminus.png');
  ctx.textures.png('module_crafter', 'textures/modules/crafter.png');
  ctx.textures.png('module_crafter_mk2', 'textures/modules/crafter_mk2.png');
  ctx.textures.png('module_crafter_mk3', 'textures/modules/crafter_mk3.png');

  // Upgrades (16x16)
  ctx.textures.png('upgrade_speed', 'textures/upgrades/speed.png');
  ctx.textures.png('upgrade_item_extraction', 'textures/upgrades/item_extraction.png');
  ctx.textures.png('upgrade_item_stack_extraction', 'textures/upgrades/item_stack_extraction.png');
  ctx.textures.png('upgrade_sneaky', 'textures/upgrades/sneaky.png');
}
