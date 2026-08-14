# Dosing Tank Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card)
[![GitHub Release](https://badgen.net/github/release/ADNPolymerase/ha-dosing-tank-card)](https://github.com/ADNPolymerase/ha-dosing-tank-card/releases)
[![Validate](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml)
[![HA Version](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-blue.svg)](https://www.home-assistant.io/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?logo=buy-me-a-coffee)](https://buymeacoffee.com/adnpolymerase)

<a href="https://buymeacoffee.com/adnpolymerase" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-orange.png" alt="Buy Me A Coffee" height="60"></a>
<a href="https://adnpolymerase.github.io/HA/" target="_blank"><img src="https://raw.githubusercontent.com/ADNPolymerase/HA/main/assets/site-button.svg" alt="Link to my github.io for my other projects" height="60"></a>

A Lovelace card to track the level of a tank. Two modes:

- **Pump runtime**: chlorine, pH−, pH+, flocculant, algaecide, or any product injected by a pump at a constant flow rate. The card counts the pump and converts it to millilitres.
- **Direct level**: a water-softener salt tank, an ESP32 probe on a drum, or anything whose level is already reported by a sensor. The card reads it and adds a consumption history and a runs-out-in estimate on top.

> 🇫🇷 [Lire en français](README.fr.md)

![Screenshot](https://raw.githubusercontent.com/ADNPolymerase/ha-dosing-tank-card/main/docs/screenshot.png)

---

## Features

- **Animated SVG tank** with configurable liquid color, real-time pump badge and low-level alert (card turns red + warning banner).
- **3 key metrics** (remaining volume in L, today's consumption in mL, 7-day pump runtime), plus a **7-day bar chart** built from HA history, no extra sensors needed.
- **Counts in the background**: runtime is reconciled from the HA history API, so nothing is lost while no browser tab is open. No automation required.
- **Collapsible adjustment panel** with Add/Remove/Reset controls, hidden by default.
- **Or no pump at all**: point it at a level sensor instead and it shows the level, the 7-day consumption and how long the tank will last.
- **Multilingual** (11 languages: EN, FR, ES, DE, IT, NL, SV, NO, DA, PL, RU, auto-detected from HA), dark-mode ready, responsive, zero dependencies.

---

## Prerequisites

> Everything in this section is for **pump-runtime mode**. In [direct level mode](#direct-level-mode) the sensor is the only thing you need: no helper, no pump.

**A pump entity**: any `switch.*`, `input_boolean.*` or `binary_sensor.*` whose state is `on` while product is being injected. No "smart dosing pump" required:

| Your setup | Pump entity to use |
|---|---|
| Dosing pump on a **smart plug** (Shelly, Sonoff, Tasmota…) | the plug's `switch.*` |
| Pump **slaved to the filtration pump** | the filtration pump's `switch.*` |
| Smart plug reporting **power (W)** only | a **Threshold** helper turning watts into a `binary_sensor` |
| Pump driven by a pool controller (Oklyn…) | the controller's auxiliary `switch.*` / `binary_sensor.*` |

If you dose **by hand** (no pump), use the +/- adjustment panel to track the level manually.

**Two helpers** (three with the optional one). The quickest way is the **✨ Create counter** button in the card editor, which creates them all and fills them into the config. Manually, from **Settings → Devices & Services → Helpers**:

| Helper | Type | Role |
|---|---|---|
| `<name> consumed` | **Number**, min `0`, max `9999999`, step `1`, unit `mL` | consumed volume, persisted across restarts |
| `<name> sync` | **Date and/or time**, date **and** time | watermark: how far the pump runtime has already been counted |
| `<name> flow rate` | **Number**, unit `mL/min` | *optional*, live flow rate, overrides `flow_rate_ml_per_min` |

> ⚠️ Without `sync_entity` the card still shows a live level while the pump runs, but **never writes to the counter**: the reading is lost as soon as the pump stops.

---

## Installation

1. HACS → **⋮** → **Custom repositories** → `https://github.com/ADNPolymerase/ha-dosing-tank-card`, category **Dashboard**.
2. Download **Dosing Tank Card**, then hard-reload the browser (`Shift`+`F5`).

Manual alternative: copy `dosing-tank-card.js` from the [latest release](../../releases/latest) to `config/www/`, then add `/local/dosing-tank-card.js` as a JavaScript-module resource.

---

## Configuration

```yaml
type: custom:dosing-tank-card
pump_entity: switch.pool_chlorine_pump
reset_entity: input_number.dosing_tank_consumed
sync_entity: input_datetime.dosing_tank_sync
flow_rate_ml_per_min: 15
tank_volume_liters: 5
alert_threshold_percent: 20
name: "Chlorine"
liquid_color: "#3b82f6"
# flow_entity: input_number.dosing_tank_flow_rate  # optional, live flow rate
# language: "fr"  # optional, auto-detected from HA locale by default
```

### Options

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `pump_entity` | `string` | ✅ ¹ |  | Switch entity controlling the dosing pump |
| `reset_entity` | `string` | ✅ ¹ |  | `input_number` (or `number`) entity that stores consumed mL |
| `sync_entity` | `string` | ✅ ¹ |  | `input_datetime` (date + time) holding the catch-up watermark. **Without it the card never writes the counter itself**, so the level only moves if something else does it |
| `flow_entity` | `string` | ¹ |  | `input_number` holding the live flow rate in mL/min; takes over from `flow_rate_ml_per_min` when > 0 |
| `flow_rate_ml_per_min` | `number` | ¹ | `15` | Pump flow rate in mL/min |
| `tank_volume_liters` | `number` | ¹ | `5` | Tank capacity in litres |
| `level_entity` | `string` | ✅ ² |  | Sensor reporting the level. **Setting it switches the card to direct-level mode** and the whole pump chain above becomes irrelevant |
| `level_full` | `number` | ² | `100` if unit is `%` | Sensor value for a full tank |
| `level_empty` | `number` | ² | `0` | Sensor value for an empty tank |
| `capacity` | `number` | ² |  | What a full tank physically holds, so quantities read in kg or litres even when the sensor only reports a percentage |
| `capacity_unit` | `string` | ² |  | Unit written next to those quantities (`kg`, `L`…) |
| `color_mode` | `string` | | `"fixed"` | `"level"` colours the tank by fill instead of using `liquid_color` |
| `warn_threshold_percent` | `number` | | `50` | Amber below this, red below `alert_threshold_percent`. Only used by `color_mode: level` |
| `alert_threshold_percent` | `number` | | `20` | Alert threshold (%) |
| `layout` | `string` | | `"rows"` | `"columns"` gives the tank the height of the card and moves the three metric tiles beside it. A selector for it sits in the visual editor |
| `show_chart` | `boolean` | | `true` | `false` drops the daily consumption chart. A softener regenerates every couple of weeks, where a day-by-day chart says little |
| `last_update` | `string` | | `"off"` | `"changed"` or `"reported"` prints a last-update line under the tank, so it survives hiding the Settings block. **They answer different questions**: `changed` dates the last move of the level, which on a softener is the last regeneration; `reported` dates the last time the sensor answered, which is what tells you it is still alive. In pump-runtime mode the same line dates the pump instead: `changed` is the end of the last injection, `reported` the last time the switch answered. Both are read from history rather than from the entity's own `last_changed`, which a restart or a reconnection resets and would otherwise fake a run that never happened |
| `show_settings` | `boolean` | | `true` | `false` drops the Settings block at the bottom of the card. There is a tick box for it in the visual editor |
| `name` | `string` | | `"Dosing Tank"` | Title shown in the card header |
| `liquid_color` | `string` | | `"#3b82f6"` | Liquid color (any CSS hex color) |
| `language` | `string` | | auto | Language override: `en`, `fr`, `es`, `de`, `it`, `nl`, `sv`, `no`, `da`, `pl`, `ru` (default: auto-detected from HA locale) |

¹ pump-runtime mode only &nbsp;&nbsp; ² direct-level mode only

---

## Direct level mode

For a tank whose level is already measured, such as a softener salt tank, an ESP32 probe, or any `sensor.*` holding a number. Set `level_entity` and the card stops counting pump runtime entirely: no counter, no watermark, no adjustment panel.

![Direct level mode](https://raw.githubusercontent.com/ADNPolymerase/ha-dosing-tank-card/main/docs/screenshot-direct.png)

```yaml
type: custom:dosing-tank-card
level_entity: sensor.softener_salt_level
level_full: 25          # kg in a full tank
name: "Softener salt"
liquid_color: "#94a3b8"
alert_threshold_percent: 15
```

A sensor already reporting `%` needs no range at all. For any other unit, `level_full` says what a full tank reads.

**Reading a tank in kilos.** A softener reports a percentage, but what you actually want to know is how much salt is left. `capacity` says what a full tank holds, and every quantity follows: remaining, 7-day consumption, the chart and its title. The level itself is still measured by the sensor, `capacity` only changes what the figures are counted in.

```yaml
level_entity: sensor.softener_salt_level
capacity: 35
capacity_unit: "kg"
```

**Inverted probes work as-is.** An ultrasonic sensor measures the distance down to the surface, so a full tank reads *small*. Just give the two readings in the order they happen:

```yaml
level_entity: sensor.ph_minus_distance
level_full: 5           # cm from the sensor to the surface, tank full
level_empty: 30         # cm, tank empty
```

The three tiles change meaning in this mode. Two are fixed: consumption over the last 7 days, and **autonomy**, how long the tank lasts at the recent average rate. The first one adapts: on a bare `%` sensor it shows the average daily consumption, since the level itself is already printed on the tank; otherwise it shows what is left, which on an inverted probe is the liquid height and not the raw distance reading. Setting `capacity` gives that figure a meaning of its own, so it goes back to showing what remains.

That average deliberately ignores days when the level went **up**: a refill hides whatever was consumed alongside it, and counting it as a zero-consumption day would inflate the autonomy of a tank that is in fact running out. Refill days appear as a green `+` in the chart. Days where the level genuinely did not move are kept, because a softener that did not regenerate is real information. Autonomy shows `—` until there are at least two complete days of decline.

---

### Color suggestions

| Product | Color | Hex |
|---|---|---|
| Chlorine (liquid) | Blue | `#3b82f6` |
| pH− | Orange | `#f97316` |
| pH+ | Purple | `#8b5cf6` |
| Flocculant | Yellow | `#eab308` |
| Algaecide | Green | `#22c55e` |

**Or colour by level instead.** `color_mode: level` ignores `liquid_color` and paints the tank green above `warn_threshold_percent` (50 by default), amber below it, red below `alert_threshold_percent` (20). Off by default, because `liquid_color` is what tells a chlorine tank from a pH− one at a glance. Works in both modes.


---

## How it works

`remaining = tank_volume × 1000 − consumed`, where consumed is pump runtime × flow rate.

Runtime is reconciled from the **Home Assistant history API**, not from the open browser tab. `sync_entity` stores a watermark, the instant up to which runtime has already been counted. On each refresh (every 15 min, and immediately when the pump stops) the card adds everything the pump ran since that watermark into `reset_entity`, then moves the watermark forward. So nothing is lost while no tab is open: the catch-up happens the next time the card is displayed, looking back up to 90 days.

The 7-day bar chart is built from the same history. The reset button zeroes the counter and moves the watermark to now, for when you refill the tank.

Any entity whose state is `on` while product is injected works with `switch.*`, `input_boolean.*` and `binary_sensor.*` alike.

---

## Upgrading from v0.1.x

Up to v0.1.3 the counter only moved while a browser tab was open, and this README suggested an automation to increment it on each pump stop. Since **v0.2.0** the card does the catch-up itself from history. If you are coming from an older version:

1. Add a `sync_entity` (see [Prerequisites](#prerequisites)). Without it the counter is never written.
2. **Delete that old automation.** With `sync_entity` set, the automation and the card would each count the same pump cycle, doubling your consumption.

---

## License

MIT, see [LICENSE](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
