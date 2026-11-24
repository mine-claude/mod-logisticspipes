// @ts-check
import { BlockType } from './mineclaude-sdk.js';
import { tickSupplierPipe, pipeChanged } from './network-router.ts';
import { openPipeScreen } from './pipe-screen.ts';
import { pipeConnections } from './pipe-shape.ts';
import { casing, machineGeometry, CRAFTING_PARTS, SOLDERING_PARTS, JUNCTION_PARTS } from './machine-shape.ts';
import { craftingTableModel, solderingStationModel, powerJunctionModel, frameModel } from './machine-model.ts';

/**
 * The data of a pipe: its own keys plus `transit`, the trip of the item passing through it (pipe-transit.js). Only
 * `transit` goes to the browsers, where client/pipe-renderer.js animates it.
 * @param {Record<string, 'number' | 'boolean' | 'string'>} [schema]
 * @param {Record<string, number | boolean | string>} [defaults]
 */
function pipeData(schema = {}, defaults = {}) {
  return { schema: { ...schema, transit: /** @type {const} */ ('string') }, default: { ...defaults, transit: '' }, client: ['transit'] };
}

// Base Pipe: a framed glass tube (pipe-shape.js) with the core of a routed pipe. The world model samples
// `<pipe>_body` (pipe-body.js) where the bars and the core are, and those texels are opaque.
class BasePipeBlock extends BlockType {
  solid = true;
  hardness = 0.5;
  tool = 'pickaxe';
  connections = pipeConnections(true);
  data = pipeData();

  // a block next to this pipe changed (a pipe, a chest placed or broken): this pipe is read again on the next walk
  onNeighborUpdate(e) { pipeChanged(e.world, e.pos, e.changes); }

  /** @param {import('../../packages/cli/types/mineclaude-mod').BlockConnectEvent} e */
  canConnect(e) {
    if (e.connects) return true;
    const name = e.neighbor.state?.block;
    if (!name) return false;
    if (name.startsWith('logisticspipes:')) return true;
    return e.world.getItemStorage(e.neighbor.pos) !== null;
  }
}

export class PipeTransportBasic extends BasePipeBlock {
  name = 'Unrouted Transport Pipe';
  tiles = { all: 'logisticspipes:pipe_transport_basic_body' };
  connections = pipeConnections(false);
}

export class PipeBasic extends BasePipeBlock {
  name = 'Basic Logistics Pipe';
  tiles = { all: 'logisticspipes:pipe_basic_body' };
  data = pipeData({ is_default_route: 'boolean' }, { is_default_route: false }); // off by default, as in the original

  onInteract(e) { return openPipeScreen(e); }
}

export class PipeProvider extends BasePipeBlock {
  name = 'Provider Logistics Pipe';
  tiles = { all: 'logisticspipes:pipe_provider_body' };
  data = pipeData({ max_extract: 'number', filters: 'string', exclude: 'boolean' }, { max_extract: 16, filters: '', exclude: true });

  onInteract(e) { return openPipeScreen(e); }
}

export class PipeProviderMk2 extends BasePipeBlock {
  name = 'Provider Logistics Pipe Mk2';
  tiles = { all: 'logisticspipes:pipe_provider_mk2_body' };
  data = pipeData({ max_extract: 'number', filters: 'string', exclude: 'boolean' }, { max_extract: 64, filters: '', exclude: true });

  onInteract(e) { return openPipeScreen(e); }
}

export class PipeRequest extends BasePipeBlock {
  name = 'Request Logistics Pipe';
  tiles = { all: 'logisticspipes:pipe_request_body' };
  data = pipeData({ last_order: 'string' }, { last_order: '' });

  onInteract(e) { return openPipeScreen(e); }
}

export class PipeRequestMk2 extends BasePipeBlock {
  name = 'Request Logistics Pipe Mk2';
  tiles = { all: 'logisticspipes:pipe_request_mk2_body' };
  data = pipeData({ last_order: 'string' }, { last_order: '' });

  onInteract(e) { return openPipeScreen(e); }
}

export class PipeSupplier extends BasePipeBlock {
  name = 'Supplier Logistics Pipe';
  tiles = { all: 'logisticspipes:pipe_supplier_body' };
  data = pipeData({ target_item: 'string', target_count: 'number', targets: 'string', supply_mode: 'number' },
    { target_item: '', target_count: 0, targets: '', supply_mode: 0 });

  onEntityTick(e) {
    tickSupplierPipe(e.world, e.pos);
  }

  onInteract(e) { return openPipeScreen(e); }
}

export class PipeCrafting extends BasePipeBlock {
  name = 'Crafting Logistics Pipe';
  tiles = { all: 'logisticspipes:pipe_crafting_body' };
  data = pipeData({ recipe_out: 'string', recipe_count: 'number', recipe_in: 'string' }, { recipe_out: '', recipe_count: 1, recipe_in: '' });

