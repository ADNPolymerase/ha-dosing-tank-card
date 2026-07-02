# Dosing Tank Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card)
[![GitHub Release](https://badgen.net/github/release/ADNPolymerase/ha-dosing-tank-card)](https://github.com/ADNPolymerase/ha-dosing-tank-card/releases)
[![Validate](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml)
[![HA Version](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-blue.svg)](https://www.home-assistant.io/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?logo=buy-me-a-coffee)](https://buymeacoffee.com/adnpolymerase)

<a href="https://buymeacoffee.com/adnpolymerase" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-orange.png" alt="Buy Me A Coffee" height="60"></a>
<a href="https://adnpolymerase.github.io/HA/" target="_blank"><img src="https://raw.githubusercontent.com/ADNPolymerase/HA/main/assets/site-button.svg" alt="Link to my github.io for my other projects" height="60"></a>

Carte Lovelace personnalisée pour Home Assistant permettant de suivre visuellement le niveau d'un **bidon de dosage liquide** — chlore, pH−, pH+, floculant, algicide, ou tout produit injecté par une pompe à débit constant.

> 🇬🇧 [Read in English](README.md)

![Capture d'écran](https://raw.githubusercontent.com/ADNPolymerase/ha-dosing-tank-card/main/docs/screenshot.png)

---

## Fonctionnalités

- **Bidon SVG animé** — le niveau de liquide évolue en douceur au fur et à mesure du calcul de consommation
- **Couleur du liquide configurable** — bleu pour le pH−, jaune pour le floculant, vert pour l'algicide…
- **Badge pompe en temps réel** — ON / OFF reflète l'état actuel du switch
- **3 métriques clés** — volume restant (L), consommation du jour (mL), temps de marche pompe sur 7 jours
- **Graphique en barres sur 7 jours** — construit depuis l'historique HA, aucun capteur supplémentaire nécessaire
- **Alerte de niveau bas** — seuil configurable ; la carte passe au rouge + affiche une bannière d'avertissement
- **Panneau d'ajustement repliable** — bascule pour afficher les contrôles Ajouter/Retirer/Réinitialiser, masqué par défaut
- **Multilingue** — détecté automatiquement depuis la langue de votre HA : 🇬🇧 EN · 🇫🇷 FR · 🇪🇸 ES · 🇩🇪 DE · 🇮🇹 IT · 🇳🇱 NL
- **Compatible mode sombre** — utilise les variables CSS HA de bout en bout
- **Responsive** — s'adapte aux tableaux de bord 1, 2 ou 3 colonnes
- **Zéro dépendance** — JavaScript pur, aucun framework, aucun npm

---

## Prérequis

**Une entité pompe** — n'importe quel `switch.*`, `input_boolean.*` ou `binary_sensor.*` dont l'état est `on` pendant l'injection du produit.

### Que puis-je utiliser comme entité pompe ? (pas besoin d'une "pompe doseuse connectée")

Vous n'avez **pas besoin** d'une pompe doseuse connectée/cloud spéciale. La carte a seulement besoin d'un signal on/off qui reflète le fonctionnement de la pompe. Configurations courantes :

| Votre installation | Entité pompe à utiliser |
|---|---|
| Pompe doseuse branchée sur une **prise connectée** (Shelly, Sonoff, Tasmota…) | le `switch.*` de la prise — son on/off = temps de marche pompe |
| Pompe doseuse **asservie à la pompe de filtration** (fonctionne dès que la filtration tourne) | le `switch.*` de votre **pompe de filtration** — consommation = temps de filtration × débit de dosage |
| Prise connectée qui remonte la **puissance (W)** mais pas d'on/off | créer un helper **Seuil** (Paramètres → Appareils et services → Assistants) pour transformer les watts en `binary_sensor`, puis y pointer la carte |
| Pompe pilotée par un contrôleur piscine (Oklyn, etc.) | le `switch.*` / `binary_sensor.*` auxiliaire du contrôleur |

Le débit (mL/min) est réglé dans la carte, donc tant que vous avez un signal "la pompe tourne", la consommation est calculée automatiquement. Si vous dosez **à la main** (sans pompe), le calcul automatique ne s'applique pas — mais vous pouvez quand même utiliser le **panneau d'ajustement +/-** pour suivre le niveau du bidon manuellement.

**Un helper `input_number`** pour conserver le volume consommé entre les redémarrages de HA.

Le créer via **Paramètres → Appareils et services → Assistants → Créer un assistant → Nombre** :

| Champ | Valeur |
|---|---|
| Nom | _(votre choix, ex. "Chlore consommé")_ |
| ID d'entité | _(votre choix, ex. `dosing_tank_consumed`)_ |
| Minimum | `0` |
| Maximum | `9999999` |
| Pas | `1` |
| Unité | `mL` |

Ou ajouter dans `configuration.yaml` :

```yaml
input_number:
  dosing_tank_consumed:
    name: "Bidon de dosage — volume consommé"
    min: 0
    max: 9999999
    step: 1
    unit_of_measurement: mL
    icon: mdi:cup-water
    mode: box
```

---

## Installation

### Via HACS (recommandé)

1. Dans HACS → **Frontend** → **⋮** → **Dépôts personnalisés**
2. Ajouter `https://github.com/ADNPolymerase/ha-dosing-tank-card` — catégorie **Lovelace**
3. Cliquer sur **Télécharger**
4. Recharger le navigateur en vidant le cache (`Shift`+`F5`)

### Manuelle

1. Télécharger `dosing-tank-card.js` depuis la [dernière version](../../releases/latest)
2. Copier vers `config/www/dosing-tank-card.js`
3. **Paramètres → Tableaux de bord → ⋮ → Ressources → Ajouter une ressource**
   - URL : `/local/dosing-tank-card.js`
   - Type : Module JavaScript
4. Recharger le navigateur en vidant le cache

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
| `language` | `string` | | auto | Forcer la langue : `en`, `fr`, `es`, `de`, `it`, `nl` (défaut : auto-détectée depuis la locale HA) |

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

### Suivi du volume

Chaque fois que la pompe passe sur **OFF**, la carte calcule la durée de la session et appelle `input_number.set_value` pour incrémenter le compteur de mL consommés :

```
restant = tank_volume_liters × 1000 − input_number.state − session_en_cours_mL
```

> **Remarque :** le compteur n'est incrémenté que lorsqu'un onglet du navigateur avec cette carte est ouvert. Pour un suivi précis en arrière-plan, utilisez l'automatisation ci-dessous.

### Graphique en barres sur 7 jours

Interroge l'API REST de l'historique HA — aucun capteur supplémentaire nécessaire. Rafraîchi toutes les 15 minutes.

### Réinitialisation

Cliquez sur le bouton de réinitialisation lorsque vous remplissez le bidon. Cela remet l'`input_number` à `0`.

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

Dupliquer et ajuster pour chaque bidon supplémentaire.

---

## Types d'entités compatibles

| Type d'entité | Remarques |
|---|---|
| `switch.*` | Support complet |
| `input_boolean.*` | Support complet |
| `binary_sensor.*` | Graphique et affichage fonctionnels ; utiliser l'automatisation pour les mises à jour du compteur |

---

## Licence

MIT — voir [LICENSE](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
