/**
 * dosing-tank-card — Home Assistant Lovelace custom card
 * Tracks the level of a tank, either from pump runtime × flow rate, or read
 * straight off a level sensor (softener salt tank, ESP32 probe…).
 *
 * Config — pump-runtime mode:
 *   type: custom:dosing-tank-card
 *   pump_entity: switch.pool_chlorine_pump      (required)
 *   reset_entity: input_number.dosing_consumed  (required)
 *   sync_entity: input_datetime.dosing_sync     (required — catch-up watermark;
 *                                                without it the card never
 *                                                writes the counter itself)
 *   flow_entity: input_number.dosing_flow_rate  (optional — live flow rate)
 *   flow_rate_ml_per_min: 15
 *   tank_volume_liters: 5
 *   alert_threshold_percent: 20
 *   name: "Chlorine"
 *   liquid_color: "#3b82f6"
 *   language: "fr"    # optional override (auto-detected from HA locale)
 *
 * Config — direct-level mode (level_entity replaces the whole pump chain):
 *   level_entity: sensor.softener_salt_level   (required in this mode)
 *   level_full: 25      # sensor value for a full tank  (default 100 if unit is %)
 *   level_empty: 0      # sensor value for an empty tank
 *   # level_full MAY be lower than level_empty: an ultrasonic probe reads the
 *   # distance down to the surface, so a full tank reads small. The mapping
 *   # inverts itself, no extra option needed.
 *   capacity: 35        # what a full tank physically holds, so quantities can
 *   capacity_unit: "kg" # be read in kg or L behind a percentage-only sensor
 *
 * Config — both modes:
 *   color_mode: "level"        # green / amber / red by fill instead of
 *   warn_threshold_percent: 50 # liquid_color. Amber below this, red below
 *                              # alert_threshold_percent. Default is "fixed".
 */

// ── i18n ─────────────────────────────────────────────────────────────────────

