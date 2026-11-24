// @ts-check
import { ItemType } from './mineclaude-sdk.js';
import { listNetworkItems, isPipe } from './network-router.ts';
import { inspectNetwork, nearestPipe, reportLines } from './client/inspect.ts';
import { PIPE_SCREEN } from './pipe-screen.ts';
import { SCREEN_TITLES } from './lp-config.ts';

// Base class for Logistics Pipes items
class LPItem extends ItemType {
  group = 'logisticspipes:logistics';
}

// Tools
// The two tools only point: the browser walks the pipes it already has and shows the report (client/inspect.ts), so a
// click costs the server one small message (lp_inspect) instead of a scan of the whole network.
/** @param {any} e @param {'controller' | 'manager'} k @param {{ x: number, y: number, z: number } | null} pos */
function inspect(e, k, pos) {
  e.player.playSound?.('logisticspipes:wrench');
  if (inspectSink) { inspectSink(e.player, { k, p: pos ? [pos.x, pos.y, pos.z] : null }); return true; }
  // no server sending it (tests, tools): the same report, computed here and written in the chat
  const getBlock = (/** @type {any} */ p) => e.world.getBlock(p);
  const at = pos ?? (e.player?.pos ? nearestPipe(getBlock, e.player.pos) : null);
  const r = at ? inspectNetwork(getBlock, at) : null;
  if (!r) { e.player.message('§c[Logistics Pipes] Mire em um cano da rede para diagnosticar.'); return false; }
  for (const line of reportLines(k, at, r)) e.player.message(line);
  return true;
}
/** @type {((player: any, msg: any) => void) | null} */
let inspectSink = null;
/** The server sets how lp_inspect is sent (server/logic.ts). @param {((player: any, msg: any) => void) | null} fn */
export function setInspectSink(fn) { inspectSink = fn; }

export class PipeController extends LPItem {
  name = 'Pipe Controller';
  icon = 'logisticspipes:pipe_controller';
  stack = 1;
  lore = ['Ferramenta de configuração de canos', 'Clique direito num cano para inspecionar e configurar'];

  onUse(e) {
    if (e.target?.type !== 'block' || !isPipe(e.world.getBlock(e.target.pos))) return false;
    return inspect(e, 'controller', e.target.pos);
  }
}

export class PipeManager extends LPItem {
  name = 'Pipe Manager';
  icon = 'logisticspipes:pipe_manager';
  stack = 1;
  lore = ['Gerenciador de rede logística', 'Exibe topologia e estatísticas completas do grafo de canos'];

  // aimed at a pipe: that network; else the browser looks for the nearest pipe around the player
  onUse(e) { return inspect(e, 'manager', e.target?.type === 'block' && isPipe(e.world.getBlock(e.target.pos)) ? e.target.pos : null); }
}

export class RemoteOrderer extends LPItem {
  name = 'Remote Orderer';
  icon = 'logisticspipes:remote_orderer';
  stack = 1;
  lore = ['Solicitador remoto de itens', 'Clique direito para listar estoque e pedir itens de qualquer lugar'];

