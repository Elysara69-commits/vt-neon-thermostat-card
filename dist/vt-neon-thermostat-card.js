/*!
 * VT Neon Thermostat Card
 * Version 1.0.0 — MIT License
 * Carte Lovelace « néon » pour les thermostats climate.* (optimisée Versatile Thermostat)
 * Mises en page : full | compact | horizontal
 */
const VERSION = "1.0.0";
const TAG = "vt-neon-thermostat-card";

/* ------------------------------------------------------------------ */
/* Traductions                                                         */
/* ------------------------------------------------------------------ */
const I18N = {
  fr: {
    off: "Arrêt", heat: "Chauffe", cool: "Clim", auto: "Auto", heat_cool: "Auto",
    dry: "Déshum.", fan_only: "Ventil.", heating: "Chauffe", idle: "Repos",
    cooling: "Clim", drying: "Déshum.", fan: "Ventil.", unavailable: "Indisponible",
    unknown: "Inconnu", target: "Consigne", current: "Actuelle",
    status: "Statut pilote Python", info: "Informations", details: "Plus de détails",
    minus: "Baisser la consigne", plus: "Augmenter la consigne",
    mode: "Mode", preset: "Preset", outdoor: "Température extérieure",
    window: "Fenêtre ouverte", presence: "Présence", motion: "Mouvement",
    overpowering: "Délestage actif", security: "Mode sécurité",
    yes: "Oui", no: "Non", close: "Fermer",
  },
  en: {
    off: "Off", heat: "Heat", cool: "Cool", auto: "Auto", heat_cool: "Auto",
    dry: "Dry", fan_only: "Fan", heating: "Heating", idle: "Idle",
    cooling: "Cooling", drying: "Drying", fan: "Fan", unavailable: "Unavailable",
    unknown: "Unknown", target: "Target", current: "Current",
    status: "Python controller status", info: "Information", details: "More details",
    minus: "Lower target", plus: "Raise target",
    mode: "Mode", preset: "Preset", outdoor: "Outdoor temperature",
    window: "Window open", presence: "Presence", motion: "Motion",
    overpowering: "Power shedding", security: "Security mode",
    yes: "Yes", no: "No", close: "Close",
  },
};

const PRESETS = {
  fr: { none: "Manuel", frost: "Hors-gel", eco: "Éco", comfort: "Confort", boost: "Boost",
        activity: "Activité", away: "Absent", home: "Présent", sleep: "Nuit" },
  en: { none: "Manual", frost: "Frost", eco: "Eco", comfort: "Comfort", boost: "Boost",
        activity: "Activity", away: "Away", home: "Home", sleep: "Sleep" },
};

const MODE_ICONS = {
  heat: "mdi:fire", off: "mdi:power", cool: "mdi:snowflake", auto: "mdi:calendar-sync",
  heat_cool: "mdi:sun-snowflake-variant", dry: "mdi:water-percent", fan_only: "mdi:fan",
};

const DEFAULTS = {
  layout: "full",
  color: "#00e5ff",
  heat_color: "#ff8a1f",
  set_current_as_main: true,
  disable_window: false,
  decimals: 1,
  hvac_modes: ["heat", "off"],
};

/* ------------------------------------------------------------------ */
/* Géométrie de la jauge (arc de 270°, ouverture en bas)               */
/* ------------------------------------------------------------------ */
const R = 82;
const START = 135;
const SWEEP = 270;
const polar = (f) => {
  const a = ((START + SWEEP * f) * Math.PI) / 180;
  return [100 + R * Math.cos(a), 100 + R * Math.sin(a)];
};
const arc = (f0, f1) => {
  const [x0, y0] = polar(f0);
  const [x1, y1] = polar(f1);
  const large = (f1 - f0) * SWEEP > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toNum = (v, fallback) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? fallback : Number(v));
