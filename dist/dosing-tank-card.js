/**
 * dosing-tank-card — Home Assistant Lovelace custom card
 * Tracks the liquid level of a dosing tank (chlorine, pH-, pH+, flocculant…)
 * based on pump runtime and a configurable flow rate.
 *
 * Config:
 *   type: custom:dosing-tank-card
 *   pump_entity: switch.pool_chlorine_pump      (required)
 *   reset_entity: input_number.dosing_consumed  (required)
 *   flow_rate_ml_per_min: 15
 *   tank_volume_liters: 5
 *   alert_threshold_percent: 20
 *   name: "Chlorine"
 *   liquid_color: "#3b82f6"
 *   language: "fr"    # optional override (auto-detected from HA locale)
 */

// ── i18n ─────────────────────────────────────────────────────────────────────

const DTL = {
  en: {
    remaining:'Remaining', today:'Today', pump7d:'Pump 7d',
    dailyChart:'Daily consumption (mL)', settings:'Settings',
    flowRate:'Flow rate', tankSize:'Tank size', alertAt:'Alert at',
    totalUsed:'Total used', adjust:'Adjust', loading:'Loading…',
    noData:'No data yet', pctLeft: p=>`${p}% left`,
    lowLevel: p=>`⚠️ Low level — refill soon (${p}% remaining)`,
    helperMissing:'Counter not found', createHelper:'Create counter',
    creating:'Creating…', helperCreated: id=>`Counter created: ${id}`,
    adjustQty:'Adjust quantity', addToTank:'Add to tank',
    removeFromTank:'Remove from tank', resetFull:'Tank refilled — Reset',
    resetting:'Resetting…', on:'ON', off:'OFF',
  },
  fr: {
    remaining:'Restant', today:"Aujourd'hui", pump7d:'Pompe 7j',
    dailyChart:'Consommation journalière (mL)', settings:'Paramètres',
    flowRate:'Débit', tankSize:'Volume bidon', alertAt:'Alerte à',
    totalUsed:'Total consommé', adjust:'Ajustement', loading:'Chargement…',
    noData:'Aucune donnée', pctLeft: p=>`${p}% restant`,
    lowLevel: p=>`⚠️ Niveau bas — rechargez dès que possible (${p}% restant)`,
    helperMissing:'Compteur introuvable', createHelper:'Créer le compteur',
    creating:'Création…', helperCreated: id=>`Compteur créé : ${id}`,
    adjustQty:'Ajuster la quantité', addToTank:'Ajouter au bidon',
    removeFromTank:'Retirer du bidon', resetFull:'Bidon rempli — Réinitialiser',
    resetting:'Réinitialisation…', on:'ACTIF', off:'INACTIF',
  },
  es: {
    remaining:'Restante', today:'Hoy', pump7d:'Bomba 7d',
    dailyChart:'Consumo diario (mL)', settings:'Ajustes',
    flowRate:'Caudal', tankSize:'Volumen depósito', alertAt:'Alerta a',
    totalUsed:'Total usado', adjust:'Ajuste', loading:'Cargando…',
    noData:'Sin datos', pctLeft: p=>`${p}% restante`,
    lowLevel: p=>`⚠️ Nivel bajo — recargar pronto (${p}% restante)`,
    helperMissing:'Contador no encontrado', createHelper:'Crear contador',
    creating:'Creando…', helperCreated: id=>`Contador creado: ${id}`,
    adjustQty:'Ajustar cantidad', addToTank:'Añadir al depósito',
    removeFromTank:'Retirar del depósito', resetFull:'Depósito lleno — Reiniciar',
    resetting:'Reiniciando…', on:'ON', off:'OFF',
  },
  de: {
    remaining:'Verbleibend', today:'Heute', pump7d:'Pumpe 7T',
    dailyChart:'Tagesverbrauch (mL)', settings:'Einstellungen',
    flowRate:'Durchfluss', tankSize:'Tankvolumen', alertAt:'Alarm bei',
    totalUsed:'Gesamt verbraucht', adjust:'Anpassen', loading:'Lädt…',
    noData:'Keine Daten', pctLeft: p=>`${p}% verbleibend`,
    lowLevel: p=>`⚠️ Niedriger Stand — bald nachfüllen (${p}% verbleibend)`,
    helperMissing:'Zähler nicht gefunden', createHelper:'Zähler erstellen',
    creating:'Erstelle…', helperCreated: id=>`Zähler erstellt: ${id}`,
    adjustQty:'Menge anpassen', addToTank:'Zum Tank hinzufügen',
    removeFromTank:'Aus Tank entnehmen', resetFull:'Tank voll — Zurücksetzen',
    resetting:'Zurücksetzen…', on:'AN', off:'AUS',
  },
  it: {
    remaining:'Rimanente', today:'Oggi', pump7d:'Pompa 7g',
    dailyChart:'Consumo giornaliero (mL)', settings:'Impostazioni',
    flowRate:'Portata', tankSize:'Volume serbatoio', alertAt:'Allarme a',
    totalUsed:'Totale consumato', adjust:'Regolazione', loading:'Caricamento…',
    noData:'Nessun dato', pctLeft: p=>`${p}% rimanente`,
    lowLevel: p=>`⚠️ Livello basso — ricaricare presto (${p}% rimanente)`,
    helperMissing:'Contatore non trovato', createHelper:'Crea contatore',
    creating:'Creazione…', helperCreated: id=>`Contatore creato: ${id}`,
    adjustQty:'Regola quantità', addToTank:'Aggiungi al serbatoio',
    removeFromTank:'Rimuovi dal serbatoio', resetFull:'Serbatoio pieno — Azzera',
    resetting:'Azzerando…', on:'ON', off:'OFF',
  },
  nl: {
    remaining:'Resterend', today:'Vandaag', pump7d:'Pomp 7d',
    dailyChart:'Dagelijks verbruik (mL)', settings:'Instellingen',
    flowRate:'Doorstroomsnelheid', tankSize:'Tankinhoud', alertAt:'Alarm bij',
    totalUsed:'Totaal verbruikt', adjust:'Aanpassen', loading:'Laden…',
    noData:'Geen gegevens', pctLeft: p=>`${p}% resterend`,
    lowLevel: p=>`⚠️ Laag niveau — spoedig bijvullen (${p}% resterend)`,
    helperMissing:'Teller niet gevonden', createHelper:'Teller aanmaken',
    creating:'Aanmaken…', helperCreated: id=>`Teller aangemaakt: ${id}`,
    adjustQty:'Hoeveelheid aanpassen', addToTank:'Toevoegen aan tank',
    removeFromTank:'Verwijderen uit tank', resetFull:'Tank gevuld — Resetten',
    resetting:'Resetten…', on:'AAN', off:'UIT',
  },
};

