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
                    todayMl = 0, sync = true, reset = true, showSettings, showChart,
                    lastUpdate, pumpChangedH = 0, lastRunH, order,
                    counterAgeDays = 30, name = 'Chlorine' } = {}) {
  const states = {
    'switch.pump': { state: pumpOn ? 'on' : 'off',
                     last_changed: new Date(now() - pumpChangedH * 3600000).toISOString(),
                     last_reported: new Date(now() - 60000).toISOString() },
  };
  if (reset) states['input_number.consumed'] = { state: '0',
    last_changed: new Date(now() - counterAgeDays * 86400000).toISOString() };
  if (sync)  states['input_datetime.sync']   =
    { state: '2026-08-12 10:00:00', attributes: { timestamp: T0 / 1000 } };

  const c = new Card();
  c.setConfig({
    pump_entity : 'switch.pump',
    reset_entity: reset ? 'input_number.consumed' : undefined,
    sync_entity : sync  ? 'input_datetime.sync'   : undefined,
    flow_rate_ml_per_min: FLOW, tank_volume_liters: 5, name,
    show_settings: showSettings, show_chart: showChart, last_update: lastUpdate,
    metrics_order: order,
  });
  c._hass             = { states, locale: { language: 'en' } };
  c._pumpOnSince      = pumpOn ? new Date(now() - onSinceMin * 60000) : null;
  c._lastHistoryFetch = lastFetchMin === null ? 0 : now() - lastFetchMin * 60000;
  c._todayConsumedMl  = todayMl;
  if (lastRunH !== undefined) c._lastRunAt = now() - lastRunH * 3600000;
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

contains('sync_entity absente et compteur figé → avertissement',
  makeCard({ sync: false }), 'the card does not write the counter itself');

// Many installs still run the automation the pre-0.2 README suggested. Their
// counter IS being written, so claiming otherwise is a false alarm.
check('sync_entity absente mais compteur alimenté → pas d\'avertissement',
  /class="warn missing"/.test(makeCard({ sync: false, counterAgeDays: 1 })), false);

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
                      capacity, capacity_unit, color_mode, warn, show_settings, layout,
                      show_chart, last_update, lastChangedH, lastReportedMin,
                      window, seriesStepDays, order, extra, names, format,
                      entity = 'sensor.salt', present = true } = {}) {
  const cur    = value ?? (series ? series.at(-1) : null);
  const states = {};
  if (present && cur !== null)
    states[entity] = { state: String(cur),
                       attributes: { unit_of_measurement: unit,
                                     friendly_name: 'Niveau de sel' },
                       last_changed: new Date(
                         now() - (lastChangedH ?? 1) * 3600000).toISOString(),
                       ...(lastReportedMin === undefined ? {} : {
                         last_reported: new Date(
                           now() - lastReportedMin * 60000).toISOString() }) };
  else if (present)
    states[entity] = { state: 'unavailable', attributes: {},
                       last_changed: new Date(now()).toISOString() };

  const c = new Card();
  c.setConfig({ level_entity: entity, level_full: full, level_empty: empty,
                alert_threshold_percent: alert, name,
                capacity, capacity_unit, color_mode, show_settings, layout,
                show_chart, last_update, window, warn_threshold_percent: warn,
                metrics_order: order });
  Object.assign(states, extra || {});
  c._hass = { states, locale: { language: 'en' }, entities: names || {},
              ...(format ? { formatEntityState: format } : {}) };
  if (series) {
    // One reading per day at the same time of day, oldest first.
    const step = (seriesStepDays ?? 1) * 86400000;
    c._levelDays = c._levelDailySeries(series.map((v, i) => ({
      state: String(v),
      last_changed: new Date(now() - (series.length - 1 - i) * step).toISOString(),
    })));
  }
  c._render();
  return { card: c, html: markup(c) };
}
// The line under the body, in direct mode: remaining quantity on the left,
// when it says something the percentage on the tank does not, and when the
// sensor last spoke pushed to the right edge.
const subline = html =>
  [...html.matchAll(/<span class="tpct">([^<]*)<\/span>/g)].map(m => m[1]);
const caption    = html => subline(html)[0] || '(aucun libellé)';
const lastUpdate = html => subline(html)[1] || '(aucun libellé)';

const tile = (html, label) => {
  const m = html.match(
    new RegExp(`<div class="mv[^"]*">([^<]*)</div>\\s*<div class="ml">${label}</div>`));
  return m ? m[1].trim() : '(tuile introuvable)';
};

// ── Échelle ──────────────────────────────────────────────────────────────────

