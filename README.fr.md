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
- **Comptage en arrière-plan** — le temps de marche est reconstitué depuis l'API d'historique HA : rien n'est perdu quand aucun onglet n'est ouvert. Aucune automatisation nécessaire.
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

**Deux helpers** (trois avec l'optionnel). Le plus simple est le bouton **✨ Créer le compteur** dans l'éditeur de carte : il les crée tous et les renseigne dans la config. Manuellement, depuis **Paramètres → Appareils et services → Assistants** :

| Helper | Type | Rôle |
|---|---|---|
| `<nom> consumed` | **Nombre** — min `0`, max `9999999`, pas `1`, unité `mL` | volume consommé, conservé entre les redémarrages |
| `<nom> sync` | **Date et/ou heure** — date **et** heure | repère : jusqu'où le temps de marche a déjà été comptabilisé |
| `<nom> flow rate` | **Nombre** — unité `mL/min` | *optionnel* — débit en direct, remplace `flow_rate_ml_per_min` |

> ⚠️ Sans `sync_entity`, la carte affiche bien un niveau en direct pendant que la pompe tourne, mais **n'écrit jamais dans le compteur** — la valeur est perdue dès l'arrêt de la pompe.

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
reset_entity: input_number.dosing_tank_consumed
sync_entity: input_datetime.dosing_tank_sync
flow_rate_ml_per_min: 15
tank_volume_liters: 5
alert_threshold_percent: 20
name: "Chlore"
liquid_color: "#3b82f6"
# flow_entity: input_number.dosing_tank_flow_rate  # optionnel — débit en direct
# language: "fr"  # optionnel — auto-détecté depuis la locale HA par défaut
```

### Options

| Option | Type | Requis | Défaut | Description |
|---|---|---|---|---|
| `pump_entity` | `string` | ✅ | — | Entité switch pilotant la pompe doseuse |
| `reset_entity` | `string` | ✅ | — | Entité `input_number` (ou `number`) qui stocke les mL consommés |
| `sync_entity` | `string` | ✅ | — | Entité `input_datetime` (date + heure) portant le repère de rattrapage — **sans elle, rien n'est jamais enregistré** |
| `flow_entity` | `string` | | — | Entité `input_number` portant le débit en direct (mL/min) ; prend le pas sur `flow_rate_ml_per_min` si > 0 |
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

`restant = volume_bidon × 1000 − consommé`, le consommé étant le temps de marche de la pompe × le débit.

Le temps de marche est reconstitué depuis l'**API d'historique de Home Assistant**, pas depuis l'onglet ouvert. `sync_entity` conserve un repère : l'instant jusqu'auquel le temps de marche a déjà été comptabilisé. À chaque rafraîchissement (toutes les 15 min, et immédiatement à l'arrêt de la pompe), la carte ajoute dans `reset_entity` tout ce que la pompe a tourné depuis ce repère, puis avance le repère. Rien n'est donc perdu quand aucun onglet n'est ouvert : le rattrapage se fait au prochain affichage de la carte, jusqu'à 90 jours en arrière.

Le graphique 7 jours est construit depuis le même historique. Le bouton de réinitialisation remet le compteur à `0` et place le repère à maintenant, quand vous remplissez le bidon.

N'importe quelle entité dont l'état est `on` pendant l'injection convient — `switch.*`, `input_boolean.*` comme `binary_sensor.*`.

---

## Migration depuis la v0.1.x

Jusqu'à la v0.1.3, le compteur n'avançait que lorsqu'un onglet était ouvert, et ce README proposait une automatisation pour l'incrémenter à chaque arrêt de pompe. Depuis la **v0.2.0**, la carte fait le rattrapage elle-même depuis l'historique. Si vous venez d'une version plus ancienne :

1. Ajoutez une `sync_entity` (voir [Prérequis](#prérequis)) — sans elle, le compteur n'est jamais écrit.
2. **Supprimez cette ancienne automatisation.** Avec `sync_entity` renseignée, l'automatisation et la carte compteraient chacune le même cycle de pompe, doublant votre consommation.

---

## Licence

MIT — voir [LICENSE](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
