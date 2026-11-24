// @ts-check
// The pipes' screens, drawn in the browser with the game's pixel kit (frame.ui). One screen type serves every pipe
// (logisticspipes:pipe_screen, opened by pipe-screen.ts with data { k: kind, p: [x, y, z] }); `k` picks what is drawn.
// The controls follow the original mod's GUIs, the art and code are ours:
//   orderer    the request pipe's catalogue: search, item grid, amount (-64 -10 -1 +1 +10 +64) and "Pedir"
//   provider   nine filter slots and include / exclude
//   supplier   nine targets with an amount each, and the request mode (partial / complete)
//   satellite  the satellite's name
//   crafting   the recipe: nine inputs, the output and how many it makes
//   sink       the basic pipe's default route
// Filter / target / recipe slots are GHOST copies (the original's dummy slots): clicking one with an item in hand
// copies the item, nothing leaves the player. Every change goes to the server (server/logic.ts, `lp_set`), which checks
// it (lp-config.ts) and answers with the settings as saved; the screen draws from that answer.
import { FILTER_SLOTS, SUPPLY_MODES, MAX_TARGET, MAX_RECIPE_COUNT } from '../lp-config.ts';

const S = 18; // slot size
/** @type {Map<string, any>} the last settings the server sent, by pipe position */
const configs = new Map();
/** @type {{ key: string, items: [string, number][], at: number } | null} */
let stock = null;

/** @param {any} p */ const keyOf = (p) => (Array.isArray(p) ? p.join(',') : '');

/** @param {any} ctx */
export function createPipeScreens(ctx) {
  ctx.net.on('lp_cfg', (/** @type {any} */ msg) => { if (msg && Array.isArray(msg.p) && msg.cfg) configs.set(keyOf(msg.p), msg.cfg); });
  ctx.net.on('stock_data', (/** @type {any} */ msg) => {
    if (!msg || !Array.isArray(msg.items)) return;
    stock = { key: keyOf(msg.p), items: msg.items.filter((/** @type {any} */ r) => Array.isArray(r) && typeof r[0] === 'string' && Number.isFinite(r[1])), at: Date.now() };
  });
  return new PipeScreen(ctx);
}

class PipeScreen {
  ctx: any;
  constructor(ctx: any) { this.ctx = ctx; }

  /** @param {any} e */
  onOpen(e) {
    const info = e.data.screenData?.();
    if (!info?.p) return;
    if (info.k === 'orderer') this.ctx.net.send('query_stock', { p: info.p });
    else this.ctx.net.send('lp_get', { p: info.p });
  }

  /** @param {any} info @param {string} key @param {unknown} value @param {number} [index] */
  set(info: any, key: string, value: unknown, index?: number) { this.ctx.net.send('lp_set', { p: info.p, key, value, ...(index !== undefined && { index }) }); }

  /** @param {CanvasRenderingContext2D} _c @param {any} f */
  draw(_c, f) {
    const { ui, data: d, state } = f, info = d.screenData?.() ?? {};
    const size = SIZES[info.k] ?? SIZES.sink;
    const o = ui.center(size.w, size.h);
    ui.hit(0, 0, ui.width, ui.height, { kind: 'outside' });
    ui.hit(o.x, o.y, size.w, size.h, { kind: 'panel' });
    ui.panel(o.x, o.y, size.w, size.h);
    ui.text(d.screenView().title, o.x + 7, o.y + 6);
    const cfg = configs.get(keyOf(info.p));
    const g = { ui, d, state, info, cfg, x: o.x, y: o.y, w: size.w, h: size.h };
    if (info.k === 'orderer') this.orderer(g);
    else if (!cfg) ui.text('Carregando...', o.x + 7, o.y + 22, { color: ui.theme.textDim });
    else if (info.k === 'provider') this.provider(g);
    else if (info.k === 'supplier') this.supplier(g);
    else if (info.k === 'satellite') this.satellite(g);
    else if (info.k === 'crafting') this.crafting(g);
    else this.sink(g);
    if (size.inv) this.playerInventory(g, size.inv);
  }

  // ---- the parts every screen shares --------------------------------------------------------------------------------

