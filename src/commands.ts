// @ts-check
import { CommandType } from './mineclaude-sdk.js';
import { listNetworkItems, fulfillRequest, scanNetwork, isPipe } from './network-router.ts';

export class LPKitCommand extends CommandType {
  admin = false;
  help = '/lpkit — recebe um kit inicial de Logistics Pipes para testes';

  run(e) {
    e.player.give('logisticspipes:pipe_transport_basic', 32);
    e.player.give('logisticspipes:pipe_basic', 8);
    e.player.give('logisticspipes:pipe_provider', 4);
    e.player.give('logisticspipes:pipe_request', 2);
    e.player.give('logisticspipes:pipe_supplier', 2);
    e.player.give('logisticspipes:pipe_chassis_mk2', 2);
    e.player.give('logisticspipes:pipe_controller', 1);
    e.player.give('logisticspipes:module_item_sink', 2);
    e.player.give('logisticspipes:module_extractor', 2);
    e.player.give('logisticspipes:chip_basic', 8);
    e.player.give('logisticspipes:chip_advanced', 4);
    e.player.give('logisticspipes:chip_fpga', 2);
    e.player.give('logisticspipes:soldering_station', 1);
    e.player.give('logisticspipes:crafting_table', 1);
    e.player.give('logisticspipes:guide_book', 1);
    e.player.playSound('logisticspipes:wrench');
    e.reply('§6[Logistics Pipes]§r Kit inicial entregue no seu inventário!');
  }
}

export class LPCommand extends CommandType {
  admin = false;
  help = '/lp <status|list|request|help> [item] [qtd] — Comandos de automação do Logistics Pipes';

  run(e) {
    const sub = (e.args[0] || 'help').toLowerCase();

    // Helper: find nearest pipe around player
    const pPos = { x: Math.floor(e.player.pos.x), y: Math.floor(e.player.pos.y), z: Math.floor(e.player.pos.z) };
    let foundPipePos = null;

    // Scan a 7x7x7 area around player for a pipe
    for (let dy = -2; dy <= 2 && !foundPipePos; dy++) {
      for (let dx = -3; dx <= 3 && !foundPipePos; dx++) {
        for (let dz = -3; dz <= 3 && !foundPipePos; dz++) {
          const testPos = { x: pPos.x + dx, y: pPos.y + dy, z: pPos.z + dz };
          if (isPipe(e.world.getBlock(testPos))) {
            foundPipePos = testPos;
          }
        }
      }
    }

    if (sub === 'help') {
      e.reply('§6=== Logistics Pipes - Comandos ===§r');
      e.reply('§e/lpkit§r - Recebe kit inicial com canos, ferramentas e chips');
      e.reply('§e/lp status§r - Exibe estado da rede de canos mais próxima');
      e.reply('§e/lp list§r - Lista itens disponíveis em todos os baús provedores da rede');
      e.reply('§e/lp request <item> [qtd]§r - Pede itens da rede para você');
      return;
    }

    if (!foundPipePos) {
      e.reply('§c[Logistics Pipes] Nenhum cano encontrado próximo a você (raio de 3 blocos).');
      return;
    }

    if (sub === 'status') {
      const net = scanNetwork(e.world, foundPipePos);
      if (!net) {
        e.reply('§c[Logistics Pipes] Erro ao analisar rede.');
        return;
      }
      e.reply('§6=== Logistics Network Status ===§r');
      e.reply(`§bCanos conectados:§r ${net.pipes.size}`);
      e.reply(`§bProvedores (Provider Pipes):§r ${net.providers.length}`);
      e.reply(`§bDestinos (Sinks/Basic):§r ${net.sinks.length}`);
      e.reply(`§bAbastecedores (Suppliers):§r ${net.suppliers.length}`);
      e.reply(`§bCanos de Crafting:§r ${net.craftingPipes.length}`);
      e.reply(`§bChassis Modulares:§r ${net.chassisPipes.length}`);
      return;
    }

    if (sub === 'list') {
      const { items, net } = listNetworkItems(e.world, foundPipePos);
      if (!net || items.size === 0) {
        e.reply('§6[Logistics Pipes]§r Rede vazia ou sem itens em provedores.');
        return;
      }
      e.reply(`§6=== Itens na Rede (${items.size} tipos) ===§r`);
      for (const [it, count] of items.entries()) {
        e.reply(` - §b${it}§r: §e${count}§r`);
      }
      return;
    }

    if (sub === 'request') {
      const rawItem = e.args[1];
      if (!rawItem) {
        e.reply('§cUso: /lp request <nome_do_item> [quantidade]');
        return;
      }

      const item = rawItem.includes(':') ? rawItem : `mineclaude:${rawItem}`;
      const count = Math.max(1, Math.min(256, parseInt(e.args[2], 10) || 1));

      const res = fulfillRequest(e.world, foundPipePos, item, count, e.player);
      if (!res.success) {
        e.reply(`§c[Logistics Pipes] ${res.message}`);
      }
      return;
    }

    e.reply(`§cSubcomando desconhecido: "${sub}". Digite /lp help`);
  }
}

/**
 * Registers commands for the Logistics Pipes mod.
 * @param {import('../../packages/cli/types/mineclaude-mod.d.ts').ModContext} ctx
 */
export function registerCommands(ctx) {
  ctx.commands.register('lp', new LPCommand());
  ctx.commands.register('lpkit', new LPKitCommand());
}
