/**
 * dosing-tank-card — Home Assistant Lovelace custom card
 * Tracks the liquid level of a dosing tank (chlorine, pH-, pH+, flocculant…)
 * based on pump runtime and a configurable flow rate.
 *
 * Minimal config:
 *   type: custom:dosing-tank-card
 *   pump_entity: switch.my_dosing_pump
 *   flow_rate_ml_per_min: 15
 *   tank_volume_liters: 5
 *   reset_entity: input_number.dosing_tank_consumed
 *
 * Full config:
 *   type: custom:dosing-tank-card
 *   pump_entity: switch.pool_chlorine_pump
 *   flow_rate_ml_per_min: 15
 *   tank_volume_liters: 5
 *   alert_threshold_percent: 20
 *   reset_entity: input_number.dosing_tank_consumed
 *   name: "Chlorine"            # card title (default: "Dosing Tank")
 *   liquid_color: "#3b82f6"     # normal level color (default: blue)
 *   reset_label: "Tank refilled" # button label
 *
 * Note: the reset_entity counter is incremented each time the pump stops while
 * the dashboard is open. For background accuracy, add an automation — see README.
 */

class DosingTankCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._pumpOnSince = null;
    this._dailyStats = null;
    this._historyLoading = false;
    this._lastHistoryFetch = 0;
    this._todayConsumedMl = 0;
    this._week7dMinutes = 0;
    this._ticker = null;
  }

  setConfig(config) {
    if (!config.pump_entity) {
      throw new Error('dosing-tank-card: pump_entity is required');
    }
    if (!config.reset_entity) {
      throw new Error('dosing-tank-card: reset_entity is required');
    }
    this._config = {
      pump_entity: config.pump_entity,
      flow_rate_ml_per_min: Number(config.flow_rate_ml_per_min) || 15,
      tank_volume_liters: Number(config.tank_volume_liters) || 5,
      alert_threshold_percent: Number(config.alert_threshold_percent) || 20,
      reset_entity: config.reset_entity,
      name: config.name || 'Dosing Tank',
      liquid_color: config.liquid_color || '#3b82f6',
      reset_label: config.reset_label || 'Tank refilled — Reset',
    };
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._config) return;

    const pump = hass.states[this._config.pump_entity];
    const prevPump = prev ? prev.states[this._config.pump_entity] : null;

    // On first load, if pump is already ON, anchor the start time to last_changed
    if (!prev && pump && pump.state === 'on') {
      this._pumpOnSince = new Date(pump.last_changed);
    }

    // State transitions
    if (prevPump && pump && pump.state !== prevPump.state) {
      if (pump.state === 'on') {
        this._pumpOnSince = new Date();
      } else if (pump.state === 'off' && this._pumpOnSince) {
        const mins = (Date.now() - this._pumpOnSince.getTime()) / 60000;
        this._incrementConsumed(mins);
        this._pumpOnSince = null;
      }
    }

    // Load history on first call, then every 15 min
    if (!this._historyLoading && Date.now() - this._lastHistoryFetch > 900000) {
      this._loadHistory();
    }

    this._render();
  }

  // ── History API ──────────────────────────────────────────────────────────────

  async _loadHistory() {
    if (!this._hass || this._historyLoading) return;
    this._historyLoading = true;
    this._lastHistoryFetch = Date.now();

    try {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 86400000);
      const url = [
        `history/period/${start.toISOString()}`,
        `?filter_entity_id=${this._config.pump_entity}`,
        `&end_time=${end.toISOString()}`,
        `&significant_changes_only=0`,
        `&no_attributes=1`,
      ].join('');

      const history = await this._hass.callApi('GET', url);
      if (history && history[0] && history[0].length > 0) {
        this._processHistory(history[0], start, end);
      } else {
        this._dailyStats = this._emptyDays();
      }
    } catch (e) {
      console.error('[dosing-tank-card] History fetch error:', e);
      this._dailyStats = this._emptyDays();
    } finally {
      this._historyLoading = false;
    }

    this._render();
  }

  _emptyDays() {
    const now = new Date();
    const locale = this._hass?.locale?.language || navigator.language || 'en';
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
      return {
        date: d,
        endDate: new Date(d.getTime() + 86400000),
        minutes: 0,
        label: d.toLocaleDateString(locale, { weekday: 'short' }),
      };
    });
  }

  _processHistory(states, start, end) {
    const days = this._emptyDays();

    let lastState = null;
    let lastTime = new Date(start);

    for (const s of states) {
      const t = new Date(s.last_changed);
      if (lastState === 'on') {
        this._accumulateToDays(days, lastTime, t < end ? t : end);
      }
      lastState = s.state;
      lastTime = t;
    }

    // Close last open interval if pump is still ON
    if (lastState === 'on') {
      this._accumulateToDays(days, lastTime, end);
    }

    this._dailyStats = days;
    this._todayConsumedMl = Math.round((days[6]?.minutes || 0) * this._config.flow_rate_ml_per_min);
    this._week7dMinutes = days.reduce((s, d) => s + d.minutes, 0);
  }

  _accumulateToDays(days, from, to) {
    for (const day of days) {
      const overlap = Math.min(to.getTime(), day.endDate.getTime())
                    - Math.max(from.getTime(), day.date.getTime());
      if (overlap > 0) day.minutes += overlap / 60000;
    }
  }

  // ── HA service calls ─────────────────────────────────────────────────────────

  async _incrementConsumed(minutes) {
    const entity = this._config.reset_entity;
    const currentVal = Number(this._hass?.states[entity]?.state) || 0;
    const delta = minutes * this._config.flow_rate_ml_per_min;
    try {
      await this._hass.callService('input_number', 'set_value', {
        entity_id: entity,
        value: Math.min(9999999, Math.round(currentVal + delta)),
      });
    } catch (e) {
      console.error('[dosing-tank-card] Increment error:', e);
    }
  }

  async _resetTank() {
    const btn = this.shadowRoot.getElementById('dtc-reset-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Resetting…'; }
    try {
      await this._hass.callService('input_number', 'set_value', {
        entity_id: this._config.reset_entity,
        value: 0,
      });
      this._pumpOnSince = null;
      this._dailyStats = this._emptyDays();
      this._todayConsumedMl = 0;
      this._week7dMinutes = 0;
      this._lastHistoryFetch = 0;
    } catch (e) {
      console.error('[dosing-tank-card] Reset error:', e);
    }
    this._render();
  }

  // ── Calculations ─────────────────────────────────────────────────────────────

  _getConsumedMl() {
    const stored = Number(this._hass?.states[this._config.reset_entity]?.state) || 0;
    const live = this._pumpOnSince
      ? (Date.now() - this._pumpOnSince.getTime()) / 60000 * this._config.flow_rate_ml_per_min
      : 0;
    return stored + live;
  }

  _fmtDuration(minutes) {
    const m = Math.round(minutes);
    if (m === 0) return '—';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min} min`;
  }

  _fmtVolume(ml) {
    const v = Math.max(0, ml);
    return v >= 1000 ? `${(v / 1000).toFixed(2)} L` : `${Math.round(v)} mL`;
  }

  // ── SVG tank ─────────────────────────────────────────────────────────────────

  _svgTank(percent, baseColor, lightColor) {
    const W = 86, H = 140;
    const BX = 3, BY = 22, BW = W - 6, BH = 105, BR = 10;
    const NX = (W - 30) / 2, NY = 3, NW = 30, NH = 18, NR = 6;
    const scale = Math.max(0, Math.min(1, percent / 100));

    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="dtc-body">
      <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="${BR}"/>
    </clipPath>
    <linearGradient id="dtc-liq" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${baseColor}"/>
      <stop offset="100%" stop-color="${lightColor}"/>
    </linearGradient>
    <linearGradient id="dtc-sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="30%" stop-color="rgba(255,255,255,.12)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>

  <!-- Cap -->
  <rect x="${NX}" y="${NY}" width="${NW}" height="${NH}" rx="${NR}"
    fill="var(--secondary-background-color,#2a2a2a)"
    stroke="var(--divider-color,rgba(255,255,255,.18))" stroke-width="1.5"/>
  <rect x="${NX + 4}" y="${NY + 5}" width="${NW - 8}" height="3" rx="1.5"
    fill="rgba(255,255,255,.08)"/>

  <!-- Body -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="${BR}"
    fill="rgba(0,0,0,.3)"
    stroke="var(--divider-color,rgba(255,255,255,.18))" stroke-width="1.5"/>

  <!-- Liquid (scaleY from bottom: 0=empty, 1=full) -->
  <g clip-path="url(#dtc-body)">
    <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}"
      fill="url(#dtc-liq)"
      style="transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(${scale});transition:transform .9s cubic-bezier(.4,0,.2,1)"/>
  </g>

  <!-- Glass sheen overlay -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="${BR}"
    fill="url(#dtc-sheen)" pointer-events="none"/>
  <rect x="${BX + 5}" y="${BY + 6}" width="5" height="${BH - 12}" rx="2.5"
    fill="rgba(255,255,255,.07)" pointer-events="none"/>

  <!-- Graduation marks -->
  ${[25, 50, 75].map(lvl => {
    const ly = BY + BH - (lvl / 100) * BH;
    return `<line x1="${BX}" y1="${ly}" x2="${BX + 10}" y2="${ly}"
      stroke="var(--divider-color,rgba(255,255,255,.25))" stroke-width="1"/>
    <text x="${BX + 13}" y="${ly + 4}" font-size="7"
      fill="var(--secondary-text-color,#888)">${lvl}%</text>`;
  }).join('\n  ')}

  <!-- Centered percentage -->
  <text x="${W / 2}" y="${BY + BH / 2 + 7}"
    text-anchor="middle" font-size="19" font-weight="700"
    fill="${percent < 35 ? '#fff' : 'var(--primary-text-color,#fff)'}"
    style="text-shadow:0 1px 3px rgba(0,0,0,.5)">
    ${percent.toFixed(0)}%
  </text>

  <!-- Base cap -->
  <rect x="${BX + 8}" y="${BY + BH - 2}" width="${BW - 16}" height="8" rx="4"
    fill="var(--secondary-background-color,#2a2a2a)"
    stroke="var(--divider-color,rgba(255,255,255,.12))" stroke-width="1.5"/>
</svg>`;
  }

  // Lighten a hex color for the gradient second stop
  _lightenHex(hex) {
    const c = hex.replace('#', '');
    const r = Math.min(255, parseInt(c.slice(0, 2), 16) + 60);
    const g = Math.min(255, parseInt(c.slice(2, 4), 16) + 60);
    const b = Math.min(255, parseInt(c.slice(4, 6), 16) + 60);
    return `rgb(${r},${g},${b})`;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  _render() {
    if (!this._hass || !this._config) return;

    const pump = this._hass.states[this._config.pump_entity];
    const resetState = this._hass.states[this._config.reset_entity];
    const isPumpOn = pump?.state === 'on';
    const consumedMl = this._getConsumedMl();
    const tankMl = this._config.tank_volume_liters * 1000;
    const remainingMl = Math.max(0, tankMl - consumedMl);
    const percent = Math.max(0, Math.min(100, (remainingMl / tankMl) * 100));
    const isAlert = percent <= this._config.alert_threshold_percent;

    const baseColor = isAlert ? '#ef4444' : this._config.liquid_color;
    const lightColor = isAlert ? '#fca5a5' : this._lightenHex(
      this._config.liquid_color.startsWith('#') ? this._config.liquid_color : '#3b82f6'
    );

    const days = this._dailyStats || [];
    const maxMin = Math.max(1, ...days.map(d => d.minutes));
    const hasHistory = days.some(d => d.minutes > 0);

    const liveToday = isPumpOn && this._pumpOnSince
      ? (Date.now() - this._pumpOnSince.getTime()) / 60000 * this._config.flow_rate_ml_per_min
      : 0;
    const todayMl = this._todayConsumedMl + liveToday;

    this.shadowRoot.innerHTML = `
<style>
:host { display: block; }
* { box-sizing: border-box; margin: 0; padding: 0; }
.card {
  background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
  border-radius: var(--ha-card-border-radius, 12px);
  padding: 16px;
  color: var(--primary-text-color, #e1e1e1);
  box-shadow: var(--ha-card-box-shadow, 0 2px 10px rgba(0,0,0,.3));
  font-family: var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif);
}
.header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 13px;
}
.title {
  font-size: 14px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}
.badge {
  font-size: 10px; font-weight: 700; padding: 3px 10px;
  border-radius: 999px; letter-spacing: .5px;
}
.badge-on  { background: rgba(34,197,94,.15); color: #22c55e; border: 1px solid rgba(34,197,94,.35); }
.badge-off { background: rgba(148,163,184,.08); color: var(--secondary-text-color,#888); border: 1px solid rgba(148,163,184,.2); }
.warn-bar {
  border-radius: 8px; padding: 8px 12px; font-size: 12px;
  display: flex; align-items: center; gap: 7px; margin-bottom: 12px;
}
.warn-bar.alert { background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.3); color: #ef4444; }
.warn-bar.missing { background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.3); color: #f59e0b; }
.metrics {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px; margin-bottom: 14px;
}
.metric {
  background: var(--secondary-background-color, rgba(255,255,255,.05));
  border-radius: 8px; padding: 10px 6px; text-align: center;
}
.mv { font-size: 16px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mv.alert { color: #ef4444; }
.ml { font-size: 9px; color: var(--secondary-text-color,#888); text-transform: uppercase; letter-spacing: .6px; margin-top: 3px; }
.body { display: grid; grid-template-columns: 100px 1fr; gap: 14px; align-items: start; }
@media (max-width: 300px) { .body { grid-template-columns: 1fr; } }
.tank-col { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.tank-pct { font-size: 11px; color: var(--secondary-text-color,#888); }
.right-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.section-title { font-size: 10px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase; color: var(--secondary-text-color,#888); margin-bottom: 6px; }
.bars { display: flex; align-items: flex-end; gap: 5px; height: 60px; }
.bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; height: 100%; }
.bar-inner { flex: 1; width: 100%; display: flex; align-items: flex-end; min-height: 0; }
.bar-el { width: 100%; border-radius: 3px 3px 0 0; min-height: 3px; transition: height .4s ease; }
.bar-lbl { font-size: 9px; color: var(--secondary-text-color,#888); text-transform: capitalize; }
.no-data { font-size: 11px; color: var(--secondary-text-color,#888); align-self: center; font-style: italic; }
.cfg { display: flex; flex-direction: column; gap: 4px; }
.cfg-row { display: flex; justify-content: space-between; font-size: 11px; gap: 6px; }
.cfg-row .lbl { color: var(--secondary-text-color,#888); }
.cfg-row .val { font-weight: 500; white-space: nowrap; }
.reset-btn {
  width: 100%; margin-top: 14px; padding: 10px 14px; border-radius: 8px;
  border: 1px solid var(--divider-color, rgba(255,255,255,.12));
  background: var(--secondary-background-color, rgba(255,255,255,.05));
  color: var(--primary-text-color, #e1e1e1);
  font-size: 13px; font-weight: 500; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .2s, color .2s, border-color .2s;
}
.reset-btn:hover:not(:disabled) { background: var(--primary-color,#03a9f4); color: #fff; border-color: transparent; }
.reset-btn:disabled { opacity: .5; cursor: default; }
</style>

<div class="card">
  <div class="header">
    <div class="title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="${isPumpOn ? '#22c55e' : 'var(--secondary-text-color,#888)'}"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z"/>
        <path d="M12 13V3"/><path d="M9 6l3-3 3 3"/>
      </svg>
      ${this._config.name}
    </div>
    <div class="badge ${isPumpOn ? 'badge-on' : 'badge-off'}">
      ${isPumpOn ? '● ON' : '○ OFF'}
    </div>
  </div>

  ${!resetState ? `<div class="warn-bar missing">⚠️ Helper not found: <strong>${this._config.reset_entity}</strong></div>` : ''}
  ${isAlert && resetState ? `<div class="warn-bar alert">⚠️ Low level — refill soon (${percent.toFixed(0)}% remaining)</div>` : ''}

  <div class="metrics">
    <div class="metric">
      <div class="mv${isAlert ? ' alert' : ''}">${(remainingMl / 1000).toFixed(2)} L</div>
      <div class="ml">Remaining</div>
    </div>
    <div class="metric">
      <div class="mv">${this._fmtVolume(todayMl)}</div>
      <div class="ml">Today</div>
    </div>
    <div class="metric">
      <div class="mv">${this._fmtDuration(this._week7dMinutes)}</div>
      <div class="ml">Pump 7d</div>
    </div>
  </div>

  <div class="body">
    <div class="tank-col">
      ${this._svgTank(percent, baseColor, lightColor)}
      <div class="tank-pct">${percent.toFixed(1)}% left</div>
    </div>
    <div class="right-col">
      <div>
        <div class="section-title">Daily consumption (mL)</div>
        <div class="bars">
          ${this._historyLoading || days.length === 0
            ? '<div class="no-data">Loading…</div>'
            : !hasHistory
              ? '<div class="no-data">No data yet</div>'
              : days.map((d, i) => {
                  const ml = Math.round(d.minutes * this._config.flow_rate_ml_per_min);
                  const pct = Math.max(3, (d.minutes / maxMin) * 100);
                  const isToday = i === days.length - 1;
                  return `<div class="bar-wrap">
                    <div class="bar-inner">
                      <div class="bar-el"
                        style="height:${pct}%;background:${isToday ? baseColor : baseColor + '55'}"
                        title="${d.label}: ${ml} mL"></div>
                    </div>
                    <div class="bar-lbl">${d.label}</div>
                  </div>`;
                }).join('')
          }
        </div>
      </div>
      <div>
        <div class="section-title">Settings</div>
        <div class="cfg">
          <div class="cfg-row"><span class="lbl">Flow rate</span><span class="val">${this._config.flow_rate_ml_per_min} mL/min</span></div>
          <div class="cfg-row"><span class="lbl">Tank size</span><span class="val">${this._config.tank_volume_liters} L</span></div>
          <div class="cfg-row"><span class="lbl">Alert at</span><span class="val">${this._config.alert_threshold_percent}%</span></div>
          <div class="cfg-row"><span class="lbl">Total used</span><span class="val">${this._fmtVolume(consumedMl)}</span></div>
        </div>
      </div>
    </div>
  </div>

  <button class="reset-btn" id="dtc-reset-btn">🔄 ${this._config.reset_label}</button>
</div>`;

    this.shadowRoot.getElementById('dtc-reset-btn')
      .addEventListener('click', () => this._resetTank());

    if (isPumpOn && !this._ticker) {
      this._ticker = setInterval(() => this._render(), 30000);
    } else if (!isPumpOn && this._ticker) {
      clearInterval(this._ticker);
      this._ticker = null;
    }
  }

  disconnectedCallback() {
    if (this._ticker) { clearInterval(this._ticker); this._ticker = null; }
  }

  getCardSize() { return 5; }

  static getStubConfig() {
    return {
      pump_entity: 'switch.my_dosing_pump',
      flow_rate_ml_per_min: 15,
      tank_volume_liters: 5,
      alert_threshold_percent: 20,
      reset_entity: 'input_number.dosing_tank_consumed',
      name: 'Chlorine',
      liquid_color: '#3b82f6',
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