  /** the player's 27 + 9 slots; clicking them is the engine's own pick / place @param {any} g @param {number} top */
  playerInventory(g, top) {
    const { ui, d } = g, x0 = g.x + Math.floor((g.w - 9 * S) / 2);
    ui.text('Inventário', x0, g.y + top - 10, { color: ui.theme.textDim });
    const slot = (/** @type {number} */ idx, /** @type {number} */ x, /** @type {number} */ y) =>
      ui.slot(x, y, d.stack(idx), { data: { kind: 'slot', idx }, picked: d.picked() === idx, name: (/** @type {any} */ s) => d.itemName(s.id) });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) slot(9 + r * 9 + c, x0 + c * S, g.y + top + r * S);
    for (let c = 0; c < 9; c++) slot(c, x0 + c * S, g.y + top + 3 * S + 4);
  }

  /**
   * A ghost slot: shows `name` (an item name the server speaks), copies the item in hand on a left click, clears on a
   * right click (or a left click with nothing in hand). `count` draws a number on it.
   * @param {any} g @param {number} x @param {number} y @param {string} name @param {(value: string, ev: any) => void} onSet
   * @param {{ count?: number, tip?: string[] }} [opt]
   */
  ghost(g: any, x: number, y: number, name: string, onSet: (value: string, ev: any) => void, opt: { count?: number, tip?: string[] } = {}) {
    const { ui, d } = g, id = name ? d.itemId(name) : null;
    const stack = id !== null && id !== undefined ? { id, n: opt.count ?? 1 } : null;
    const tip = stack ? [d.itemName(id), ...(opt.tip ?? [])] : opt.tip ?? ['Clique com um item na mão para copiá-lo'];
    ui.slot(x, y, stack, {
      ghost: true, tip,
      onClick: (/** @type {any} */ ev) => {
        const held = d.held?.();
        if (ev.button === 2 || !held) onSet('', ev);
        else onSet(d.itemKey(held.id) ?? '', ev);
        return true;
      },
    });
  }

  // ---- provider: filters and include / exclude ---------------------------------------------------------------------

  /** @param {any} g */
  provider(g) {
    const { ui, cfg, info } = g, x0 = g.x + Math.floor((g.w - FILTER_SLOTS * S) / 2);
    ui.text('Filtros', x0, g.y + 18, { color: ui.theme.textDim });
    for (let i = 0; i < FILTER_SLOTS; i++) this.ghost(g, x0 + i * S, g.y + 28, cfg.filters[i], (v) => this.set(info, 'filter', v, i));
    const label = cfg.exclude ? 'Exclui os listados' : 'Só os listados';
    ui.button(x0, g.y + 50, 96, 14, label, {
      tip: cfg.exclude ? ['Fornece tudo, menos os itens dos filtros', 'Sem filtros: fornece tudo'] : ['Fornece só os itens dos filtros'],
      onClick: () => { this.set(info, 'exclude', !cfg.exclude); return true; },
    });
    ui.text(`Lote máx: ${cfg.max}`, x0 + 104, g.y + 54, { color: ui.theme.textDim });
  }

  // ---- supplier: targets with amounts and the mode -----------------------------------------------------------------

  /** @param {any} g */
  supplier(g) {
    const { ui, cfg, info } = g, x0 = g.x + Math.floor((g.w - FILTER_SLOTS * S) / 2);
    ui.text('Manter no inventário', x0, g.y + 18, { color: ui.theme.textDim });
    const send = (/** @type {number} */ i, /** @type {any} */ t) => this.set(info, 'target', t, i);
    for (let i = 0; i < FILTER_SLOTS; i++) {
      const t = cfg.targets[i], x = x0 + i * S, y = g.y + 28;
      this.ghost(g, x, y, t?.item ?? '', (v, ev) => {
        const held = g.d.held?.();
        if (ev.button === 2) { // right: one less (Shift: ten); at zero the slot is empty
          if (!t) return;
          const n = t.count - (ev.shift ? 10 : 1);
          send(i, n >= 1 ? { item: t.item, count: n } : null);
        } else if (held && v) send(i, { item: v, count: Math.max(1, held.n ?? 1) });
        else if (t) send(i, { item: t.item, count: Math.min(MAX_TARGET, t.count + (ev.shift ? 10 : 1)) }); // empty hand: one more
      }, { count: t?.count, tip: t ? ['Esquerdo: +1  Direito: -1 (Shift: 10)'] : undefined });
    }
    ui.button(x0, g.y + 52, 110, 14, `Modo: ${SUPPLY_MODES[cfg.mode] ?? SUPPLY_MODES[0]}`, {
      tip: cfg.mode === 1 ? ['Completo: só pede quando a rede', 'tem tudo o que falta de uma vez'] : ['Parcial: pede o que a rede tiver,', 'até 16 por vez'],
      onClick: () => { this.set(info, 'mode', (cfg.mode + 1) % SUPPLY_MODES.length); return true; },
    });
  }

  // ---- satellite: its name -----------------------------------------------------------------------------------------

  /** @param {any} g */
  satellite(g) {
    const { ui, cfg, info, state } = g;
    state.nome ??= { value: cfg.name ?? '', cursor: 0, sel: 0 };
    ui.text('Nome do satélite', g.x + 7, g.y + 18, { color: ui.theme.textDim });
    ui.textField({ x: g.x + 7, y: g.y + 28, w: g.w - 60, h: 12, state: state.nome, placeholder: 'sat_1', max: 16 });
    const value = String(state.nome.value), valid = /^[A-Za-z0-9_-]{1,16}$/.test(value);
    ui.button(g.x + g.w - 49, g.y + 27, 42, 14, 'Salvar', {
      disabled: !valid || value === cfg.name,
      tip: valid ? ['Salva o nome'] : ['Letras, números, _ e -, até 16'],
      onClick: () => { this.set(info, 'name', value); return true; },
    });
    ui.text(cfg.name ? `Atual: ${cfg.name}` : 'Sem nome', g.x + 7, g.y + 46, { color: value === cfg.name ? ui.theme.ok : ui.theme.textDim });
  }

  // ---- crafting: the recipe ----------------------------------------------------------------------------------------

  /** @param {any} g */
  crafting(g) {
    const { ui, cfg, info } = g, gx = g.x + 30, gy = g.y + 20;
    for (let i = 0; i < 9; i++) this.ghost(g, gx + (i % 3) * S, gy + Math.floor(i / 3) * S, cfg.inputs[i], (v) => this.set(info, 'input', v, i));
    ui.arrow(gx + 3 * S + 8, gy + S + 4, !!cfg.out);
    this.ghost(g, gx + 3 * S + 30, gy + S, cfg.out, (v) => this.set(info, 'output', v), { count: cfg.count, tip: ['O que a receita produz'] });
    const step = (/** @type {number} */ dlt) => () => { this.set(info, 'count', Math.max(1, Math.min(MAX_RECIPE_COUNT, cfg.count + dlt))); return true; };
    const by = gy + 3 * S + 6, bx = gx + 3 * S + 14;
    ui.button(bx, by, 14, 11, '-', { onClick: step(-1), tip: ['-1'] });
    ui.text(String(cfg.count), bx + 18, by + 2);
    ui.button(bx + 32, by, 14, 11, '+', { onClick: step(1), tip: ['+1'] });
    ui.text('Receita', g.x + 7, gy - 1 + 3 * S + 8, { color: ui.theme.textDim });
  }

  // ---- basic pipe: the default route -------------------------------------------------------------------------------

  /** @param {any} g */
  sink(g) {
    const { ui, cfg, info } = g;
    ui.button(g.x + 7, g.y + 20, g.w - 14, 14, `Rota padrão: ${cfg.def ? 'Sim' : 'Não'}`, {
      tip: ['Rota padrão: recebe o que', 'nenhum outro destino aceita'],
      onClick: () => { this.set(info, 'default', !cfg.def); return true; },
    });
  }

  // ---- orderer: the network's catalogue ----------------------------------------------------------------------------

  /** @param {any} g */
  orderer(g) {
    const { ui, d, state, info } = g, COLS = 10, ROWS = 5;
    state.busca ??= { value: '', cursor: 0, sel: 0 };
    state.lista ??= { scroll: 0 };
    state.qtd ??= 1;
    const mine = stock && stock.key === keyOf(info.p) ? stock : null;
    const q = String(state.busca.value).toLowerCase();
    const rows = (mine?.items ?? [])
      .map(([name, n]) => ({ name, n, id: d.itemId(name) }))
      .filter((r) => r.id !== null && r.id !== undefined)
      .filter((r) => !q || String(d.itemName(r.id)).toLowerCase().includes(q) || r.name.includes(q));
    if (state.pedido && !rows.some((r) => r.name === state.pedido)) state.pedido = null;

    const lx = g.x + 7, lw = COLS * S + 8;
    ui.textField({ x: lx, y: g.y + 16, w: lw, h: 12, state: state.busca, placeholder: 'Buscar...', max: 32, onChange: () => { state.lista.scroll = 0; } });
    ui.list({
      x: lx, y: g.y + 31, w: lw, h: ROWS * S, rowH: S, count: Math.ceil(rows.length / COLS), state: state.lista, data: { kind: 'list' },
      row: (/** @type {number} */ r, /** @type {number} */ rx, /** @type {number} */ ry) => {
        for (let c = 0; c < COLS; c++) {
          const it = rows[r * COLS + c];
          if (!it) break;
          ui.slot(rx + c * S, ry, { id: it.id, n: it.n }, {
            picked: state.pedido === it.name, tip: [d.itemName(it.id), `${it.n} na rede`],
            onClick: () => { state.pedido = it.name; return true; },
          });
        }
      },
    });
    const by = g.y + 31 + ROWS * S + 4;
    if (!mine) ui.text('Consultando a rede...', lx, by, { color: ui.theme.textDim });
    else if (!mine.items.length) ui.text('Nenhum item nos provedores', lx, by, { color: ui.theme.textDim });
    else {
      const sel = rows.find((r) => r.name === state.pedido);
      ui.text(sel ? d.itemName(sel.id) : `${rows.length} itens`, lx, by, { color: sel ? ui.theme.text : ui.theme.textDim });
    }

    // the amount: --- -- - [n] + ++ +++
    const ay = by + 12, add = (/** @type {number} */ k) => () => { state.qtd = Math.max(1, Math.min(256, state.qtd + k)); return true; };
    let x = lx;
    for (const [lbl, k, w] of [['---', -64, 20], ['--', -10, 16], ['-', -1, 12]] as [string, number, number][]) { ui.button(x, ay, w, 11, lbl, { onClick: add(k), tip: [String(k)] }); x += w + 2; }
    const qt = String(state.qtd);
    ui.text(qt, x + Math.floor((24 - ui.textWidth(qt)) / 2), ay + 2);
    x += 26;
    for (const [lbl, k, w] of [['+', 1, 12], ['++', 10, 16], ['+++', 64, 20]] as [string, number, number][]) { ui.button(x, ay, w, 11, lbl, { onClick: add(k), tip: [`+${k}`] }); x += w + 2; }

    ui.button(g.x + g.w - 51, ay - 1, 44, 13, 'Pedir', {
      disabled: !state.pedido, tip: state.pedido ? ['Entrega no inventário ao lado', 'do cano, ou para você'] : ['Escolha um item'],
      onClick: () => { this.ctx.net.send('request_item', { p: info.p, item: state.pedido, count: state.qtd }); return true; },
    });
    ui.button(g.x + g.w - 51, by - 3, 44, 11, 'Atualizar', { onClick: () => { this.ctx.net.send('query_stock', { p: info.p }); return true; } });
  }

  /** @param {any} e */
  onPointer(e) {
    const d = e.data, r = e.region;
    if (!r || r.kind === 'outside') { d.actions.close(); return true; }
    if (r.kind === 'slot') { if (e.button === 2) d.actions.right(r.idx); else d.actions.click(r.idx, !!e.shift); return true; }
    return true; // the rest of the panel keeps the click
  }

  /** @param {any} e */
  onKey(e) {
    // a focused text field took its keys before this; Esc / the inventory key close the screen
    if (e.code === 'Escape' || e.action === 'inventory') { e.data.actions.close(); return true; }
    const n = /^Digit([1-9])$/.exec(e.code)?.[1];
    if (n && e.region?.kind === 'slot') { e.data.actions.hotbar(e.region.idx, Number(n) - 1); return true; }
    return false;
  }
}

// panel size of each kind and where the player's inventory starts (0: none)
const SIZES = /** @type {Record<string, { w: number, h: number, inv: number }>} */ ({
  orderer: { w: 196, h: 166, inv: 0 },
  provider: { w: 176, h: 160, inv: 84 },
  supplier: { w: 176, h: 160, inv: 84 },
  crafting: { w: 176, h: 186, inv: 110 },
  satellite: { w: 160, h: 60, inv: 0 },
  sink: { w: 160, h: 44, inv: 0 },
});