// A % sensor needs no range, and gets no caption: the tank already says 62 %.
check('capteur en %, pas de plage à configurer',
  /stroke-linejoin="round">62%<\/text>/.test(makeDirect({ value: 62 }).html), true);
check('capteur en % : aucun libellé sous le bidon',
  caption(makeDirect({ value: 62 }).html), '(aucun libellé)');

// The quantity is shown in both arrangements, just not in the same place:
// first tile in rows, under the tank in columns.
check('rows : la quantité est dans la tuile',
  tile(makeDirect({ value: 18.4, unit: 'kg', full: 25 }).html, 'Remaining'), '18.4 kg');
check('columns : la quantité est sous le bidon',
  caption(makeDirect({ value: 18.4, unit: 'kg', full: 25, layout: 'columns' }).html),
  '18.4 kg left');
check('rows : aucun libellé sous le bidon',
  caption(makeDirect({ value: 18.4, unit: 'kg', full: 25 }).html), '(aucun libellé)');

check('kg → pourcentage du bidon (18.4/25)',
  makeDirect({ value: 18.4, unit: 'kg', full: 25 }).card._levelValue().pct, 73.6);

// Ultrasonic probe: it measures the distance down to the surface, so a FULL
// tank reads small. level_full < level_empty must invert the mapping by itself.
check('sonde inversée (plein = 5 cm, vide = 30 cm), lecture 12 cm → 72 %',
  makeDirect({ value: 12, unit: 'cm', full: 5, empty: 30 }).card._levelValue().pct, 72);

// The raw reading of an inverted probe is a measure of EMPTINESS: 12 cm down
// to the surface on a 5–30 cm range means 18 cm of liquid left. Printing the
// raw 12 under a "Remaining" label would say the opposite of the truth.
check('sonde inversée : la tuile montre le liquide, pas la distance',
  tile(makeDirect({ value: 12, unit: 'cm', full: 5, empty: 30 }).html, 'Remaining'),
  '18 cm');
check('sonde inversée : idem sous le bidon en columns',
  caption(makeDirect({ value: 12, unit: 'cm', full: 5, empty: 30,
                       layout: 'columns' }).html), '18 cm left');

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
check('capteur en kg : la tuile Restant est conservée en rows',
  tile(makeDirect({ series: [25,23,21,19,17,15,13,11], unit: 'kg', full: 25 }).html,
       'Remaining'), '11 kg');

// ── Autonomie ────────────────────────────────────────────────────────────────
// 25 kg tank losing 2 kg/day = 8 %/day. Today is excluded from the average
// (it is still running), so 6 complete days at 8 % → 8 %/day.
// Current level 11 kg = 44 % → 44/8 = 5.5 → 6 days.

const steady = makeDirect({ series: [25,23,21,19,17,15,13,11], unit: 'kg', full: 25 });
check('autonomie sur une baisse régulière', tile(steady.html, 'Autonomy'), '6 d');
check('consommation 7 jours = 7 × 2 kg', tile(steady.html, '7 days'), '14 kg');

// Same slope, refilled on day 4 (21 → 25). The refill day adds nothing to the
// 7-day total while still counting as one of the seven, so the rate comes out
// a little low and the autonomy a little generous. That is the accepted price
// of a figure the user can check by hand: 68 % left, 48 % over 7 days,
// 68 ÷ (48/7) ≈ 10.
const refilled = makeDirect({ series: [25,23,21,25,23,21,19,17], unit: 'kg', full: 25 });
check('un remplissage est absorbé sans autonomie aberrante',
  tile(refilled.html, 'Autonomy'), '10 d');
contains('le jour de remplissage est marqué dans le graphe',
  refilled.html, 'class="bi refill"');

check('bidon fraîchement rempli, aucune baisse → pas d\'autonomie inventée',
  tile(makeDirect({ series: [25,25,25,25,25,25,25,25], unit: 'kg', full: 25 }).html,
       'Autonomy'), '—');

// Flat days are days like any other: 3 days at 4 %, 3 flat and a 12 % drop
// today make 24 % over the window, so 76 ÷ (24/7) ≈ 22.
check('les journées plates comptent comme des journées',
  tile(makeDirect({ series: [25,24,24,23,23,22,22,19], unit: 'kg', full: 25 }).html,
       'Autonomy'), '22 d');

// The contract itself, checked rather than hard-coded: what the tile shows is
// exactly the remaining level divided by the 7-day consumption over 7.
const rel      = makeDirect({ series: [92,86,80,74,68,62,56,50], unit: '%' });
const relStats = rel.card._levelStats();
check('l\'autonomie est exactement restant ÷ (conso 7 jours ÷ 7)',
  tile(rel.html, 'Autonomy'),
  `${Math.round(rel.card._levelValue().pct / (relStats.used7dPct / 7))} d`);

