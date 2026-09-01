/* ------------------------------------------------------------------ *
 *  Theme — "Grid Lab"
 *
 *  Drop-in replacement for src/theme.js. Verified against the real
 *  markup in App.jsx, Analyze.jsx, Capture.jsx and Review.jsx — every
 *  class those files use is defined here, so no page markup has to
 *  change; only the tokens, shape language and type treatment differ.
 *
 *  Shape language: nothing is rounded. Panels are hairline-ruled
 *  rectangles, controls are joined segment strips, selection is a 2px
 *  left edge in an accent. Type is one family (JetBrains Mono) with
 *  uppercase tracked micro-labels.
 * ------------------------------------------------------------------ */

export const C = {
  /* surfaces */
  ground: "#05080E",   // page
  panel: "#0A0F18",    // cards, rows, tiles
  panel2: "#070B13",   // recessed: inputs, chart wells, mastheads
  rule: "#17232F",     // hairline, 1px, every border
  rule2: "#0F1A25",    // inner hairline: row dividers inside a panel

  /* text */
  ink: "#DBE6F2",      // body
  bright: "#F4F8FD",   // headings, hero numerals on ink
  muted: "#4F6274",    // labels, secondary meta
  dim: "#3F5162",      // micro-labels, axis ticks
  ghost: "#24313F",    // disabled marks, empty swatch borders

  /* accents — exactly two */
  signal: "#FF4FA3",   // magenta: primary action, LT2, series 1
  cool: "#35D6C0",     // teal: positive delta, LT1, series 2

  /* lactate zone ramp (reading severity, not series identity) */
  zone1: "#35D6C0",    // < 2.0 mmol
  zone2: "#FFB03A",    // < 3.0
  zone3: "#FF8A4C",    // < 4.5
  zone4: "#FF3B5C",    // >= 4.5
  hot: "#FF3B5C",      // destructive / error (alias of zone4)
  warm: "#FF8A4C",
  sel: "#DBE6F2",      // selected-control fill: ink, inverted
};

/* Multi-test overlay series. Order matters — tests are coloured by
   selection order, and the first two carry the accent pair. */
export const SERIES = ["#FF4FA3", "#35D6C0", "#A78BFF", "#FFB03A", "#FF7A5C", "#5AA9FF"];

export const lactColor = (v) =>
  v == null ? C.ghost : v < 2.0 ? C.zone1 : v < 3.0 ? C.zone2 : v < 4.5 ? C.zone3 : C.zone4;

/* Recharts needs values, not classes. Import this instead of hardcoding
   colours in a chart component. */