  onUse(e) {
    const pPos = { x: Math.floor(e.player.pos.x), y: Math.floor(e.player.pos.y), z: Math.floor(e.player.pos.z) };
    let foundPipePos = null;

    // Scan a 7x7x7 area around player for a pipe
    for (let dy = -3; dy <= 3 && !foundPipePos; dy++) {
      for (let dx = -5; dx <= 5 && !foundPipePos; dx++) {
        for (let dz = -5; dz <= 5 && !foundPipePos; dz++) {
          const testPos = { x: pPos.x + dx, y: pPos.y + dy, z: pPos.z + dz };
          if (isPipe(e.world.getBlock(testPos))) {
            foundPipePos = testPos;
          }
        }
      }
    }

    if (!foundPipePos) {
      e.player.message('§c[Remote Orderer] Sinal fraco: aproxime-se de um cano da rede logística (raio de 5 blocos).');
      return false;
    }

    e.player.playSound('logisticspipes:request_ping');
    // the orderer screen (client/lp-screens.ts) on the pipe it found; the chat listing below is the fallback
    if (typeof e.player.openScreen === 'function' && e.player.openScreen(PIPE_SCREEN, {
      title: SCREEN_TITLES.orderer, data: { k: 'orderer', p: [foundPipePos.x, foundPipePos.y, foundPipePos.z], remote: true },
    })) return true;
    const { items } = listNetworkItems(e.world, foundPipePos);
    if (items.size === 0) {
      e.player.message('§6[Remote Orderer]§r Conectado à rede, mas não há itens armazenados nos provedores.');
      return true;
    }

    e.player.message(`§6=== Catálogo do Remote Orderer (${items.size} itens disponíveis) ===§r`);
    let count = 0;
    for (const [item, qty] of items.entries()) {
      e.player.message(` • §b${item}§r: §e${qty}x§r`);
      if (++count >= 8) {
        e.player.message(` ...e mais ${items.size - 8} itens.`);
        break;
      }
    }
    e.player.message(' §7Dica: Peça qualquer um via §e/lp request <item> [qtd]§r');
    return true;
  }
}

export class LogisticsDisk extends LPItem {
  name = 'Logistics Disk';
  icon = 'logisticspipes:disk';
  stack = 16;
  lore = ['Disco de dados para armazenar ordens e macros de requisição'];
}

export class GuideBook extends LPItem {
  name = "Logistics Pipes' Guide Book";
  icon = 'logisticspipes:guide_book';
  stack = 1;
  lore = ['Manual de instruções sobre redes, canos, módulos e automação', 'Clique direito para abrir o sumário'];

  onUse(e) {
    e.player.playSound('logisticspipes:wrench');
    e.player.message('§6========== GUIA DO LOGISTICS PIPES ==========§r');
    e.player.message('§e1. Canos de Transporte:§r Use §bpipe_transport_basic§r para interligar baús e estações.');
    e.player.message('§e2. Provedores:§r Coloque §bpipe_provider§r encostado num baú para torná-lo fonte de itens.');
    e.player.message('§e3. Pedidos:§r Conecte um §bpipe_request§r ou use o §bRemote Orderer§r e §e/lp request§r.');
    e.player.message('§e4. Abastecimento:§r O §bpipe_supplier§r mantém o baú sempre com o estoque mínimo.');
    e.player.message('§e5. Estação de Solda:§r Use a §bsoldering_station§r para transformar chips brutos em chips ativos.');
    e.player.message('§e6. Ferramentas:§r O §bPipe Controller§r inspeciona nós e conexões.');
    e.player.message('§6==============================================§r');
    return true;
  }
}

export class BrokenItem extends LPItem {
  name = 'Logistics Broken Item';
  icon = 'logisticspipes:broken_item';
  stack = 64;
  lore = ['Sucata inútil de cano quebrado'];
}

// Chips
export class ChipBasicRaw extends LPItem {
  name = 'Raw Basic Chip';
  icon = 'logisticspipes:chip_basic_raw';
  stack = 64;
}

export class ChipBasic extends LPItem {
  name = 'Basic Chip';
  icon = 'logisticspipes:chip_basic';
  stack = 64;
  lore = ['Chip lógico básico para canos provedores e estações simples'];
}

export class ChipAdvancedRaw extends LPItem {
  name = 'Raw Advanced Chip';
  icon = 'logisticspipes:chip_advanced_raw';
  stack = 64;
}

export class ChipAdvanced extends LPItem {
  name = 'Advanced Chip';
  icon = 'logisticspipes:chip_advanced';
  stack = 64;
  lore = ['Chip lógico avançado para canos de requisição e chassis'];
}

export class ChipFPGARaw extends LPItem {
  name = 'Raw FPGA';
  icon = 'logisticspipes:chip_fpga_raw';
  stack = 64;
}