const DTL = {
  en: {
    remaining:'Remaining', today:'Today', pump7d:'Pump 7d',
    dailyChart:'Daily consumption (mL)', settings:'Settings',
    flowRate:'Flow rate', tankSize:'Tank size', alertAt:'Alert at',
    totalUsed:'Total used', adjust:'Adjust', loading:'Loading…',
    noData:'No data yet',
    lowLevel: p=>`⚠️ Low level — refill soon (${p}% remaining)`,
    helperMissing:'Counter not found', createHelper:'Create counter',
    creating:'Creating…', helperCreated: id=>`Created: ${id}`,
    syncMissing:'No sync helper: the card does not write the counter itself',
    saveInEditor:'Add them in the card editor to keep them after a reload.',
    adjustQty:'Adjust quantity', addToTank:'Add to tank',
    removeFromTank:'Remove from tank', resetFull:'Tank refilled — Reset',
    resetting:'Resetting…', on:'ON', off:'OFF',
    autonomy:'Autonomy', days7:'7 days', levelSource:'Source', levelRange:'Range',
    qtyLeft: q=>`${q} left`,
    lastUpdate:'Last update', inverted:'inverted', fmtDays: d=>`${d} d`,
    sensorMissing:'Level sensor not found', sensorUnavailable:'Level sensor unavailable',
    rangeMissing:'Set the full-tank value', refill:'Refill',
    dailyChartU: u=>`Daily consumption (${u})`,
    avgDaily:'Daily avg', perDay: v=>`${v}/d`,
    // editor
    edEntities:'Entities', edPump:'Pump entity',
    edCounter:'Counter (mL)', edFlowEnt:'Flow-rate entity (mL/min)',
    edSync:'Sync entity', edTank:'Tank',
    edFlowRate:'Flow rate (mL/min)', edTankVol:'Tank volume (L)',
    edAlert:'Alert threshold (%)', edLang:'Language',
    edAppearance:'Appearance', edTitle:'Card title', edColor:'Liquid color',
    edMode:'Mode', edModePump:'Pump runtime', edModeDirect:'Direct level',
    edLevelEnt:'Level entity', edFull:'Value when full', edEmpty:'Value when empty',
    edCapacity:'Full-tank quantity', edCapacityUnit:'Unit',
    edColorMode:'Color mode', edColorFixed:'Fixed color', edColorLevel:'By level',
    edWarn:'Warning threshold (%)',
    edShowSettings:'Show the settings block',
    edLayout:'Layout', edLayoutRows:'Metrics on top', edLayoutCols:'Tank on the side',
  },
  fr: {
    remaining:'Restant', today:"Aujourd'hui", pump7d:'Pompe 7j',
    dailyChart:'Consommation journalière (mL)', settings:'Paramètres',
    flowRate:'Débit', tankSize:'Volume bidon', alertAt:'Alerte à',
    totalUsed:'Total consommé', adjust:'Ajustement', loading:'Chargement…',
    noData:'Aucune donnée',
    lowLevel: p=>`⚠️ Niveau bas — rechargez dès que possible (${p}% restant)`,
    helperMissing:'Compteur introuvable', createHelper:'Créer le compteur',
    creating:'Création…', helperCreated: id=>`Créé : ${id}`,
    syncMissing:"Sans entité sync, la carte n'écrit pas le compteur elle-même",
    saveInEditor:"Renseignez-les dans l'éditeur de carte pour les conserver après rechargement.",
    adjustQty:'Ajuster la quantité', addToTank:'Ajouter au bidon',
    removeFromTank:'Retirer du bidon', resetFull:'Bidon rempli — Réinitialiser',
    resetting:'Réinitialisation…', on:'ACTIF', off:'INACTIF',
    autonomy:'Autonomie', days7:'7 jours', levelSource:'Source', levelRange:'Plage',
    qtyLeft: q=>`${q} restant`,
    lastUpdate:'Dernière MAJ', inverted:'inversée', fmtDays: d=>`${d} j`,
    sensorMissing:'Capteur de niveau introuvable', sensorUnavailable:'Capteur de niveau indisponible',
    rangeMissing:'Renseignez la valeur bidon plein', refill:'Remplissage',
    dailyChartU: u=>`Consommation journalière (${u})`,
    avgDaily:'Moyenne/j', perDay: v=>`${v}/j`,
    // editor
    edEntities:'Entités', edPump:'Entité pompe',
    edCounter:'Compteur (mL)', edFlowEnt:'Entité débit (mL/min)',
    edSync:'Entité sync', edTank:'Bidon',
    edFlowRate:'Débit (mL/min)', edTankVol:'Volume du bidon (L)',
    edAlert:'Seuil d\'alerte (%)', edLang:'Langue',
    edAppearance:'Apparence', edTitle:'Titre de la carte', edColor:'Couleur du liquide',
    edMode:'Mode', edModePump:'Temps de pompe', edModeDirect:'Niveau direct',
    edLevelEnt:'Entité niveau', edFull:'Valeur plein', edEmpty:'Valeur vide',
    edCapacity:'Quantité bidon plein', edCapacityUnit:'Unité',
    edColorMode:'Mode couleur', edColorFixed:'Couleur fixe', edColorLevel:'Par palier',
    edWarn:"Seuil d'avertissement (%)",
    edShowSettings:'Afficher le bloc Paramètres',
    edLayout:'Disposition', edLayoutRows:'Métriques en haut', edLayoutCols:'Bidon sur le côté',
  },
  es: {
    remaining:'Restante', today:'Hoy', pump7d:'Bomba 7d',
    dailyChart:'Consumo diario (mL)', settings:'Ajustes',
    flowRate:'Caudal', tankSize:'Volumen depósito', alertAt:'Alerta a',
    totalUsed:'Total usado', adjust:'Ajuste', loading:'Cargando…',
    noData:'Sin datos',
    lowLevel: p=>`⚠️ Nivel bajo — recargar pronto (${p}% restante)`,
    helperMissing:'Contador no encontrado', createHelper:'Crear contador',
    creating:'Creando…', helperCreated: id=>`Creado: ${id}`,
    syncMissing:'Sin entidad de sincronización, la tarjeta no escribe el contador',
    saveInEditor:'Añádelos en el editor de la tarjeta para conservarlos tras recargar.',
    adjustQty:'Ajustar cantidad', addToTank:'Añadir al depósito',
    removeFromTank:'Retirar del depósito', resetFull:'Depósito lleno — Reiniciar',
    resetting:'Reiniciando…', on:'ON', off:'OFF',
    autonomy:'Autonomía', days7:'7 días', levelSource:'Fuente', levelRange:'Rango',
    qtyLeft: q=>`${q} restante`,
    lastUpdate:'Última act.', inverted:'invertido', fmtDays: d=>`${d} d`,
    sensorMissing:'Sensor de nivel no encontrado', sensorUnavailable:'Sensor de nivel no disponible',
    rangeMissing:'Indique el valor de depósito lleno', refill:'Rellenado',
    dailyChartU: u=>`Consumo diario (${u})`,
    avgDaily:'Media diaria', perDay: v=>`${v}/d`,
    // editor
    edEntities:'Entidades', edPump:'Entidad bomba',
    edCounter:'Contador (mL)', edFlowEnt:'Entidad caudal (mL/min)',
    edSync:'Entidad sync', edTank:'Depósito',
    edFlowRate:'Caudal (mL/min)', edTankVol:'Volumen (L)',
    edAlert:'Umbral de alerta (%)', edLang:'Idioma',
    edAppearance:'Apariencia', edTitle:'Título de la tarjeta', edColor:'Color del líquido',
    edMode:'Modo', edModePump:'Tiempo de bomba', edModeDirect:'Nivel directo',
    edLevelEnt:'Entidad de nivel', edFull:'Valor lleno', edEmpty:'Valor vacío',
    edCapacity:'Cantidad depósito lleno', edCapacityUnit:'Unidad',
    edColorMode:'Modo de color', edColorFixed:'Color fijo', edColorLevel:'Por nivel',
    edWarn:'Umbral de aviso (%)',
    edShowSettings:'Mostrar el bloque de ajustes',
    edLayout:'Disposición', edLayoutRows:'Métricas arriba', edLayoutCols:'Depósito al lado',
  },
  ru: {
    remaining:'Осталось', today:'Сегодня', pump7d:'Насос 7д',
    dailyChart:'Суточный расход (мл)', settings:'Настройки',
    flowRate:'Расход', tankSize:'Объём бака', alertAt:'Оповещение при',
    totalUsed:'Всего использовано', adjust:'Корректировка', loading:'Загрузка…',
    noData:'Пока нет данных',
    lowLevel: p=>`⚠️ Низкий уровень — пополните бак (${p}% осталось)`,
    helperMissing:'Счётчик не найден', createHelper:'Создать счётчик',
    creating:'Создание…', helperCreated: id=>`Создано: ${id}`,
    syncMissing:'Без сущности синхронизации карточка сама не пишет счётчик',
    saveInEditor:'Добавьте их в редакторе карточки, чтобы сохранить после перезагрузки.',
    adjustQty:'Изменить количество', addToTank:'Добавить в бак',
    removeFromTank:'Убрать из бака', resetFull:'Бак заполнен — Сбросить',
    resetting:'Сброс…', on:'ВКЛ', off:'ВЫКЛ',
    autonomy:'Автономность', days7:'7 дней', levelSource:'Источник', levelRange:'Диапазон',
    qtyLeft: q=>`осталось ${q}`,
    lastUpdate:'Обновлено', inverted:'инвертирован', fmtDays: d=>`${d} д`,
    sensorMissing:'Датчик уровня не найден', sensorUnavailable:'Датчик уровня недоступен',
    rangeMissing:'Укажите значение полного бака', refill:'Пополнение',
    dailyChartU: u=>`Суточный расход (${u})`,
    avgDaily:'В среднем/д', perDay: v=>`${v}/д`,
    // editor
    edEntities:'Сущности', edPump:'Сущность насоса',
    edCounter:'Счётчик (мл)', edFlowEnt:'Сущность расхода (мл/мин)',
    edSync:'Сущность синхронизации', edTank:'Бак',
    edFlowRate:'Расход (мл/мин)', edTankVol:'Объём бака (л)',
    edAlert:'Порог оповещения (%)', edLang:'Язык',
    edAppearance:'Внешний вид', edTitle:'Заголовок карточки', edColor:'Цвет жидкости',
    edMode:'Режим', edModePump:'Время работы насоса', edModeDirect:'Прямой уровень',
    edLevelEnt:'Сущность уровня', edFull:'Значение при полном', edEmpty:'Значение при пустом',
    edCapacity:'Объём полного бака', edCapacityUnit:'Единица',
    edColorMode:'Режим цвета', edColorFixed:'Фиксированный цвет', edColorLevel:'По уровню',
    edWarn:'Порог предупреждения (%)',
    edShowSettings:'Показывать блок настроек',
    edLayout:'Расположение', edLayoutRows:'Метрики сверху', edLayoutCols:'Бак сбоку',
  },
  de: {
    remaining:'Verbleibend', today:'Heute', pump7d:'Pumpe 7T',
    dailyChart:'Tagesverbrauch (mL)', settings:'Einstellungen',
    flowRate:'Durchfluss', tankSize:'Tankvolumen', alertAt:'Alarm bei',
    totalUsed:'Gesamt verbraucht', adjust:'Anpassen', loading:'Lädt…',
    noData:'Keine Daten',
    lowLevel: p=>`⚠️ Niedriger Stand — bald nachfüllen (${p}% verbleibend)`,
    helperMissing:'Zähler nicht gefunden', createHelper:'Zähler erstellen',
    creating:'Erstelle…', helperCreated: id=>`Erstellt: ${id}`,
    syncMissing:'Ohne Sync-Entität schreibt die Karte den Zähler nicht selbst',
    saveInEditor:'Trage sie im Karten-Editor ein, damit sie nach dem Neuladen erhalten bleiben.',
    adjustQty:'Menge anpassen', addToTank:'Zum Tank hinzufügen',
    removeFromTank:'Aus Tank entnehmen', resetFull:'Tank voll — Zurücksetzen',
    resetting:'Zurücksetzen…', on:'AN', off:'AUS',
    autonomy:'Reichweite', days7:'7 Tage', levelSource:'Quelle', levelRange:'Bereich',
    qtyLeft: q=>`${q} verbleibend`,
    lastUpdate:'Zuletzt akt.', inverted:'invertiert', fmtDays: d=>`${d} T`,
    sensorMissing:'Füllstandsensor nicht gefunden', sensorUnavailable:'Füllstandsensor nicht verfügbar',
    rangeMissing:'Wert für vollen Tank angeben', refill:'Nachfüllung',
    dailyChartU: u=>`Tagesverbrauch (${u})`,
    avgDaily:'Ø pro Tag', perDay: v=>`${v}/T`,
    // editor
    edEntities:'Entitäten', edPump:'Pumpen-Entität',
    edCounter:'Zähler (mL)', edFlowEnt:'Durchfluss-Entität (mL/min)',
    edSync:'Sync-Entität', edTank:'Tank',
    edFlowRate:'Durchfluss (mL/min)', edTankVol:'Tankvolumen (L)',
    edAlert:'Alarmschwelle (%)', edLang:'Sprache',
    edAppearance:'Darstellung', edTitle:'Kartentitel', edColor:'Flüssigkeitsfarbe',
    edMode:'Modus', edModePump:'Pumpenlaufzeit', edModeDirect:'Direkter Füllstand',
    edLevelEnt:'Füllstand-Entität', edFull:'Wert bei voll', edEmpty:'Wert bei leer',
    edCapacity:'Menge bei vollem Tank', edCapacityUnit:'Einheit',
    edColorMode:'Farbmodus', edColorFixed:'Feste Farbe', edColorLevel:'Nach Füllstand',
    edWarn:'Warnschwelle (%)',
    edShowSettings:'Einstellungsblock anzeigen',
    edLayout:'Anordnung', edLayoutRows:'Kennzahlen oben', edLayoutCols:'Tank an der Seite',
  },
  it: {
    remaining:'Rimanente', today:'Oggi', pump7d:'Pompa 7g',
    dailyChart:'Consumo giornaliero (mL)', settings:'Impostazioni',
    flowRate:'Portata', tankSize:'Volume serbatoio', alertAt:'Allarme a',
    totalUsed:'Totale consumato', adjust:'Regolazione', loading:'Caricamento…',
    noData:'Nessun dato',
    lowLevel: p=>`⚠️ Livello basso — ricaricare presto (${p}% rimanente)`,
    helperMissing:'Contatore non trovato', createHelper:'Crea contatore',
    creating:'Creazione…', helperCreated: id=>`Creato: ${id}`,
    syncMissing:'Senza entità sync, la scheda non scrive il contatore',
    saveInEditor:"Inseriscili nell'editor della scheda per conservarli dopo il ricaricamento.",
    adjustQty:'Regola quantità', addToTank:'Aggiungi al serbatoio',
    removeFromTank:'Rimuovi dal serbatoio', resetFull:'Serbatoio pieno — Azzera',
    resetting:'Azzerando…', on:'ON', off:'OFF',
    autonomy:'Autonomia', days7:'7 giorni', levelSource:'Sorgente', levelRange:'Intervallo',
    qtyLeft: q=>`${q} rimanente`,
    lastUpdate:'Ultimo agg.', inverted:'invertito', fmtDays: d=>`${d} g`,
    sensorMissing:'Sensore di livello non trovato', sensorUnavailable:'Sensore di livello non disponibile',
    rangeMissing:'Imposta il valore a serbatoio pieno', refill:'Riempimento',
    dailyChartU: u=>`Consumo giornaliero (${u})`,
    avgDaily:'Media/g', perDay: v=>`${v}/g`,
    // editor
    edEntities:'Entità', edPump:'Entità pompa',
    edCounter:'Contatore (mL)', edFlowEnt:'Entità portata (mL/min)',
    edSync:'Entità sync', edTank:'Serbatoio',
    edFlowRate:'Portata (mL/min)', edTankVol:'Volume serbatoio (L)',
    edAlert:'Soglia allarme (%)', edLang:'Lingua',
    edAppearance:'Aspetto', edTitle:'Titolo scheda', edColor:'Colore liquido',
    edMode:'Modalità', edModePump:'Tempo di pompa', edModeDirect:'Livello diretto',
    edLevelEnt:'Entità livello', edFull:'Valore pieno', edEmpty:'Valore vuoto',
    edCapacity:'Quantità serbatoio pieno', edCapacityUnit:'Unità',
    edColorMode:'Modalità colore', edColorFixed:'Colore fisso', edColorLevel:'Per livello',
    edWarn:'Soglia di avviso (%)',
    edShowSettings:'Mostra il blocco impostazioni',
    edLayout:'Disposizione', edLayoutRows:'Metriche in alto', edLayoutCols:'Serbatoio di lato',
  },
  nl: {
    remaining:'Resterend', today:'Vandaag', pump7d:'Pomp 7d',
    dailyChart:'Dagelijks verbruik (mL)', settings:'Instellingen',
    flowRate:'Doorstroomsnelheid', tankSize:'Tankinhoud', alertAt:'Alarm bij',
    totalUsed:'Totaal verbruikt', adjust:'Aanpassen', loading:'Laden…',
    noData:'Geen gegevens',
    lowLevel: p=>`⚠️ Laag niveau — spoedig bijvullen (${p}% resterend)`,
    helperMissing:'Teller niet gevonden', createHelper:'Teller aanmaken',
    creating:'Aanmaken…', helperCreated: id=>`Aangemaakt: ${id}`,
    syncMissing:'Zonder sync-entiteit schrijft de kaart de teller niet zelf',
    saveInEditor:'Voeg ze toe in de kaarteditor om ze na herladen te behouden.',
    adjustQty:'Hoeveelheid aanpassen', addToTank:'Toevoegen aan tank',
    removeFromTank:'Verwijderen uit tank', resetFull:'Tank gevuld — Resetten',
    resetting:'Resetten…', on:'AAN', off:'UIT',
    autonomy:'Autonomie', days7:'7 dagen', levelSource:'Bron', levelRange:'Bereik',
    qtyLeft: q=>`${q} resterend`,
    lastUpdate:'Laatste update', inverted:'omgekeerd', fmtDays: d=>`${d} d`,
    sensorMissing:'Niveausensor niet gevonden', sensorUnavailable:'Niveausensor niet beschikbaar',
    rangeMissing:'Stel de waarde bij volle tank in', refill:'Bijvullen',
    dailyChartU: u=>`Dagelijks verbruik (${u})`,
    avgDaily:'Gem. per dag', perDay: v=>`${v}/d`,
    // editor
    edEntities:'Entiteiten', edPump:'Pomp entiteit',
    edCounter:'Teller (mL)', edFlowEnt:'Doorstroom entiteit (mL/min)',
    edSync:'Sync entiteit', edTank:'Tank',
    edFlowRate:'Doorstroomsnelheid (mL/min)', edTankVol:'Tankinhoud (L)',
    edAlert:'Alarmdrempel (%)', edLang:'Taal',
    edAppearance:'Weergave', edTitle:'Kaarttitel', edColor:'Vloeistofkleur',
    edMode:'Modus', edModePump:'Pomplooptijd', edModeDirect:'Direct niveau',
    edLevelEnt:'Niveau-entiteit', edFull:'Waarde bij vol', edEmpty:'Waarde bij leeg',
    edCapacity:'Hoeveelheid volle tank', edCapacityUnit:'Eenheid',
    edColorMode:'Kleurmodus', edColorFixed:'Vaste kleur', edColorLevel:'Per niveau',
    edWarn:'Waarschuwingsdrempel (%)',
    edShowSettings:'Instellingenblok tonen',
    edLayout:'Indeling', edLayoutRows:'Metrieken bovenaan', edLayoutCols:'Tank aan de zijkant',
  },
  sv: {
    remaining:'Återstår', today:'Idag', pump7d:'Pump 7d',
    dailyChart:'Daglig förbrukning (mL)', settings:'Inställningar',
    flowRate:'Flöde', tankSize:'Tankstorlek', alertAt:'Larm vid',
    totalUsed:'Totalt använt', adjust:'Justera', loading:'Laddar…',
    noData:'Ingen data än',
    lowLevel: p=>`⚠️ Låg nivå — fyll på snart (${p}% kvar)`,
    helperMissing:'Räknare hittades inte', createHelper:'Skapa räknare',
    creating:'Skapar…', helperCreated: id=>`Skapad: ${id}`,
    syncMissing:'Utan synkroniseringsenhet skriver kortet inte räknaren självt',
    saveInEditor:'Lägg till dem i kortredigeraren för att behålla dem efter omladdning.',
    adjustQty:'Justera mängd', addToTank:'Lägg till i tank',
    removeFromTank:'Ta bort från tank', resetFull:'Tank påfylld — Återställ',
    resetting:'Återställer…', on:'PÅ', off:'AV',
    autonomy:'Räckvidd', days7:'7 dagar', levelSource:'Källa', levelRange:'Intervall',
    qtyLeft: q=>`${q} kvar`,
    lastUpdate:'Senast uppdaterad', inverted:'inverterad', fmtDays: d=>`${d} d`,
    sensorMissing:'Nivågivare hittades inte', sensorUnavailable:'Nivågivare otillgänglig',
    rangeMissing:'Ange värdet för full tank', refill:'Påfyllning',
    dailyChartU: u=>`Daglig förbrukning (${u})`,
    avgDaily:'Snitt/dag', perDay: v=>`${v}/d`,
    // editor
    edEntities:'Entiteter', edPump:'Pumpenhet',
    edCounter:'Räknare (mL)', edFlowEnt:'Flödesenhet (mL/min)',
    edSync:'Synkroniseringsenhet', edTank:'Tank',
    edFlowRate:'Flöde (mL/min)', edTankVol:'Tankvolym (L)',
    edAlert:'Larmnivå (%)', edLang:'Språk',
    edAppearance:'Utseende', edTitle:'Korttitel', edColor:'Vätskefärg',
    edMode:'Läge', edModePump:'Pumptid', edModeDirect:'Direkt nivå',
    edLevelEnt:'Nivåenhet', edFull:'Värde vid full', edEmpty:'Värde vid tom',
    edCapacity:'Mängd full tank', edCapacityUnit:'Enhet',
    edColorMode:'Färgläge', edColorFixed:'Fast färg', edColorLevel:'Efter nivå',
    edWarn:'Varningströskel (%)',
    edShowSettings:'Visa inställningsblocket',
    edLayout:'Layout', edLayoutRows:'Mätvärden överst', edLayoutCols:'Tank vid sidan',
  },
  no: {
    remaining:'Gjenstår', today:'I dag', pump7d:'Pumpe 7d',
    dailyChart:'Daglig forbruk (mL)', settings:'Innstillinger',
    flowRate:'Strømning', tankSize:'Tankstørrelse', alertAt:'Varsel ved',
    totalUsed:'Totalt brukt', adjust:'Juster', loading:'Laster…',
    noData:'Ingen data ennå',
    lowLevel: p=>`⚠️ Lavt nivå — fyll på snart (${p}% igjen)`,
    helperMissing:'Teller ikke funnet', createHelper:'Opprett teller',
    creating:'Oppretter…', helperCreated: id=>`Opprettet: ${id}`,
    syncMissing:'Uten synkenhet skriver ikke kortet telleren selv',
    saveInEditor:'Legg dem til i kortredigeringen for å beholde dem etter omlasting.',
    adjustQty:'Juster mengde', addToTank:'Legg til i tank',
    removeFromTank:'Fjern fra tank', resetFull:'Tank fylt — Tilbakestill',
    resetting:'Tilbakestiller…', on:'PÅ', off:'AV',
    autonomy:'Rekkevidde', days7:'7 dager', levelSource:'Kilde', levelRange:'Område',
    qtyLeft: q=>`${q} igjen`,
    lastUpdate:'Sist oppdatert', inverted:'invertert', fmtDays: d=>`${d} d`,
    sensorMissing:'Nivåsensor ikke funnet', sensorUnavailable:'Nivåsensor utilgjengelig',
    rangeMissing:'Angi verdien for full tank', refill:'Påfylling',
    dailyChartU: u=>`Daglig forbruk (${u})`,
    avgDaily:'Snitt/dag', perDay: v=>`${v}/d`,
    // editor
    edEntities:'Entiteter', edPump:'Pumpenhet',
    edCounter:'Teller (mL)', edFlowEnt:'Strømenhet (mL/min)',
    edSync:'Synkenhet', edTank:'Tank',
    edFlowRate:'Strømning (mL/min)', edTankVol:'Tankvolum (L)',
    edAlert:'Varselgrense (%)', edLang:'Språk',
    edAppearance:'Utseende', edTitle:'Korttittel', edColor:'Væskefarge',
    edMode:'Modus', edModePump:'Pumpetid', edModeDirect:'Direkte nivå',
    edLevelEnt:'Nivåenhet', edFull:'Verdi ved full', edEmpty:'Verdi ved tom',
    edCapacity:'Mengde full tank', edCapacityUnit:'Enhet',
    edColorMode:'Fargemodus', edColorFixed:'Fast farge', edColorLevel:'Etter nivå',
    edWarn:'Varselgrense (%)',
    edShowSettings:'Vis innstillingsblokken',
    edLayout:'Oppsett', edLayoutRows:'Måltall øverst', edLayoutCols:'Tank på siden',
  },
  da: {
    remaining:'Tilbage', today:'I dag', pump7d:'Pumpe 7d',
    dailyChart:'Dagligt forbrug (mL)', settings:'Indstillinger',
    flowRate:'Flow', tankSize:'Tankstørrelse', alertAt:'Alarm ved',
    totalUsed:'Total brugt', adjust:'Juster', loading:'Indlæser…',
    noData:'Ingen data endnu',
    lowLevel: p=>`⚠️ Lavt niveau — genopfyld snart (${p}% tilbage)`,
    helperMissing:'Tæller ikke fundet', createHelper:'Opret tæller',
    creating:'Opretter…', helperCreated: id=>`Oprettet: ${id}`,
    syncMissing:'Uden synkroniseringsenhed skriver kortet ikke selv tælleren',
    saveInEditor:'Tilføj dem i kortredigeringen for at bevare dem efter genindlæsning.',
    adjustQty:'Juster mængde', addToTank:'Tilføj til tank',
    removeFromTank:'Fjern fra tank', resetFull:'Tank fyldt — Nulstil',
    resetting:'Nulstiller…', on:'TIL', off:'FRA',
    autonomy:'Rækkevidde', days7:'7 dage', levelSource:'Kilde', levelRange:'Område',
    qtyLeft: q=>`${q} tilbage`,
    lastUpdate:'Sidst opdateret', inverted:'inverteret', fmtDays: d=>`${d} d`,
    sensorMissing:'Niveausensor ikke fundet', sensorUnavailable:'Niveausensor utilgængelig',
    rangeMissing:'Angiv værdien for fuld tank', refill:'Påfyldning',
    dailyChartU: u=>`Dagligt forbrug (${u})`,
    avgDaily:'Gns./dag', perDay: v=>`${v}/d`,
    // editor
    edEntities:'Entiteter', edPump:'Pumpeenhed',
    edCounter:'Tæller (mL)', edFlowEnt:'Flow entitet (mL/min)',
    edSync:'Synkroniseringsenhed', edTank:'Tank',
    edFlowRate:'Flow (mL/min)', edTankVol:'Tankvolumen (L)',
    edAlert:'Alarmgrænse (%)', edLang:'Sprog',
    edAppearance:'Udseende', edTitle:'Korttitel', edColor:'Væskefarve',
    edMode:'Tilstand', edModePump:'Pumpetid', edModeDirect:'Direkte niveau',
    edLevelEnt:'Niveauenhed', edFull:'Værdi ved fuld', edEmpty:'Værdi ved tom',
    edCapacity:'Mængde fuld tank', edCapacityUnit:'Enhed',
    edColorMode:'Farvetilstand', edColorFixed:'Fast farve', edColorLevel:'Efter niveau',
    edWarn:'Advarselsgrænse (%)',
    edShowSettings:'Vis indstillingsblokken',
    edLayout:'Layout', edLayoutRows:'Måltal øverst', edLayoutCols:'Tank i siden',
  },
  pl: {
    remaining:'Pozostało', today:'Dziś', pump7d:'Pompa 7d',
    dailyChart:'Dzienne zużycie (mL)', settings:'Ustawienia',
    flowRate:'Przepływ', tankSize:'Pojemność zbiornika', alertAt:'Alarm przy',
    totalUsed:'Łącznie zużyto', adjust:'Dostosuj', loading:'Ładowanie…',
    noData:'Brak danych',
    lowLevel: p=>`⚠️ Niski poziom — uzupełnij wkrótce (${p}% pozostało)`,
    helperMissing:'Licznik nie znaleziony', createHelper:'Utwórz licznik',
    creating:'Tworzenie…', helperCreated: id=>`Utworzono: ${id}`,
    syncMissing:'Bez encji sync karta sama nie zapisuje licznika',
    saveInEditor:'Dodaj je w edytorze karty, aby zachować je po przeładowaniu.',
    adjustQty:'Dostosuj ilość', addToTank:'Dodaj do zbiornika',
    removeFromTank:'Usuń ze zbiornika', resetFull:'Zbiornik napełniony — Reset',
    resetting:'Resetowanie…', on:'WŁ.', off:'WYŁ.',
    autonomy:'Autonomia', days7:'7 dni', levelSource:'Źródło', levelRange:'Zakres',
    qtyLeft: q=>`pozostało ${q}`,
    lastUpdate:'Ostatnia akt.', inverted:'odwrócony', fmtDays: d=>`${d} d`,
    sensorMissing:'Nie znaleziono czujnika poziomu', sensorUnavailable:'Czujnik poziomu niedostępny',
    rangeMissing:'Podaj wartość dla pełnego zbiornika', refill:'Napełnienie',
    dailyChartU: u=>`Dzienne zużycie (${u})`,
    avgDaily:'Śr./dzień', perDay: v=>`${v}/d`,
    // editor
    edEntities:'Encje', edPump:'Encja pompy',
    edCounter:'Licznik (mL)', edFlowEnt:'Encja przepływu (mL/min)',
    edSync:'Encja sync', edTank:'Zbiornik',
    edFlowRate:'Przepływ (mL/min)', edTankVol:'Pojemność (L)',
    edAlert:'Próg alarmu (%)', edLang:'Język',
    edAppearance:'Wygląd', edTitle:'Tytuł karty', edColor:'Kolor cieczy',
    edMode:'Tryb', edModePump:'Czas pracy pompy', edModeDirect:'Poziom bezpośredni',
    edLevelEnt:'Encja poziomu', edFull:'Wartość przy pełnym', edEmpty:'Wartość przy pustym',
    edCapacity:'Ilość przy pełnym', edCapacityUnit:'Jednostka',
    edColorMode:'Tryb koloru', edColorFixed:'Stały kolor', edColorLevel:'Wg poziomu',
    edWarn:'Próg ostrzeżenia (%)',
    edShowSettings:'Pokaż blok ustawień',
    edLayout:'Układ', edLayoutRows:'Metryki u góry', edLayoutCols:'Zbiornik z boku',
  },
};