export const chart = {
  grid: C.rule,
  gridField: "rgba(53,214,192,.07)",
  tick: { fill: C.muted, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
  axisLabel: { fill: C.dim, fontSize: 10, letterSpacing: ".14em" },
  tooltip: {
    background: C.panel,
    border: `1px solid ${C.rule}`,
    borderRadius: 0,
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
  },
  legend: { fontSize: 10, letterSpacing: ".14em", color: C.muted },
  curve: { strokeWidth: 2.5, dot: { r: 0 }, squareDot: 6 },
  lt1Dash: "1 4",   // dotted — LT1
  lt2Dash: "7 4",   // dashed — LT2
  obla: "4 4",      // the fixed 4.0 mmol line (horizontal, on y)
  series: SERIES,
};

const baseCss = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* The page itself, not just the app root. body carries an 8px UA margin
   and neither html nor body has a background of its own, so the browser
   canvas showed as a pale frame around everything. Tokens live on
   .lt-root and are not visible to its ancestors, hence the literal from
   the same C object the tokens are built from.

   color-scheme keeps scrollbars and form controls dark to match. */
html { background:${C.ground}; color-scheme:dark; }
body { margin:0; padding:0; background:${C.ground}; }

.lt-root {
  --ground:${C.ground}; --panel:${C.panel}; --panel2:${C.panel2};
  --rule:${C.rule}; --rule2:${C.rule2};
  --ink:${C.ink}; --bright:${C.bright}; --muted:${C.muted}; --dim:${C.dim}; --ghost:${C.ghost};
  --signal:${C.signal}; --cool:${C.cool};
  --warm:${C.warm}; --hot:${C.hot}; --sel:${C.sel};

  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px;
  --mono:'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  background:var(--ground); color:var(--ink); min-height:100vh;
  font-family:var(--mono); font-variant-numeric:tabular-nums;
  -webkit-font-smoothing:antialiased; padding:0 0 40px;
}
.lt-root *,.lt-root *::before,.lt-root *::after{box-sizing:border-box;}
/* Nothing in this system is rounded. */
.lt-root *{border-radius:0 !important;}
.lt-wrap{max-width:760px;margin:0 auto;padding:0 14px;}
.lt-wrap-wide{max-width:1280px;margin:0 auto;padding:0 14px;}
.lt-mono{font-family:var(--mono);font-variant-numeric:tabular-nums;}

/* --- texture: the two grid fields. Decoration only, never over text. --- */
.lt-horizon{position:relative;overflow:hidden;background:var(--panel2);}
.lt-horizon::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:86px;
  background-image:
    repeating-linear-gradient(90deg, rgba(255,79,163,.22) 0 1px, transparent 1px 44px),
    repeating-linear-gradient(rgba(53,214,192,.16) 0 1px, transparent 1px 12px);
  -webkit-mask-image:linear-gradient(transparent, #000 85%);
  mask-image:linear-gradient(transparent, #000 85%);pointer-events:none;}
.lt-horizon > *{position:relative;}
.lt-gridfield{position:relative;background:var(--panel2);}
.lt-gridfield::before{content:"";position:absolute;inset:0;pointer-events:none;
  background-image:
    repeating-linear-gradient(90deg, rgba(53,214,192,.07) 0 1px, transparent 1px 44px),
    repeating-linear-gradient(rgba(53,214,192,.05) 0 1px, transparent 1px 22px);}
.lt-gridfield > *{position:relative;}

/* --- type --- */
.lt-eyebrow{font-size:11px;letter-spacing:.46em;text-transform:uppercase;color:var(--cool);font-weight:500;}
.lt-h1{font-size:26px;font-weight:500;letter-spacing:-.01em;margin:10px 0 4px;line-height:1.15;color:var(--bright);}
.lt-sub{font-size:12.5px;color:var(--muted);line-height:1.6;}
.lt-micro{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim);}
.lt-label{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);}

/* --- panels --- */
.lt-card{background:var(--panel);border:1px solid var(--rule);padding:var(--s4);margin-top:var(--s3);}
.lt-card-t{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);
  font-weight:500;padding-bottom:9px;border-bottom:1px solid var(--rule);margin-bottom:var(--s3);}

.lt-grid{display:grid;gap:var(--s3);}
.lt-g2{grid-template-columns:1fr 1fr;}
.lt-g3{grid-template-columns:repeat(3,1fr);}

/* --- fields --- */
/* Capture/Review markup is <label class="lt-field"><span>Label</span><input>. */
.lt-field{display:block;}
.lt-field > span,.lt-field label{display:block;font-size:9px;letter-spacing:.22em;
  text-transform:uppercase;color:var(--dim);margin-bottom:6px;}
.lt-field + .lt-field{margin-top:var(--s3);}
/* inside a grid the gap already spaces fields; the sibling margin
   would otherwise drop every field but the first, misaligning row 1 */
.lt-grid > .lt-field + .lt-field{margin-top:0;}
.lt-input{width:100%;background:var(--panel2);border:1px solid var(--rule);color:var(--ink);
  padding:11px 12px;font-size:15px;font-family:var(--mono);font-variant-numeric:tabular-nums;
  outline:none;transition:border-color .1s,box-shadow .1s;}
.lt-input:focus{border-color:var(--cool);box-shadow:inset 0 0 0 1px var(--cool);}
.lt-input::placeholder{color:var(--ghost);}
.lt-big{font-size:30px;padding:16px 12px;text-align:center;letter-spacing:.02em;}

/* --- buttons: square, tracked, uppercase --- */
.lt-btn{border:1px solid var(--rule);background:transparent;color:var(--ink);
  padding:11px 16px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;
  cursor:pointer;font-family:var(--mono);transition:background .1s,color .1s,border-color .1s;}