export class ChipFPGA extends LPItem {
  name = 'FPGA';
  icon = 'logisticspipes:chip_fpga';
  stack = 64;
  lore = ['Matriz de portas programáveis para roteamento e alta velocidade'];
}

// Modules
export class ModuleBlank extends LPItem {
  name = 'Blank Module';
  icon = 'logisticspipes:module_blank';
  stack = 64;
  lore = ['Base virgem para criar módulos lógicos de chassis'];
}

export class ModuleItemSink extends LPItem {
  name = 'ItemSink Module';
  icon = 'logisticspipes:module_item_sink';
  stack = 16;
  lore = ['Direciona itens específicos para o baú conectado'];
}

export class ModuleItemSinkPolymorphic extends LPItem {
  name = 'Polymorphic ItemSink Module';
  icon = 'logisticspipes:module_item_sink_polymorphic';
  stack = 16;
  lore = ['Aceita itens que já estejam presentes no baú'];
}

export class ModulePassiveSupplier extends LPItem {
  name = 'Passive Supplier Module';
  icon = 'logisticspipes:module_passive_supplier';
  stack = 16;
  lore = ['Mantém o inventário abastecido passivamente'];
}

export class ModuleActiveSupplier extends LPItem {
  name = 'Active Supplier Module';
  icon = 'logisticspipes:module_active_supplier';
  stack = 16;
  lore = ['Requisita ativamente itens da rede para manter estoque'];
}

export class ModuleExtractor extends LPItem {
  name = 'Extractor Module';
  icon = 'logisticspipes:module_extractor';
  stack = 16;
  lore = ['Extrai itens do baú e injeta na rede de canos'];
}

export class ModuleExtractorMk2 extends LPItem {
  name = 'Extractor MK2 Module';
  icon = 'logisticspipes:module_extractor_mk2';
  stack = 16;
  lore = ['Extrai itens mais rapidamente em lotes maiores'];
}

export class ModuleExtractorMk3 extends LPItem {
  name = 'Extractor MK3 Module';
  icon = 'logisticspipes:module_extractor_mk3';
  stack = 16;
  lore = ['Extrai pilhas completas em altíssima velocidade'];
}

export class ModuleProvider extends LPItem {
  name = 'Provider Module';
  icon = 'logisticspipes:module_provider';
  stack = 16;
  lore = ['Permite que o chassis atue como provedor de itens'];
}

export class ModuleProviderMk2 extends LPItem {
  name = 'Provider Module MK2';
  icon = 'logisticspipes:module_provider_mk2';
  stack = 16;
  lore = ['Fornece pilhas inteiras sob demanda'];
}

export class ModuleQuickSort extends LPItem {
  name = 'QuickSort Module';
  icon = 'logisticspipes:module_quick_sort';
  stack = 16;
  lore = ['Esvazia rapidamente itens e os distribui para os sinks corretos'];
}

export class ModuleTerminus extends LPItem {
  name = 'Terminus Module';
  icon = 'logisticspipes:module_terminus';
  stack = 16;
  lore = ['Destino final de descarte / overflow para itens sem rota'];
}

export class ModuleCrafter extends LPItem {
  name = 'Crafting Module';
  icon = 'logisticspipes:module_crafter';
  stack = 16;
  lore = ['Habilita auto-crafting dentro de um cano chassis'];
}

export class ModuleCrafterMk2 extends LPItem {
  name = 'Crafting Module MK2';
  icon = 'logisticspipes:module_crafter_mk2';
  stack = 16;
  lore = ['Auto-crafting em lotes médios'];
}

export class ModuleCrafterMk3 extends LPItem {
  name = 'Crafting Module MK3';
  icon = 'logisticspipes:module_crafter_mk3';
  stack = 16;
  lore = ['Auto-crafting em lotes de stacks'];
}

// Upgrades
export class UpgradeSpeed extends LPItem {
  name = 'Item Speed Upgrade';
  icon = 'logisticspipes:upgrade_speed';
  stack = 16;
  lore = ['Aumenta a velocidade de trânsito dos itens nos canos'];
}

