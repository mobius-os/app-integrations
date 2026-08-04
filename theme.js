// Connections — scoped stylesheet (JS template literal; keep backticks out).
// Inherits the shell's design tokens: --bg --surface --surface2 --border
// --text --muted --accent --accent-fg --green --danger --font.
export const CSS = `
.cx-root { position: relative; display: flex; flex-direction: column; height: 100%; width: 100%;
  max-width: 100%; overflow: hidden; background: var(--bg); color: var(--text);
  font-family: var(--font); -webkit-font-smoothing: antialiased; }
.cx-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 14px 16px 40px;
  display: flex; flex-direction: column; gap: 10px; word-break: break-word; overflow-wrap: anywhere; }
.cx-scroll > * { flex-shrink: 0; }

.cx-header { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
  gap: 12px; min-height: 48px; padding: max(12px, env(safe-area-inset-top)) 16px 12px;
  background: var(--surface); border-bottom: 1px solid var(--border); }
.cx-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
.cx-back { flex: 0 0 auto; min-width: 40px; min-height: 40px; border: 0; border-radius: 10px;
  background: transparent; color: var(--muted); font-size: 19px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; }
.cx-back:hover { color: var(--text); background: var(--surface2, var(--bg)); }
.cx-brand-text { min-width: 0; line-height: 1.15; }
.cx-title { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.015em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cx-subtitle { display: block; margin-top: 2px; font-size: 12px; font-weight: 500; color: var(--muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.cx-header-right { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }

.cx-btn { min-height: 40px; padding: 8px 15px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text); font-family: var(--font); font-size: 13px;
  font-weight: 650; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; transition: background .15s, color .15s, border-color .15s, opacity .15s; }
.cx-btn:disabled { opacity: .55; cursor: default; }
.cx-btn--primary { background: var(--accent); border-color: var(--accent); color: var(--accent-fg, #fff); }
.cx-btn--danger { background: color-mix(in srgb, var(--danger) 14%, transparent);
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); color: var(--danger); }
.cx-btn--ghost { background: transparent; }

.cx-card { display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px 14px 8px 0;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  font-family: var(--font); color: var(--text);
  transition: border-color .15s, background .15s; }
.cx-card:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); }
.cx-card-open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px;
  padding: 5px 0 5px 14px; border: 0; background: transparent; text-align: left;
  cursor: pointer; font-family: var(--font); color: var(--text); border-radius: 12px 0 0 12px; }
.cx-card.is-off .cx-card-name, .cx-card.is-off .cx-card-meta { opacity: .6; }
.cx-dot { flex: 0 0 auto; width: 10px; height: 10px; border-radius: 50%; margin-top: 1px; }
.cx-dot--green { background: var(--green); }
.cx-dot--danger { background: var(--danger); }
.cx-dot--muted { background: var(--border); }
.cx-card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.cx-card-name { font-size: 14.5px; font-weight: 650; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; }
.cx-card-endpoint { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; }
.cx-card-meta { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.cx-card-meta .is-warn { color: var(--danger); font-weight: 600; }
.cx-chevron { flex: 0 0 auto; color: var(--muted); font-size: 16px; }

.cx-switch { flex: 0 0 auto; position: relative; width: 44px; height: 26px; border-radius: 13px;
  border: 1px solid var(--border); background: var(--surface2, var(--bg)); cursor: pointer;
  transition: background .18s, border-color .18s; padding: 0; }
.cx-switch span { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
  border-radius: 50%; background: var(--muted); transition: transform .18s, background .18s; }
.cx-switch.is-on { background: color-mix(in srgb, var(--green) 30%, transparent);
  border-color: color-mix(in srgb, var(--green) 55%, var(--border)); }
.cx-switch.is-on span { transform: translateX(18px); background: var(--green); }
.cx-switch:disabled { opacity: .5; cursor: default; }

.cx-empty { display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 44px 24px; text-align: center; color: var(--muted); }
.cx-empty-glyph { font-size: 34px; opacity: .8; }
.cx-empty-title { font-size: 15px; font-weight: 650; color: var(--text); margin: 0; }
.cx-empty p { margin: 0; font-size: 13px; line-height: 1.5; max-width: 340px; }

.cx-notice { padding: 12px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5;
  background: var(--surface); border: 1px solid var(--border); color: var(--muted); }
.cx-notice--danger { border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  background: color-mix(in srgb, var(--danger) 8%, var(--surface)); color: var(--text); }
.cx-notice--accent { border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  background: color-mix(in srgb, var(--accent) 8%, var(--surface)); color: var(--text); }
.cx-notice a, .cx-notice button.cx-linklike { color: var(--accent); font-weight: 650; }
.cx-linklike { border: 0; background: none; padding: 0; font: inherit; cursor: pointer; }

.cx-section-label { margin: 8px 2px 0; font-size: 12px; font-weight: 700; letter-spacing: .04em;
  text-transform: uppercase; color: var(--muted); }

.cx-detail { display: flex; flex-direction: column; gap: 10px; }
.cx-detail-head { display: flex; align-items: flex-start; gap: 12px; padding: 16px 14px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.cx-detail-name { margin: 0; font-size: 17px; font-weight: 700; }
.cx-detail-state { margin-top: 3px; font-size: 12.5px; color: var(--muted); }
.cx-kv { display: flex; flex-direction: column; gap: 0; background: var(--surface);
  border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.cx-kv-row { display: flex; justify-content: space-between; align-items: baseline; gap: 14px;
  padding: 11px 14px; font-size: 13px; border-top: 1px solid var(--border); }
.cx-kv-row:first-child { border-top: 0; }
.cx-kv-key { color: var(--muted); flex: 0 0 auto; font-weight: 600; }
.cx-kv-value { min-width: 0; text-align: right; font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere; }
.cx-kv-value.is-warn { color: var(--danger); }
.cx-tools { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 14px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.cx-tool-chip { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;
  background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--text);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border)); }
.cx-detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.cx-detail-actions .cx-btn { flex: 1; min-width: 120px; }

.cx-form { display: flex; flex-direction: column; gap: 12px; padding: 16px 14px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.cx-field { display: flex; flex-direction: column; gap: 6px; }
.cx-field > span { font-size: 12.5px; font-weight: 650; color: var(--muted); }
.cx-field input { min-height: 44px; padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--bg); color: var(--text);
  font-family: var(--font); font-size: 14px; }
.cx-field input:focus { outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
  outline-offset: 1px; }
.cx-form-actions { display: flex; gap: 8px; }
.cx-form-actions .cx-btn { flex: 1; }
.cx-support-note { margin: 0; font-size: 12px; color: var(--muted); line-height: 1.5; }

.cx-search { min-height: 44px; padding: 10px 14px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
  font-family: var(--font); font-size: 14px; width: 100%; }
.cx-search:focus { outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
  outline-offset: 1px; }
.cx-card-icon { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 6px; }

.cx-suggestion { display: flex; flex-direction: column; gap: 8px; padding: 14px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.cx-suggestion-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cx-suggestion-id { display: flex; align-items: center; gap: 11px; min-width: 0; }
.cx-suggestion-icon { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 8px; }
.cx-suggestion-name { margin: 0; font-size: 15px; font-weight: 700; }
.cx-suggestion-tagline { font-size: 12.5px; color: var(--muted); font-weight: 600; }
.cx-suggestion-detail { margin: 0; font-size: 13px; line-height: 1.5; }
.cx-suggestion-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  font-size: 12px; color: var(--muted); }
.cx-pill { padding: 3px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 650;
  border: 1px solid var(--border); background: var(--bg); color: var(--muted); }
.cx-pill--added { border-color: color-mix(in srgb, var(--green) 55%, var(--border));
  color: var(--green); }

.cx-confirm { display: flex; gap: 8px; align-items: center; }
.cx-confirm .cx-btn { flex: 1; }
`