.lt-btn:hover{background:var(--panel);border-color:#24313F;}
.lt-btn:focus-visible{outline:1px solid var(--cool);outline-offset:2px;}
.lt-btn-primary{background:var(--signal);color:#2A0A1A;border-color:var(--signal);font-weight:700;}
.lt-btn-primary:hover{background:#FF6BB3;border-color:#FF6BB3;}
.lt-btn-primary:disabled{opacity:.32;cursor:not-allowed;background:var(--signal);}
.lt-btn-lg{width:100%;padding:15px;font-size:12px;}
.lt-btn-ghost{background:transparent;color:var(--muted);border-color:transparent;}
.lt-btn-ghost:hover{color:var(--ink);background:var(--panel);}
.lt-btn:disabled{opacity:.35;cursor:not-allowed;}

/* --- lane strip: PROPOSED, not in the current build. Optional
       replacement for the stage table's at-a-glance read. --- */
.lt-lanes{display:flex;gap:2px;align-items:flex-end;height:62px;margin:var(--s2) 0 var(--s1);}
.lt-lane{flex:1;position:relative;background:var(--panel2);height:100%;overflow:hidden;
  cursor:pointer;border:1px solid var(--rule);transition:border-color .1s;}
.lt-lane:hover{border-color:#24313F;}
.lt-lane.active{border-color:var(--signal);box-shadow:inset 0 0 0 1px var(--signal);}
.lt-lane-fill{position:absolute;left:0;right:0;bottom:0;transition:height .35s ease;}
.lt-lane-num{position:absolute;top:3px;left:0;right:0;text-align:center;font-size:9px;
  letter-spacing:.1em;color:var(--dim);}
.lt-lane-val{position:absolute;bottom:3px;left:0;right:0;text-align:center;font-size:10px;
  font-weight:700;color:#05080E;}

.lt-timer{text-align:center;padding:22px 0 6px;}
.lt-timer-n{font-size:64px;font-weight:700;line-height:.92;letter-spacing:-.02em;color:var(--bright);}
.lt-timer-l{font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:var(--dim);margin-top:10px;}

/* --- rows, tables --- */
.lt-row{display:flex;justify-content:space-between;align-items:baseline;padding:10px 0;
  border-bottom:1px solid var(--rule2);font-size:12.5px;}
.lt-row:last-child{border-bottom:none;}
.lt-row-k{color:var(--muted);font-size:11px;letter-spacing:.06em;}
.lt-row-v{font-variant-numeric:tabular-nums;}

.lt-table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums;}
.lt-table th{text-align:right;color:var(--dim);font-weight:500;font-size:9px;letter-spacing:.2em;
  text-transform:uppercase;padding:0 0 9px;border-bottom:1px solid var(--rule);}
.lt-table th:first-child,.lt-table td:first-child{text-align:left;}
.lt-table td{text-align:right;padding:9px 0;border-bottom:1px solid var(--rule2);}
.lt-table tr:last-child td{border-bottom:none;}

.lt-note{font-size:11.5px;color:var(--muted);line-height:1.65;}
.lt-flag{border-left:2px solid var(--signal);padding:3px 0 3px 12px;margin:12px 0;font-size:12px;line-height:1.6;}
.lt-flag b{color:var(--bright);font-weight:500;}
.lt-flag.cool{border-color:var(--cool);}
.lt-flag.hot{border-color:var(--hot);}

/* --- chips: joined strip, active is inverted ink --- */
.lt-chips{display:flex;flex-wrap:wrap;}
.lt-chip{border:1px solid var(--rule);border-left:none;background:transparent;color:var(--muted);
  padding:6px 12px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;
  font-family:var(--mono);}
.lt-chip:first-child{border-left:1px solid var(--rule);}
.lt-chip:hover{color:var(--ink);}
.lt-chip.on{background:var(--sel);color:var(--ground);border-color:var(--sel);}
.lt-chip:focus-visible{outline:1px solid var(--cool);outline-offset:2px;}

.lt-open{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;
  background:transparent;border:none;border-bottom:1px solid var(--rule2);color:var(--ink);
  padding:12px 6px;cursor:pointer;font-family:var(--mono);text-align:left;transition:background .1s;}
.lt-open:last-child{border-bottom:none;}
.lt-open:hover{background:var(--panel);}
.lt-open:focus-visible{outline:1px solid var(--cool);outline-offset:-2px;}
.lt-open-l{font-size:12.5px;}
.lt-open-s{font-size:10.5px;color:var(--dim);margin-top:4px;}
.lt-spark{display:flex;gap:2px;align-items:flex-end;height:22px;width:58px;flex-shrink:0;}
.lt-spark span{flex:1;min-height:2px;}
.lt-chev{color:var(--dim);font-size:14px;flex-shrink:0;}

.lt-foot{display:flex;gap:var(--s2);margin-top:var(--s3);}
.lt-foot > *{flex:1;}

@media (prefers-reduced-motion: reduce){.lt-root *{transition:none !important;animation:none !important;}}
@media (max-width:520px){ .lt-g3{grid-template-columns:1fr 1fr;} .lt-h1{font-size:22px;} }
`;

/* Navigation — masthead with the grid horizon behind it. */
export const navCss = `
.lt-nav{padding:24px 14px 22px;border-bottom:1px solid var(--rule);margin-bottom:var(--s3);}
.lt-nav-inner{max-width:1280px;margin:0 auto;display:flex;align-items:flex-end;
  justify-content:space-between;gap:var(--s4);}
/* Page title in the masthead. Same metrics as .lt-h1 per the type
   scale, but uppercase — .lt-h1 also carries in-card headings like
   "Set up the test", which are sentence case by design. */
.lt-nav-title{font-size:26px;font-weight:500;letter-spacing:-.01em;line-height:1.1;
  color:var(--bright);text-transform:uppercase;margin-top:8px;}
.lt-nav-links{display:flex;margin-top:12px;}
.lt-navlink{font-size:11px;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;
  padding:6px 13px;color:var(--dim);border:1px solid var(--rule);border-left:none;}
.lt-navlink:first-child{border-left:1px solid var(--rule);}
.lt-navlink:hover{color:var(--ink);}
.lt-navlink.active{background:var(--signal);color:#2A0A1A;border-color:var(--signal);}
.lt-nav-meta{font-size:10px;letter-spacing:.16em;color:var(--dim);text-align:right;line-height:1.9;}
`;

/* Analyze — list + lens. Columns divided by a hairline plus an offset
   shadow hairline, which is where the "double rule" reading comes from. */
export const analyzeCss = `
.lt-analyze{display:grid;grid-template-columns:minmax(320px,400px) 1fr;gap:0;
  align-items:start;margin-top:var(--s4);}
/* The grid spaces itself. A top margin on the first card in a column
   starts the column box above the card, so the divider rule between the
   columns pokes out above both panels. */
.lt-analyze > .lt-card,
.lt-analyze > * > .lt-card:first-child{margin-top:0;}
@media (max-width:900px){.lt-analyze{grid-template-columns:1fr;}}
.lt-analyze > :first-child{border-right:1px solid var(--rule);
  box-shadow:inset -3px 0 0 -2px var(--rule2);padding-right:var(--s4);}
@media (max-width:900px){.lt-analyze > :first-child{border-right:none;box-shadow:none;padding-right:0;}}
.lt-analyze > :last-child{padding-left:var(--s4);}
@media (max-width:900px){.lt-analyze > :last-child{padding-left:0;}}

.lt-list{max-height:52vh;overflow-y:auto;}
.lt-item{display:flex;align-items:center;gap:var(--s3);padding:12px 10px;
  border-bottom:1px solid var(--rule2);border-left:2px solid transparent;cursor:pointer;}
.lt-item:first-child{border-top:1px solid var(--rule);}
.lt-item:hover{background:var(--panel);}
.lt-item.on{background:var(--panel);border-left-color:var(--signal);}
.lt-item-main{flex:1;min-width:0;}
.lt-item-t{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lt-item.on .lt-item-t{color:var(--bright);}
.lt-item-s{font-size:10.5px;letter-spacing:.06em;color:var(--dim);margin-top:4px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;}
.lt-item-th{font-size:10.5px;color:var(--signal);margin-top:3px;}
.lt-item-acts{display:flex;gap:var(--s2);flex-shrink:0;}

.lt-check{display:flex;align-items:center;gap:var(--s2);cursor:pointer;flex-shrink:0;}
.lt-check input{accent-color:var(--signal);width:14px;height:14px;cursor:pointer;}
.lt-swatch{width:8px;height:8px;border:1px solid var(--ghost);display:inline-block;}

.lt-linkbtn{background:none;border:none;padding:2px 0;cursor:pointer;font-size:10px;
  letter-spacing:.1em;text-transform:uppercase;color:var(--dim);text-decoration:none;
  font-family:var(--mono);}
.lt-linkbtn:hover{color:var(--cool);}
.lt-linkbtn.danger:hover{color:var(--hot);}

/* segmented control: joined, square, active inverted */
.lt-seg{display:flex;}
.lt-seg-b{background:transparent;border:1px solid var(--rule);border-left:none;color:var(--muted);
  padding:4px 10px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;
  font-family:var(--mono);}
.lt-seg-b:first-child{border-left:1px solid var(--rule);}
.lt-seg-b:hover{color:var(--ink);}
.lt-seg-b.on{background:var(--sel);border-color:var(--sel);color:var(--ground);}
.lt-seg-b:focus-visible{outline:1px solid var(--cool);outline-offset:2px;}
.lt-seg.sm .lt-seg-b{padding:4px 10px;font-size:10px;}
.lt-underlist{display:flex;align-items:center;justify-content:space-between;gap:var(--s3);
  padding:var(--s3) 0 0;border-top:1px solid var(--rule);margin-top:var(--s3);}

/* stat tiles: joined pair, hero numeral in the accent */
.lt-tile-cap{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin:var(--s1) 0 var(--s2);}
.lt-tiles{display:grid;grid-template-columns:1fr 1fr;gap:0;}
@media (max-width:520px){.lt-tiles{grid-template-columns:1fr;}}
.lt-tile{background:var(--panel);border:1px solid var(--rule);padding:16px 18px;}
.lt-tiles .lt-tile + .lt-tile{border-left:none;}
@media (max-width:520px){.lt-tiles .lt-tile + .lt-tile{border-left:1px solid var(--rule);border-top:none;}}
.lt-tile-h{font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);}
.lt-tile-m{color:var(--dim);}
.lt-tile-v{font-size:52px;font-weight:700;line-height:.92;letter-spacing:-.02em;margin-top:12px;color:var(--signal);}
.lt-tile-v.cool{color:var(--cool);}
.lt-tile-u{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin-top:4px;}
.lt-tile-hr{font-size:17px;margin-top:10px;color:var(--ink);}
.lt-tile-d{font-size:10px;letter-spacing:.1em;margin-top:7px;color:var(--cool);}
.lt-tile-d.down{color:var(--warm);}

.lt-picker-l{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim);margin-bottom:6px;}
.lt-pickers{display:flex;flex-wrap:wrap;gap:18px;margin:var(--s4) 0;}
`;

/* Capture — two-column laptop layout plus stat blocks. */
export const captureCss = `
.lt-capture{display:grid;grid-template-columns:minmax(360px,1fr) minmax(380px,1.1fr);
  gap:var(--s4);align-items:start;}
@media (max-width:960px){.lt-capture{grid-template-columns:1fr;}}

.lt-stat{background:var(--panel);border:1px solid var(--rule);padding:12px 14px;}
.lt-stat-l{font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim);}
.lt-stat-v{font-size:22px;margin-top:6px;color:var(--bright);}
.lt-stat-s{font-size:10.5px;color:var(--muted);margin-top:3px;}

/* banner: accent left edge, never a filled panel */
.lt-resume{display:flex;align-items:center;justify-content:space-between;gap:var(--s3);
  flex-wrap:wrap;background:var(--panel);border:1px solid var(--rule);border-left:2px solid var(--signal);
  padding:13px 15px;margin-bottom:var(--s4);}
.lt-resume-t{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--signal);}
.lt-resume-s{font-size:10.5px;color:var(--muted);margin-top:4px;}

.lt-gate{display:flex;align-items:center;justify-content:center;min-height:80vh;}

/* status strip: pinned facts, never actions the user must find */
.lt-status{display:flex;justify-content:space-between;align-items:center;gap:var(--s4);
  padding:9px 14px;border-top:1px solid var(--rule);background:var(--panel2);
  font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-top:var(--s5);}
`;

export const css = baseCss + navCss + analyzeCss + captureCss;
