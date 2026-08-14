# Dosing Tank Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card)
[![GitHub Release](https://badgen.net/github/release/ADNPolymerase/ha-dosing-tank-card)](https://github.com/ADNPolymerase/ha-dosing-tank-card/releases)
[![Validate](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/actions/workflows/hacs.yml)
[![HA Version](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-blue.svg)](https://www.home-assistant.io/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?logo=buy-me-a-coffee)](https://buymeacoffee.com/adnpolymerase)

<a href="https://buymeacoffee.com/adnpolymerase" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-orange.png" alt="Buy Me A Coffee" height="60"></a>
<a href="https://adnpolymerase.github.io/HA/" target="_blank"><img src="https://raw.githubusercontent.com/ADNPolymerase/HA/main/assets/site-button.svg" alt="Link to my github.io for my other projects" height="60"></a>

Une carte Lovelace pour suivre le niveau d'une cuve. Deux modes :

- **Temps de pompe** : chlore, pH−, pH+, floculant, algicide, ou tout produit injecté par une pompe à débit constant. La carte compte la pompe et convertit en millilitres.
- **Niveau direct** : un bac à sel d'adoucisseur, une sonde ESP32 sur un bidon, ou tout ce dont le niveau est déjà remonté par un capteur. La carte le lit et y ajoute un historique de consommation et une estimation d'autonomie.

> 🇬🇧 [Read in English](README.md)

![Capture d'écran](https://raw.githubusercontent.com/ADNPolymerase/ha-dosing-tank-card/main/docs/screenshot.fr.png)

---

## Fonctionnalités

- **Bidon SVG animé** avec couleur de liquide configurable, badge pompe en temps réel et alerte de niveau bas (carte rouge + bannière).
- **3 métriques clés** (volume restant en L, consommation du jour en mL, marche pompe sur 7 jours), plus un **graphique en barres 7 jours** construit depuis l'historique HA, aucun capteur supplémentaire.
- **Comptage en arrière-plan** : le temps de marche est reconstitué depuis l'API d'historique HA, donc rien n'est perdu quand aucun onglet n'est ouvert. Aucune automatisation nécessaire.
- **Panneau d'ajustement repliable** avec Ajouter/Retirer/Réinitialiser, masqué par défaut.
- **Ou pas de pompe du tout** : pointez-la sur un capteur de niveau et elle affiche le niveau, la consommation sur 7 jours et l'autonomie restante.
- **Multilingue** (11 langues : FR, EN, ES, DE, IT, NL, SV, NO, DA, PL, RU, auto-détectée depuis HA), mode sombre, responsive, zéro dépendance.

---

## Prérequis

> Toute cette section concerne le **mode temps de pompe**. En [mode niveau direct](#mode-niveau-direct), le capteur suffit : aucun helper, aucune pompe.

**Une entité pompe** : n'importe quel `switch.*`, `input_boolean.*` ou `binary_sensor.*` dont l'état est `on` pendant l'injection du produit. Pas besoin d'une « pompe doseuse connectée » :

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
| `<nom> consumed` | **Nombre**, min `0`, max `9999999`, pas `1`, unité `mL` | volume consommé, conservé entre les redémarrages |
| `<nom> sync` | **Date et/ou heure**, date **et** heure | repère : jusqu'où le temps de marche a déjà été comptabilisé |
| `<nom> flow rate` | **Nombre**, unité `mL/min` | *optionnel*, débit en direct, remplace `flow_rate_ml_per_min` |

> ⚠️ Sans `sync_entity`, la carte affiche bien un niveau en direct pendant que la pompe tourne, mais **n'écrit jamais dans le compteur** : la valeur est perdue dès l'arrêt de la pompe.

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
# flow_entity: input_number.dosing_tank_flow_rate  # optionnel, débit en direct
# language: "fr"  # optionnel, auto-détecté depuis la locale HA par défaut
```

### Options

| Option | Type | Requis | Défaut | Description |
|---|---|---|---|---|
| `pump_entity` | `string` | ✅ ¹ |  | Entité switch pilotant la pompe doseuse |
| `reset_entity` | `string` | ✅ ¹ |  | Entité `input_number` (ou `number`) qui stocke les mL consommés |
| `sync_entity` | `string` | ✅ ¹ |  | Entité `input_datetime` (date + heure) portant le repère de rattrapage. **Sans elle, la carte n'écrit jamais le compteur elle-même**, le niveau ne bouge donc que si autre chose s'en charge |
| `flow_entity` | `string` | ¹ |  | Entité `input_number` portant le débit en direct (mL/min) ; prend le pas sur `flow_rate_ml_per_min` si > 0 |
| `flow_rate_ml_per_min` | `number` | ¹ | `15` | Débit de la pompe en mL/min |
| `tank_volume_liters` | `number` | ¹ | `5` | Capacité du bidon en litres |
| `level_entity` | `string` | ✅ ² |  | Capteur remontant le niveau. **La renseigner bascule la carte en mode niveau direct** et toute la chaîne pompe ci-dessus devient sans objet |
| `level_full` | `number` | ² | `100` si l'unité est `%` | Valeur du capteur bidon plein |
| `level_empty` | `number` | ² | `0` | Valeur du capteur bidon vide |
| `capacity` | `number` | ² |  | Ce que contient physiquement une cuve pleine, pour lire les quantités en kg ou en litres même si le capteur ne remonte qu'un pourcentage |
| `capacity_unit` | `string` | ² |  | Unité affichée à côté de ces quantités (`kg`, `L`…) |
| `color_mode` | `string` | | `"fixed"` | `"level"` colore le bidon selon le remplissage au lieu d'utiliser `liquid_color` |
| `warn_threshold_percent` | `number` | | `50` | Orange en dessous, rouge sous `alert_threshold_percent`. Utilisé uniquement par `color_mode: level` |
| `alert_threshold_percent` | `number` | | `20` | Seuil d'alerte (%) |
| `layout` | `string` | | `"rows"` | `"columns"` donne au bidon la hauteur de la carte et déplace les trois tuiles à côté. Un sélecteur existe pour ça dans l'éditeur visuel |
| `show_chart` | `boolean` | | `true` | `false` retire le graphe de consommation journalière. Un adoucisseur régénère toutes les deux semaines environ, où un graphe jour par jour n'apprend pas grand-chose |
| `last_update` | `string` | | `"off"` | `"changed"` ou `"reported"` affiche une ligne de dernière mise à jour sous le bidon, qui survit donc au masquage du bloc Paramètres. **Les deux ne répondent pas à la même question** : `changed` date le dernier mouvement du niveau, soit la dernière régénération sur un adoucisseur ; `reported` date la dernière réponse du capteur, ce qui seul prouve qu'il est encore vivant. En mode temps de pompe, la même ligne date la pompe : `changed` donne la fin de la dernière injection, `reported` la dernière réponse du switch |
| `show_settings` | `boolean` | | `true` | `false` retire le bloc Paramètres en bas de la carte. Une case à cocher existe pour ça dans l'éditeur visuel |
| `name` | `string` | | `"Dosing Tank"` | Titre affiché dans l'en-tête de la carte |
| `liquid_color` | `string` | | `"#3b82f6"` | Couleur du liquide (toute couleur CSS hexadécimale) |
| `language` | `string` | | auto | Forcer la langue : `en`, `fr`, `es`, `de`, `it`, `nl`, `sv`, `no`, `da`, `pl`, `ru` (défaut : auto-détectée depuis la locale HA) |

¹ mode temps de pompe uniquement &nbsp;&nbsp; ² mode niveau direct uniquement

---

## Mode niveau direct

Pour une cuve dont le niveau est déjà mesuré, par exemple un bac à sel d'adoucisseur, une sonde ESP32, ou n'importe quel `sensor.*` contenant un nombre. Renseignez `level_entity` et la carte cesse totalement de compter le temps de pompe : plus de compteur, plus de repère, plus de panneau d'ajustement.

![Mode niveau direct](https://raw.githubusercontent.com/ADNPolymerase/ha-dosing-tank-card/main/docs/screenshot-direct.fr.png)

```yaml
type: custom:dosing-tank-card
level_entity: sensor.adoucisseur_niveau_sel
level_full: 25          # kg dans un bac plein
name: "Sel adoucisseur"
liquid_color: "#94a3b8"
alert_threshold_percent: 15
```

Un capteur qui remonte déjà des `%` n'a besoin d'aucune plage. Pour toute autre unité, `level_full` indique ce que lit le capteur quand la cuve est pleine.

**Lire une cuve en kilos.** Un adoucisseur remonte un pourcentage, alors que ce qu'on veut savoir c'est combien il reste de sel. `capacity` indique ce que contient une cuve pleine, et toutes les quantités suivent : restant, consommation 7 jours, graphe et son titre. Le niveau reste mesuré par le capteur, `capacity` ne change que l'unité dans laquelle on compte.

```yaml
level_entity: sensor.adoucisseur_niveau_sel
capacity: 35
capacity_unit: "kg"
```

**Les sondes inversées fonctionnent telles quelles.** Un capteur ultrason mesure la distance jusqu'à la surface : une cuve pleine donne donc une *petite* valeur. Donnez simplement les deux lectures dans cet ordre :

```yaml
level_entity: sensor.ph_moins_distance
level_full: 5           # cm entre le capteur et la surface, cuve pleine
level_empty: 30         # cm, cuve vide
```

Les trois tuiles changent de sens dans ce mode. Deux sont fixes : la consommation des 7 derniers jours, et l'**autonomie**, combien de temps la cuve tient au rythme moyen récent. La première s'adapte : sur un capteur en `%` seul elle affiche la consommation moyenne par jour, puisque le niveau est déjà inscrit sur le bidon ; sinon elle affiche ce qu'il reste, ce qui sur une sonde inversée est la hauteur de liquide et non la distance brute. Renseigner `capacity` donne à ce chiffre un sens propre, il repasse donc en quantité restante.

Cette moyenne ignore délibérément les journées où le niveau est **monté** : un remplissage masque ce qui a été consommé en parallèle, et le compter comme une journée à consommation nulle gonflerait l'autonomie d'une cuve qui est en réalité en train de se vider. Les jours de remplissage apparaissent en `+` vert dans le graphe. Les journées où le niveau n'a réellement pas bougé sont conservées, car un adoucisseur qui n'a pas régénéré, c'est une vraie information. L'autonomie affiche `—` tant qu'il n'y a pas au moins deux journées complètes de baisse.

---

### Suggestions de couleurs

| Produit | Couleur | Hex |
|---|---|---|
| Chlore (liquide) | Bleu | `#3b82f6` |
| pH− | Orange | `#f97316` |
| pH+ | Violet | `#8b5cf6` |
| Floculant | Jaune | `#eab308` |
| Algicide | Vert | `#22c55e` |

**Ou colorer selon le niveau.** `color_mode: level` ignore `liquid_color` et peint le bidon en vert au-dessus de `warn_threshold_percent` (50 par défaut), en orange en dessous, en rouge sous `alert_threshold_percent` (20). Désactivé par défaut, parce que `liquid_color` est ce qui distingue un bidon de chlore d'un bidon de pH− au premier coup d'œil. Fonctionne dans les deux modes.


---

## Fonctionnement

`restant = volume_bidon × 1000 − consommé`, le consommé étant le temps de marche de la pompe × le débit.

Le temps de marche est reconstitué depuis l'**API d'historique de Home Assistant**, pas depuis l'onglet ouvert. `sync_entity` conserve un repère : l'instant jusqu'auquel le temps de marche a déjà été comptabilisé. À chaque rafraîchissement (toutes les 15 min, et immédiatement à l'arrêt de la pompe), la carte ajoute dans `reset_entity` tout ce que la pompe a tourné depuis ce repère, puis avance le repère. Rien n'est donc perdu quand aucun onglet n'est ouvert : le rattrapage se fait au prochain affichage de la carte, jusqu'à 90 jours en arrière.

Le graphique 7 jours est construit depuis le même historique. Le bouton de réinitialisation remet le compteur à `0` et place le repère à maintenant, quand vous remplissez le bidon.

N'importe quelle entité dont l'état est `on` pendant l'injection convient : `switch.*`, `input_boolean.*` comme `binary_sensor.*`.

---

## Migration depuis la v0.1.x

Jusqu'à la v0.1.3, le compteur n'avançait que lorsqu'un onglet était ouvert, et ce README proposait une automatisation pour l'incrémenter à chaque arrêt de pompe. Depuis la **v0.2.0**, la carte fait le rattrapage elle-même depuis l'historique. Si vous venez d'une version plus ancienne :

1. Ajoutez une `sync_entity` (voir [Prérequis](#prérequis)). Sans elle, le compteur n'est jamais écrit.
2. **Supprimez cette ancienne automatisation.** Avec `sync_entity` renseignée, l'automatisation et la carte compteraient chacune le même cycle de pompe, doublant votre consommation.

---

## Licence

MIT, voir [LICENSE](https://github.com/ADNPolymerase/ha-dosing-tank-card/blob/main/LICENSE)
