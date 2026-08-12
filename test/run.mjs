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
const T0   = freezeClock('2026-08-12T12:00:00Z'); // midday, so day buckets are
                                                  // the same in any timezone

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

// ═══ Mode niveau direct ══════════════════════════════════════════════════════

/**
 * A direct-mode card. `series` is 8 daily readings, oldest first — the first
 * one seeds the very first delta, the last one is today.
 */
function makeDirect({ series = null, value = null, unit = '%',
                      full, empty, alert = 20, name = 'Bac à sel',
                      entity = 'sensor.salt', present = true } = {}) {
  const cur    = value ?? (series ? series.at(-1) : null);
  const states = {};
  if (present && cur !== null)
    states[entity] = { state: String(cur),
                       attributes: { unit_of_measurement: unit,
                                     friendly_name: 'Niveau de sel' },
                       last_changed: new Date(now() - 3600000).toISOString() };
  else if (present)
    states[entity] = { state: 'unavailable', attributes: {},
                       last_changed: new Date(now()).toISOString() };

  const c = new Card();
  c.setConfig({ level_entity: entity, level_full: full, level_empty: empty,
                alert_threshold_percent: alert, name });
  c._hass = { states, locale: { language: 'en' } };
  if (series) {
    // One reading per day at the same time of day, oldest first.
    c._levelDays = c._levelDailySeries(series.map((v, i) => ({
      state: String(v),
      last_changed: new Date(now() - (series.length - 1 - i) * 86400000).toISOString(),
    })));
  }
  c._render();
  return { card: c, html: markup(c) };
}
const tile = (html, label) => {
  const m = html.match(
    new RegExp(`<div class="mv[^"]*">([^<]*)</div>\\s*<div class="ml">${label}</div>`));
  return m ? m[1].trim() : '(tuile introuvable)';
};

// ── Échelle ──────────────────────────────────────────────────────────────────

check('capteur en %, pas de plage à configurer',
  tile(makeDirect({ value: 62 }).html, 'Remaining'), '62 %');

check('capteur en kg mis à l\'échelle sur level_full',
  tile(makeDirect({ value: 18.4, unit: 'kg', full: 25 }).html, 'Remaining'), '18.4 kg');

check('kg → pourcentage du bidon (18.4/25)',
  makeDirect({ value: 18.4, unit: 'kg', full: 25 }).card._levelValue().pct, 73.6);

// Ultrasonic probe: it measures the distance down to the surface, so a FULL
// tank reads small. level_full < level_empty must invert the mapping by itself.
check('sonde inversée (plein = 5 cm, vide = 30 cm), lecture 12 cm → 72 %',
  makeDirect({ value: 12, unit: 'cm', full: 5, empty: 30 }).card._levelValue().pct, 72);

// The raw reading of an inverted probe is a measure of EMPTINESS: 12 cm down
// to the surface on a 5–30 cm range means 18 cm of liquid left. Printing the
// raw 12 under a "Remaining" label would say the opposite of the truth.
check('sonde inversée : la tuile Restant montre le liquide, pas la distance',
  tile(makeDirect({ value: 12, unit: 'cm', full: 5, empty: 30 }).html, 'Remaining'),
  '18 cm');

contains('la plage inversée est signalée dans les réglages',
  makeDirect({ value: 12, unit: 'cm', full: 5, empty: 30 }).html, 'inverted');

// Displayed low → high whichever way round the config is written.
contains('la plage se lit comme une échelle croissante',
  makeDirect({ value: 12, unit: 'cm', full: 5, empty: 30 }).html, '5 → 30 cm');

// On a % sensor the level is already on the tank, so the first tile carries
// the daily rate instead of repeating it.
const pctSeries = makeDirect({ series: [92,86,80,74,68,62,56,50], unit: '%' });
check('capteur en % : la 1re tuile passe en moyenne journalière',
  tile(pctSeries.html, 'Daily avg'), '6 %/d');
check('capteur en % : plus de tuile Restant redondante',
  /<div class="ml">Remaining<\/div>/.test(pctSeries.html), false);
check('capteur en kg : la tuile Restant est conservée',
  tile(makeDirect({ series: [25,23,21,19,17,15,13,11], unit: 'kg', full: 25 }).html,
       'Remaining'), '11 kg');

// ── Autonomie ────────────────────────────────────────────────────────────────
// 25 kg tank losing 2 kg/day = 8 %/day. Today is excluded from the average
// (it is still running), so 6 complete days at 8 % → 8 %/day.
// Current level 11 kg = 44 % → 44/8 = 5.5 → 6 days.

