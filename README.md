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

**An `input_number` helper** to persist the consumed volume across restarts — **Settings → Devices & Services → Helpers → Create helper → Number** (min `0`, max `9999999`, step `1`, unit `mL`).

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
flow_rate_ml_per_min: 15
tank_volume_liters: 5
alert_threshold_percent: 20
reset_entity: input_number.dosing_tank_consumed
name: "Chlorine"
liquid_color: "#3b82f6"
# language: "fr"  # optional — auto-detected from HA locale by default
```

### Options

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `pump_entity` | `string` | ✅ | — | Switch entity controlling the dosing pump |
| `reset_entity` | `string` | ✅ | — | `input_number` entity that stores consumed mL |
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

Each time the pump switches **OFF**, the card computes the session duration and increments the consumed-mL counter (`remaining = tank_volume × 1000 − consumed`). The bar chart queries the HA history API. The reset button sets the counter back to `0` when you refill.

> **Note:** the counter is only incremented while a browser tab showing the card is open. For accurate background tracking, use the automation below.

---

## Automation for background accuracy

```yaml
alias: "Dosing tank — track chlorine consumption"
trigger:
  - platform: state
    entity_id: switch.pool_chlorine_pump
    from: "on"
    to: "off"
action:
  - variables:
      duration_min: >
        {{ (as_timestamp(now()) - as_timestamp(trigger.from_state.last_changed)) / 60 }}
      flow_ml_per_min: 15
  - service: input_number.set_value
    target:
      entity_id: input_number.dosing_tank_consumed
    data:
      value: >
        {{ [9999999,
            (states('input_number.dosing_tank_consumed') | float)
            + (duration_min * flow_ml_per_min) | round(0)
           ] | min }}
mode: queued
max: 5
```

Duplicate and adjust for each additional tank. `switch.*` and `input_boolean.*` are fully supported; with a `binary_sensor.*`, use the automation for counter updates.

---

## License

MIT — see [LICENSE](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
