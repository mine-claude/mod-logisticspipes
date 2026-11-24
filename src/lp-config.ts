// @ts-check
// The settings each pipe keeps in its block data and its screen edits (client/lp-screens.ts), shared by both sides:
// the parse/serialize of the lists, which pipe has which screen, and the server-side check of every value a browser
// sends. The screens are ours (pixel kit of the game); the controls follow the original mod's GUIs: the provider's nine
// filters with include/exclude, the supplier's nine targets with a request mode, the satellite's name, the crafting
// pipe's recipe and the basic pipe's default route.

export const FILTER_SLOTS = 9;
export const MAX_TARGET = 4096;
export const MAX_RECIPE_COUNT = 64;
export const SUPPLY_MODES = ['Parcial', 'Completo'];
const ITEM = /^[a-z0-9_]+:[a-z0-9_./]{1,64}$/;
const SATELLITE = /^[A-Za-z0-9_-]{1,16}$/;

/** @param {unknown} v */
export const isItemName = (v) => typeof v === 'string' && ITEM.test(v);

/** "a;;b" -> ['a', '', 'b', '', ...] padded to `n` (unknown entries become empty) @param {unknown} text */
export function parseList(text, n = FILTER_SLOTS) {
  const parts = typeof text === 'string' && text ? text.split(';') : [];
  return Array.from({ length: n }, (_, i) => (isItemName(parts[i]) ? parts[i] : ''));
}
/** @param {string[]} list */
export const joinList = (list) => list.map((s) => (isItemName(s) ? s : '')).join(';');

/** "a*16;;b*4" -> [{ item, count } | null, ...] @param {unknown} text */
export function parseTargets(text, n = FILTER_SLOTS) {
  const parts = typeof text === 'string' && text ? text.split(';') : [];
  return Array.from({ length: n }, (_, i) => {
    const [item, count] = String(parts[i] ?? '').split('*');
    const c = Math.floor(Number(count));
    return isItemName(item) && c >= 1 ? { item, count: Math.min(c, MAX_TARGET) } : null;
  });
}
/** @param {({ item: string, count: number } | null)[]} list */
export const joinTargets = (list) => list.map((t) => (t && isItemName(t.item) && t.count >= 1 ? `${t.item}*${Math.min(Math.floor(t.count), MAX_TARGET)}` : '')).join(';');

/** The supplier's targets: the list, or the single target of the pipes saved before the screen existed. @param {any} data */
export function supplierTargets(data) {
  const list = parseTargets(data?.targets).filter(Boolean);
  if (list.length) return /** @type {{ item: string, count: number }[]} */ (list);
  return isItemName(data?.target_item) && data?.target_count >= 1 ? [{ item: data.target_item, count: data.target_count }] : [];
}

/** May this provider hand out `item`? Exclude mode (the default) with no filters provides everything. @param {any} data @param {string} item */
export function providerAllows(data, item) {
  const filters = parseList(data?.filters).filter(Boolean);
  const listed = filters.includes(item);
  return data?.exclude === false ? listed : !listed;
}

// Which screen each pipe opens and what its screen may change. `kind` is what the browser's screen draws.
export const PIPE_SCREENS = {
  'logisticspipes:pipe_request': 'orderer',
  'logisticspipes:pipe_request_mk2': 'orderer',
  'logisticspipes:pipe_remote_orderer': 'orderer',
  'logisticspipes:pipe_provider': 'provider',
  'logisticspipes:pipe_provider_mk2': 'provider',
  'logisticspipes:pipe_supplier': 'supplier',
  'logisticspipes:pipe_satellite': 'satellite',
  'logisticspipes:pipe_crafting': 'crafting',
  'logisticspipes:pipe_crafting_mk2': 'crafting',
  'logisticspipes:pipe_crafting_mk3': 'crafting',
  'logisticspipes:pipe_basic': 'sink',
};
export const SCREEN_TITLES = {
  orderer: 'Pedidos da Rede', provider: 'Cano Provedor', supplier: 'Cano Abastecedor',
  satellite: 'Cano Satélite', crafting: 'Cano de Fabricação', sink: 'Cano Lógico Básico',
};