// ── Fenêtre réglable ─────────────────────────────────────────────────────────
// Always seven bars, of a width the window decides. What matters is that the
// consumption tile, its label and the autonomy divisor all use the days that
// history actually covered, never the window that was asked for.

const wide = makeDirect({ series: [92,88,84,80,76,72,68,64], unit: '%',
                          capacity: 35, capacity_unit: 'kg', window: 28,
                          seriesStepDays: 4 });
check('fenêtre 28 j : la tuile annonce 28 jours',
  /<div class="ml">28 days<\/div>/.test(wide.html), true);
contains('fenêtre 28 j : le titre annonce la vraie période',
  wide.html, 'Consumption per 4 days (kg)');
contains('fenêtre 7 j : le titre reste journalier',
  makeDirect({ series: [92,86,80,74,68,62,56,50], unit: '%', capacity: 35,
               capacity_unit: 'kg' }).html, 'Daily consumption (kg)');
check('fenêtre 28 j : toujours 7 barres',
  (wide.html.match(/class="bw"/g) || []).length, 7);
check('fenêtre 28 j : autonomie = restant ÷ (conso ÷ 28)',
  tile(wide.html, 'Autonomy'),
  `${Math.round(wide.card._levelValue().pct /
     (wide.card._levelStats().used7dPct / 28))} d`);
check('fenêtre 28 j : aucune note quand tout est couvert',
  /class="histnote"/.test(wide.html), false);

// Only part of the window has data, as on a default recorder purging at 10 d.
const shortHist = makeDirect({ series: [80,76,72,68], unit: '%',
                               capacity: 35, capacity_unit: 'kg', window: 28,
                               seriesStepDays: 4 });
check('historique court : la tuile annonce le couvert, pas la fenêtre',
  /<div class="ml">12 days<\/div>/.test(shortHist.html), true);
contains('historique court : la carte le dit', shortHist.html, 'history: 12 d');
check('historique court : l\'autonomie divise par 12, pas par 28',
  tile(shortHist.html, 'Autonomy'),
  `${Math.round(shortHist.card._levelValue().pct /
     (shortHist.card._levelStats().used7dPct / 12))} d`);
check('fenêtre 7 j : le comportement d\'origine, étiquette comprise',
  /<div class="ml">7 days<\/div>/.test(
    makeDirect({ series: [92,86,80,74,68,62,56,50], unit: '%' }).html), true);

// ── Capacité physique ────────────────────────────────────────────────────────
// A softener reports a percentage, but the useful figure is kilos of salt.
// capacity converts the percentage without touching how the level is measured.

const salt = makeDirect({ series: [92,86,80,74,68,62,56,50], unit: '%',
                          capacity: 35, capacity_unit: 'kg' });

check('capacité : la conso 7 jours passe en kg', tile(salt.html, '7 days'), '14.7 kg');
contains('capacité : le graphe est titré dans l\'unité physique',
  salt.html, 'Daily consumption (kg)');
check('capacité en rows : la quantité tient la 1re tuile',
  tile(salt.html, 'Remaining'), '17.5 kg');
const saltCols = makeDirect({ series: [92,86,80,74,68,62,56,50], unit: '%',
                              capacity: 35, capacity_unit: 'kg', layout: 'columns' });
check('capacité en columns : la quantité passe sous le bidon',
  caption(saltCols.html), '17.5 kg left');
check('capacité en columns : la 1re tuile devient la moyenne journalière',
  /<div class="ml">Daily avg<\/div>/.test(saltCols.html), true);
// The Range row describes the sensor, so it stays in the sensor's own unit
// even when quantities elsewhere are shown in kilos.
contains('capacité : la plage reste en unités capteur', salt.html, '0 → 100 %');
check('sans capacité, rien ne change sur un capteur en %',
  tile(makeDirect({ series: [92,86,80,74,68,62,56,50], unit: '%' }).html,
       'Daily avg'), '6 %/d');

// The daily average is a percentage of the tank internally. Printed under a
// kg label without scaling it read "6 kg/j" where the truth was 2.1, and no
// test caught it because the only one covered a bare % sensor, where the
// scale factor is 100 and the error is invisible.
const scaled = makeDirect({ series: [92,86,80,74,68,62,56,50], unit: '%',
                            capacity: 35, capacity_unit: 'kg', layout: 'columns' });
check('la moyenne journalière est dans l\'unité physique, pas en %',
  tile(scaled.html, 'Daily avg'), '2.1 kg/d');