  onInteract(e) { return openPipeScreen(e); }
}

export class PipeCraftingMk2 extends BasePipeBlock {
  name = 'Crafting Logistics Pipe Mk2';
  tiles = { all: 'logisticspipes:pipe_crafting_mk2_body' };
  onInteract(e) { return openPipeScreen(e); }
  data = pipeData({ recipe_out: 'string', recipe_count: 'number', recipe_in: 'string' }, { recipe_out: '', recipe_count: 16, recipe_in: '' });
}

export class PipeCraftingMk3 extends BasePipeBlock {
  name = 'Crafting Logistics Pipe Mk3';
  tiles = { all: 'logisticspipes:pipe_crafting_mk3_body' };
  onInteract(e) { return openPipeScreen(e); }
  data = pipeData({ recipe_out: 'string', recipe_count: 'number', recipe_in: 'string' }, { recipe_out: '', recipe_count: 64, recipe_in: '' });
}

export class PipeSatellite extends BasePipeBlock {
  name = 'Satellite Logistics Pipe';
  tiles = { all: 'logisticspipes:pipe_satellite_body' };
  data = pipeData({ satellite_id: 'string' }, { satellite_id: 'sat_1' });

  onInteract(e) { return openPipeScreen(e); }
}

export class PipeRemoteOrdererBlock extends BasePipeBlock {
  name = 'Remote Orderer Logistics Pipe';
  tiles = { all: 'logisticspipes:pipe_remote_orderer_body' };
  onInteract(e) { return openPipeScreen(e); }
}

// Modular Chassis Pipes
export class PipeChassisMk1 extends BasePipeBlock {
  name = 'Logistics Chassis Mk1';
  tiles = { all: 'logisticspipes:pipe_chassis_mk1_body' };
  inventory = { slots: 1, screen: /** @type {const} */ ('logisticspipes:chassis_screen') };
}

export class PipeChassisMk2 extends BasePipeBlock {
  name = 'Logistics Chassis Mk2';
  tiles = { all: 'logisticspipes:pipe_chassis_mk2_body' };
  inventory = { slots: 2, screen: /** @type {const} */ ('logisticspipes:chassis_screen') };
}

export class PipeChassisMk3 extends BasePipeBlock {
  name = 'Logistics Chassis Mk3';
  tiles = { all: 'logisticspipes:pipe_chassis_mk3_body' };
  inventory = { slots: 3, screen: /** @type {const} */ ('logisticspipes:chassis_screen') };
}

export class PipeChassisMk4 extends BasePipeBlock {
  name = 'Logistics Chassis Mk4';
  tiles = { all: 'logisticspipes:pipe_chassis_mk4_body' };
  inventory = { slots: 4, screen: /** @type {const} */ ('logisticspipes:chassis_screen') };
}

export class PipeChassisMk5 extends BasePipeBlock {
  name = 'Logistics Chassis Mk5';
  tiles = { all: 'logisticspipes:pipe_chassis_mk5_body' };
  inventory = { slots: 8, screen: /** @type {const} */ ('logisticspipes:chassis_screen') };
}

// Solid Machines. They are not cubes: the casing is the shell of machine-shape.js (sunk panels on five sides) and each
// one carries its own part on the lid, so the silhouette alone tells them apart. The ones with a front turn with the
// player (`facing` bound to the state, chosen at placement) — the part on the lid is what shows which way they look.
//
// `geometry` is only the silhouette now (physics, mira, support, occlusion); what is drawn is the declared `model` of
// machine-model.js, with a texture and a UV rectangle per face (docs/sdk-block-models.md).

// Workbench: the lid holds a tray whose rim is open at the front, where the player stands.
export class CraftingTableBlock extends BlockType {
  name = 'Logistics Crafting Table';
  solid = true;
  hardness = 2.0;
  tool = 'axe';
  tiles = { all: 'logisticspipes:machine_plate', top: 'logisticspipes:crafting_tray', front: 'logisticspipes:crafting_table_front' };
  inventory = { slots: 18, screen: /** @type {const} */ ('logisticspipes:crafting_table_screen') };
  facing = /** @type {const} */ ('n');
  geometry = machineGeometry(casing(15, CRAFTING_PARTS));
  model = craftingTableModel();
  /** @type {import('../../packages/cli/types/mineclaude-mod').BlockStateDeclaration} */
  states = {
    version: 1,
    properties: { facing: ['n', 'e', 's', 'w'] },
    default: { facing: 'n' },
    bind: { facing: 'facing' },
    placement: { facing: 'horizontal_facing' },
  };
}