/** What the screen shows of a pipe's data (only the keys of its kind). @param {string} kind @param {any} data */
export function screenConfig(kind, data) {
  switch (kind) {
    case 'provider': return { filters: parseList(data?.filters), exclude: data?.exclude !== false, max: data?.max_extract ?? 16 };
    case 'supplier': {
      const list = parseTargets(data?.targets);
      // a pipe saved before the screen existed shows its single target in the first slot
      if (!list.some(Boolean) && isItemName(data?.target_item) && data?.target_count >= 1) list[0] = { item: data.target_item, count: Math.min(data.target_count, MAX_TARGET) };
      return { targets: list, mode: SUPPLY_MODES[data?.supply_mode] ? data.supply_mode : 0 };
    }
    case 'satellite': return { name: typeof data?.satellite_id === 'string' ? data.satellite_id : '' };
    case 'crafting': return { inputs: parseList(data?.recipe_in), out: isItemName(data?.recipe_out) ? data.recipe_out : '', count: data?.recipe_count ?? 1 };
    case 'sink': return { def: data?.is_default_route === true };
    default: return {};
  }
}

/**
 * One change a browser asks for, checked: the block-data patch to write, or null when it is not valid for this kind.
 * @param {string} kind @param {any} data the pipe's current data @param {{ key?: unknown, index?: unknown, value?: unknown }} msg
 * @returns {Record<string, string | number | boolean> | null}
 */
export function applyChange(kind, data, msg) {
  const key = msg?.key, value = msg?.value, index = Number(msg?.index);
  const slot = Number.isInteger(index) && index >= 0 && index < FILTER_SLOTS;
  const itemOrEmpty = value === '' || isItemName(value);
  switch (kind) {
    case 'provider':
      if (key === 'filter' && slot && itemOrEmpty) { const l = parseList(data?.filters); l[index] = /** @type {string} */ (value); return { filters: joinList(l) }; }
      if (key === 'exclude' && typeof value === 'boolean') return { exclude: value };
      return null;
    case 'supplier': {
      if (key === 'target' && slot) {
        const l = parseTargets(data?.targets);
        if (!l.some(Boolean) && isItemName(data?.target_item)) l[0] = { item: data.target_item, count: Math.max(1, Math.min(data.target_count ?? 1, MAX_TARGET)) };
        if (value === null || value === '') l[index] = null;
        else if (value && typeof value === 'object' && isItemName(/** @type {any} */ (value).item)) {
          const c = Math.floor(Number(/** @type {any} */ (value).count));
          if (!(c >= 1)) return null;
          l[index] = { item: /** @type {any} */ (value).item, count: Math.min(c, MAX_TARGET) };
        } else return null;
        // the old single target is folded into the list, so it is not counted twice
        return { targets: joinTargets(l), target_item: '', target_count: 0 };
      }
      if (key === 'mode' && Number.isInteger(value) && SUPPLY_MODES[/** @type {number} */ (value)]) return { supply_mode: /** @type {number} */ (value) };
      return null;
    }
    case 'satellite':
      return key === 'name' && typeof value === 'string' && SATELLITE.test(value) ? { satellite_id: value } : null;
    case 'crafting':
      if (key === 'input' && slot && itemOrEmpty) { const l = parseList(data?.recipe_in); l[index] = /** @type {string} */ (value); return { recipe_in: joinList(l) }; }
      if (key === 'output' && itemOrEmpty) return { recipe_out: /** @type {string} */ (value) };
      if (key === 'count' && Number.isInteger(value) && /** @type {number} */ (value) >= 1 && /** @type {number} */ (value) <= MAX_RECIPE_COUNT) return { recipe_count: /** @type {number} */ (value) };
      return null;
    case 'sink':
      return key === 'default' && typeof value === 'boolean' ? { is_default_route: value } : null;
    default: return null;
  }
}