// Mirrors HA's slugify to predict the entity_id generated from a helper name
function _slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// User-provided config values (name, colors, entity ids) end up inside template
// literals — escape them so a quote in a title cannot break the markup.
const _ESC = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
function _esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => _ESC[c]);
}

// Finite number or null. Guards against Number('') === 0 and the 'unavailable'
// / 'unknown' states a sensor can hold, both of which would read as a level.
function _num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Creates whichever of the three helpers the card needs is still missing:
// consumed counter (mL), flow-rate helper (mL/min) and the sync watermark.
// Shared by the card and the editor so both stay in step.
async function _ensureHelpers(hass, config) {
  const cardName = config.name || 'Dosing Tank';
  const cfg      = { ...config };
  const created  = [];

  if (!cfg.reset_entity || !hass?.states[cfg.reset_entity]) {
    const n = `${cardName} consumed`;
    await hass.callWS({
      type: 'input_number/create', name: n,
      min: 0, max: 9999999, step: 1,
      unit_of_measurement: 'mL', mode: 'box', icon: 'mdi:cup-water',
    });
    cfg.reset_entity = `input_number.${_slugify(n)}`;
    created.push(cfg.reset_entity);
  }
  // Flow-rate helper (mL/min) — seeded with the current config flow rate
  if (!cfg.flow_entity || !hass?.states[cfg.flow_entity]) {
    const n = `${cardName} flow rate`;
    await hass.callWS({
      type: 'input_number/create', name: n,
      min: 0, max: 100000, step: 1, initial: cfg.flow_rate_ml_per_min || 50,
      unit_of_measurement: 'mL/min', mode: 'box', icon: 'mdi:pump',
    });
    cfg.flow_entity = `input_number.${_slugify(n)}`;
    created.push(cfg.flow_entity);
  }
  // Sync watermark (input_datetime, date + time)
  if (!cfg.sync_entity || !hass?.states[cfg.sync_entity]) {
    const n = `${cardName} sync`;
    await hass.callWS({
      type: 'input_datetime/create', name: n,
      has_date: true, has_time: true, icon: 'mdi:clock-check',
    });
    cfg.sync_entity = `input_datetime.${_slugify(n)}`;
    created.push(cfg.sync_entity);
  }
  return { config: cfg, created };
}

// ── Visual editor ─────────────────────────────────────────────────────────────

class DosingTankCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config  = {};
    this._hass    = null;
    this._built   = false;
    this._touched = false;
  }

  set hass(hass) {
    this._hass = hass;
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(el => {
      if (el.hass !== hass) el.hass = hass;
    });
    this._syncCreateRow();
  }

  setConfig(config) {
    this._config = { ...config };
    // Which field group to show. Kept on the editor rather than in the config
    // so that picking "Direct level" reveals the entity picker before any
    // level_entity exists to infer the mode from.
    if (this._mode === undefined)
      this._mode = config.level_entity ? 'direct' : 'pump';
    // Home Assistant calls setConfig again after every config-changed the
    // editor itself emits. Rebuilding the form here would recreate the entity
    // pickers each time, and a picker recreated that way can emit an empty
    // value-changed which is then saved over a configured entity. That is how
    // a card silently loses its counter. Build once; afterwards refresh the
    // values in place, and only rebuild when the structure really differs.
    // Compared against the mode the DOM was built with, not the previous value
    // of _mode: the mode select changes _mode before setConfig ever runs.
    if (!this._built || this._builtMode !== this._mode) this._render();
    else this._syncFields();
  }

  /**
   * Whether a picker event should be written to the config.
   * Refuses echoes, and refuses to clear an entity that is already set until
   * the user has actually touched the form: an empty value arriving before any
   * interaction is the picker initialising, never a deliberate clear.
   */
  _acceptsPick(key, v) {
    const cur = this._config[key] ?? '';
    if (v === cur) return false;
    if (!v && cur && !this._touched) return false;
    return true;
  }

  // Refreshes values without touching the DOM structure.
  _syncFields() {
    const c = this._config;
    const set = (id, v) => {
      const el = this.shadowRoot.getElementById(id);
      if (el && el.value !== String(v)) el.value = v;
    };
    set('flow',   c.flow_rate_ml_per_min    ?? 15);
    set('volume', c.tank_volume_liters       ?? 5);
    set('alert',  c.alert_threshold_percent  ?? 20);
    set('name',   c.name                     ?? 'Dosing Tank');
    set('cpick',  c.liquid_color             ?? '#3b82f6');
    set('ctext',  c.liquid_color             ?? '#3b82f6');
    set('lang',   c.language                 ?? 'auto');
    set('lfull',  c.level_full               ?? '');
    set('lempty', c.level_empty              ?? '');
    set('cap',    c.capacity                 ?? '');
    set('capunit',c.capacity_unit            ?? '');
    set('warn',   c.warn_threshold_percent   ?? 50);
    set('cmode',  c.color_mode               ?? 'fixed');
    set('layout', c.layout                   ?? 'rows');
    const box = this.shadowRoot.getElementById('showset');
    if (box) box.checked = c.show_settings !== false;

    const keys = this._mode === 'direct'
      ? { 'level-wrap': 'level_entity' }
      : { 'pump-wrap': 'pump_entity',  'reset-wrap': 'reset_entity',
          'flow-wrap': 'flow_entity',  'sync-wrap':  'sync_entity' };
    for (const [wrapId, key] of Object.entries(keys)) {
      const el = this.shadowRoot.getElementById(wrapId)
        ?.querySelector('ha-entity-picker, input');
      const v = this._config[key] || '';
      if (el && el.value !== v) el.value = v;
    }
    this._syncCreateRow();
  }

  _syncCreateRow() {
    const row = this.shadowRoot?.getElementById('create-row');
    if (!row) return;
    const missing = !this._config.reset_entity
      || !this._hass?.states[this._config.reset_entity]
      || !this._config.sync_entity
      || !this._hass?.states[this._config.sync_entity];
    row.style.display = missing ? 'flex' : 'none';
  }

  _fire(cfg) {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: cfg }, bubbles: true, composed: true,
    }));
  }

  _t() {
    const lang = this._config?.language && this._config.language !== 'auto'
      ? this._config.language
      : (this._hass?.locale?.language || this._hass?.language || navigator.language || 'en');
    return DTL[lang.split('-')[0].toLowerCase()] || DTL.en;
  }

  _render() {
    const c = this._config;
    const T = this._t();
    const direct = this._mode === 'direct';
    const tiered = c.color_mode === 'level';
    const LANG_LABELS = {
      auto:'Auto (HA locale)', en:'English', fr:'Français',
      es:'Español', de:'Deutsch', it:'Italiano', nl:'Nederlands',
      sv:'Svenska', no:'Norsk', da:'Dansk', pl:'Polski', ru:'Русский',
    };
    const langOptions = Object.entries(LANG_LABELS)
      .map(([k,v]) => `<option value="${k}"${(c.language||'auto')===k?' selected':''}>${v}</option>`)
      .join('');

    this.shadowRoot.innerHTML = `
<style>
:host{display:block}
*{box-sizing:border-box}
.form{display:flex;flex-direction:column;gap:14px;padding:4px 0}
.sec{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;
  color:var(--secondary-text-color,#888);margin-bottom:-6px;margin-top:4px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field{display:flex;flex-direction:column;gap:4px}
.field label{font-size:12px;color:var(--secondary-text-color,#888)}
ha-entity-picker{display:block}
input[type=text],input[type=number],select{
  width:100%;padding:9px 10px;border-radius:6px;font-size:14px;
  background:var(--secondary-background-color,rgba(255,255,255,.06));
  color:var(--primary-text-color,#e1e1e1);
  border:1px solid var(--divider-color,rgba(255,255,255,.15));outline:none}
input:focus,select:focus{border-color:var(--primary-color,#03a9f4)}
.color-row{display:flex;align-items:center;gap:10px}
.color-row input[type=color]{width:40px;height:36px;padding:2px;border-radius:6px;
  border:1px solid var(--divider-color,rgba(255,255,255,.15));background:none;cursor:pointer}
.color-row input[type=text]{flex:1}
.create-row{display:flex;align-items:center;gap:8px;margin-top:4px}
.create-btn{flex:none;padding:7px 12px;border-radius:6px;font-size:12px;font-weight:600;
  cursor:pointer;border:1px solid var(--primary-color,#03a9f4);
  background:rgba(3,169,244,.1);color:var(--primary-color,#03a9f4);
  white-space:nowrap;transition:background .15s}
.create-btn:hover:not(:disabled){background:var(--primary-color,#03a9f4);color:#fff}
.create-btn:disabled{opacity:.5;cursor:default}
.create-status{font-size:11px;color:var(--secondary-text-color,#888);flex:1;word-break:break-all}
.check{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;
  color:var(--primary-text-color,#e1e1e1)}
.check input{width:16px;height:16px;margin:0;cursor:pointer;accent-color:var(--primary-color,#03a9f4)}
</style>
<div class="form">
  <div class="field">
    <label>${T.edMode}</label>
    <select id="mode">
      <option value="pump"${direct?'':' selected'}>${T.edModePump}</option>
      <option value="direct"${direct?' selected':''}>${T.edModeDirect}</option>
    </select>
  </div>

  <div class="sec">${T.edEntities}</div>
  ${direct?`<div class="field" id="level-wrap"></div>`:`
  <div class="field" id="pump-wrap"></div>
  <div class="field" id="reset-wrap"></div>
  <div class="field" id="flow-wrap"></div>
  <div class="field" id="sync-wrap"></div>
  <div class="create-row" id="create-row" style="display:none">
    <button class="create-btn" id="create-btn">✨ ${T.createHelper}</button>
    <span class="create-status" id="create-status"></span>
  </div>`}

  <div class="sec">${T.edTank}</div>
  ${direct?`<div class="grid2">
    <div class="field">
      <label>${T.edFull}</label>
      <input type="number" id="lfull" step="any" value="${c.level_full??''}">
    </div>
    <div class="field">
      <label>${T.edEmpty}</label>
      <input type="number" id="lempty" step="any" value="${c.level_empty??''}">
    </div>
  </div>
  <div class="grid2">
    <div class="field">
      <label>${T.edCapacity}</label>
      <input type="number" id="cap" min="0" step="any" value="${c.capacity??''}">
    </div>
    <div class="field">
      <label>${T.edCapacityUnit}</label>
      <input type="text" id="capunit" maxlength="8" placeholder="kg"
        value="${_esc(c.capacity_unit??'')}">
    </div>
  </div>`:`<div class="grid2">
    <div class="field">
      <label>${T.edFlowRate}</label>
      <input type="number" id="flow" min="0.1" step="0.1" value="${c.flow_rate_ml_per_min??15}">
    </div>
    <div class="field">
      <label>${T.edTankVol}</label>
      <input type="number" id="volume" min="0.1" step="0.1" value="${c.tank_volume_liters??5}">
    </div>
  </div>`}
  <div class="grid2">
    <div class="field">
      <label>${T.edAlert}</label>
      <input type="number" id="alert" min="0" max="100" step="1" value="${c.alert_threshold_percent??20}">
    </div>
    <div class="field">
      <label>${T.edLang}</label>
      <select id="lang">${langOptions}</select>
    </div>
  </div>

  <div class="sec">${T.edAppearance}</div>
  <div class="field">
    <label>${T.edTitle}</label>
    <input type="text" id="name" value="${_esc(c.name??'Dosing Tank')}">
  </div>
  <div class="grid2">
    <div class="field">
      <label>${T.edColorMode}</label>
      <select id="cmode">
        <option value="fixed"${tiered?'':' selected'}>${T.edColorFixed}</option>
        <option value="level"${tiered?' selected':''}>${T.edColorLevel}</option>
      </select>
    </div>
    <div class="field">
      <label>${T.edWarn}</label>
      <input type="number" id="warn" min="0" max="100" step="1"
        value="${c.warn_threshold_percent??50}">
    </div>
  </div>
  <div class="field">
    <label>${T.edColor}</label>
    <div class="color-row">
      <input type="color" id="cpick" value="${_esc(c.liquid_color??'#3b82f6')}">
      <input type="text"  id="ctext" value="${_esc(c.liquid_color??'#3b82f6')}" placeholder="#3b82f6" maxlength="7">
    </div>
  </div>
  <div class="field">
    <label>${T.edLayout}</label>
    <select id="layout">
      <option value="rows"${c.layout==='columns'?'':' selected'}>${T.edLayoutRows}</option>
      <option value="columns"${c.layout==='columns'?' selected':''}>${T.edLayoutCols}</option>
    </select>
  </div>
  <label class="check">
    <input type="checkbox" id="showset"${c.show_settings===false?'':' checked'}>
    ${T.edShowSettings}
  </label>
</div>`;

    // Entity pickers — label comes from ha-entity-picker itself (no duplicate <label>)
    const makePicker = (wrapId, key, label, onPick) => {
      const wrap = this.shadowRoot.getElementById(wrapId);
      if (!wrap) return;
      const pick = v => {
        if (!this._acceptsPick(key, v)) return;
        this._fire(onPick ? onPick(v) : { ...this._config, [key]: v });
      };
      const hasPicker = !!customElements.get('ha-entity-picker');
      if (hasPicker) {
        const p = document.createElement('ha-entity-picker');
        p.label = label;
        p.value = this._config[key] || '';
        p.allowCustomEntity = true;
        if (this._hass) p.hass = this._hass;
        p.addEventListener('value-changed', e => pick(e.detail.value));
        wrap.appendChild(p);
      } else {
        const lbl = document.createElement('label');
        lbl.textContent = label;
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = this._config[key] || '';
        inp.addEventListener('change', e => pick(e.target.value));
        wrap.appendChild(lbl);
        wrap.appendChild(inp);
      }
    };

    if (direct) {
      // Picking the sensor prefills the range from its own min/max when it has
      // them (number/input_number do), so a non-% sensor is one click away
      // from being usable instead of showing "set the full-tank value".
      makePicker('level-wrap', 'level_entity', T.edLevelEnt, v => {
        const next = { ...this._config, level_entity: v };
        const at   = this._hass?.states[v]?.attributes || {};
        if (next.level_full == null && at.unit_of_measurement !== '%') {
          const max = _num(at.max), min = _num(at.min);
          if (max !== null) { next.level_full = max; next.level_empty = min ?? 0; }
        }
        return next;
      });
    } else {
      makePicker('pump-wrap',  'pump_entity',  T.edPump);
      makePicker('reset-wrap', 'reset_entity', T.edCounter);
      makePicker('flow-wrap',  'flow_entity',  T.edFlowEnt);
      makePicker('sync-wrap',  'sync_entity',  T.edSync);

      // Wired once; visibility is refreshed by _syncCreateRow as config and
      // hass come in, so the row never needs the form to be rebuilt.
      this.shadowRoot.getElementById('create-btn')
        ?.addEventListener('click', () => this._createHelper());
      this._syncCreateRow();
    }

    // Mode switch. Leaving direct mode clears the level keys, otherwise the
    // card would keep reading the sensor whatever the editor shows.
    this.shadowRoot.getElementById('mode')?.addEventListener('change', e => {
      this._mode = e.target.value;
      if (this._mode === 'pump' && this._config.level_entity)
        this._fire({ ...this._config, level_entity: undefined,
                     level_full: undefined, level_empty: undefined });
      else this._render();
    });

    // Range inputs: an emptied field must clear the key, not be ignored.
    const bindNum = (id, key) => {
      this.shadowRoot.getElementById(id)?.addEventListener('change', e => {
        const raw = e.target.value.trim();
        const v   = raw === '' ? undefined : Number(raw);
        if (v === undefined || Number.isFinite(v))
          this._fire({ ...this._config, [key]: v });
      });
    };
    bindNum('lfull',  'level_full');
    bindNum('lempty', 'level_empty');
    bindNum('cap',    'capacity');

    // Simple inputs
    const bind = (id, key, toVal) => {
      const el = this.shadowRoot.getElementById(id);
      if (!el) return;
      el.addEventListener('change', e => {
        const v = toVal ? toVal(e.target.value) : e.target.value;
        if (v !== '' && !Number.isNaN(v))
          this._fire({ ...this._config, [key]: v });
      });
    };
    bind('flow',   'flow_rate_ml_per_min',   Number);
    bind('volume', 'tank_volume_liters',      Number);
    bind('alert',  'alert_threshold_percent', Number);
    bind('name',   'name',                    null);
    bind('lang',   'language',                v => v === 'auto' ? undefined : v);
    bind('capunit','capacity_unit',           v => v.trim() || undefined);
    bind('warn',   'warn_threshold_percent',  Number);
    bind('cmode',  'color_mode',              v => v);
    bind('layout', 'layout',                  v => v);

    // A checkbox carries its state in .checked, not .value, so it cannot go
    // through bind(). Ticked is the default, so it writes nothing at all.
    this.shadowRoot.getElementById('showset')?.addEventListener('change', e =>
      this._fire({ ...this._config, show_settings: e.target.checked ? undefined : false }));

    // Color sync
    const cp = this.shadowRoot.getElementById('cpick');
    const ct = this.shadowRoot.getElementById('ctext');
    cp?.addEventListener('input', e => {
      ct.value = e.target.value;
      this._fire({ ...this._config, liquid_color: e.target.value });
    });
    ct?.addEventListener('change', e => {
      const v = e.target.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        cp.value = v;
        this._fire({ ...this._config, liquid_color: v });
      }
    });

    // Anything a picker emits before this fires came from the picker setting
    // itself up, not from the user. See _acceptsPick.
    for (const ev of ['focusin', 'pointerdown', 'keydown'])
      this.shadowRoot.addEventListener(ev, () => { this._touched = true; }, { once: true });

    this._built     = true;
    this._builtMode = this._mode;
  }

  async _createHelper() {
    const btn    = this.shadowRoot.getElementById('create-btn');
    const status = this.shadowRoot.getElementById('create-status');
    if (btn) { btn.disabled = true; btn.textContent = this._t().creating; }

    try {
      const { config } = await _ensureHelpers(this._hass, this._config);
      this._config = config;
      this._fire(this._config);   // persists the new entity ids in the card config
      this._render();
    } catch(e) {
      if (status) status.textContent = '❌ ' + (e.message || 'Error');
      if (btn) { btn.disabled = false; btn.textContent = `✨ ${this._t().createHelper}`; }
    }
  }
}