// Same figure, stated as the relation it must satisfy.
const sc = scaled.card._levelStats();
check('moyenne × jours couverts = consommation de la fenêtre',
  Math.round(sc.avgVal * sc.coveredDays * 10) / 10,
  Math.round(sc.used7dVal * 10) / 10);

// ── Couleurs par palier ──────────────────────────────────────────────────────
// Opt-in: liquid_color is how a chlorine tank is told from a pH− one.

const tier = v => {
  const h = makeDirect({ value: v, color_mode: 'level', alert: 20, warn: 50 }).html;
  return h.match(/stop-color="(#[0-9a-f]{6})"/i)?.[1];
};
check('palier : 80 % vert',   tier(80), '#22c55e');
check('palier : 35 % orange', tier(35), '#f59e0b');
check('palier : 12 % rouge',  tier(12), '#ef4444');
check('sans color_mode, la couleur configurée est conservée',
  makeDirect({ value: 35 }).html.match(/stop-color="(#[0-9a-f]{6})"/i)?.[1], '#3b82f6');

// ── Dégradations ─────────────────────────────────────────────────────────────

contains('unité non-% sans level_full → on demande la plage, on ne devine pas',
  makeDirect({ value: 18, unit: 'kg' }).html, 'Set the full-tank value');

contains('capteur indisponible',
  makeDirect({ value: null, unit: 'kg', full: 25 }).html, 'Level sensor unavailable');

contains('capteur absent des états',
  makeDirect({ value: 62, present: false }).html, 'Level sensor not found');

check('plage inconnue → pas de pourcentage inventé dans le bidon',
  />—<\/text>/.test(makeDirect({ value: 18, unit: 'kg' }).html), true);

// The caption under the tank repeated the figure drawn on it, one decimal
// further, so the two disagreed on screen: "18%" above "17.6% left".
check('plus de libellé sous le bidon',
  /class="tpct"/.test(makeDirect({ value: 62 }).html), false);
check('le bidon porte le pourcentage une seule fois',
  (makeDirect({ value: 62 }).html.match(/62%/g) || []).length, 1);

// The figure sits on top of the tank, not on the card surface. Following
// --primary-text-color made it near black on a light theme, inside a dark
// halo: unreadable. Reported from a real install running the HA light theme.
const tankText = h => h.match(/<text[^>]*>[^<]*<\/text>/)?.[0] ?? '';
contains('le chiffre du bidon est blanc en dur',
  tankText(makeDirect({ value: 62 }).html), 'fill="#fff"');
check('le chiffre du bidon ne suit pas le thème',
  /primary-text-color/.test(tankText(makeDirect({ value: 62 }).html)), false);

// The harness has no layout engine, so these guard the mechanism rather than
// the pixels: a card in a narrow dashboard column has a wide viewport, so a
// media query never matches it and the adjustment row overflowed.
const css = makeCard().split('</style>')[0];
contains('la carte est son propre conteneur de requêtes',
  css, 'container-type:inline-size');