export class UpgradeItemExtraction extends LPItem {
  name = 'Item Extraction Upgrade';
  icon = 'logisticspipes:upgrade_item_extraction';
  stack = 16;
  lore = ['Aumenta a quantidade extraída por tick de extração'];
}

export class UpgradeItemStackExtraction extends LPItem {
  name = 'ItemStack Extraction Upgrade';
  icon = 'logisticspipes:upgrade_item_stack_extraction';
  stack = 16;
  lore = ['Permite extrair stacks completas'];
}

export class UpgradeSneaky extends LPItem {
  /** @param {string} dir */
  constructor(dir = 'UP') {
    super();
    this.name = `Sneaky Upgrade (${dir})`;
    this.lore = [`Acessa a face ${dir} do inventário adjacente`];
  }
  icon = 'logisticspipes:upgrade_sneaky';
  stack = 16;
}

/**
 * Registers all items of the Logistics Pipes mod.
 * @param {import('../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx
 */
export function registerItems(ctx) {
  // Creative tab
  ctx.items.group({ id: 'logistics', name: 'Logistics Pipes', icon: 'logisticspipes:pipe_basic', order: 85 });

  // Tools
  ctx.items.register('pipe_controller', new PipeController());
  ctx.items.register('pipe_manager', new PipeManager());
  ctx.items.register('remote_orderer', new RemoteOrderer());
  ctx.items.register('disk', new LogisticsDisk());
  ctx.items.register('guide_book', new GuideBook());
  ctx.items.register('broken_item', new BrokenItem());

  // Chips
  ctx.items.register('chip_basic_raw', new ChipBasicRaw());
  ctx.items.register('chip_basic', new ChipBasic());
  ctx.items.register('chip_advanced_raw', new ChipAdvancedRaw());
  ctx.items.register('chip_advanced', new ChipAdvanced());
  ctx.items.register('chip_fpga_raw', new ChipFPGARaw());
  ctx.items.register('chip_fpga', new ChipFPGA());

  // Modules
  ctx.items.register('module_blank', new ModuleBlank());
  ctx.items.register('module_item_sink', new ModuleItemSink());
  ctx.items.register('module_item_sink_polymorphic', new ModuleItemSinkPolymorphic());
  ctx.items.register('module_passive_supplier', new ModulePassiveSupplier());
  ctx.items.register('module_active_supplier', new ModuleActiveSupplier());
  ctx.items.register('module_extractor', new ModuleExtractor());
  ctx.items.register('module_extractor_mk2', new ModuleExtractorMk2());
  ctx.items.register('module_extractor_mk3', new ModuleExtractorMk3());
  ctx.items.register('module_provider', new ModuleProvider());
  ctx.items.register('module_provider_mk2', new ModuleProviderMk2());
  ctx.items.register('module_quick_sort', new ModuleQuickSort());
  ctx.items.register('module_terminus', new ModuleTerminus());
  ctx.items.register('module_crafter', new ModuleCrafter());
  ctx.items.register('module_crafter_mk2', new ModuleCrafterMk2());
  ctx.items.register('module_crafter_mk3', new ModuleCrafterMk3());

  // Upgrades
  ctx.items.register('upgrade_speed', new UpgradeSpeed());
  ctx.items.register('upgrade_item_extraction', new UpgradeItemExtraction());
  ctx.items.register('upgrade_item_stack_extraction', new UpgradeItemStackExtraction());
  ctx.items.register('upgrade_sneaky_up', new UpgradeSneaky('UP'));
  ctx.items.register('upgrade_sneaky_down', new UpgradeSneaky('DOWN'));
  ctx.items.register('upgrade_sneaky_north', new UpgradeSneaky('NORTH'));
  ctx.items.register('upgrade_sneaky_south', new UpgradeSneaky('SOUTH'));
  ctx.items.register('upgrade_sneaky_east', new UpgradeSneaky('EAST'));
  ctx.items.register('upgrade_sneaky_west', new UpgradeSneaky('WEST'));
}
