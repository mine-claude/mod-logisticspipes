// @ts-check

/**
 * Registers all crafting recipes for Logistics Pipes.
 * @param {import('../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx
 */
export function registerRecipes(ctx) {
  // Unrouted Transport Pipe: 8x from iron + red dye (redstone proxy) + glass
  ctx.recipes.add({
    out: 'logisticspipes:pipe_transport_basic',
    n: 8,
    pattern: [
      'iri',
      'g g',
      'iri',
    ],
    legend: {
      i: 'mineclaude:iron_ingot',
      r: 'mineclaude:dye_red',
      g: 'mineclaude:glass',
    },
  });

  // Basic Logistics Pipe: Transport Pipe + Basic Chip
  ctx.recipes.add({
    out: 'logisticspipes:pipe_basic',
    n: 1,
    pattern: [
      'c',
      'p',
    ],
    legend: {
      c: 'logisticspipes:chip_basic',
      p: 'logisticspipes:pipe_transport_basic',
    },
  });

  // Provider Logistics Pipe: Basic Pipe + Advanced Chip
  ctx.recipes.add({
    out: 'logisticspipes:pipe_provider',
    n: 1,
    pattern: [
      'c',
      'p',
    ],
    legend: {
      c: 'logisticspipes:chip_advanced',
      p: 'logisticspipes:pipe_basic',
    },
  });

  // Provider Mk2: Provider + FPGA
  ctx.recipes.add({
    out: 'logisticspipes:pipe_provider_mk2',
    n: 1,
    in: [
      ['logisticspipes:pipe_provider', 1],
      ['logisticspipes:chip_fpga', 1],
    ],
  });

  // Request Logistics Pipe: Basic Pipe + Gold + Glass
  ctx.recipes.add({
    out: 'logisticspipes:pipe_request',
    n: 1,
    pattern: [
      ' g ',
      'gpg',
      ' g ',
    ],
    legend: {
      g: 'mineclaude:gold_ingot',
      p: 'logisticspipes:pipe_basic',
    },
  });

  // Request Mk2: Request Pipe + FPGA
  ctx.recipes.add({
    out: 'logisticspipes:pipe_request_mk2',
    n: 1,
    in: [
      ['logisticspipes:pipe_request', 1],
      ['logisticspipes:chip_fpga', 1],
    ],
  });

  // Supplier Pipe: Basic Pipe + Chest
  ctx.recipes.add({
    out: 'logisticspipes:pipe_supplier',
    n: 1,
    in: [
      ['logisticspipes:pipe_basic', 1],
      ['mineclaude:chest', 1],
    ],
  });

  // Crafting Pipe: Basic Pipe + Crafting Table
  ctx.recipes.add({
    out: 'logisticspipes:pipe_crafting',
    n: 1,
    in: [
      ['logisticspipes:pipe_basic', 1],
      ['mineclaude:crafting_table', 1],
    ],
  });

  // Crafting Pipe Mk2: Crafting Pipe + Chip Advanced
  ctx.recipes.add({
    out: 'logisticspipes:pipe_crafting_mk2',
    n: 1,
    in: [
      ['logisticspipes:pipe_crafting', 1],
      ['logisticspipes:chip_advanced', 1],
    ],
  });

  // Crafting Pipe Mk3: Crafting Pipe Mk2 + FPGA
  ctx.recipes.add({
    out: 'logisticspipes:pipe_crafting_mk3',
    n: 1,
    in: [
      ['logisticspipes:pipe_crafting_mk2', 1],
      ['logisticspipes:chip_fpga', 1],
    ],
  });

  // Satellite Pipe: Basic Pipe + Blue Dye
  ctx.recipes.add({
    out: 'logisticspipes:pipe_satellite',
    n: 1,
    in: [
      ['logisticspipes:pipe_basic', 1],
      ['mineclaude:dye_blue', 1],
    ],
  });

  // Remote Orderer Pipe: Basic Pipe + Diamond
  ctx.recipes.add({
    out: 'logisticspipes:pipe_remote_orderer',
    n: 1,
    in: [
      ['logisticspipes:pipe_basic', 1],
      ['mineclaude:diamond', 1],
    ],
  });

  // Chassis Mk1..5
  ctx.recipes.add({
    out: 'logisticspipes:pipe_chassis_mk1',
    n: 1,
    pattern: [
      ' i ',
      'ipi',
      ' i ',
    ],
    legend: {
      i: 'mineclaude:iron_ingot',
      p: 'logisticspipes:pipe_transport_basic',
    },
  });

  ctx.recipes.add({
    out: 'logisticspipes:pipe_chassis_mk2',
    n: 1,
    in: [
      ['logisticspipes:pipe_chassis_mk1', 1],
      ['mineclaude:gold_ingot', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:pipe_chassis_mk3',
    n: 1,
    in: [
      ['logisticspipes:pipe_chassis_mk2', 1],
      ['mineclaude:gold_ingot', 2],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:pipe_chassis_mk4',
    n: 1,
    in: [
      ['logisticspipes:pipe_chassis_mk3', 1],
      ['mineclaude:diamond', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:pipe_chassis_mk5',
    n: 1,
    in: [
      ['logisticspipes:pipe_chassis_mk4', 1],
      ['mineclaude:diamond', 2],
    ],
  });

  // Machines
  ctx.recipes.add({
    out: 'logisticspipes:soldering_station',
    n: 1,
    pattern: [
      'iri',
      'ici',
      'iii',
    ],
    legend: {
      i: 'mineclaude:iron_ingot',
      r: 'mineclaude:dye_red',
      c: 'mineclaude:crafting_table',
    },
  });

  ctx.recipes.add({
    out: 'logisticspipes:power_junction',
    n: 1,
    pattern: [
      'igi',
      'gdg',
      'igi',
    ],
    legend: {
      i: 'mineclaude:iron_ingot',
      g: 'mineclaude:gold_ingot',
      d: 'mineclaude:diamond',
    },
  });

  ctx.recipes.add({
    out: 'logisticspipes:crafting_table',
    n: 1,
    pattern: [
      ' c ',
      'ipi',
      ' i ',
    ],
    legend: {
      c: 'mineclaude:crafting_table',
      p: 'logisticspipes:pipe_basic',
      i: 'mineclaude:iron_ingot',
    },
  });

  ctx.recipes.add({
    out: 'logisticspipes:frame',
    n: 4,
    pattern: [
      'isi',
      's s',
      'isi',
    ],
    legend: {
      i: 'mineclaude:iron_ingot',
      s: 'mineclaude:stone',
    },
  });

  // Tools & Items
  ctx.recipes.add({
    out: 'logisticspipes:pipe_controller',
    n: 1,
    pattern: [
      ' i ',
      ' si',
      's  ',
    ],
    legend: {
      i: 'mineclaude:iron_ingot',
      s: 'mineclaude:stick',
    },
  });

  ctx.recipes.add({
    out: 'logisticspipes:pipe_manager',
    n: 1,
    in: [
      ['logisticspipes:pipe_controller', 1],
      ['logisticspipes:chip_advanced', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:remote_orderer',
    n: 1,
    pattern: [
      ' g ',
      'gcg',
      ' g ',
    ],
    legend: {
      g: 'mineclaude:gold_ingot',
      c: 'logisticspipes:chip_fpGA'.toLowerCase(),
    },
  });

  ctx.recipes.add({
    out: 'logisticspipes:disk',
    n: 4,
    in: [
      ['mineclaude:iron_ingot', 1],
      ['mineclaude:dye_red', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:guide_book',
    n: 1,
    in: [
      ['mineclaude:coal', 1],
      ['logisticspipes:pipe_transport_basic', 1],
    ],
  });

  // Raw chips -> Solder into completed chips (also available via standard table)
  ctx.recipes.add({
    out: 'logisticspipes:chip_basic_raw',
    n: 2,
    in: [
      ['mineclaude:iron_ingot', 1],
      ['mineclaude:dye_red', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:chip_basic',
    n: 1,
    in: [
      ['logisticspipes:chip_basic_raw', 1],
      ['mineclaude:gold_ingot', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:chip_advanced_raw',
    n: 2,
    in: [
      ['mineclaude:gold_ingot', 1],
      ['mineclaude:dye_red', 2],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:chip_advanced',
    n: 1,
    in: [
      ['logisticspipes:chip_advanced_raw', 1],
      ['mineclaude:diamond', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:chip_fpga_raw',
    n: 1,
    in: [
      ['mineclaude:diamond', 1],
      ['mineclaude:dye_red', 4],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:chip_fpga',
    n: 1,
    in: [
      ['logisticspipes:chip_fpga_raw', 1],
      ['mineclaude:gold_ingot', 2],
    ],
  });

  // Modules
  ctx.recipes.add({
    out: 'logisticspipes:module_blank',
    n: 4,
    pattern: [
      'iri',
      'rpr',
      'iri',
    ],
    legend: {
      i: 'mineclaude:iron_ingot',
      r: 'mineclaude:dye_red',
      p: 'mineclaude:gold_ingot',
    },
  });

  ctx.recipes.add({
    out: 'logisticspipes:module_item_sink',
    n: 1,
    in: [
      ['logisticspipes:module_blank', 1],
      ['mineclaude:chest', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:module_extractor',
    n: 1,
    in: [
      ['logisticspipes:module_blank', 1],
      ['mineclaude:iron_ingot', 2],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:module_provider',
    n: 1,
    in: [
      ['logisticspipes:module_blank', 1],
      ['logisticspipes:chip_basic', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:module_active_supplier',
    n: 1,
    in: [
      ['logisticspipes:module_blank', 1],
      ['logisticspipes:chip_advanced', 1],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:module_quick_sort',
    n: 1,
    in: [
      ['logisticspipes:module_blank', 1],
      ['mineclaude:dye_blue', 2],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:module_terminus',
    n: 1,
    in: [
      ['logisticspipes:module_blank', 1],
      ['mineclaude:cobblestone', 4],
    ],
  });

  // Upgrades
  ctx.recipes.add({
    out: 'logisticspipes:upgrade_speed',
    n: 1,
    in: [
      ['mineclaude:gold_ingot', 2],
      ['mineclaude:dye_red', 2],
    ],
  });

  ctx.recipes.add({
    out: 'logisticspipes:upgrade_item_extraction',
    n: 1,
    in: [
      ['mineclaude:iron_ingot', 2],
      ['mineclaude:cobblestone', 2],
    ],
  });
}