const fmt = (v, lang, d) =>
  v === null || v === undefined || Number.isNaN(Number(v))
    ? "–"
    : Number(v).toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const CSS = `
:host{display:block;--vt-accent:#00e5ff;--vt-heat:#ff8a1f}
*{box-sizing:border-box}
[hidden]{display:none!important}
button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
button:focus-visible,select:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
ha-icon{--mdc-icon-size:20px;display:inline-flex}

ha-card{
  --acc:var(--vt-accent);
  display:block;position:relative;overflow:hidden;height:100%;container-type:inline-size;
  padding:12px 14px 0;border-radius:18px;color:#e9fbff;
  background:
    radial-gradient(130% 52% at 50% -4%,rgba(214,232,236,.66) 0%,rgba(140,168,176,.30) 42%,rgba(8,16,20,0) 74%),
    linear-gradient(180deg,#0f1c21 0%,#070d10 100%);
  border:1px solid color-mix(in srgb,var(--acc) 55%,transparent);
  box-shadow:0 0 14px color-mix(in srgb,var(--acc) 26%,transparent),
             inset 0 0 22px color-mix(in srgb,var(--acc) 9%,transparent);
  transition:border-color .3s,box-shadow .3s;
}
ha-card.heating{--acc:var(--vt-heat)}
ha-card.unavailable{opacity:.55;pointer-events:none;filter:grayscale(.6)}

/* En-tête */
.head{position:relative;z-index:3;display:grid;grid-template-columns:32px minmax(0,1fr) 32px;align-items:center}
.icon-btn{width:32px;height:32px;border:0;background:none;color:var(--acc);border-radius:50%;display:grid;place-items:center;opacity:.9}
.icon-btn:hover{background:color-mix(in srgb,var(--acc) 14%,transparent)}
.title{text-align:center;cursor:pointer;min-width:0}
.name{display:block;font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--acc);
  text-shadow:0 0 10px color-mix(in srgb,var(--acc) 60%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.head-state ha-icon{--mdc-icon-size:13px;color:#ffb15e;margin-left:4px;vertical-align:-2px}
.head-state{display:none;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(233,251,255,.65);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Badges */
.badges{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-top:6px}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px 2px 5px;border-radius:999px;font-size:10px;font-weight:700;
  color:#ffd9a8;border:1px solid rgba(255,138,31,.55);background:rgba(255,138,31,.12)}
.badge ha-icon{--mdc-icon-size:14px}

/* Jauge */
.gauge{position:relative;width:min(100%,172px);margin:2px auto 0}
.gauge svg{display:block;width:100%;height:auto;overflow:visible}
.track,.fill{fill:none;stroke-width:12;stroke-linecap:round}
.track{stroke:rgba(255,255,255,.09)}
.fill{stroke:var(--acc);filter:drop-shadow(0 0 5px color-mix(in srgb,var(--acc) 70%,transparent))}
.dot-set{fill:#03080a;stroke:rgba(255,255,255,.28);stroke-width:1}
.dot-cur{fill:#fff;filter:drop-shadow(0 0 4px rgba(255,255,255,.8))}
.center{position:absolute;inset:0 0 12% 0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.temp{font-size:clamp(28px,19cqw,44px);font-weight:800;line-height:1;color:#fff;letter-spacing:-.01em;
  text-shadow:0 0 14px color-mix(in srgb,var(--acc) 40%,transparent)}
.unit{font-size:.36em;font-weight:700;vertical-align:top;margin-left:2px;color:var(--acc);position:relative;top:.25em}
.state{margin-top:6px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--acc)}

/* Consigne */
.setpoint{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;width:min(100%,190px);margin:-20px auto 0}
.round{width:36px;height:36px;flex:none;border-radius:50%;display:grid;place-items:center;color:var(--acc);
  border:1px solid color-mix(in srgb,var(--acc) 75%,transparent);
  background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--acc) 22%,transparent),rgba(0,0,0,.6));
  box-shadow:0 0 10px color-mix(in srgb,var(--acc) 35%,transparent);transition:transform .12s,box-shadow .2s}
.round:active{transform:scale(.92)}
.round ha-icon{--mdc-icon-size:22px}
.sp-text{display:flex;flex-direction:column;align-items:center;gap:1px;padding-top:8px}
.lbl{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(233,251,255,.55)}
.sp-val{font-size:16px;font-weight:800;color:#fff;white-space:nowrap}

/* Modes HVAC */
.modes{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:8px;margin-top:12px}
.mode{display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 6px;border-radius:10px;
  font-size:10px;font-weight:700;color:rgba(233,251,255,.7);background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);
  transition:background .2s,border-color .2s,color .2s,box-shadow .2s}
.mode.active{color:var(--acc);border-color:var(--acc);background:color-mix(in srgb,var(--acc) 13%,rgba(0,0,0,.4));
  box-shadow:0 0 10px color-mix(in srgb,var(--acc) 35%,transparent)}

/* Preset */
.preset{position:relative;margin-top:10px}
.preset select{appearance:none;-webkit-appearance:none;width:100%;height:34px;padding:0 32px 0 12px;border-radius:10px;
  font-family:inherit;font-weight:700;font-size:13px;color:#fff;background:rgba(0,0,0,.5);border:1px solid color-mix(in srgb,var(--acc) 65%,transparent)}
.preset select option{background:#0b1418;color:#fff}
.preset ha-icon{position:absolute;right:8px;top:7px;color:var(--acc);pointer-events:none}

/* Puissance */
.power{margin:12px 0}
.bar{height:5px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.bar i{display:block;height:100%;width:0;border-radius:inherit;background:var(--acc);
  box-shadow:0 0 8px var(--acc);transition:width .5s ease}
.power-text{margin-top:8px;text-align:center;font-size:11px;font-weight:700;color:#fff;white-space:nowrap}

/* Statut */
.status{margin:0 -14px;padding:10px 14px 13px;text-align:center;
  background:linear-gradient(180deg,color-mix(in srgb,var(--acc) 5%,transparent),color-mix(in srgb,var(--acc) 13%,transparent));
  border-top:1px solid color-mix(in srgb,var(--acc) 35%,transparent)}
.status .lbl{display:block;margin-bottom:3px}
.st-val{display:block;font-size:13px;font-weight:800;color:var(--acc);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Panneau d'informations */
.panel{position:absolute;inset:0;z-index:2;overflow:auto;padding:48px 16px 14px;background:rgba(4,9,11,.95);
  backdrop-filter:blur(4px)}
.row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,.07)}
.row span:first-child{color:rgba(233,251,255,.6)}
.row span:last-child{font-weight:700;color:#fff;text-align:right}

/* ------------------------- Mise en page COMPACTE ------------------------- */
.layout-compact{padding:10px 12px 0}
.layout-compact .head{grid-template-columns:minmax(0,1fr)}
.layout-compact .head .icon-btn{display:none}
.layout-compact .gauge{width:min(100%,116px)}
.layout-compact .temp{font-size:clamp(22px,16cqw,30px)}
.layout-compact .state{margin-top:3px;font-size:9px}
.layout-compact .setpoint{width:min(100%,128px);margin-top:-15px}
.layout-compact .round{width:30px;height:30px}
.layout-compact .round ha-icon{--mdc-icon-size:18px}
.layout-compact .sp-text{padding-top:4px}
.layout-compact .lbl{display:none}
.layout-compact .sp-val{font-size:14px}
.layout-compact .modes{margin-top:8px;gap:6px}
.layout-compact .mode{padding:6px}
.layout-compact .mode .mlabel{display:none}
.layout-compact .power{margin:8px 0 10px}
.layout-compact .power-text{margin-top:5px;font-size:10px}

/* ------------------------- Mise en page HORIZONTALE ------------------------- */
.layout-horizontal{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;
  grid-template-areas:"gauge head setpoint modes" "gauge power setpoint modes";
  column-gap:8px;row-gap:4px;align-items:center;padding:10px 12px}
.layout-horizontal .gauge{grid-area:gauge;width:72px;margin:0}
.layout-horizontal .center{inset:0 0 10% 0}
.layout-horizontal .temp{font-size:17px}
.layout-horizontal .unit{font-size:.5em}
.layout-horizontal .gauge .state{display:none}
.layout-horizontal .head{grid-area:head;display:block}
.layout-horizontal .head .icon-btn{display:none}
.layout-horizontal .title{text-align:left}
.layout-horizontal .head-state{display:block}
.layout-horizontal .badges{display:none}
.layout-horizontal .setpoint{grid-area:setpoint;width:auto;margin:0;gap:3px}
.layout-horizontal .round{width:30px;height:30px}
.layout-horizontal .round ha-icon{--mdc-icon-size:18px}
.layout-horizontal .sp-text{padding:0;min-width:38px}
.layout-horizontal .lbl{display:none}
.layout-horizontal .sp-val{font-size:14px}
.layout-horizontal .modes{grid-area:modes;display:flex;flex-direction:column;margin:0;gap:4px}
.layout-horizontal .mode{width:30px;height:30px;padding:0;border-radius:50%;justify-content:center}
.layout-horizontal .mode .mlabel{display:none}
.layout-horizontal .power{grid-area:power;margin:0;display:flex;align-items:center;gap:8px}
.layout-horizontal .bar{flex:1}
.layout-horizontal .power-text{margin:0;font-size:10px}
.layout-horizontal .panel{padding-top:12px}

@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

/* ------------------------------------------------------------------ */
/* Carte                                                               */
/* ------------------------------------------------------------------ */
class VtNeonThermostatCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._pending = null;
    this._panelOpen = false;
    this._sig = {};
  }

  static getConfigElement() {
    return document.createElement(`${TAG}-editor`);
  }

  static getStubConfig(hass) {
    const entity = Object.keys((hass && hass.states) || {}).find((k) => k.startsWith("climate."));
    return { entity: entity || "climate.example", layout: "full" };
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("vt-neon-thermostat-card : le paramètre « entity » (climate.xxx) est obligatoire.");
    }
    const c = { ...DEFAULTS, ...config };
    c.powerEntity = config.powerEntity ?? config.power_entity;
    c.statusEntity = config.statusEntity ?? config.status_entity;
    c.set_current_as_main = config.set_current_as_main ?? config.setCurrentAsMain ?? DEFAULTS.set_current_as_main;
    c.disable_window = config.disable_window ?? config.disableWindow ?? DEFAULTS.disable_window;
    if (config.compact === true && !config.layout) c.layout = "compact";
    if (!["full", "compact", "horizontal"].includes(c.layout)) c.layout = "full";
    this._config = c;
    this._build();
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  getCardSize() {
    return { full: 7, compact: 4, horizontal: 2 }[this._config && this._config.layout] || 6;
  }

  getGridOptions() {
    const l = this._config && this._config.layout;
    if (l === "horizontal") return { columns: 12, rows: 2, min_columns: 6, min_rows: 2 };
    if (l === "compact") return { columns: 6, rows: 5, min_columns: 3, min_rows: 4 };
    return { columns: 6, rows: 8, min_columns: 3, min_rows: 6 };
  }

  disconnectedCallback() {
    clearTimeout(this._timer);
    clearTimeout(this._release);
  }

  /* ---------------------------- Construction ---------------------------- */
  _build() {
    const c = this._config;
    const root = this.shadowRoot;
    this._sig = {};
    root.innerHTML = `
      <style>${CSS}</style>
      <ha-card class="layout-${c.layout}">
        <div class="head">
          <button class="icon-btn" id="info" type="button" aria-expanded="false"><ha-icon icon="mdi:information-outline"></ha-icon></button>
          <div class="title" id="title"><span class="name" id="name"></span><span class="head-state" id="hstate"></span></div>
          <button class="icon-btn" id="more" type="button"><ha-icon icon="mdi:dots-vertical"></ha-icon></button>
        </div>
        <div class="badges" id="badges" hidden></div>
        <div class="gauge">
          <svg viewBox="6 6 188 164" aria-hidden="true">
            <path class="track" id="track"></path>
            <path class="fill" id="fill"></path>
            <circle class="dot-set" id="dset" r="5"></circle>
            <circle class="dot-cur" id="dcur" r="6.5"></circle>
          </svg>
          <div class="center">
            <div class="temp"><span id="temp"></span><span class="unit" id="unit"></span></div>
            <div class="state" id="state"></div>
          </div>
        </div>
        <div class="setpoint">
          <button class="round" id="minus" type="button"><ha-icon icon="mdi:minus"></ha-icon></button>
          <div class="sp-text"><span class="lbl" id="splabel"></span><span class="sp-val" id="spval"></span></div>
          <button class="round" id="plus" type="button"><ha-icon icon="mdi:plus"></ha-icon></button>
        </div>
        <div class="modes" id="modes"></div>
        <div class="preset" id="presetwrap"><select id="preset"></select><ha-icon icon="mdi:chevron-down"></ha-icon></div>
        <div class="power" id="power"><div class="bar"><i id="barfill"></i></div><div class="power-text" id="ptext"></div></div>
        <div class="status" id="status"><span class="lbl" id="stlabel"></span><span class="st-val" id="stval"></span></div>
        <div class="panel" id="panel" hidden></div>
      </ha-card>`;

    const $ = (s) => root.querySelector(s);
    this._r = {
      card: $("ha-card"), info: $("#info"), more: $("#more"), title: $("#title"), name: $("#name"), hstate: $("#hstate"),
      badges: $("#badges"), track: $("#track"), fill: $("#fill"), dset: $("#dset"), dcur: $("#dcur"),
      temp: $("#temp"), unit: $("#unit"), state: $("#state"), splabel: $("#splabel"), spval: $("#spval"),
      minus: $("#minus"), plus: $("#plus"), modes: $("#modes"), presetwrap: $("#presetwrap"), preset: $("#preset"),
      power: $("#power"), barfill: $("#barfill"), ptext: $("#ptext"), status: $("#status"),
      stlabel: $("#stlabel"), stval: $("#stval"), panel: $("#panel"),
    };
    const r = this._r;
    r.card.style.setProperty("--vt-accent", c.color);
    r.card.style.setProperty("--vt-heat", c.heat_color || c.color);
    r.track.setAttribute("d", arc(0, 1));

    r.minus.addEventListener("click", () => this._bump(-1));
    r.plus.addEventListener("click", () => this._bump(1));
    r.modes.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-mode]");
      if (b && this._hass) this._hass.callService("climate", "set_hvac_mode", { entity_id: c.entity, hvac_mode: b.dataset.mode });
    });
    r.preset.addEventListener("change", (e) => {
      if (this._hass) this._hass.callService("climate", "set_preset_mode", { entity_id: c.entity, preset_mode: e.target.value });
    });
    r.info.addEventListener("click", () => {
      this._panelOpen = !this._panelOpen;
      this._renderPanel();
    });
    r.more.addEventListener("click", () => this._moreInfo());
    r.title.addEventListener("click", () => this._moreInfo());
  }

  _moreInfo() {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId: this._config.entity }, bubbles: true, composed: true,
    }));
  }

  /* ------------------------------ Actions ------------------------------ */
  _bump(dir) {
    const l = this._lim;
    if (!l || l.tgt === null || !this._hass) return;
    const decimals = Math.max((String(l.step).split(".")[1] || "").length, 1);
    const v = Math.min(l.max, Math.max(l.min, Number((l.tgt + dir * l.step).toFixed(decimals))));
    this._pending = v;
    this._update();
    clearTimeout(this._timer);
    clearTimeout(this._release);
    this._timer = setTimeout(() => {
      this._hass.callService("climate", "set_temperature", { entity_id: this._config.entity, temperature: v });
      this._release = setTimeout(() => { this._pending = null; this._update(); }, 2500);
    }, 600);
  }

  /* ------------------------------- Rendu ------------------------------- */
  _t(key) {
    const lang = ((this._hass && this._hass.language) || "en").slice(0, 2);
    return (I18N[lang] || I18N.en)[key] || I18N.en[key] || key;
  }

  _presetLabel(p) {
    const c = this._config;
    const lang = ((this._hass && this._hass.language) || "en").slice(0, 2);
    if (c.preset_labels && c.preset_labels[p]) return c.preset_labels[p];
    const dict = PRESETS[lang] || PRESETS.en;
    return dict[p] || (p ? p.charAt(0).toUpperCase() + p.slice(1) : "");
  }

  _attr(a, key) {
    if (a[key] !== undefined) return a[key];
    if (a.specific_states && a.specific_states[key] !== undefined) return a.specific_states[key];
    if (a.configuration && a.configuration[key] !== undefined) return a.configuration[key];
    return undefined;
  }

  _update() {
    if (!this._r || !this._hass || !this._config) return;
    const c = this._config, h = this._hass, r = this._r;
    const lang = h.language || "en";
    const st = h.states[c.entity];
    const full = c.layout === "full";

    r.stlabel.textContent = c.status_label || this._t("status");
    r.splabel.textContent = this._t("target");
    r.minus.setAttribute("aria-label", this._t("minus"));
    r.plus.setAttribute("aria-label", this._t("plus"));
    r.info.setAttribute("aria-label", this._t("info"));
    r.more.setAttribute("aria-label", this._t("details"));

    if (!st) {
      r.card.classList.add("unavailable");
      r.name.textContent = c.name || c.entity;
      r.state.textContent = this._t("unavailable");
      r.hstate.textContent = this._t("unavailable");
      return;
    }

    const a = st.attributes || {};
    const unavailable = st.state === "unavailable" || st.state === "unknown";
    const unit = (h.config && h.config.unit_system && h.config.unit_system.temperature) || a.temperature_unit || "°C";
    const dec = toNum(c.decimals, 1);

    /* Températures */
    const cur = a.current_temperature != null && !Number.isNaN(Number(a.current_temperature)) ? Number(a.current_temperature) : null;
    const tgtAttr = a.temperature != null && !Number.isNaN(Number(a.temperature)) ? Number(a.temperature) : null;
    const tgt = this._pending !== null ? this._pending : tgtAttr;
    const min = toNum(c.min !== undefined ? c.min : a.min_temp, 7);
    const max = toNum(c.max !== undefined ? c.max : a.max_temp, 35);
    const step = toNum(c.step !== undefined ? c.step : (a.target_temp_step !== undefined ? a.target_temp_step : a.target_temperature_step), 0.5);
    this._lim = { min, max, step, tgt };
    const frac = (v) => clamp01((v - min) / (max - min || 1));

    /* Libellés principaux */
    r.card.classList.toggle("unavailable", unavailable);
    r.name.textContent = c.name || a.friendly_name || c.entity;
    const main = c.set_current_as_main ? cur : tgt;
    r.temp.textContent = fmt(main, lang, dec);
    r.unit.textContent = unit;
    if (c.set_current_as_main) {
      r.splabel.textContent = this._t("target");
      r.spval.textContent = tgt === null ? "–" : `${fmt(tgt, lang, dec)}${unit}`;
    } else {
      r.splabel.textContent = this._t("current");
      r.spval.textContent = cur === null ? "–" : `${fmt(cur, lang, dec)}${unit}`;
    }

    /* Jauge */
    if (cur !== null && frac(cur) > 0.002) {
      r.fill.setAttribute("d", arc(0, frac(cur)));
      r.fill.style.display = "";
    } else {
      r.fill.style.display = "none";
    }
    const place = (el, v) => {
      if (v === null) { el.style.display = "none"; return; }
      const [x, y] = polar(frac(v));
      el.setAttribute("cx", x.toFixed(2));
      el.setAttribute("cy", y.toFixed(2));
      el.style.display = "";
    };
    place(r.dcur, cur);
    place(r.dset, tgt);

    /* État */
    const action = a.hvac_action && a.hvac_action !== "off" ? a.hvac_action : null;
    const stateKey = unavailable ? st.state : (st.state === "off" ? "off" : (action || st.state));
    const stateText = this._t(stateKey);
    r.card.classList.toggle("heating", !unavailable && st.state !== "off" && a.hvac_action === "heating");

    /* Badges (fenêtre, délestage, sécurité, absence) */
    const badges = [];
    if (!c.disable_window) {
      const w = this._attr(a, "window_state");
      const wa = this._attr(a, "window_auto_state");
      if (w === "on" || wa === "on") badges.push({ icon: "mdi:window-open-variant", label: this._t("window") });
    }
    if (this._attr(a, "overpowering_state") === "on") badges.push({ icon: "mdi:flash-alert", label: this._t("overpowering") });
    if (this._attr(a, "security_state") === "on") badges.push({ icon: "mdi:shield-alert", label: this._t("security") });
    const bsig = badges.map((b) => b.icon).join("|") + lang;
    if (this._sig.badges !== bsig) {
      this._sig.badges = bsig;
      r.badges.textContent = "";
      badges.forEach((b) => {
        const el = document.createElement("span");
        el.className = "badge";
        const ic = document.createElement("ha-icon");
        ic.setAttribute("icon", b.icon);
        el.appendChild(ic);
        el.appendChild(document.createTextNode(b.label));
        r.badges.appendChild(el);
      });
    }
    r.badges.hidden = badges.length === 0;
    r.state.textContent = stateText;
    r.hstate.textContent = stateText;
    badges.forEach((b) => {
      const ic = document.createElement("ha-icon");
      ic.setAttribute("icon", b.icon);
      ic.setAttribute("title", b.label);
      r.hstate.appendChild(ic);
    });

    /* Boutons de mode */
    const avail = Array.isArray(a.hvac_modes) ? a.hvac_modes : [];
    let modes = (c.hvac_modes || []).filter((m) => avail.includes(m));
    if (!modes.length) modes = avail.slice(0, 4);
    const hideModes = c.hide_modes === true;
    r.modes.hidden = hideModes || !modes.length;
    const msig = modes.join(",") + lang;
    if (this._sig.modes !== msig) {
      this._sig.modes = msig;
      r.modes.textContent = "";
      modes.forEach((m) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mode";
        b.dataset.mode = m;
        b.setAttribute("aria-label", this._t(m));
        const ic = document.createElement("ha-icon");
        ic.setAttribute("icon", MODE_ICONS[m] || "mdi:thermostat");
        const lb = document.createElement("span");
        lb.className = "mlabel";
        lb.textContent = this._t(m);
        b.append(ic, lb);
        r.modes.appendChild(b);
      });
    }
    r.modes.querySelectorAll(".mode").forEach((b) => {
      const active = b.dataset.mode === st.state;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });

    /* Preset */
    const presets = Array.isArray(a.preset_modes) ? a.preset_modes : [];
    const hidePreset = c.hide_preset !== undefined ? c.hide_preset : !full;
    r.presetwrap.hidden = hidePreset || !presets.length;
    const psig = presets.join(",") + lang + JSON.stringify(c.preset_labels || {});
    if (this._sig.presets !== psig) {
      this._sig.presets = psig;
      r.preset.textContent = "";
      presets.forEach((p) => {
        const o = document.createElement("option");
        o.value = p;
        o.textContent = this._presetLabel(p);
        r.preset.appendChild(o);
      });
    }
    if (a.preset_mode) r.preset.value = a.preset_mode;

    /* Puissance */
    let pct = this._attr(a, "on_percent");
    if (pct === undefined) pct = this._attr(a, "power_percent");
    pct = pct === undefined || pct === null || Number.isNaN(Number(pct)) ? null : Number(pct) * (Number(pct) <= 1 ? 100 : 1);
    const ps = c.powerEntity ? h.states[c.powerEntity] : undefined;
    let watts = ps && ps.state !== "unavailable" && ps.state !== "unknown" && !Number.isNaN(Number(ps.state)) ? Number(ps.state) : null;
    if (pct === null && watts !== null && c.max_power) pct = Math.min(100, (watts / Number(c.max_power)) * 100);
    r.power.hidden = c.hide_power === true || (pct === null && watts === null);
    r.barfill.style.width = `${Math.min(100, Math.max(0, pct || 0))}%`;
    const parts = [];
    if (pct !== null) parts.push(`${Math.round(pct)} %`);
    if (watts !== null) parts.push(`${Math.round(watts)} W`);
    r.ptext.textContent = parts.join(" - ");

    /* Statut du pilote */
    const hideStatus = c.hide_status !== undefined ? c.hide_status : !full;
    r.status.hidden = hideStatus || !c.statusEntity;
    if (c.statusEntity) {
      const ss = h.states[c.statusEntity];
      r.stval.textContent = ss && ss.state !== "unavailable" && ss.state !== "unknown" ? ss.state : "—";
    }

    this._renderPanel(st, a, { cur, tgt, unit, dec, lang });
  }

  _renderPanel(st, a, v) {
    const r = this._r;
    r.panel.hidden = !this._panelOpen;
    r.info.setAttribute("aria-expanded", String(this._panelOpen));
    if (!this._panelOpen || !this._hass) return;
    const h = this._hass;
    st = st || h.states[this._config.entity];
    if (!st) return;
    a = a || st.attributes || {};
    const lang = h.language || "en";
    const unit = (h.config && h.config.unit_system && h.config.unit_system.temperature) || "°C";
    const dec = toNum(this._config.decimals, 1);
    const yn = (x) => (x === "on" ? this._t("yes") : x === "off" ? this._t("no") : null);
    const rows = [
      [this._t("current"), a.current_temperature != null ? `${fmt(a.current_temperature, lang, dec)}${unit}` : null],
      [this._t("target"), a.temperature != null ? `${fmt(a.temperature, lang, dec)}${unit}` : null],
      [this._t("mode"), this._t(st.state)],
      [this._t("preset"), a.preset_mode ? this._presetLabel(a.preset_mode) : null],
      [this._t("outdoor"), this._attr(a, "ext_current_temperature") != null ? `${fmt(this._attr(a, "ext_current_temperature"), lang, dec)}${unit}` : null],
      ...(this._config.disable_window ? [] : [[this._t("window"), yn(this._attr(a, "window_state"))]]),
      [this._t("presence"), yn(this._attr(a, "presence_state"))],
      [this._t("motion"), yn(this._attr(a, "motion_state"))],
      [this._t("overpowering"), yn(this._attr(a, "overpowering_state"))],
      [this._t("security"), yn(this._attr(a, "security_state"))],
    ].filter((x) => x[1] !== null && x[1] !== undefined);
    r.panel.textContent = "";
    rows.forEach(([k, val]) => {
      const row = document.createElement("div");
      row.className = "row";
      const s1 = document.createElement("span");
      s1.textContent = k;
      const s2 = document.createElement("span");
      s2.textContent = val;
      row.append(s1, s2);
      r.panel.appendChild(row);
    });
  }
}

/* ------------------------------------------------------------------ */
/* Éditeur visuel                                                      */
/* ------------------------------------------------------------------ */
const EDITOR_LABELS = {
  fr: {
    entity: "Thermostat (climate)", name: "Nom affiché", layout: "Mise en page",
    powerEntity: "Capteur de puissance (W)", statusEntity: "Entité de statut",
    status_label: "Titre du bloc statut", color: "Couleur néon (hex)",
    set_current_as_main: "Température actuelle en grand", disable_window: "Désactiver la détection fenêtre",
    hide_preset: "Masquer le preset", hide_status: "Masquer le statut", hide_power: "Masquer la puissance", hide_modes: "Masquer les modes",
  },
  en: {
    entity: "Thermostat (climate)", name: "Display name", layout: "Layout",
    powerEntity: "Power sensor (W)", statusEntity: "Status entity",
    status_label: "Status block title", color: "Neon color (hex)",
    set_current_as_main: "Show current temperature as main", disable_window: "Disable window detection",
    hide_preset: "Hide preset", hide_status: "Hide status", hide_power: "Hide power", hide_modes: "Hide modes",
  },
};

class VtNeonThermostatCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _schema() {
    const fr = ((this._hass && this._hass.language) || "en").startsWith("fr");
    return [
      { name: "entity", required: true, selector: { entity: { domain: "climate" } } },
      { name: "name", selector: { text: {} } },
      {
        name: "layout",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "full", label: fr ? "Complète" : "Full" },
              { value: "compact", label: fr ? "Compacte" : "Compact" },
              { value: "horizontal", label: fr ? "Horizontale" : "Horizontal" },
            ],
          },
        },
      },
      { name: "powerEntity", selector: { entity: { domain: "sensor" } } },
      { name: "statusEntity", selector: { entity: { domain: ["input_text", "sensor", "text"] } } },
      { name: "status_label", selector: { text: {} } },
      { name: "color", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "set_current_as_main", selector: { boolean: {} } },
          { name: "disable_window", selector: { boolean: {} } },
          { name: "hide_preset", selector: { boolean: {} } },
          { name: "hide_status", selector: { boolean: {} } },
          { name: "hide_power", selector: { boolean: {} } },
          { name: "hide_modes", selector: { boolean: {} } },
        ],
      },
    ];
  }

  _render() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (e) => {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config: e.detail.value }, bubbles: true, composed: true,
        }));
      });
      this.appendChild(this._form);
    }
    const lang = ((this._hass && this._hass.language) || "en").slice(0, 2);
    const labels = EDITOR_LABELS[lang] || EDITOR_LABELS.en;
    this._form.hass = this._hass;
    this._form.computeLabel = (s) => labels[s.name] || s.name;
    this._form.schema = this._schema();
    this._form.data = this._config;
  }
}

/* ------------------------------------------------------------------ */
/* Enregistrement                                                      */
/* ------------------------------------------------------------------ */
if (!customElements.get(TAG)) customElements.define(TAG, VtNeonThermostatCard);
if (!customElements.get(`${TAG}-editor`)) customElements.define(`${TAG}-editor`, VtNeonThermostatCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((x) => x.type === TAG)) {
  window.customCards.push({
    type: TAG,
    name: "VT Neon Thermostat Card",
    description: "Thermostat néon pour Versatile Thermostat — mises en page complète, compacte et horizontale.",
    preview: true,
    documentationURL: "https://github.com/VOTRE_PSEUDO/vt-neon-thermostat-card",
  });
}

console.info(
  `%c VT-NEON-THERMOSTAT-CARD %c v${VERSION} `,
  "color:#001014;background:#00e5ff;font-weight:700;border-radius:3px 0 0 3px;padding:2px 0",
  "color:#00e5ff;background:#001014;font-weight:700;border-radius:0 3px 3px 0;padding:2px 0"
);
