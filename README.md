# Dosing Tank Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card)
[![GitHub Release](https://badgen.net/github/release/ADNPolymerase/ha-dosing-tank-card)](https://github.com/ADNPolymerase/ha-dosing-tank-card/releases)
[![Validate](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml)
[![HA Version](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-blue.svg)](https://www.home-assistant.io/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?logo=buy-me-a-coffee)](https://buymeacoffee.com/adnpolymerase)

<a href="https://buymeacoffee.com/adnpolymerase" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-orange.png" alt="Buy Me A Coffee" height="60"></a>
<a href="https://adnpolymerase.github.io/HA/" target="_blank"><img src="https://raw.githubusercontent.com/ADNPolymerase/HA/main/assets/site-button.svg" alt="Link to my github.io for my other projects" height="60"></a>

A Lovelace card to track the level of a **liquid dosing tank** — chlorine, pH−, pH+, flocculant, algaecide, or any product injected by a pump at a constant flow rate.

> 🇫🇷 [Lire en français](README.fr.md)

![Screenshot](https://raw.githubusercontent.com/ADNPolymerase/ha-dosing-tank-card/main/docs/screenshot.png)

---

## Features

- **Animated SVG tank** with configurable liquid color, real-time pump badge and low-level alert (card turns red + warning banner).
- **3 key metrics** — remaining volume (L), today's consumption (mL), 7-day pump runtime — plus a **7-day bar chart** built from HA history, no extra sensors needed.
- **Counts in the background** — runtime is reconciled from the HA history API, so nothing is lost while no browser tab is open. No automation required.
- **Collapsible adjustment panel** — Add/Remove/Reset controls, hidden by default.
- **Multilingual** (11 languages: EN, FR, ES, DE, IT, NL, SV, NO, DA, PL, RU — auto-detected from HA), dark-mode ready, responsive, zero dependencies.

---

## Prerequisites

**A pump entity** — any `switch.*`, `input_boolean.*` or `binary_sensor.*` whose state is `on` while product is being injected. No "smart dosing pump" required:

| Your setup | Pump entity to use |
|---|---|
| Dosing pump on a **smart plug** (Shelly, Sonoff, Tasmota…) | the plug's `switch.*` |
| Pump **slaved to the filtration pump** | the filtration pump's `switch.*` |
| Smart plug reporting **power (W)** only | a **Threshold** helper turning watts into a `binary_sensor` |
| Pump driven by a pool controller (Oklyn…) | the controller's auxiliary `switch.*` / `binary_sensor.*` |

If you dose **by hand** (no pump), use the +/- adjustment panel to track the level manually.

**Two helpers** (three with the optional one). The quickest way is the **✨ Create counter** button in the card editor — it creates them all and fills them into the config. Manually, from **Settings → Devices & Services → Helpers**:

| Helper | Type | Role |
|---|---|---|
| `<name> consumed` | **Number** — min `0`, max `9999999`, step `1`, unit `mL` | consumed volume, persisted across restarts |
| `<name> sync` | **Date and/or time** — date **and** time | watermark: how far the pump runtime has already been counted |
| `<name> flow rate` | **Number** — unit `mL/min` | *optional* — live flow rate, overrides `flow_rate_ml_per_min` |

> ⚠️ Without `sync_entity` the card still shows a live level while the pump runs, but **never writes to the counter** — the reading is lost as soon as the pump stops.

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
# flow_entity: input_number.dosing_tank_flow_rate  # optional — live flow rate
# language: "fr"  # optional — auto-detected from HA locale by default
```

### Options

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `pump_entity` | `string` | ✅ | — | Switch entity controlling the dosing pump |
| `reset_entity` | `string` | ✅ | — | `input_number` (or `number`) entity that stores consumed mL |
| `sync_entity` | `string` | ✅ | — | `input_datetime` (date + time) holding the catch-up watermark — **without it nothing is ever saved** |
| `flow_entity` | `string` | | — | `input_number` holding the live flow rate in mL/min; takes over from `flow_rate_ml_per_min` when > 0 |
| `flow_rate_ml_per_min` | `number` | | `15` | Pump flow rate in mL/min |
| `tank_volume_liters` | `number` | | `5` | Tank capacity in litres |
| `alert_threshold_percent` | `number` | | `20` | Alert threshold (%) |
| `name` | `string` | | `"Dosing Tank"` | Title shown in the card header |
| `liquid_color` | `string` | | `"#3b82f6"` | Liquid color (any CSS hex color) |
| `language` | `string` | | auto | Language override: `en`, `fr`, `es`, `de`, `it`, `nl`, `sv`, `no`, `da`, `pl`, `ru` (default: auto-detected from HA locale) |

### Color suggestions

| Product | Color | Hex |
|---|---|---|
| Chlorine (liquid) | Blue | `#3b82f6` |
| pH− | Orange | `#f97316` |
| pH+ | Purple | `#8b5cf6` |
| Flocculant | Yellow | `#eab308` |
| Algaecide | Green | `#22c55e` |


---

## How it works

`remaining = tank_volume × 1000 − consumed`, where consumed is pump runtime × flow rate.

Runtime is reconciled from the **Home Assistant history API**, not from the open browser tab. `sync_entity` stores a watermark — the instant up to which runtime has already been counted. On each refresh (every 15 min, and immediately when the pump stops) the card adds everything the pump ran since that watermark into `reset_entity`, then moves the watermark forward. So nothing is lost while no tab is open: the catch-up happens the next time the card is displayed, looking back up to 90 days.

The 7-day bar chart is built from the same history. The reset button zeroes the counter and moves the watermark to now, for when you refill the tank.

Any entity whose state is `on` while product is injected works — `switch.*`, `input_boolean.*` and `binary_sensor.*` alike.

---

## Upgrading from v0.1.x

Up to v0.1.3 the counter only moved while a browser tab was open, and this README suggested an automation to increment it on each pump stop. Since **v0.2.0** the card does the catch-up itself from history. If you are coming from an older version:

1. Add a `sync_entity` (see [Prerequisites](#prerequisites)) — without it the counter is never written.
2. **Delete that old automation.** With `sync_entity` set, the automation and the card would each count the same pump cycle, doubling your consumption.

---

## License

MIT — see [LICENSE](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
