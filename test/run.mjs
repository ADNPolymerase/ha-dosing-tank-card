/**
 * dosing-tank-card — behaviour tests.  Run with:  node test/run.mjs
 *
 * These cover the arithmetic that can be wrong without looking wrong: the
 * consumption shown while the pump is running, and the two states where the
 * card would otherwise fail silently.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadCard, markup, freezeClock, now, check, contains, report }
  from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const registry = await loadCard(join(HERE, '..', 'dist', 'dosing-tank-card.js'));
const Card   = registry.get('dosing-tank-card');
const Editor = registry.get('dosing-tank-card-editor');

const FLOW = 15;                                  // mL/min
const T0   = freezeClock('2026-08-12T10:00:00Z');

/**
 * A card in a chosen state.
 *   onSinceMin   how long the pump has been running
 *   lastFetchMin how long ago the history was last folded into the daily total
 *   todayMl      what that fetch put in the daily total
 */
function makeCard({ pumpOn = true, onSinceMin = 30, lastFetchMin = null,
                    todayMl = 0, sync = true, reset = true,
                    name = 'Chlorine' } = {}) {
  const states = {
    'switch.pump': { state: pumpOn ? 'on' : 'off',
                     last_changed: new Date(now()).toISOString() },
  };
  if (reset) states['input_number.consumed'] = { state: '0' };
  if (sync)  states['input_datetime.sync']   =
    { state: '2026-08-12 10:00:00', attributes: { timestamp: T0 / 1000 } };

  const c = new Card();
  c.setConfig({
    pump_entity : 'switch.pump',
    reset_entity: reset ? 'input_number.consumed' : undefined,
    sync_entity : sync  ? 'input_datetime.sync'   : undefined,
    flow_rate_ml_per_min: FLOW, tank_volume_liters: 5, name,
  });
  c._hass             = { states, locale: { language: 'en' } };
  c._pumpOnSince      = pumpOn ? new Date(now() - onSinceMin * 60000) : null;
  c._lastHistoryFetch = lastFetchMin === null ? 0 : now() - lastFetchMin * 60000;
  c._todayConsumedMl  = todayMl;
  c._dailyStats       = c._emptyDays();
  c._render();
  return markup(c);
}

const todayTile = html => {
  const m = html.match(/<div class="mv">([^<]*)<\/div>\s*<div class="ml">Today<\/div>/);
  return m ? m[1].trim() : '(tuile introuvable)';
};

// ── Today's consumption ──────────────────────────────────────────────────────
// The live tail must start where the last history fetch stopped, never at the
// pump start, or the overlap is counted twice.

check('pompe ON 30 min, historique replié il y a 25 min → 5 min repliées + 25 min live',
  todayTile(makeCard({ onSinceMin: 30, lastFetchMin: 25, todayMl: 5 * FLOW })), '450 mL');

check('pompe OFF → historique seul',
  todayTile(makeCard({ pumpOn: false, todayMl: 600 })), '600 mL');

check('aucun historique encore replié → toute la marche est live',
  todayTile(makeCard({ onSinceMin: 30, lastFetchMin: null })), '450 mL');

check('historique plus récent que le démarrage pompe → ancrage sur l\'historique',
  todayTile(makeCard({ onSinceMin: 30, lastFetchMin: 10, todayMl: 20 * FLOW })), '450 mL');

// ── Silent-failure guards ────────────────────────────────────────────────────
// Without sync_entity, _syncFromHistory bails out and the counter is never
// written. That must be visible, not silent.

contains('sync_entity absente → avertissement',
  makeCard({ sync: false }), 'Sync helper missing');

contains('reset_entity absente → avertissement',
  makeCard({ reset: false }), 'Counter not found');

check('helpers complets → aucun avertissement',
  /class="warn missing"/.test(makeCard()), false);

// ── Escaping ─────────────────────────────────────────────────────────────────

const quoted = makeCard({ name: 'Chlore "piscine" <b>' });
contains('titre échappé', quoted, 'Chlore &quot;piscine&quot; &lt;b&gt;');
check('titre : rien d\'injecté', /Chlore "piscine" <b>/.test(quoted), false);

// ── Editor contract ──────────────────────────────────────────────────────────
// CustomEvent.detail is a readonly accessor: assigning it after construction
// silently drops the payload and every edit made in the editor is discarded.

const ed = new Editor();
ed.setConfig({ pump_entity: 'switch.pump' });
ed._fire({ pump_entity: 'switch.other' });
const ev = ed.events.at(-1);
check('l\'éditeur émet config-changed', ev?.type, 'config-changed');
check('config-changed porte bien detail.config',
  ev?.detail?.config?.pump_entity, 'switch.other');

report();