check('aucune requête média sur la largeur du viewport',
  /@media\s*\(\s*max-width/.test(css), false);
contains('le champ nombre peut rétrécir', css, '.adj-input{flex:1;min-width:');

// ── Bloc Paramètres masquable ────────────────────────────────────────────────
// Reference material, useful while configuring and never again. Shown by
// default so no existing card changes on its own.

check('le bloc Paramètres est affiché par défaut',
  /class="stitle">Settings</.test(makeDirect({ value: 62 }).html), true);
check('show_settings: false le retire',
  /class="stitle">Settings</.test(
    makeDirect({ value: 62, show_settings: false }).html), false);
check('le graphe reste quand le bloc est masqué',
  /class="bars"/.test(makeDirect({ value: 62, show_settings: false }).html), true);
check('mode pompe : le bloc se masque aussi',
  /class="stitle">Settings</.test(makeCard({ showSettings: false })), false);

// ── Disposition ──────────────────────────────────────────────────────────────
// Same blocks, two arrangements. "columns" gives the tank the height of the
// row and moves the metrics beside it, which is what a dashboard column wants.

const rowsHtml = makeDirect({ value: 62, capacity: 35, capacity_unit: 'kg' }).html;
const colsHtml = makeDirect({ value: 62, capacity: 35, capacity_unit: 'kg',
                              layout: 'columns' }).html;
check('rows par défaut', /class="body"/.test(rowsHtml), true);
check('columns pose la classe qui déplace les tuiles',
  /class="body cols"/.test(colsHtml), true);
// In rows the metrics come before the body, in columns they are inside it.
check('rows : les tuiles sont au-dessus du corps',
  rowsHtml.indexOf('class="metrics ') < rowsHtml.indexOf('class="body"'), true);
check('columns : les tuiles sont dans le corps',
  colsHtml.indexOf('class="metrics ') > colsHtml.indexOf('class="body cols"'), true);
check('columns : le bidon prend la hauteur qu\'on lui donne',
  /<svg width="100%" height="100%"/.test(colsHtml), true);
check('rows : le bidon garde sa taille naturelle',
  /<svg width="86" height="140"/.test(rowsHtml), true);
const edLay = new Editor();
edLay.setConfig({ pump_entity: 'switch.pump' });
contains('éditeur : le sélecteur de disposition existe',
  markup(edLay), 'id="layout"');

// ── Graphe masquable et ligne « dernière MAJ » ───────────────────────────────
// A softener regenerates every couple of weeks, so a day-by-day chart says
// very little there. And the last-update line has to survive unticking the
// Settings block, which is the only place it lived until now.

check('le graphe est affiché par défaut',
  /class="bars"/.test(makeDirect({ value: 62 }).html), true);
check('show_chart: false le retire',
  /class="bars"/.test(makeDirect({ value: 62, show_chart: false }).html), false);
check('mode pompe : le graphe se masque aussi',
  /class="bars"/.test(makeCard({ showChart: false })), false);

// In pump mode the same line dates the pump instead of a level sensor: its
// last_changed is the end of the last injection.
const pumpSub = html =>
  [...html.matchAll(/<span class="tpct">([^<]*)<\/span>/g)].map(m => m[1])[1]
  || '(aucun libellé)';
check('mode pompe : changed date la dernière injection',
  pumpSub(makeCard({ pumpOn: false, lastUpdate: 'changed', pumpChangedH: 26 })),
  'Last injection 1 d');
check('mode pompe : reported date la réponse de la pompe',
  pumpSub(makeCard({ pumpOn: false, lastUpdate: 'reported', pumpChangedH: 26 })),
  'Updated 1 min');
check('mode pompe : aucune ligne par défaut',
  /class="tpct"/.test(makeCard()), false);

// Reported from a real install: the pump had been idle since the previous
// evening, but the Oklyn integration reloaded that morning, so the switch's
// last_changed read 5 h and the card announced an injection that never
// happened. The timestamp now comes from history, where the transitions are.
const H = h => new Date(now() - h * 3600000).toISOString();
const probe = new Card();
probe.setConfig({ pump_entity: 'switch.p', reset_entity: 'input_number.c',
                  sync_entity: 'input_datetime.s' });

check('la ligne affiche la vraie durée',
  pumpSub(makeCard({ pumpOn: false, lastUpdate: 'changed',
                     pumpChangedH: 5, lastRunH: 19 })), 'Last injection 19 h');

check('la dernière injection vient de l\'historique, pas de last_changed',
  Math.round((now() - probe._lastRunEnd([
    { state: 'off',         last_changed: H(30) },
    { state: 'on',          last_changed: H(20) },
    { state: 'off',         last_changed: H(19) },   // fin réelle
    { state: 'unavailable', last_changed: H(14) },
    { state: 'off',         last_changed: H(5)  },   // rechargement
  ])) / 3600000), 19);

check('pompe encore en marche → maintenant',
  probe._lastRunEnd([{ state: 'off', last_changed: H(3) },
                     { state: 'on',  last_changed: H(1) }]), now());
check('jamais tournée dans la fenêtre → rien',
  probe._lastRunEnd([{ state: 'off', last_changed: H(9) }]), null);

// The same trap on a level sensor: coming back from unavailable at the same
// value is not a move.
check('le dernier mouvement de niveau ignore les retours d\'unavailable',
  Math.round((now() - probe._lastValueMove([
    { state: '70',          last_changed: H(40) },
    { state: '68',          last_changed: H(30) },
    { state: 'unavailable', last_changed: H(10) },
    { state: '68',          last_changed: H(5)  },
  ])) / 3600000), 30);

check('aucune ligne de MAJ par défaut',
  /class="tpct"/.test(makeDirect({ value: 62 }).html), false);
check('last_update: changed affiche la ligne hors des Paramètres',
  lastUpdate(makeDirect({ value: 62, last_update: 'changed',
                          show_settings: false }).html), 'Updated 1 h');

// The two meanings diverge on a slow sensor: the level of a softener only
// moves at each regeneration, so 'changed' dates that regeneration while
// 'reported' says whether the sensor still answers.
const slow = { value: 62, lastChangedH: 288, lastReportedMin: 3 };
check('changed → date le dernier changement de niveau',
  lastUpdate(makeDirect({ ...slow, last_update: 'changed' }).html), 'Updated 12 d');
check('reported → date la dernière réponse du capteur',
  lastUpdate(makeDirect({ ...slow, last_update: 'reported' }).html), 'Updated 3 min');
// Both halves share one row, so the quantity keeps its place when the
// last-update line appears beside it.
const bothHalves = makeDirect({ value: 18.4, unit: 'kg', full: 25, layout: 'columns',
                          last_update: 'changed' }).html;
check('quantité à gauche', caption(bothHalves), '18.4 kg left');
check('MAJ à droite',      lastUpdate(bothHalves), 'Updated 1 h');

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
contains('éditeur : la case Paramètres est cochée par défaut',
  markup(edPump), 'id="showset" checked');

const edDirect = new Editor();
edDirect.setConfig({ level_entity: 'sensor.salt' });
contains('éditeur : le mode se déduit de level_entity',
  markup(edDirect), 'value="direct" selected');
contains('éditeur en mode direct : champs de plage', markup(edDirect), 'id="lfull"');
check('éditeur en mode direct : ni débit ni volume',
  /id="flow"|id="volume"/.test(markup(edDirect)), false);
check('éditeur en mode direct : pas de bouton de création de helpers',
  /id="create-btn"/.test(markup(edDirect)), false);

// ── Éditeur : ne pas perdre une entité configurée ────────────────────────────
// HA calls setConfig again after every config-changed the editor emits. If the
// form is rebuilt each time, the entity pickers are recreated, and a recreated
// picker can emit an empty value-changed that gets saved over the entity.

const edKeep = new Editor();
edKeep.setConfig({ pump_entity: 'switch.pump', reset_entity: 'input_number.c' });
edKeep.shadowRoot.innerHTML = 'SENTINELLE';       // survives only if not rebuilt
edKeep.setConfig({ pump_entity: 'switch.pump', reset_entity: 'input_number.c',
                   name: 'Chlore' });
check('un second setConfig ne reconstruit pas le formulaire',
  markup(edKeep), 'SENTINELLE');

const edPick = new Editor();
edPick.setConfig({ pump_entity: 'switch.pump', reset_entity: 'input_number.c' });
check('un picker qui s\'initialise ne peut pas vider une entité configurée',
  edPick._acceptsPick('reset_entity', ''), false);
check('un écho de la valeur courante n\'écrit rien',
  edPick._acceptsPick('reset_entity', 'input_number.c'), false);
check('un vrai changement passe',
  edPick._acceptsPick('reset_entity', 'input_number.autre'), true);
edPick._touched = true;
check('après interaction, effacer le champ est honoré',
  edPick._acceptsPick('reset_entity', ''), true);
check('renseigner une entité vide au départ passe toujours',
  edPick._acceptsPick('sync_entity', 'input_datetime.s'), true);

// Changing mode is a structural change, so a rebuild is expected there.
const edMode = new Editor();
edMode.setConfig({ pump_entity: 'switch.pump' });
edMode.shadowRoot.innerHTML = 'SENTINELLE';
edMode._mode = 'direct';
edMode.setConfig({ level_entity: 'sensor.s' });
check('changer de mode reconstruit bien le formulaire',
  markup(edMode) !== 'SENTINELLE', true);

// ── metrics_order : quelles tuiles, dans quel ordre ─────────────────────────
// Les libellés des tuiles, dans l'ordre où la carte les dessine.
const tiles = html => [...html.matchAll(/<div class="ml">([^<]*)<\/div>/g)]
  .map(m => m[1]).join(' | ');
const SERIES = [100, 96, 92, 88, 84, 80, 76, 72];

{
  const rows = makeDirect({ series: SERIES, capacity: 35, capacity_unit: 'kg' });
  check('défaut en lignes : restant, consommation, autonomie',
    tiles(rows.html), 'Remaining | 7 days | Autonomy');

  const cols = makeDirect({ series: SERIES, capacity: 35, capacity_unit: 'kg',
                            layout: 'columns' });
  check('défaut en colonnes : la moyenne prend la première place',
    tiles(cols.html), 'Daily avg | 7 days | Autonomy');
  check('le défaut ne pose pas de metrics_order dans la config',
    cols.card._config.metrics_order, null);
}

{
  // La demande de pascal_ha : ne garder que la consommation.
  const one = makeDirect({ series: SERIES, capacity: 35, capacity_unit: 'kg',
                           layout: 'columns', order: ['consumption'] });
  check('une seule tuile demandée, une seule affichée',
    tiles(one.html), '7 days');
  check('la rangée annonce son nombre de tuiles',
    /class="metrics n1"/.test(one.html), true);

  const two = makeDirect({ series: SERIES, capacity: 35, capacity_unit: 'kg',
                           order: ['autonomy', 'consumption'] });
  check('l\'ordre demandé est respecté',
    tiles(two.html), 'Autonomy | 7 days');

  // Les quatre à la fois : le restant et la moyenne ne s'excluent plus.
  const four = makeDirect({ series: SERIES, capacity: 35, capacity_unit: 'kg',
                            layout: 'columns',
                            order: ['remaining', 'average', 'consumption', 'autonomy'] });
  check('les quatre tuiles peuvent coexister',
    tiles(four.html), 'Remaining | Daily avg | 7 days | Autonomy');
  check('quatre tuiles, la grille suit',
    /class="metrics n4"/.test(four.html), true);

  const none = makeDirect({ series: SERIES, capacity: 35, capacity_unit: 'kg',
                            order: [] });
  check('liste vide : la rangée disparaît, elle ne revient pas au défaut',
    /class="metrics/.test(none.html), false);

  // Le piège corrigé dans oklyn-card : réinjecter les clés absentes ferait que
  // supprimer une tuile ne supprimerait rien.
  const bogus = makeDirect({ series: SERIES, capacity: 35, capacity_unit: 'kg',
                             order: ['autonomy', 'today', 'inconnu'] });
  check('les clés d\'un autre mode ou inventées sont écartées',
    tiles(bogus.html), 'Autonomy');
}

{
  // Le mode temps de pompe a ses propres tuiles et la même option.
  check('pompe : les trois tuiles par défaut',
    tiles(makeCard({ pumpOn: false })), 'Remaining | Today | Pump 7d');
  check('pompe : réordonnées et filtrées comme en direct',
    tiles(makeCard({ pumpOn: false, order: ['pump7d', 'remaining'] })),
    'Pump 7d | Remaining');
  check('pompe : une clé du mode direct ne passe pas',
    tiles(makeCard({ pumpOn: false, order: ['autonomy'] })), '');
}

// ── Tuiles d'entité ─────────────────────────────────────────────────────────
{
  const SALT = { series: SERIES, capacity: 35, capacity_unit: 'kg' };
  const water = { 'sensor.eau': { state: '1250',
    attributes: { unit_of_measurement: 'L', friendly_name: 'Adoucisseur eau restante' } } };

  const a = makeDirect({ ...SALT, extra: water,
                         order: ['consumption', 'sensor.eau'] });
  check('une entité devient une tuile, libellée par son nom',
    tiles(a.html), '7 days | Adoucisseur eau restante');
  check('sans formatEntityState : état et unité',
    /<div class="mv">1250 L<\/div>/.test(a.html), true);

  // Le nom du registre prime sur le friendly_name, comme dans oklyn-card :
  // c'est celui-là qui est débarrassé du préfixe d'appareil.
  const b = makeDirect({ ...SALT, extra: water, order: ['sensor.eau'],
    names: { 'sensor.eau': { name: 'Eau restante' } },
    format: st => `${st.state} litres` });
  check('formatEntityState rend la valeur quand il existe',
    /<div class="mv[^"]*">1250 litres<\/div>/.test(b.html), true);
  check('une valeur longue passe au cran de taille en dessous',
    /class="mv long"/.test(b.html), true);
  check('une valeur courte n\'y passe pas',
    /class="mv long"/.test(a.html), false);
  check('le nom du registre prime sur le friendly_name',
    tiles(b.html), 'Eau restante');

  const off = makeDirect({ ...SALT, order: ['consumption', 'sensor.eau'],
    extra: { 'sensor.eau': { state: 'unavailable', attributes: {} } } });
  check('entité décrochée : la tuile reste',
    tiles(off.html), '7 days | sensor.eau');
  check('entité décrochée : un tiret, pas "unavailable"',
    /<div class="mv">—<\/div>/.test(off.html), true);

  // Une entité absente de hass ne doit pas casser le rendu non plus.
  const gone = makeDirect({ ...SALT, order: ['sensor.jamais_vue'] });
  check('entité inconnue : tuile avec un tiret', tiles(gone.html), 'sensor.jamais_vue');

  check('seule une tuile d\'entité est cliquable',
    (a.html.match(/data-entity="/g) || []).length, 1);
  check('la tuile cliquable porte son entité',
    a.html.includes('data-entity="sensor.eau"'), true);

  // Le plafond : quatre tuiles, pas cinq.
  const five = makeDirect({ ...SALT, extra: water,
    order: ['remaining', 'average', 'consumption', 'autonomy', 'sensor.eau'] });
  check('cinq demandées, quatre affichées',
    tiles(five.html), 'Remaining | Daily avg | 7 days | Autonomy');
  check('la grille reste à quatre', /class="metrics n4"/.test(five.html), true);
}

{
  // L'éditeur : les entités configurées sont proposées avec les tuiles
  // intégrées, sinon elles ne seraient ni déplaçables ni supprimables.
  // The stub returns null from getElementById, so the two slots the editor
  // fills by hand have to be handed to it. Everything else stays untouched.
  const withSlots = (hass, config) => {
    const e = new Editor();
    const slots = {};
    e.shadowRoot.getElementById = id =>
      (id === 'morder' || id === 'addtile')
        ? (slots[id] ||= document.createElement('div')) : null;
    e.hass = hass;
    e.setConfig(config);
    return e;
  };

  const ed = withSlots(
    { states: { 'sensor.eau': { state: '1250',
        attributes: { friendly_name: 'Eau restante' } } }, entities: {} },
    { level_entity: 'sensor.s', metrics_order: ['consumption', 'sensor.eau'] });
  const opts = ed._orderForm.schema[0].selector.select.options.map(o => o.value);
  check('les quatre tuiles intégrées sont proposées',
    opts.slice(0, 4).join(), 'remaining,average,consumption,autonomy');
  check('l\'entité configurée est proposée elle aussi',
    opts.includes('sensor.eau'), true);
  check('elle est proposée sous son nom',
    ed._orderForm.schema[0].selector.select.options
      .find(o => o.value === 'sensor.eau').label, 'Eau restante');

  // Plein, donc plus rien à ajouter.
  const full = withSlots({ states: {}, entities: {} },
    { level_entity: 'sensor.s',
      metrics_order: ['remaining', 'average', 'consumption', 'autonomy'] });
  check('rangée pleine : le sélecteur d\'ajout disparaît',
    full.shadowRoot.getElementById('addtile')?.style.display, 'none');
}

// ── Changer de fenêtre sur une carte déjà affichée ───────────────────────────
// Home Assistant réutilise l'élément quand une carte est modifiée, il n'en
// construit pas un neuf : setConfig est rappelé sur la même instance. Or
// l'historique n'est rechargé qu'une fois par quart d'heure. Une carte passée
// de 1 à 4 semaines gardait donc sa requête de 7 jours, et comme setConfig
// venait de vider la série, elle dessinait un graphe vide sous une tuile qui
// annonçait déjà 28 jours.
{
  const bars = html => (html.match(/class="bi[ "]/g) || []).length;
  const states = [];
  for (let h = 40 * 24; h >= 0; h--)
    states.push({ state: String(100 - (40 * 24 - h) * 0.02),
                  last_changed: new Date(now() - h * 3600000).toISOString() });

  let calls = 0;
  const hass = value => ({
    states: { 'sensor.salt': { state: String(value),
              attributes: { unit_of_measurement: '%', friendly_name: 'Sel' },
              last_changed: new Date(now() - 86400000).toISOString() } },
    locale: { language: 'en' },
    callApi: async () => { calls++; return [states]; },
    callService: async () => {},
  });

  const c = new Card();
  c.setConfig({ level_entity: 'sensor.salt', capacity: 35, capacity_unit: 'kg',
                window: 7 });
  c.hass = hass(50);
  await new Promise(r => setTimeout(r, 30));
  check('fenêtre 7 j : le graphe est rempli au premier affichage',
    bars(markup(c)), 7);

  c.setConfig({ level_entity: 'sensor.salt', capacity: 35, capacity_unit: 'kg',
                window: 28 });
  c.hass = hass(49);
  await new Promise(r => setTimeout(r, 30));
  check('passer en 28 j relance la requête, sans attendre le quart d\'heure',
    calls, 2);
  check('passer en 28 j : le graphe reste rempli',
    bars(markup(c)), 7);

  // Le garde ne doit pas rouvrir la vanne à chaque setConfig : l'éditeur en
  // émet un par frappe, et refaire l'appel à chacun mitraillerait le recorder.
  const before = calls;
  c.setConfig({ level_entity: 'sensor.salt', capacity: 35, capacity_unit: 'kg',
                window: 28, name: 'Autre nom' });
  c.hass = hass(48);
  await new Promise(r => setTimeout(r, 30));
  check('une config sans effet sur la requête ne la relance pas',
    calls, before);
}

report();