// Mirrors HA's slugify to predict the entity_id generated from a helper name
function _slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ── Visual editor ─────────────────────────────────────────────────────────────

class DosingTankCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass   = null;
  }

  set hass(hass) {
    this._hass = hass;
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(el => {
      if (el.hass !== hass) el.hass = hass;
    });
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _fire(cfg) {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: cfg }, bubbles: true, composed: true,
    }));
  }

  _render() {
    const c = this._config;
    const LANG_LABELS = {
      auto:'Auto (HA locale)', en:'English', fr:'Français',
      es:'Español', de:'Deutsch', it:'Italiano', nl:'Nederlands',
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
</style>
<div class="form">
  <div class="sec">Entities</div>
  <div class="field" id="pump-wrap"><label>Pump entity</label></div>
  <div class="field" id="reset-wrap"><label>Counter entity (input_number, mL)</label></div>
  <div class="field" id="flow-wrap"><label>Flow-rate entity (input_number, mL/min — optional)</label></div>
  <div class="field" id="sync-wrap"><label>Sync entity (input_datetime — runtime watermark)</label></div>
  <div class="create-row" id="create-row" style="display:none">
    <button class="create-btn" id="create-btn">✨ Create helpers</button>
    <span class="create-status" id="create-status"></span>
  </div>

  <div class="sec">Tank</div>
  <div class="grid2">
    <div class="field">
      <label>Flow rate (mL/min)</label>
      <input type="number" id="flow" min="0.1" step="0.1" value="${c.flow_rate_ml_per_min??15}">
    </div>
    <div class="field">
      <label>Tank volume (L)</label>
      <input type="number" id="volume" min="0.1" step="0.1" value="${c.tank_volume_liters??5}">
    </div>
  </div>
  <div class="grid2">
    <div class="field">
      <label>Alert threshold (%)</label>
      <input type="number" id="alert" min="0" max="100" step="1" value="${c.alert_threshold_percent??20}">
    </div>
    <div class="field">
      <label>Language</label>
      <select id="lang">${langOptions}</select>
    </div>
  </div>

  <div class="sec">Appearance</div>
  <div class="field">
    <label>Card title</label>
    <input type="text" id="name" value="${c.name??'Dosing Tank'}">
  </div>
  <div class="field">
    <label>Liquid color</label>
    <div class="color-row">
      <input type="color" id="cpick" value="${c.liquid_color??'#3b82f6'}">
      <input type="text"  id="ctext" value="${c.liquid_color??'#3b82f6'}" placeholder="#3b82f6" maxlength="7">
    </div>
  </div>
</div>`;

    // Entity pickers
    const makePicker = (wrapId, key, label) => {
      const wrap = this.shadowRoot.getElementById(wrapId);
      if (!wrap) return;
      const hasPicker = !!customElements.get('ha-entity-picker');
      if (hasPicker) {
        const p = document.createElement('ha-entity-picker');
        p.label = label;
        p.value = this._config[key] || '';
        p.allowCustomEntity = true;
        if (this._hass) p.hass = this._hass;
        p.addEventListener('value-changed', e =>
          this._fire({ ...this._config, [key]: e.detail.value }));
        wrap.appendChild(p);
      } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = this._config[key] || '';
        inp.addEventListener('change', e =>
          this._fire({ ...this._config, [key]: e.target.value }));
        wrap.appendChild(inp);
      }
    };
    makePicker('pump-wrap',  'pump_entity',  'Pump entity');
    makePicker('reset-wrap', 'reset_entity', 'Counter entity (input_number, mL)');
    makePicker('flow-wrap',  'flow_entity',  'Flow-rate entity (input_number, mL/min)');
    makePicker('sync-wrap',  'sync_entity',  'Sync entity (input_datetime)');

    // Show create button when the counter or the sync watermark is missing
    const missing = !this._config.reset_entity
      || !this._hass?.states[this._config.reset_entity]
      || !this._config.sync_entity
      || !this._hass?.states[this._config.sync_entity];
    const createRow = this.shadowRoot.getElementById('create-row');
    if (createRow && missing) {
      createRow.style.display = 'flex';
      this.shadowRoot.getElementById('create-btn')
        ?.addEventListener('click', () => this._createHelper());
    }

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
  }

  async _createHelper() {
    const btn    = this.shadowRoot.getElementById('create-btn');
    const status = this.shadowRoot.getElementById('create-status');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

    const cardName = this._config.name || 'Dosing Tank';
    const cfg      = { ...this._config };

    try {
      // Consumed counter (mL)
      if (!cfg.reset_entity || !this._hass?.states[cfg.reset_entity]) {
        const n = `${cardName} consumed`;
        await this._hass.callWS({
          type: 'input_number/create', name: n,
          min: 0, max: 9999999, step: 1,
          unit_of_measurement: 'mL', mode: 'box', icon: 'mdi:cup-water',
        });
        cfg.reset_entity = `input_number.${_slugify(n)}`;
      }
      // Flow-rate helper (mL/min) — seeded with the current config flow rate
      if (!cfg.flow_entity || !this._hass?.states[cfg.flow_entity]) {
        const n = `${cardName} flow rate`;
        await this._hass.callWS({
          type: 'input_number/create', name: n,
          min: 0, max: 100000, step: 1, initial: cfg.flow_rate_ml_per_min || 50,
          unit_of_measurement: 'mL/min', mode: 'box', icon: 'mdi:pump',
        });
        cfg.flow_entity = `input_number.${_slugify(n)}`;
      }
      // Sync watermark (input_datetime, date + time)
      if (!cfg.sync_entity || !this._hass?.states[cfg.sync_entity]) {
        const n = `${cardName} sync`;
        await this._hass.callWS({
          type: 'input_datetime/create', name: n,
          has_date: true, has_time: true, icon: 'mdi:clock-check',
        });
        cfg.sync_entity = `input_datetime.${_slugify(n)}`;
      }
      this._config = cfg;
      this._fire(this._config);
      this._render();
    } catch(e) {
      if (status) status.textContent = '❌ ' + (e.message || 'Error');
      if (btn) { btn.disabled = false; btn.textContent = '✨ Create helpers'; }
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
    this._uid             = Math.random().toString(36).slice(2, 7);
  }

  setConfig(config) {
    if (!config.pump_entity) throw new Error('dosing-tank-card: pump_entity is required');
    this._config = {
      pump_entity:             config.pump_entity,
      flow_rate_ml_per_min:    Number(config.flow_rate_ml_per_min) || 15,
      tank_volume_liters:      Number(config.tank_volume_liters) || 5,
      alert_threshold_percent: Number(config.alert_threshold_percent) || 20,
      reset_entity:            config.reset_entity || null,
      flow_entity:             config.flow_entity || null,
      sync_entity:             config.sync_entity || null,
      name:                    config.name || 'Dosing Tank',
      liquid_color:            config.liquid_color || '#3b82f6',
      language:                config.language || null,
    };
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

  _svgTank(pct, base, light) {
    const W=86,H=140,BX=3,BY=22,BW=80,BH=105,BR=10,NX=28,NY=3,NW=30,NH=18,NR=6;
    const s = Math.max(0, Math.min(1, pct / 100));
    const u = this._uid;
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
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
${[25,50,75].map(lv=>{const ly=BY+BH-(lv/100)*BH;return `<line x1="${BX}" y1="${ly}" x2="${BX+10}" y2="${ly}" stroke="var(--divider-color,rgba(255,255,255,.25))" stroke-width="1"/>
<text x="${BX+13}" y="${ly+4}" font-size="7" fill="var(--secondary-text-color,#888)">${lv}%</text>`;}).join('')}
<text x="${W/2}" y="${BY+BH/2+7}" text-anchor="middle" font-size="19" font-weight="700"
  fill="${pct<35?'#fff':'var(--primary-text-color,#fff)'}"
  style="text-shadow:0 1px 3px rgba(0,0,0,.5)">${pct.toFixed(0)}%</text>
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

    const T          = this._t();
    const pump       = this._hass.states[this._config.pump_entity];
    const resetState = this._hass.states[this._config.reset_entity];
    const isPumpOn   = pump?.state === 'on';
    const consumedMl = this._getConsumedMl();
    const tankMl     = this._config.tank_volume_liters * 1000;
    const remaining  = Math.max(0, tankMl - consumedMl);
    const pct        = Math.max(0, Math.min(100, (remaining / tankMl) * 100));
    const isAlert    = pct <= this._config.alert_threshold_percent;

    const base  = isAlert ? '#ef4444' : this._config.liquid_color;
    const light = isAlert ? '#fca5a5' : this._lighten(
      this._config.liquid_color?.startsWith('#') ? this._config.liquid_color : '#3b82f6');

    const days    = this._dailyStats || [];
    const maxMin  = Math.max(1, ...days.map(d => d.minutes));
    const hasDays = days.some(d => d.minutes > 0);
    const liveToday = isPumpOn && this._pumpOnSince
      ? (Date.now()-this._pumpOnSince.getTime())/60000*this._currentFlow() : 0;
    const todayMl = this._todayConsumedMl + liveToday;

    this.shadowRoot.innerHTML = `
<style>
:host{display:block}
*{box-sizing:border-box;margin:0;padding:0}
.card{
  background:var(--ha-card-background,var(--card-background-color,#1c1c1e));
  border-radius:var(--ha-card-border-radius,12px);padding:16px;
  color:var(--primary-text-color,#e1e1e1);
  box-shadow:var(--ha-card-box-shadow,0 2px 10px rgba(0,0,0,.3));
  font-family:var(--paper-font-body1_-_font-family,Roboto,system-ui,sans-serif);}
.hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
.ttl{font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px}
.badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;letter-spacing:.5px}
.badge-on {background:rgba(34,197,94,.15);color:#22c55e;border:1px solid rgba(34,197,94,.35)}
.badge-off{background:rgba(148,163,184,.08);color:var(--secondary-text-color,#888);border:1px solid rgba(148,163,184,.2)}
.warn{border-radius:8px;padding:8px 12px;font-size:12px;display:flex;align-items:center;gap:7px;margin-bottom:12px}
.warn.alert  {background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:#ef4444}
.warn.missing{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);color:#f59e0b;flex-wrap:wrap;gap:6px}
.warn-create{padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;
  border:1px solid #f59e0b;background:rgba(245,158,11,.15);color:#f59e0b;white-space:nowrap;
  transition:background .15s}
.warn-create:hover:not(:disabled){background:#f59e0b;color:#000}
.warn-create:disabled{opacity:.5;cursor:default}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.metric{background:var(--secondary-background-color,rgba(255,255,255,.05));border-radius:8px;padding:10px 6px;text-align:center}
.mv{font-size:16px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mv.alert{color:#ef4444}
.ml{font-size:9px;color:var(--secondary-text-color,#888);text-transform:uppercase;letter-spacing:.6px;margin-top:3px}
.body{display:grid;grid-template-columns:100px 1fr;gap:14px;align-items:start}
@media(max-width:300px){.body{grid-template-columns:1fr}}
.tcol{display:flex;flex-direction:column;align-items:center;gap:5px}
.tpct{font-size:11px;color:var(--secondary-text-color,#888)}
.rcol{display:flex;flex-direction:column;gap:12px;min-width:0}
.stitle{font-size:10px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:var(--secondary-text-color,#888);margin-bottom:6px}
.bars{display:flex;align-items:flex-end;gap:5px;height:60px}
.bw{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%}
.bi{flex:1;width:100%;display:flex;align-items:flex-end;min-height:0}
.be{width:100%;border-radius:3px 3px 0 0;min-height:3px;transition:height .4s}
.bl{font-size:9px;color:var(--secondary-text-color,#888);text-transform:capitalize}
.nodata{font-size:11px;color:var(--secondary-text-color,#888);align-self:center;font-style:italic}
.cfg{display:flex;flex-direction:column;gap:4px}
.cfgr{display:flex;justify-content:space-between;font-size:11px;gap:6px}
.cfgr .l{color:var(--secondary-text-color,#888)}
.cfgr .v{font-weight:500;white-space:nowrap}
/* footer */
.footer{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.btn{width:100%;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:7px;
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
.stepper{display:flex;align-items:center;gap:4px;flex:1}
.sbtn{width:32px;height:32px;border-radius:6px;
  border:1px solid var(--divider-color,rgba(255,255,255,.15));
  background:var(--secondary-background-color,rgba(255,255,255,.06));
  color:var(--primary-text-color,#e1e1e1);font-size:18px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:background .15s;padding:0}
.sbtn:hover{background:var(--primary-color,#03a9f4);color:#fff;border-color:transparent}
.adj-input{flex:1;text-align:center;padding:6px 4px;border-radius:6px;font-size:14px;font-weight:600;
  background:var(--secondary-background-color,rgba(255,255,255,.06));
  color:var(--primary-text-color,#e1e1e1);
  border:1px solid var(--divider-color,rgba(255,255,255,.15))}
.adj-unit{font-size:12px;color:var(--secondary-text-color,#888)}
.adj-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.btn-add{border-color:rgba(34,197,94,.4)!important}
.btn-add:hover:not(:disabled){background:#22c55e!important;border-color:transparent!important}
.btn-rem{border-color:rgba(239,68,68,.4)!important}
.btn-rem:hover:not(:disabled){background:#ef4444!important;border-color:transparent!important}
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
      ${this._config.name}
    </div>
    <div class="badge ${isPumpOn?'badge-on':'badge-off'}">
      ${isPumpOn?`● ${T.on}`:`○ ${T.off}`}
    </div>
  </div>

  ${!resetState?`<div class="warn missing">
    <span>⚠️ ${T.helperMissing}${this._config.reset_entity ? ': <strong>'+this._config.reset_entity+'</strong>' : ''}</span>
    <button class="warn-create" id="dtc-create-helper">✨ ${T.createHelper}</button>
  </div>`:''}
  ${isAlert&&resetState?`<div class="warn alert">${T.lowLevel(pct.toFixed(0))}</div>`:''}

  <div class="metrics">
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
  </div>

  <div class="body">
    <div class="tcol">
      ${this._svgTank(pct, base, light)}
      <div class="tpct">${T.pctLeft(pct.toFixed(1))}</div>
    </div>
    <div class="rcol">
      <div>
        <div class="stitle">${T.dailyChart}</div>
        <div class="bars">
          ${this._historyLoading||!days.length
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
      <div>
        <div class="stitle">${T.settings}</div>
        <div class="cfg">
          <div class="cfgr"><span class="l">${T.flowRate}</span><span class="v">${this._currentFlow()} mL/min</span></div>
          <div class="cfgr"><span class="l">${T.tankSize}</span><span class="v">${this._config.tank_volume_liters} L</span></div>
          <div class="cfgr"><span class="l">${T.alertAt}</span><span class="v">${this._config.alert_threshold_percent}%</span></div>
          <div class="cfgr"><span class="l">${T.totalUsed}</span><span class="v">${this._fmtVol(consumedMl)}</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
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
  </div>
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

  async _createHelper() {
    const T      = this._t();
    const btn    = this.shadowRoot.getElementById('dtc-create-helper');
    if (btn) { btn.disabled = true; btn.textContent = T.creating; }

    const cardName = this._config.name || 'Dosing Tank';
    const cfg      = { ...this._config };

    try {
      if (!cfg.reset_entity || !this._hass?.states[cfg.reset_entity]) {
        const n = `${cardName} consumed`;
        await this._hass.callWS({
          type: 'input_number/create', name: n,
          min: 0, max: 9999999, step: 1,
          unit_of_measurement: 'mL', mode: 'box', icon: 'mdi:cup-water',
        });
        cfg.reset_entity = `input_number.${_slugify(n)}`;
      }
      if (!cfg.flow_entity || !this._hass?.states[cfg.flow_entity]) {
        const n = `${cardName} flow rate`;
        await this._hass.callWS({
          type: 'input_number/create', name: n,
          min: 0, max: 100000, step: 1, initial: cfg.flow_rate_ml_per_min || 50,
          unit_of_measurement: 'mL/min', mode: 'box', icon: 'mdi:pump',
        });
        cfg.flow_entity = `input_number.${_slugify(n)}`;
      }
      if (!cfg.sync_entity || !this._hass?.states[cfg.sync_entity]) {
        const n = `${cardName} sync`;
        await this._hass.callWS({
          type: 'input_datetime/create', name: n,
          has_date: true, has_time: true, icon: 'mdi:clock-check',
        });
        cfg.sync_entity = `input_datetime.${_slugify(n)}`;
      }
      this._config = cfg;
      this._render();
    } catch(e) {
      console.error('[dosing-tank-card] Create helper error:', e);
      if (btn) { btn.disabled = false; btn.textContent = `✨ ${T.createHelper}`; }
    }
  }

  disconnectedCallback() {
    if (this._ticker) { clearInterval(this._ticker); this._ticker = null; }
  }

  getCardSize() { return 5; }

  static getStubConfig() {
    return {
      pump_entity:             'switch.my_dosing_pump',
      reset_entity:            'input_number.dosing_tank_consumed',
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