// The sloping gantry over the bench says which way this one looks; while it is working the head comes down onto the
// bench, the solder tile and the readout light up and the block gives off light.
export class SolderingStationBlock extends BlockType {
  name = 'Soldering Station';
  solid = true;
  hardness = 2.5;
  tool = 'pickaxe';
  tiles = { all: 'logisticspipes:machine_plate', top: 'logisticspipes:machine_lid', front: 'logisticspipes:soldering_station_front' };
  inventory = { slots: 4, screen: /** @type {const} */ ('logisticspipes:soldering_station_screen') };
  facing = /** @type {const} */ ('n');
  geometry = machineGeometry(casing(13, SOLDERING_PARTS));
  model = solderingStationModel();
  /** @type {import('../../packages/cli/types/mineclaude-mod').BlockStateDeclaration} */
  states = {
    version: 1,
    properties: { facing: ['n', 'e', 's', 'w'], active: 'boolean' },
    default: { facing: 'n', active: false },
    bind: { facing: 'facing' },
    placement: { facing: 'horizontal_facing' },
    variants: [{ when: { active: true }, props: {
      model: solderingStationModel(true),
      tiles: { all: 'logisticspipes:machine_plate', top: 'logisticspipes:machine_lid', front: 'logisticspipes:soldering_station_front_active' },
      light: 7,
    } }],
  };

  // The head is down and the station lit while there is something in it to solder.
  onEntityTick(e) {
    const active = (e.world.getItemStorage(e.pos)?.list() ?? []).length > 0;
    if (e.world.getBlockState(e.pos)?.properties.active !== active) e.world.setBlockState(e.pos, { active });
  }
}

// The transformer drum sits at the back of the lid and the terminal at the front.
export class PowerJunctionBlock extends BlockType {
  name = 'Logistics Power Junction';
  solid = true;
  hardness = 3.0;
  tool = 'pickaxe';
  tiles = { all: 'logisticspipes:machine_plate', top: 'logisticspipes:machine_lid', front: 'logisticspipes:power_junction_front' };
  facing = /** @type {const} */ ('n');
  geometry = machineGeometry(casing(13, JUNCTION_PARTS));
  model = powerJunctionModel();
  /** @type {import('../../packages/cli/types/mineclaude-mod').BlockStateDeclaration} */
  states = {
    version: 1,
    properties: { facing: ['n', 'e', 's', 'w'] },
    default: { facing: 'n' },
    bind: { facing: 'facing' },
    placement: { facing: 'horizontal_facing' },
  };
  data = {
    schema: /** @type {const} */ ({ energy: 'number', max_energy: 'number' }),
    default: { energy: 10000, max_energy: 10000 },
  };

  onInteract(e) {
    e.player.playSound('logisticspipes:wrench');
    e.player.message(`§6[Logistics Pipes]§r Junção de Energia: §a${e.data.energy} / ${e.data.max_energy} LP Energy§r`);
    return true;
  }
}

// The bare casing the other machines are built on: the same shell, with nothing on the lid and no front.
export class FrameBlock extends BlockType {
  name = 'Logistics Block Frame';
  solid = true;
  hardness = 1.5;
  tool = 'pickaxe';
  tiles = { all: 'logisticspipes:machine_plate', top: 'logisticspipes:machine_lid' };
  geometry = machineGeometry(casing());
  model = frameModel();
}

/**
 * Registers all blocks of the Logistics Pipes mod.
 * @param {import('../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx
 */
export function registerBlocks(ctx) {
  // Pipes
  ctx.blocks.register('pipe_transport_basic', new PipeTransportBasic());
  ctx.blocks.register('pipe_basic', new PipeBasic());
  ctx.blocks.register('pipe_provider', new PipeProvider());
  ctx.blocks.register('pipe_provider_mk2', new PipeProviderMk2());
  ctx.blocks.register('pipe_request', new PipeRequest());
  ctx.blocks.register('pipe_request_mk2', new PipeRequestMk2());
  ctx.blocks.register('pipe_supplier', new PipeSupplier());
  ctx.blocks.register('pipe_crafting', new PipeCrafting());
  ctx.blocks.register('pipe_crafting_mk2', new PipeCraftingMk2());
  ctx.blocks.register('pipe_crafting_mk3', new PipeCraftingMk3());
  ctx.blocks.register('pipe_satellite', new PipeSatellite());
  ctx.blocks.register('pipe_remote_orderer', new PipeRemoteOrdererBlock());
  ctx.blocks.register('pipe_chassis_mk1', new PipeChassisMk1());
  ctx.blocks.register('pipe_chassis_mk2', new PipeChassisMk2());
  ctx.blocks.register('pipe_chassis_mk3', new PipeChassisMk3());
  ctx.blocks.register('pipe_chassis_mk4', new PipeChassisMk4());
  ctx.blocks.register('pipe_chassis_mk5', new PipeChassisMk5());

  // Solid Machines
  ctx.blocks.register('crafting_table', new CraftingTableBlock());
  ctx.blocks.register('soldering_station', new SolderingStationBlock());
  ctx.blocks.register('power_junction', new PowerJunctionBlock());
  ctx.blocks.register('frame', new FrameBlock());
}