const steady = makeDirect({ series: [25,23,21,19,17,15,13,11], unit: 'kg', full: 25 });
check('autonomie sur une baisse régulière', tile(steady.html, 'Autonomy'), '6 d');
check('consommation 7 jours = 7 × 2 kg', tile(steady.html, '7 days'), '14 kg');

// Same slope, but refilled on day 4 (21 → 25). That day hides whatever was
// consumed alongside the refill, so it must leave BOTH sides of the average.
// Counting it as a zero-consumption day would give 40/6 = 6.7 %/day → 10 days,
// i.e. an autonomy 40 % too optimistic on a tank that is about to run out.
const refilled = makeDirect({ series: [25,23,21,25,23,21,19,17], unit: 'kg', full: 25 });
check('un remplissage ne gonfle pas l\'autonomie',
  tile(refilled.html, 'Autonomy'), '9 d');
contains('le jour de remplissage est marqué dans le graphe',
  refilled.html, 'class="bi refill"');

check('bidon fraîchement rempli, aucune baisse → pas d\'autonomie inventée',
  tile(makeDirect({ series: [25,25,25,25,25,25,25,25], unit: 'kg', full: 25 }).html,
       'Autonomy'), '—');

// A flat day is real information (the softener simply did not regenerate),
// unlike a refill day. 6 complete days, 3 of them at 0 → 12/6 = 2 %/day, and
// 76 % left → 38 days. Dropping the flat days would give 12/3 = 4 %/day → 19
// days, halving the autonomy of a tank that is in fact barely used.
check('les journées à consommation nulle comptent dans la moyenne',
  tile(makeDirect({ series: [25,24,24,23,23,22,22,19], unit: 'kg', full: 25 }).html,
       'Autonomy'), '38 d');

// ── Dégradations ─────────────────────────────────────────────────────────────

contains('unité non-% sans level_full → on demande la plage, on ne devine pas',
  makeDirect({ value: 18, unit: 'kg' }).html, 'Set the full-tank value');

contains('capteur indisponible',
  makeDirect({ value: null, unit: 'kg', full: 25 }).html, 'Level sensor unavailable');

contains('capteur absent des états',
  makeDirect({ value: 62, present: false }).html, 'Level sensor not found');

check('plage inconnue → pas de pourcentage inventé dans le bidon',
  /<div class="tpct">—<\/div>/.test(makeDirect({ value: 18, unit: 'kg' }).html), true);

// ── Ce que le mode direct ne doit PAS afficher ───────────────────────────────

const plain = makeDirect({ value: 62 }).html;
check('pas de panneau d\'ajustement mL',   /dtc-adj-toggle/.test(plain), false);
check('pas d\'avertissement compteur/sync', /warn missing/.test(plain), false);
// Match the element, not the .badge-on/.badge-off rules in the stylesheet.
check('pas de badge pompe',                 /<div class="badge /.test(plain), false);
check('alerte niveau bas fonctionnelle',
  /class="warn alert"/.test(makeDirect({ value: 12 }).html), true);

// ── Rétrocompatibilité ───────────────────────────────────────────────────────

check('getCardSize : 4 en direct, 5 en mode pompe',
  makeDirect({ value: 62 }).card.getCardSize(), 4);

let threw = null;
try { new Card().setConfig({ name: 'x' }); } catch (e) { threw = e.message; }
contains('ni pump_entity ni level_entity → erreur explicite',
  threw, 'pump_entity or level_entity is required');

// A config carrying both keys must not run the counter chain as well.
const both = new Card();
both.setConfig({ pump_entity: 'switch.pump', level_entity: 'sensor.salt' });
both._hass = { states: { 'sensor.salt': { state: '62',
                 attributes: { unit_of_measurement: '%' } } },
               locale: { language: 'en' } };
both._render();
check('level_entity l\'emporte sur pump_entity',
  /dtc-adj-toggle/.test(markup(both)), false);

// ── Éditeur : bascule de mode ────────────────────────────────────────────────

const edPump = new Editor();
edPump.setConfig({ pump_entity: 'switch.pump' });
contains('éditeur en mode pompe : champ débit', markup(edPump), 'Flow rate (mL/min)');
check('éditeur en mode pompe : pas de champ de plage',
  /id="lfull"/.test(markup(edPump)), false);

const edDirect = new Editor();
edDirect.setConfig({ level_entity: 'sensor.salt' });
contains('éditeur : le mode se déduit de level_entity',
  markup(edDirect), 'value="direct" selected');
contains('éditeur en mode direct : champs de plage', markup(edDirect), 'id="lfull"');
check('éditeur en mode direct : ni débit ni volume',
  /id="flow"|id="volume"/.test(markup(edDirect)), false);
check('éditeur en mode direct : pas de bouton de création de helpers',
  /id="create-btn"/.test(markup(edDirect)), false);

report();