customElements.define('dosing-tank-card-editor', DosingTankCardEditor);


// ── Main card ─────────────────────────────────────────────────────────────────

class DosingTankCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass            = null;
    this._config          = null;
    this._pumpOnSince     = null;
    this._dailyStats      = null;
    this._historyLoading  = false;
    this._lastHistoryFetch= 0;
    this._todayConsumedMl = 0;
    this._week7dMinutes   = 0;
    this._ticker          = null;
    this._showAdjust      = false;
    this._adjustAmount    = 500;
    this._helperNotice    = null;
    this._uid             = Math.random().toString(36).slice(2, 7);
  }

  setConfig(config) {
    if (!config.pump_entity && !config.level_entity)
      throw new Error('dosing-tank-card: pump_entity or level_entity is required');
    this._helperNotice = null;   // a fresh config supersedes any "created" notice
    this._levelDays    = null;
    this._config = {
      pump_entity:             config.pump_entity || null,
      flow_rate_ml_per_min:    Number(config.flow_rate_ml_per_min) || 15,
      tank_volume_liters:      Number(config.tank_volume_liters) || 5,
      alert_threshold_percent: Number(config.alert_threshold_percent) || 20,
      reset_entity:            config.reset_entity || null,
      flow_entity:             config.flow_entity || null,
      sync_entity:             config.sync_entity || null,
      // Direct-level mode: the level comes from a sensor instead of being
      // derived from pump runtime. Setting level_entity switches modes.
      level_entity:            config.level_entity || null,
      level_full:              _num(config.level_full),
      level_empty:             _num(config.level_empty),
      // What a full tank physically holds, so quantities can be shown in kg or
      // litres even when the sensor only reports a percentage.
      capacity:                _num(config.capacity),
      capacity_unit:           config.capacity_unit || null,
      // 'level' colours the tank green / amber / red by fill level instead of
      // using liquid_color. Off by default: liquid_color is how a chlorine tank
      // is told apart from a pH− one at a glance.
      color_mode:              config.color_mode === 'level' ? 'level' : 'fixed',
      show_settings:           config.show_settings !== false,
      // 'columns' gives the tank the full height of the card and moves the
      // three metric tiles beside it. 'rows' is the original arrangement.
      layout:                  config.layout === 'columns' ? 'columns' : 'rows',
      warn_threshold_percent:  Number(config.warn_threshold_percent) || 50,
      name:                    config.name || 'Dosing Tank',
      liquid_color:            config.liquid_color || '#3b82f6',
      language:                config.language || null,
    };
  }

  get _isDirect() { return !!this._config.level_entity; }

  _levelState() {
    return this._config.level_entity
      ? this._hass?.states[this._config.level_entity] : null;
  }

  _levelUnit() { return this._levelState()?.attributes?.unit_of_measurement || ''; }

  // Values the sensor reads when the tank is empty / full. level_full may be
  // LOWER than level_empty: an ultrasonic probe measures the distance down to
  // the surface, so a full tank reads small. The mapping below handles both
  // directions with the same formula — no "invert" switch needed.
  // Returns nulls when the range cannot be known, rather than guessing.
  _levelRange() {
    const c = this._config;
    if (c.level_full !== null)
      return { empty: c.level_empty !== null ? c.level_empty : 0, full: c.level_full };
    if (this._levelUnit() === '%') return { empty: 0, full: 100 };
    return { empty: null, full: null };
  }

  // { v, pct } for the current reading; pct is null when the range is unknown.
  // null overall when the sensor is missing, unavailable or not numeric.
  _levelValue() {
    const v = _num(this._levelState()?.state);
    if (v === null) return null;
    const { empty, full } = this._levelRange();
    if (empty === null || full === empty) return { v, pct: null };
    return { v, pct: Math.max(0, Math.min(100, (v - empty) / (full - empty) * 100)) };
  }

  /**
   * How a percentage of the tank is turned into a figure on screen.
   * `capacity` lets a tank be read in what it physically holds — 35 kg of salt
   * behind a sensor that only reports a percentage — instead of in whatever
   * unit the sensor happens to use. Without it, the sensor's own span is used,
   * which is the previous behaviour.
   * Returns null when neither is known, so nothing is invented.
   */
  _displayScale() {
    const c = this._config;
    if (c.capacity !== null) return { factor: c.capacity, unit: c.capacity_unit || '' };
    const { empty, full } = this._levelRange();
    if (empty === null || full === empty) return null;
    return { factor: Math.abs(full - empty), unit: this._levelUnit() };
  }

  // Flow rate (mL/min): live helper value if configured & valid, else config value.
  _currentFlow() {
    const fe = this._config.flow_entity
      ? Number(this._hass?.states[this._config.flow_entity]?.state) : NaN;
    return fe > 0 ? fe : this._config.flow_rate_ml_per_min;
  }

  // Watermark = timestamp up to which pump runtime has already been counted into
  // the consumed counter. Stored in an input_datetime helper (tz-safe via .timestamp).
  _watermark() {
    const st = this._config.sync_entity
      ? this._hass?.states[this._config.sync_entity] : null;
    const ts = Number(st?.attributes?.timestamp);
    return ts > 0 ? new Date(ts * 1000) : null;
  }

  async _setWatermark(date) {
    if (!this._config.sync_entity) return;
    await this._hass.callService('input_datetime', 'set_datetime', {
      entity_id: this._config.sync_entity,
      timestamp: Math.floor(date.getTime() / 1000),
    });
  }

  static getConfigElement() {
    return document.createElement('dosing-tank-card-editor');
  }

  _t() {
    const lang = this._config?.language
      || this._hass?.locale?.language
      || this._hass?.language
      || navigator.language
      || 'en';
    return DTL[lang.split('-')[0].toLowerCase()] || DTL.en;
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._config) return;

    if (this._isDirect) {
      const lvl     = hass.states[this._config.level_entity];
      const prevLvl = prev?.states[this._config.level_entity];
      if (!this._historyLoading && Date.now() - this._lastHistoryFetch > 900000)
        this._loadLevelHistory();
      if (!prev || lvl?.state !== prevLvl?.state) this._render();
      return;
    }

    const pump      = hass.states[this._config.pump_entity];
    const prevPump  = prev?.states[this._config.pump_entity];
    const reset     = this._config.reset_entity ? hass.states[this._config.reset_entity] : null;
    const prevReset = this._config.reset_entity ? prev?.states[this._config.reset_entity] : null;

    if (!prev && pump?.state === 'on')
      this._pumpOnSince = new Date(pump.last_changed);

    if (prevPump && pump && pump.state !== prevPump.state) {
      if (pump.state === 'on') {
        this._pumpOnSince = new Date();
      } else if (pump.state === 'off') {
        // Pump just stopped: reconcile the counter from history right away
        // (the history catch-up is the single source of truth — no live write
        // here, to avoid double-counting the same runtime).
        this._pumpOnSince = null;
        this._loadHistory(true);
      }
    }

    if (!this._historyLoading && Date.now() - this._lastHistoryFetch > 900000)
      this._loadHistory();

    // Only re-render when entities that affect the display actually change
    const pumpChanged  = !prev || pump?.state !== prevPump?.state || pump?.last_changed !== prevPump?.last_changed;
    const resetChanged = reset?.state !== prevReset?.state;
    if (pumpChanged || resetChanged) this._render();
  }

  // ── History ───────────────────────────────────────────────────────────────

  async _loadHistory(force = false) {
    if (!this._hass || this._historyLoading) return;
    if (!force && Date.now() - this._lastHistoryFetch <= 900000) return;
    this._historyLoading   = true;
    this._lastHistoryFetch = Date.now();
    try {
      const end       = new Date();
      const chartFrom = new Date(end.getTime() - 7 * 86400000);
      const watermark = this._watermark();
      // Fetch far enough back to cover both the 7-day chart and the
      // uncounted runtime since the watermark (capped at 90 days).
      const floor90   = new Date(end.getTime() - 90 * 86400000);
      let start = chartFrom;
      if (watermark && watermark < start) start = watermark;
      if (start < floor90) start = floor90;

      const url = `history/period/${start.toISOString()}` +
        `?filter_entity_id=${this._config.pump_entity}` +
        `&end_time=${end.toISOString()}&significant_changes_only=0&no_attributes=1`;
      const history = await this._hass.callApi('GET', url);
      const states  = history?.[0]?.length > 0 ? history[0] : [];

      if (states.length) this._processHistory(states, chartFrom, end);
      else this._dailyStats = this._emptyDays();

      await this._syncFromHistory(states, watermark, end);
    } catch (e) {
      console.error('[dosing-tank-card] History error:', e);
      this._dailyStats = this._emptyDays();
    } finally { this._historyLoading = false; }
    this._render();
  }

  // ── Direct level mode ─────────────────────────────────────────────────────

  async _loadLevelHistory() {
    if (!this._hass || this._historyLoading) return;
    this._historyLoading   = true;
    this._lastHistoryFetch = Date.now();
    try {
      const end = new Date();
      // Midnight 7 days back: that extra day seeds the first daily delta.
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
      // A level sensor reports far more often than a pump switch, so unlike
      // _loadHistory this asks for significant changes only and the compact
      // payload — a week of a 30 s sensor is otherwise tens of thousands of
      // points for the seven numbers we actually need.
      const url = `history/period/${start.toISOString()}` +
        `?filter_entity_id=${this._config.level_entity}` +
        `&end_time=${end.toISOString()}&significant_changes_only=1` +
        `&minimal_response&no_attributes`;
      const history = await this._hass.callApi('GET', url);
      this._levelDays = this._levelDailySeries(history?.[0] || []);
    } catch (e) {
      console.error('[dosing-tank-card] Level history error:', e);
      this._levelDays = null;
    } finally { this._historyLoading = false; }
    this._render();
  }

  // 8 day buckets: [0] seeds the first delta, [1..7] are the days displayed.
  _levelDailySeries(states) {
    const now = new Date();
    const T   = this._t();
    const loc = Object.keys(DTL).find(k => DTL[k] === T) || 'en';
    const days = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (7 - i));
      return { date: d, endDate: new Date(d.getTime() + 86400000), last: null,
               label: d.toLocaleDateString(loc, { weekday: 'short' }) };
    });
    for (const s of states) {
      const v = _num(s.state);
      if (v === null) continue;                       // unavailable / unknown
      const t = new Date(s.last_changed || s.last_updated).getTime();
      for (const d of days)
        if (t >= d.date.getTime() && t < d.endDate.getTime()) { d.last = v; break; }
    }
    // A day with no reading keeps the previous one: a sensor that simply did
    // not move is flat, not a gap.
    for (let i = 1; i < days.length; i++)
      if (days[i].last === null) days[i].last = days[i - 1].last;
    return days;
  }

  // Daily consumption derived from the level series. Everything is computed in
  // percent of the tank, never in raw sensor units: with an inverted probe
  // (full = small reading) consumption makes the raw value go UP, so "only
  // count decreases" is only true once mapped through the range.
  _levelStats() {
    const days = this._levelDays;
    const { empty, full } = this._levelRange();
    if (!days || empty === null || full === empty) return null;

    // Percentages are what the maths runs on; the scale only decides how they
    // are written out (sensor units, or kg/L when capacity is configured).
    const scale = this._displayScale() || { factor: Math.abs(full - empty), unit: '' };
    const toPct = v => v === null ? null
      : Math.max(0, Math.min(100, (v - empty) / (full - empty) * 100));

    const bars = [];
    let used7dPct = 0;
    for (let i = 1; i < days.length; i++) {
      const prev = toPct(days[i - 1].last), cur = toPct(days[i].last);
      const known  = prev !== null && cur !== null;
      const delta  = known ? prev - cur : 0;
      const refill = known && delta < 0;              // level went up
      const used   = refill ? 0 : Math.max(0, delta);
      bars.push({ label: days[i].label, usedPct: used,
                  usedVal: used / 100 * scale.factor, refill, known });
      used7dPct += used;
    }

    // Plainly the 7-day consumption over 7 days, so the autonomy can be
    // checked by hand against the tile printed right above it. Earlier this
    // divided by "complete non-refill days" instead, which was defensible in
    // isolation but disagreed with that tile whenever the history was short:
    // a card three days old read 2.5 kg over 7 days and 30 days of autonomy
    // at the same time, and nothing on screen explained the gap.
    const avgPctDay = used7dPct > 0 ? used7dPct / 7 : null;
    return { bars, span: scale.factor, unit: scale.unit, used7dPct,
             used7dVal: used7dPct / 100 * scale.factor, avgPctDay };
  }

  // Level readings keep one decimal below 100 (18.4 kg), integer above.
  _fmtLevel(v, unit) {
    if (!Number.isFinite(v)) return '—';
    const n = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
    return unit ? `${n} ${unit}` : String(n);
  }

  _fmtAutonomy(T, days) {
    if (!Number.isFinite(days) || days <= 0) return '—';
    return days > 99 ? `> ${T.fmtDays(99)}` : T.fmtDays(Math.round(days));
  }

  _fmtAgo(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '—';
    const min = Math.floor(ms / 60000);
    if (min < 1)  return '< 1 min';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    return h < 24 ? `${h} h` : this._t().fmtDays(Math.floor(h / 24));
  }

  _directMetrics(T, lvl, stats, isAlert, scale, tall) {
    const unit = scale?.unit ?? '';
    // What is LEFT, in tank units. The raw reading cannot be used as-is: an
    // inverted probe measures the distance down to the surface, so it grows as
    // the tank empties and would sit under a "remaining" label while meaning
    // the exact opposite. On a plain 0-to-max sensor this equals the reading,
    // and with capacity configured it is the physical quantity left.
    const remain = (lvl?.pct != null && scale)
      ? this._fmtLevel(lvl.pct / 100 * scale.factor, unit) : '—';
    // In the columns arrangement the quantity is printed under the tank, next
    // to the level it qualifies, which frees this slot for the daily rate: the
    // one figure the card works out and would otherwise show nowhere once
    // capacity is configured. In rows nothing moves, so the slot keeps the
    // quantity unless that would only repeat the percentage on the tank.
    const rate  = stats?.avgPctDay
      ? T.perDay(this._fmtLevel(stats.avgPctDay, unit)) : '—';
    const first = tall || (unit === '%' && stats?.avgPctDay)
      ? { v: rate, l: T.avgDaily }
      : { v: remain, l: T.remaining };
    const pace = first.l === T.avgDaily;
    const used = stats ? this._fmtLevel(stats.used7dVal, unit) : '—';
    const auto = (stats?.avgPctDay && lvl?.pct != null)
      ? this._fmtAutonomy(T, lvl.pct / stats.avgPctDay) : '—';
    return `<div class="metrics">
    <div class="metric">
      <div class="mv${isAlert&&!pace?' alert':''}">${_esc(first.v)}</div>
      <div class="ml">${first.l}</div>
    </div>
    <div class="metric">
      <div class="mv">${_esc(used)}</div>
      <div class="ml">${T.days7}</div>
    </div>
    <div class="metric">
      <div class="mv">${_esc(auto)}</div>
      <div class="ml">${T.autonomy}</div>
    </div>
  </div>`;
  }

  /**
   * The line under the tank, in direct mode.
   * Only in the columns arrangement, and only when it says something the
   * tank does not already: "23.8 kg left" under a tank showing 68 % adds the
   * quantity, whereas "68.0 % left" only repeated the figure, which is why the
   * old percentage caption was dropped in v0.8.1. In rows the quantity stays
   * in the first tile, so printing it here too would be that duplication again.
   */
  _remainingCaption(T, lvl, scale) {
    if (!scale || lvl?.pct == null || scale.unit === '%' || !scale.unit) return '';
    const qty = this._fmtLevel(lvl.pct / 100 * scale.factor, scale.unit);
    return `<div class="tpct">${_esc(T.qtyLeft(qty))}</div>`;
  }

  _directBars(T, stats, base) {
    if (this._historyLoading || !stats) return `<div class="nodata">${T.loading}</div>`;
    const bars = stats.bars;
    if (!bars.some(b => b.usedPct > 0 || b.refill))
      return `<div class="nodata">${T.noData}</div>`;
    const max = Math.max(...bars.map(b => b.usedPct), 0.0001);
    return bars.map((b, i) => {
      // A refill day has no consumption to show; an empty bar would read as
      // "nothing happened", so it gets a marker instead.
      if (b.refill) return `<div class="bw"><div class="bi refill" title="${_esc(b.label+': '+T.refill)}">+</div>
        <div class="bl">${b.label}</div></div>`;
      const h   = Math.max(3, (b.usedPct / max) * 100);
      const col = i === bars.length - 1 ? base : base + '55';
      const tip = `${b.label}: ${this._fmtLevel(b.usedVal, stats.unit)}`;
      return `<div class="bw"><div class="bi">
        <div class="be" style="height:${h}%;background:${col}" title="${_esc(tip)}"></div>
      </div><div class="bl">${b.label}</div></div>`;
    }).join('');
  }

  // `unit` here is the SENSOR's unit: the range describes what the sensor
  // reads, never the physical capacity, which may be in another unit entirely.
  _directSettings(T, st, range, unit) {
    const name = st?.attributes?.friendly_name || this._config.level_entity || '—';
    // Always low → high so it reads as a scale; "(inverted)" is what tells you
    // which end means full, rather than a range printed backwards.
    const rng  = range && range.empty !== null
      ? `${Math.min(range.full, range.empty)} → ${Math.max(range.full, range.empty)}` +
        `${unit ? ' ' + unit : ''}` +
        (range.full < range.empty ? ` (${T.inverted})` : '')
      : '—';
    const upd  = st?.last_changed ? this._fmtAgo(st.last_changed) : '—';
    return `
          <div class="cfgr"><span class="l">${T.levelSource}</span><span class="v">${_esc(name)}</span></div>
          <div class="cfgr"><span class="l">${T.levelRange}</span><span class="v">${_esc(rng)}</span></div>
          <div class="cfgr"><span class="l">${T.alertAt}</span><span class="v">${this._config.alert_threshold_percent}%</span></div>
          <div class="cfgr"><span class="l">${T.lastUpdate}</span><span class="v">${_esc(upd)}</span></div>`;
  }

  // Add the pump runtime accumulated since the watermark into the consumed
  // counter, then advance the watermark to `now`. This is what makes the card
  // accurate even when no browser tab was open during a pump cycle.
  async _syncFromHistory(states, watermark, now) {
    if (!this._config.reset_entity || !this._config.sync_entity) return;
    if (!watermark) { await this._setWatermark(now); return; }   // first run: anchor only
    const onMin = this._onMinutesInWindow(states, watermark, now);
    if (onMin > 0) {
      const cur = Number(this._hass?.states[this._config.reset_entity]?.state) || 0;
      await this._setCounter(cur + onMin * this._currentFlow());
      await this._setWatermark(now);   // advance only when runtime was counted
    }
  }

  // Total minutes the pump was 'on' within the [from, to] window.
  _onMinutesInWindow(states, from, to) {
    let last = null, lt = null, total = 0;
    const f = from.getTime(), tt = to.getTime();
    const acc = (a, b) => { const x = Math.max(a, f), y = Math.min(b, tt);
      if (y > x) total += (y - x) / 60000; };
    for (const s of states) {
      const t = new Date(s.last_changed).getTime();
      if (last === 'on' && lt != null) acc(lt, t);
      last = s.state; lt = t;
    }
    if (last === 'on' && lt != null) acc(lt, tt);
    return total;
  }

  _emptyDays() {
    const now    = new Date();
    const locale = this._t() === DTL.en ? 'en' :
      Object.keys(DTL).find(k => DTL[k] === this._t()) || 'en';
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
      return { date: d, endDate: new Date(d.getTime() + 86400000), minutes: 0,
               label: d.toLocaleDateString(locale, { weekday: 'short' }) };
    });
  }

  _processHistory(states, start, end) {
    const days = this._emptyDays();
    let last = null, lt = new Date(start);
    for (const s of states) {
      const t = new Date(s.last_changed);
      if (last === 'on') this._addToDays(days, lt, t < end ? t : end);
      last = s.state; lt = t;
    }
    if (last === 'on') this._addToDays(days, lt, end);
    this._dailyStats      = days;
    this._todayConsumedMl = Math.round((days[6]?.minutes || 0) * this._currentFlow());
    this._week7dMinutes   = days.reduce((s, d) => s + d.minutes, 0);
  }

  _addToDays(days, from, to) {
    for (const d of days) {
      const ov = Math.min(to.getTime(), d.endDate.getTime()) - Math.max(from.getTime(), d.date.getTime());
      if (ov > 0) d.minutes += ov / 60000;
    }
  }

  // ── HA services ───────────────────────────────────────────────────────────

  async _setCounter(value) {
    if (!this._config.reset_entity) return;
    // Domain-aware: works with input_number.* helpers AND number.* entities
    // (e.g. an integration-provided consumption counter). Both expose set_value.
    const domain = this._config.reset_entity.split('.')[0];
    await this._hass.callService(domain, 'set_value', {
      entity_id: this._config.reset_entity,
      value: Math.round(Math.max(0, Math.min(9999999, value))),
    });
  }

  async _resetTank() {
    const btn = this.shadowRoot.getElementById('dtc-reset-btn');
    if (btn) { btn.disabled = true; btn.textContent = this._t().resetting; }
    try {
      await this._setCounter(0);
      await this._setWatermark(new Date());   // refill point: start counting fresh
      this._pumpOnSince      = null;
      this._dailyStats       = this._emptyDays();
      this._todayConsumedMl  = 0;
      this._week7dMinutes    = 0;
      this._lastHistoryFetch = 0;
    } catch (e) { console.error('[dosing-tank-card] Reset error:', e); }
    this._render();
  }

  async _applyAdjustment(direction) {
    const cur    = Number(this._hass?.states[this._config.reset_entity]?.state) || 0;
    const newVal = direction === 'add' ? cur - this._adjustAmount : cur + this._adjustAmount;
    const btn    = this.shadowRoot.getElementById(`dtc-adj-${direction}`);
    if (btn) btn.disabled = true;
    try { await this._setCounter(newVal); }
    catch (e) { console.error('[dosing-tank-card] Adjust error:', e); }
    this._render();
  }

  // ── Calculations ──────────────────────────────────────────────────────────

  _getConsumedMl() {
    const stored = Number(this._config.reset_entity && this._hass?.states[this._config.reset_entity]?.state) || 0;
    // Live tail: runtime since the watermark not yet folded into the counter.
    let live = 0;
    if (this._hass?.states[this._config.pump_entity]?.state === 'on') {
      const wmTs    = this._watermark()?.getTime() || 0;
      const sinceTs = Math.max(this._pumpOnSince?.getTime() || Date.now(), wmTs);
      live = Math.max(0, Date.now() - sinceTs) / 60000 * this._currentFlow();
    }
    return stored + live;
  }

  _fmtDuration(min) {
    const m = Math.round(min); if (!m) return '—';
    const h = Math.floor(m / 60);
    return h ? `${h}h ${m % 60}m` : `${m} min`;
  }

  _fmtVol(ml) {
    const v = Math.max(0, ml);
    return v >= 1000 ? `${(v / 1000).toFixed(2)} L` : `${Math.round(v)} mL`;
  }

  _lighten(hex) {
    const c = hex.replace('#', '');
    if (c.length !== 6) return hex;
    return `rgb(${Math.min(255,parseInt(c.slice(0,2),16)+60)},${Math.min(255,parseInt(c.slice(2,4),16)+60)},${Math.min(255,parseInt(c.slice(4,6),16)+60)})`;
  }

  // ── SVG tank ─────────────────────────────────────────────────────────────

  _svgTank(pct, base, light, label, fill) {
    const W=86,H=140,BX=3,BY=22,BW=80,BH=105,BR=10,NX=28,NY=3,NW=30,NH=18,NR=6;
    const s = Math.max(0, Math.min(1, pct / 100));
    const u = this._uid;
    // `fill` lets the drawing take the height its column is given instead of
    // its natural 86×140; the viewBox keeps the proportions either way.
    const size = fill
      ? 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"'
      : `width="${W}" height="${H}"`;
    return `<svg ${size} viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="dtc-cp-${u}"><rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="${BR}"/></clipPath>
  <linearGradient id="dtc-lg-${u}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${base}"/><stop offset="100%" stop-color="${light}"/>
  </linearGradient>
  <linearGradient id="dtc-sh-${u}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
    <stop offset="30%" stop-color="rgba(255,255,255,.12)"/>
    <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
  </linearGradient>
</defs>
<rect x="${NX}" y="${NY}" width="${NW}" height="${NH}" rx="${NR}"
  fill="var(--secondary-background-color,#2a2a2a)"
  stroke="var(--divider-color,rgba(255,255,255,.18))" stroke-width="1.5"/>
<rect x="${NX+4}" y="${NY+5}" width="${NW-8}" height="3" rx="1.5" fill="rgba(255,255,255,.08)"/>
<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="${BR}"
  fill="rgba(0,0,0,.3)" stroke="var(--divider-color,rgba(255,255,255,.18))" stroke-width="1.5"/>
<g clip-path="url(#dtc-cp-${u})">
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" fill="url(#dtc-lg-${u})"
    style="transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(${s});transition:transform .9s cubic-bezier(.4,0,.2,1)"/>
</g>
<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="${BR}" fill="url(#dtc-sh-${u})" pointer-events="none"/>
<rect x="${BX+5}" y="${BY+6}" width="5" height="${BH-12}" rx="2.5" fill="rgba(255,255,255,.07)" pointer-events="none"/>
${/* Tick marks only. The 25/50/75 % labels used to sit exactly where the big
      figure is drawn, hiding one of them behind it; they also duplicated that
      figure and the "% left" caption underneath. Slightly longer and stronger
      now that they carry the scale on their own. */''}
${[25,50,75].map(lv=>{const ly=BY+BH-(lv/100)*BH;return `<line x1="${BX+2}" y1="${ly}" x2="${BX+14}" y2="${ly}" stroke="var(--secondary-text-color,#8a8a8a)" stroke-opacity=".5" stroke-width="1.5" stroke-linecap="round"/>`;}).join('')}
${/* Always white, never --primary-text-color: this figure is drawn on top of
      the tank, not on the card surface. On a light theme that variable is
      near black, which put dark glyphs inside a dark halo and made the number
      unreadable. The halo is what carries white over both the liquid and the
      empty part, in any theme, and a stroke painted behind the glyphs also
      keeps them crisp where a CSS text-shadow blurred. */''}
<text x="${W/2}" y="${BY+BH/2+7}" text-anchor="middle" font-size="19" font-weight="700"
  fill="#fff"
  ${/* 1.8 and not more: paint-order draws the stroke behind the glyphs, and
        half of its width falls inside the outline. On a 19 px bold figure a
        3.5 px stroke closed the counters of the zeros, which read as filled
        blobs. */''}
  paint-order="stroke" stroke="rgba(0,0,0,.75)" stroke-width="1.8"
  stroke-linejoin="round">${label ?? `${pct.toFixed(0)}%`}</text>
<rect x="${BX+8}" y="${BY+BH-2}" width="${BW-16}" height="8" rx="4"
  fill="var(--secondary-background-color,#2a2a2a)"
  stroke="var(--divider-color,rgba(255,255,255,.12))" stroke-width="1.5"/>
</svg>`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _render() {
    if (!this._hass || !this._config) return;

    // Preserve adjustment amount if input is in DOM
    const adjInput = this.shadowRoot.getElementById('dtc-adj-input');
    if (adjInput) this._adjustAmount = Math.max(1, Number(adjInput.value) || this._adjustAmount);

    const T      = this._t();
    const direct = this._isDirect;

    // Direct-level mode reads everything off one sensor; pump mode keeps its
    // counter/watermark chain. Only pct / isAlert / base / light are shared.
    const lvlState = direct ? this._levelState() : null;
    const lvl      = direct ? this._levelValue() : null;
    const lvlRange = direct ? this._levelRange() : null;
    const lvlStats = direct ? this._levelStats() : null;
    const lvlScale = direct ? this._displayScale() : null;
    const lvlUnit  = direct ? (lvlScale?.unit ?? '') : '';

    const pump       = direct ? null : this._hass.states[this._config.pump_entity];
    const resetState = direct ? null : this._hass.states[this._config.reset_entity];
    // Without the sync watermark nothing is ever written to the counter
    // (_syncFromHistory bails out), so it deserves the same warning.
    const syncState  = (!direct && this._config.sync_entity)
      ? this._hass.states[this._config.sync_entity] : null;
    const isPumpOn   = pump?.state === 'on';
    const consumedMl = direct ? 0 : this._getConsumedMl();
    const tankMl     = this._config.tank_volume_liters * 1000;
    const remaining  = Math.max(0, tankMl - consumedMl);

    const hasPct  = direct ? lvl?.pct != null : true;
    const pct     = direct ? (lvl?.pct ?? 0)
                           : Math.max(0, Math.min(100, (remaining / tankMl) * 100));
    const isAlert = hasPct && pct <= this._config.alert_threshold_percent;

    // What is wrong in direct mode, if anything — checked in order of severity.
    const directWarn = !direct ? null
      : !lvlState        ? T.sensorMissing
      : lvl === null     ? T.sensorUnavailable
      : lvl.pct === null ? T.rangeMissing
      : null;
    // Something else may be writing the counter, typically the automation the
    // pre-0.2 README suggested and that many installs still run. If it moved
    // recently, saying nothing is recorded is a false alarm, so the missing
    // watermark is only raised when the counter looks genuinely stalled.
    const counterMoved = !!resetState?.last_changed &&
      Date.now() - new Date(resetState.last_changed).getTime() < 7 * 86400000;
    const showHelperWarn = !direct && (!resetState || (!syncState && !counterMoved));
    const showAlert      = isAlert && (direct ? !!lvl : !!resetState);


    // color_mode 'level' trades liquid_color for a green / amber / red reading
    // of the fill. Red is already the alert threshold, amber the warn one.
    const tinted = !isAlert && this._config.color_mode === 'level'
      ? (pct <= this._config.warn_threshold_percent ? '#f59e0b' : '#22c55e')
      : this._config.liquid_color;
    const base  = _esc(isAlert ? '#ef4444' : tinted);
    const light = _esc(isAlert ? '#fca5a5' : this._lighten(
      tinted?.startsWith('#') ? tinted : '#3b82f6'));

    const days    = this._dailyStats || [];
    const maxMin  = Math.max(1, ...days.map(d => d.minutes));
    const hasDays = days.some(d => d.minutes > 0);
    // Live tail for today: only the runtime the last history fetch did not already
    // fold into _todayConsumedMl, otherwise that stretch would be counted twice.
    const todayFrom = isPumpOn && this._pumpOnSince
      ? Math.max(this._pumpOnSince.getTime(), this._lastHistoryFetch) : 0;
    const liveToday = todayFrom
      ? Math.max(0, Date.now() - todayFrom) / 60000 * this._currentFlow() : 0;
    const todayMl = this._todayConsumedMl + liveToday;

    // The metrics row is placed by the layout, so it is built once here and
    // dropped into whichever column the arrangement calls for.
    const tall = this._config.layout === 'columns';
    const metricsHtml = direct
      ? this._directMetrics(T, lvl, lvlStats, isAlert, lvlScale, tall)
      : `<div class="metrics">
    <div class="metric">
      <div class="mv${isAlert?' alert':''}">${(remaining/1000).toFixed(2)} L</div>
      <div class="ml">${T.remaining}</div>
    </div>
    <div class="metric">
      <div class="mv">${this._fmtVol(todayMl)}</div>
      <div class="ml">${T.today}</div>
    </div>
    <div class="metric">
      <div class="mv">${this._fmtDuration(this._week7dMinutes)}</div>
      <div class="ml">${T.pump7d}</div>
    </div>
  </div>`;

    this.shadowRoot.innerHTML = `
<style>
:host{display:block}
*{box-sizing:border-box;margin:0;padding:0}
.card{
  background:var(--ha-card-background,var(--card-background-color,#1c1c1e));
  border-radius:var(--ha-card-border-radius,12px);padding:16px;
  color:var(--primary-text-color,#e1e1e1);
  box-shadow:var(--ha-card-box-shadow,0 2px 10px rgba(0,0,0,.3));
  font-family:var(--paper-font-body1_-_font-family,Roboto,system-ui,sans-serif);
  /* The card adapts to ITS OWN width, not the viewport's. A media query is
     useless here: a 210 px card in a wide dashboard column would never match
     one, and that is exactly where the layout broke. */
  container-type:inline-size;}
.hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
.ttl{font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px}
.badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;letter-spacing:.5px}
.badge-on {background:rgba(34,197,94,.15);color:#22c55e;border:1px solid rgba(34,197,94,.35)}
.badge-off{background:rgba(148,163,184,.08);color:var(--secondary-text-color,#888);border:1px solid rgba(148,163,184,.2)}
.warn{border-radius:8px;padding:8px 12px;font-size:12px;display:flex;align-items:center;gap:7px;margin-bottom:12px}
.warn.alert  {background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:#ef4444}
.warn.missing{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);color:#f59e0b;flex-wrap:wrap;gap:6px}
.warn.created{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);color:#22c55e;
  flex-direction:column;align-items:flex-start;gap:3px;word-break:break-all}
.warn-create{padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;
  border:1px solid #f59e0b;background:rgba(245,158,11,.15);color:#f59e0b;white-space:nowrap;
  transition:background .15s}
.warn-create:hover:not(:disabled){background:#f59e0b;color:#000}
.warn-create:disabled{opacity:.5;cursor:default}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.metric{background:var(--secondary-background-color,rgba(255,255,255,.05));border-radius:8px;padding:10px 6px;text-align:center;min-width:0}
.mv{font-size:16px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mv.alert{color:#ef4444}
.ml{font-size:9px;color:var(--secondary-text-color,#888);text-transform:uppercase;letter-spacing:.6px;margin-top:3px}
.body{display:grid;grid-template-columns:100px 1fr;gap:14px;align-items:start}
/* Columns layout: the tank takes the whole height of the row and the metrics
   sit beside it, tightened so three of them still fit a narrower column. */
.body.cols{grid-template-columns:100px 1fr;align-items:stretch}
.body.cols .tcol{height:100%;min-height:150px;justify-content:center}
.body.cols .tcol svg{width:100%;height:100%}
.body.cols .metrics{gap:5px;margin-bottom:12px}
.body.cols .metric{padding:6px 3px}
.body.cols .mv{font-size:13px}
.body.cols .ml{font-size:8px;letter-spacing:.3px}
.tcol{display:flex;flex-direction:column;align-items:center;gap:5px}
.tpct{font-size:11px;color:var(--secondary-text-color,#888);text-align:center}
.rcol{display:flex;flex-direction:column;gap:12px;min-width:0}
.stitle{font-size:10px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:var(--secondary-text-color,#888);margin-bottom:6px}
.bars{display:flex;align-items:flex-end;gap:5px;height:60px}
.bw{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%}
.bi{flex:1;width:100%;display:flex;align-items:flex-end;min-height:0}
.be{width:100%;border-radius:3px 3px 0 0;min-height:3px;transition:height .4s}
.bl{font-size:9px;color:var(--secondary-text-color,#888);text-transform:capitalize;
  max-width:100%;overflow:hidden;text-overflow:clip;white-space:nowrap}
.bi.refill{align-items:center;justify-content:center;color:#22c55e;font-size:14px;font-weight:700}
.nodata{font-size:11px;color:var(--secondary-text-color,#888);align-self:center;font-style:italic}
.cfg{display:flex;flex-direction:column;gap:4px}
.cfgr{display:flex;justify-content:space-between;font-size:11px;gap:6px}
.cfgr .l{color:var(--secondary-text-color,#888)}
.cfgr .v{font-weight:500;white-space:nowrap}
/* footer */
.footer{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.btn{width:100%;min-width:0;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:7px;text-align:center;
  transition:background .2s,color .2s,border-color .2s;
  border:1px solid var(--divider-color,rgba(255,255,255,.12));
  background:var(--secondary-background-color,rgba(255,255,255,.05));
  color:var(--primary-text-color,#e1e1e1)}
.btn:hover:not(:disabled){background:var(--primary-color,#03a9f4);color:#fff;border-color:transparent}
.btn:disabled{opacity:.5;cursor:default}
.btn.open{border-color:var(--primary-color,#03a9f4);color:var(--primary-color,#03a9f4)}
/* adjustment panel */
.adj-panel{background:var(--secondary-background-color,rgba(255,255,255,.04));
  border:1px solid var(--divider-color,rgba(255,255,255,.1));
  border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px;
  animation:fadein .18s ease}
@keyframes fadein{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.adj-row{display:flex;align-items:center;gap:6px}
.adj-row label{font-size:11px;color:var(--secondary-text-color,#888);white-space:nowrap}
.stepper{display:flex;align-items:center;gap:4px;flex:1;min-width:0}
.sbtn{flex:none;width:32px;height:32px;border-radius:6px;
  border:1px solid var(--divider-color,rgba(255,255,255,.15));
  background:var(--secondary-background-color,rgba(255,255,255,.06));
  color:var(--primary-text-color,#e1e1e1);font-size:18px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:background .15s;padding:0}
.sbtn:hover{background:var(--primary-color,#03a9f4);color:#fff;border-color:transparent}
/* Without min-width:0 an <input> refuses to shrink below its intrinsic size
   (~170 px), so the stepper pushed the + button and the unit outside the card
   on any narrow column. This is what made the adjustment row overflow. */
.adj-input{flex:1;min-width:42px;width:100%;text-align:center;padding:6px 4px;border-radius:6px;font-size:14px;font-weight:600;
  background:var(--secondary-background-color,rgba(255,255,255,.06));
  color:var(--primary-text-color,#e1e1e1);
  border:1px solid var(--divider-color,rgba(255,255,255,.15))}
.adj-unit{font-size:12px;color:var(--secondary-text-color,#888)}
.adj-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.btn-add{border-color:rgba(34,197,94,.4)!important}
.btn-add:hover:not(:disabled){background:#22c55e!important;border-color:transparent!important}
.btn-rem{border-color:rgba(239,68,68,.4)!important}
.btn-rem:hover:not(:disabled){background:#ef4444!important;border-color:transparent!important}
/* Narrow column. Keyed on the card's own width, so it works in a narrow
   dashboard column as well as on a phone. Shrinking comes first (the number
   box gives up its width), stacking only once even that is not enough.
   Thresholds are content-box widths, so roughly card width minus 32 px. */
@container (max-width:280px){
  .body{grid-template-columns:1fr}
}
@container (max-width:250px){
  .adj-row{flex-direction:column;align-items:stretch;gap:5px}
  .adj-grid{grid-template-columns:1fr}
}
@container (max-width:200px){
  .metrics{grid-template-columns:1fr}
  /* Below this the unit label is what stands between the number box and
     nothing at all, and "mL" is obvious from the panel it sits in. */
  .adj-unit{display:none}
}
.sep{height:1px;background:var(--divider-color,rgba(255,255,255,.08));margin:2px 0}
</style>

<div class="card">
  <div class="hdr">
    <div class="ttl">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="${isPumpOn?'#22c55e':'var(--secondary-text-color,#888)'}"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z"/>
        <path d="M12 13V3"/><path d="M9 6l3-3 3 3"/>
      </svg>
      ${_esc(this._config.name)}
    </div>
    ${direct?'':`<div class="badge ${isPumpOn?'badge-on':'badge-off'}">
      ${isPumpOn?`● ${T.on}`:`○ ${T.off}`}
    </div>`}
  </div>

  ${showHelperWarn?`<div class="warn missing">
    <span>⚠️ ${!resetState
      ? T.helperMissing + (this._config.reset_entity ? ': <strong>'+_esc(this._config.reset_entity)+'</strong>' : '')
      : T.syncMissing}</span>
    <button class="warn-create" id="dtc-create-helper">✨ ${T.createHelper}</button>
  </div>`:''}
  ${directWarn?`<div class="warn missing">
    <span>⚠️ ${directWarn}${this._config.level_entity && !lvlState
      ? ': <strong>'+_esc(this._config.level_entity)+'</strong>' : ''}</span>
  </div>`:''}
  ${this._helperNotice?.length?`<div class="warn created">
    <span>✅ ${T.helperCreated(_esc(this._helperNotice.join(', ')))}</span>
    <span>${T.saveInEditor}</span>
  </div>`:''}
  ${showAlert?`<div class="warn alert">${T.lowLevel(pct.toFixed(0))}</div>`:''}

  ${/* Two arrangements of the same three blocks. "rows" stacks the metrics
        above a short tank; "columns" gives the tank the full height of the
        card and moves the metrics beside it, which is denser. Nothing but
        the arrangement changes. */''}
  ${tall?'':metricsHtml}

  <div class="body${tall?' cols':''}">
    ${/* No caption under the tank: it repeated the figure drawn on the tank,
          and rounded to one more decimal, so the two disagreed on screen,
          "18%" above "17.6% left". The precise quantity is in the first
          metric tile, in litres or kilos, which says more than a decimal
          of a percentage. */''}
    <div class="tcol">
      ${this._svgTank(pct, base, light, hasPct ? `${pct.toFixed(0)}%` : '—', tall)}
      ${direct&&tall?this._remainingCaption(T, lvl, lvlScale):''}
    </div>
    <div class="rcol">
      ${tall?metricsHtml:''}
      <div>
        <div class="stitle">${direct?T.dailyChartU(lvlUnit||'%'):T.dailyChart}</div>
        <div class="bars">
          ${direct?this._directBars(T,lvlStats,base):
            this._historyLoading||!days.length
            ?`<div class="nodata">${T.loading}</div>`
            :!hasDays
              ?`<div class="nodata">${T.noData}</div>`
              :days.map((d,i)=>{
                const ml=Math.round(d.minutes*this._currentFlow());
                const h=Math.max(3,(d.minutes/maxMin)*100);
                const col=i===days.length-1?base:base+'55';
                return `<div class="bw"><div class="bi">
                  <div class="be" style="height:${h}%;background:${col}" title="${d.label}: ${ml} mL"></div>
                </div><div class="bl">${d.label}</div></div>`;
              }).join('')}
        </div>
      </div>
      ${/* Reference material: useful while configuring, never again. On a tank
            looked at once a week it took a third of the card, hence the
            option to drop it. Shown by default so nothing changes on its own. */''}
      ${this._config.show_settings===false?'':`<div>
        <div class="stitle">${T.settings}</div>
        <div class="cfg">
          ${direct?this._directSettings(T,lvlState,lvlRange,this._levelUnit()):`
          <div class="cfgr"><span class="l">${T.flowRate}</span><span class="v">${this._currentFlow()} mL/min</span></div>
          <div class="cfgr"><span class="l">${T.tankSize}</span><span class="v">${this._config.tank_volume_liters} L</span></div>
          <div class="cfgr"><span class="l">${T.alertAt}</span><span class="v">${this._config.alert_threshold_percent}%</span></div>
          <div class="cfgr"><span class="l">${T.totalUsed}</span><span class="v">${this._fmtVol(consumedMl)}</span></div>`}
        </div>
      </div>`}
    </div>
  </div>

  ${direct?'':`<div class="footer">
    <button class="btn${this._showAdjust?' open':''}" id="dtc-adj-toggle">
      ✏️ ${T.adjust} ${this._showAdjust?'▲':'▼'}
    </button>

    ${this._showAdjust?`
    <div class="adj-panel">
      <div class="adj-row">
        <label>${T.adjustQty}</label>
        <div class="stepper">
          <button class="sbtn" id="dtc-step-dn">−</button>
          <input class="adj-input" id="dtc-adj-input" type="number" min="1" step="1" value="${this._adjustAmount}">
          <button class="sbtn" id="dtc-step-up">+</button>
          <span class="adj-unit">mL</span>
        </div>
      </div>
      <div class="adj-grid">
        <button class="btn btn-add" id="dtc-adj-add">＋ ${T.addToTank}</button>
        <button class="btn btn-rem" id="dtc-adj-remove">－ ${T.removeFromTank}</button>
      </div>
      <div class="sep"></div>
      <button class="btn" id="dtc-reset-btn">🔄 ${T.resetFull}</button>
    </div>`:''}
  </div>`}
</div>`;

    // Events
    this.shadowRoot.getElementById('dtc-create-helper')
      ?.addEventListener('click', () => this._createHelper());
    this.shadowRoot.getElementById('dtc-adj-toggle')
      ?.addEventListener('click', () => { this._showAdjust = !this._showAdjust; this._render(); });

    if (this._showAdjust) {
      const inp = this.shadowRoot.getElementById('dtc-adj-input');

      this.shadowRoot.getElementById('dtc-step-dn')?.addEventListener('click', () => {
        const v = Math.max(1, (Number(inp?.value)||100) - 100);
        if (inp) inp.value = v; this._adjustAmount = v;
      });
      this.shadowRoot.getElementById('dtc-step-up')?.addEventListener('click', () => {
        const v = (Number(inp?.value)||100) + 100;
        if (inp) inp.value = v; this._adjustAmount = v;
      });
      inp?.addEventListener('change', e => {
        this._adjustAmount = Math.max(1, Number(e.target.value) || 1);
      });
      this.shadowRoot.getElementById('dtc-adj-add')
        ?.addEventListener('click', () => this._applyAdjustment('add'));
      this.shadowRoot.getElementById('dtc-adj-remove')
        ?.addEventListener('click', () => this._applyAdjustment('remove'));
      this.shadowRoot.getElementById('dtc-reset-btn')
        ?.addEventListener('click', () => this._resetTank());
    }

    if (isPumpOn && !this._ticker) {
      // Only re-render from ticker when adjustment panel is closed (avoids flicker)
      this._ticker = setInterval(() => { if (!this._showAdjust) this._render(); }, 30000);
    } else if (!isPumpOn && this._ticker) {
      clearInterval(this._ticker); this._ticker = null;
    }
  }

  // A card cannot persist its own Lovelace config, so the created ids are only
  // applied for this session and shown to the user, who has to paste them into
  // the card editor to keep them. The editor's own button does persist them.
  async _createHelper() {
    const T   = this._t();
    const btn = this.shadowRoot.getElementById('dtc-create-helper');
    if (btn) { btn.disabled = true; btn.textContent = T.creating; }

    try {
      const { config, created } = await _ensureHelpers(this._hass, this._config);
      this._config       = config;
      this._helperNotice = created;
      this._render();
    } catch(e) {
      console.error('[dosing-tank-card] Create helper error:', e);
      if (btn) { btn.disabled = false; btn.textContent = `✨ ${T.createHelper}`; }
    }
  }

  disconnectedCallback() {
    if (this._ticker) { clearInterval(this._ticker); this._ticker = null; }
  }

  // Direct mode has no adjustment footer, so the card is shorter.
  getCardSize() { return this._isDirect ? 4 : 5; }

  static getStubConfig() {
    return {
      pump_entity:             'switch.my_dosing_pump',
      reset_entity:            'input_number.dosing_tank_consumed',
      sync_entity:             'input_datetime.dosing_tank_sync',
      flow_rate_ml_per_min:    15,
      tank_volume_liters:      5,
      alert_threshold_percent: 20,
      name:                    'Dosing Tank',
      liquid_color:            '#3b82f6',
    };
  }
}

customElements.define('dosing-tank-card', DosingTankCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'dosing-tank-card',
  name: 'Dosing Tank Card',
  description: 'Track liquid level of a dosing tank (chlorine, pH-, pH+, flocculant…) based on pump runtime',
  preview: true,
  documentationURL: 'https://github.com/ADNPolymerase/ha-dosing-tank-card',
});
