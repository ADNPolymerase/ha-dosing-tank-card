# Dosing Tank Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card)
[![GitHub Release](https://badgen.net/github/release/ADNPolymerase/ha-dosing-tank-card)](https://github.com/ADNPolymerase/ha-dosing-tank-card/releases)
[![Validate](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml)
[![HA Version](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-blue.svg)](https://www.home-assistant.io/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?logo=buy-me-a-coffee)](https://buymeacoffee.com/adnpolymerase)

<a href="https://buymeacoffee.com/adnpolymerase" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-orange.png" alt="Buy Me A Coffee" height="60"></a>
<a href="https://adnpolymerase.github.io/HA/" target="_blank"><img src="https://raw.githubusercontent.com/ADNPolymerase/HA/main/assets/site-button.svg" alt="Link to my github.io for my other projects" height="60"></a>

Une carte Lovelace pour suivre le niveau d'un **bidon de dosage liquide** — chlore, pH−, pH+, floculant, algicide, ou tout produit injecté par une pompe à débit constant.

> 🇬🇧 [Read in English](README.md)

![Capture d'écran](https://raw.githubusercontent.com/ADNPolymerase/ha-dosing-tank-card/main/docs/screenshot.fr.png)

---

## Fonctionnalités

- **Bidon SVG animé** avec couleur de liquide configurable, badge pompe en temps réel et alerte de niveau bas (carte rouge + bannière).
- **3 métriques clés** — volume restant (L), consommation du jour (mL), marche pompe sur 7 jours — plus un **graphique en barres 7 jours** construit depuis l'historique HA, aucun capteur supplémentaire.
- **Panneau d'ajustement repliable** — Ajouter/Retirer/Réinitialiser, masqué par défaut.
- **Multilingue** (11 langues : FR, EN, ES, DE, IT, NL, SV, NO, DA, PL, RU — auto-détectée depuis HA), mode sombre, responsive, zéro dépendance.

---

## Prérequis

**Une entité pompe** — n'importe quel `switch.*`, `input_boolean.*` ou `binary_sensor.*` dont l'état est `on` pendant l'injection du produit. Pas besoin d'une « pompe doseuse connectée » :

| Votre installation | Entité pompe à utiliser |
|---|---|
| Pompe doseuse sur une **prise connectée** (Shelly, Sonoff, Tasmota…) | le `switch.*` de la prise |
| Pompe **asservie à la pompe de filtration** | le `switch.*` de la pompe de filtration |
| Prise connectée remontant la **puissance (W)** seule | un helper **Seuil** transformant les watts en `binary_sensor` |
| Pompe pilotée par un contrôleur piscine (Oklyn…) | le `switch.*` / `binary_sensor.*` auxiliaire du contrôleur |

Si vous dosez **à la main** (sans pompe), utilisez le panneau d'ajustement +/- pour suivre le niveau manuellement.

**Un helper `input_number`** pour conserver le volume consommé entre les redémarrages — **Paramètres → Appareils et services → Assistants → Créer un assistant → Nombre** (min `0`, max `9999999`, pas `1`, unité `mL`).

---

## Installation

1. HACS → **⋮** → **Dépôts personnalisés** → `https://github.com/ADNPolymerase/ha-dosing-tank-card`, catégorie **Dashboard**.
2. Téléchargez **Dosing Tank Card**, puis rechargez le navigateur en vidant le cache (`Shift`+`F5`).

Alternative manuelle : copiez `dosing-tank-card.js` depuis la [dernière version](../../releases/latest) vers `config/www/`, puis ajoutez `/local/dosing-tank-card.js` comme ressource module JavaScript.

---

## Configuration

```yaml
type: custom:dosing-tank-card
pump_entity: switch.pool_chlorine_pump
flow_rate_ml_per_min: 15
tank_volume_liters: 5
alert_threshold_percent: 20
reset_entity: input_number.dosing_tank_consumed
name: "Chlore"
liquid_color: "#3b82f6"
# language: "fr"  # optionnel — auto-détecté depuis la locale HA par défaut
```

### Options

| Option | Type | Requis | Défaut | Description |
|---|---|---|---|---|
| `pump_entity` | `string` | ✅ | — | Entité switch pilotant la pompe doseuse |
| `reset_entity` | `string` | ✅ | — | Entité `input_number` qui stocke les mL consommés |
| `flow_rate_ml_per_min` | `number` | | `15` | Débit de la pompe en mL/min |
| `tank_volume_liters` | `number` | | `5` | Capacité du bidon en litres |
| `alert_threshold_percent` | `number` | | `20` | Seuil d'alerte (%) |
| `name` | `string` | | `"Dosing Tank"` | Titre affiché dans l'en-tête de la carte |
| `liquid_color` | `string` | | `"#3b82f6"` | Couleur du liquide (toute couleur CSS hexadécimale) |
| `language` | `string` | | auto | Forcer la langue : `en`, `fr`, `es`, `de`, `it`, `nl`, `sv`, `no`, `da`, `pl`, `ru` (défaut : auto-détectée depuis la locale HA) |

### Suggestions de couleurs

| Produit | Couleur | Hex |
|---|---|---|
| Chlore (liquide) | Bleu | `#3b82f6` |
| pH− | Orange | `#f97316` |
| pH+ | Violet | `#8b5cf6` |
| Floculant | Jaune | `#eab308` |
| Algicide | Vert | `#22c55e` |


---

## Fonctionnement

Chaque fois que la pompe passe sur **OFF**, la carte calcule la durée de la session et incrémente le compteur de mL consommés (`restant = volume_bidon × 1000 − consommé`). Le graphique interroge l'API historique HA. Le bouton de réinitialisation remet le compteur à `0` quand vous remplissez.

> **Remarque :** le compteur n'est incrémenté que lorsqu'un onglet du navigateur affichant la carte est ouvert. Pour un suivi précis en arrière-plan, utilisez l'automatisation ci-dessous.

---

## Automatisation pour la précision en arrière-plan

```yaml
alias: "Bidon de dosage — suivi consommation chlore"
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

Dupliquer et ajuster pour chaque bidon supplémentaire. `switch.*` et `input_boolean.*` sont totalement supportés ; avec un `binary_sensor.*`, utilisez l'automatisation pour les mises à jour du compteur.

---

## Licence

MIT — voir [LICENSE](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
