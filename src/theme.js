/* ------------------------------------------------------------------ *
 *  Theme — palette and stylesheet lifted verbatim from the artifact
 *  baseline (9821237), with one addition: .lt-wrap-wide, since the
 *  original 760px column was a phone layout and capture/analyze are
 *  now laptop screens.
 * ------------------------------------------------------------------ */

export const C = {
  ground: "#11151B",
  panel: "#1A2029",
  panel2: "#212932",
  rule: "#2E3846",
  ink: "#E9EEF3",
  muted: "#7E8DA0",
  dim: "#55626F",
  signal: "#F2C14E",
  cool: "#4FB3C9",
  warm: "#E39A4B",
  hot: "#E2564A",
  /* Selected-control grey. Deliberately outside the series palette: the
     chips were using signal, the same yellow as the first plotted test,
     which made the controls look like they belonged to that test. */
  sel: "#C3CCD8",
};

export const lactColor = (v) =>
  v == null ? C.dim : v < 2.0 ? C.cool : v < 3.0 ? C.signal : v < 4.5 ? C.warm : C.hot;

const baseCss = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

.lt-root {
  --ground:${C.ground}; --panel:${C.panel}; --panel2:${C.panel2};
  --rule:${C.rule}; --ink:${C.ink}; --muted:${C.muted}; --dim:${C.dim};
  --signal:${C.signal}; --cool:${C.cool}; --warm:${C.warm}; --hot:${C.hot};
  --sel:${C.sel};
  background:var(--ground); color:var(--ink); min-height:100vh;
  font-family:'Archivo','Helvetica Neue',Arial,sans-serif;
  -webkit-font-smoothing:antialiased; padding:18px 14px 40px;
}
.lt-root *,.lt-root *::before,.lt-root *::after{box-sizing:border-box;}
.lt-wrap{max-width:760px;margin:0 auto;}
.lt-wrap-wide{max-width:1180px;margin:0 auto;}
.lt-mono{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;}

.lt-eyebrow{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim);
  font-weight:600;font-family:'JetBrains Mono',monospace;}
.lt-h1{font-size:26px;font-weight:700;letter-spacing:-.02em;margin:4px 0 2px;line-height:1.1;}
.lt-sub{font-size:13px;color:var(--muted);line-height:1.5;}

.lt-card{background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:16px;margin-top:14px;}
.lt-card-t{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);
  font-weight:600;margin-bottom:12px;font-family:'JetBrains Mono',monospace;}

.lt-grid{display:grid;gap:10px;}
.lt-g2{grid-template-columns:1fr 1fr;}
.lt-g3{grid-template-columns:repeat(3,1fr);}

.lt-field label{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--dim);font-weight:600;margin-bottom:5px;font-family:'JetBrains Mono',monospace;}
.lt-input{width:100%;background:var(--panel2);border:1px solid var(--rule);border-radius:7px;
  color:var(--ink);padding:11px 12px;font-size:16px;font-family:'JetBrains Mono',monospace;
  font-variant-numeric:tabular-nums;outline:none;transition:border-color .12s,box-shadow .12s;}
.lt-input:focus{border-color:var(--signal);box-shadow:0 0 0 3px rgba(242,193,78,.16);}
.lt-input::placeholder{color:#495663;}

.lt-big{font-size:30px;padding:16px 12px;text-align:center;font-weight:500;letter-spacing:.02em;}

.lt-btn{border:1px solid var(--rule);background:var(--panel2);color:var(--ink);border-radius:8px;
  padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
  letter-spacing:.02em;transition:background .12s,border-color .12s;}
.lt-btn:hover{background:#28323d;}
.lt-btn:focus-visible{outline:2px solid var(--signal);outline-offset:2px;}
.lt-btn-primary{background:var(--signal);color:#171310;border-color:var(--signal);}
.lt-btn-primary:hover{background:#f7cf6c;}
.lt-btn-primary:disabled{opacity:.34;cursor:not-allowed;background:var(--signal);}
.lt-btn-lg{width:100%;padding:16px;font-size:15px;}
.lt-btn-ghost{background:transparent;color:var(--muted);}
.lt-btn-ghost:hover{background:var(--panel2);color:var(--ink);}

/* lane strip — the signature: stage progress drawn as track lanes,
   each completed lane's fill height encodes its lactate reading */
.lt-lanes{display:flex;gap:3px;align-items:flex-end;height:62px;margin:6px 0 2px;}
.lt-lane{flex:1;position:relative;background:var(--panel2);border-radius:3px;height:100%;
  overflow:hidden;cursor:pointer;border:1px solid transparent;transition:border-color .12s;}
.lt-lane:hover{border-color:var(--rule);}
.lt-lane.active{border-color:var(--signal);}
.lt-lane-fill{position:absolute;left:0;right:0;bottom:0;transition:height .4s ease;}
.lt-lane-num{position:absolute;top:3px;left:0;right:0;text-align:center;font-size:9px;
  font-family:'JetBrains Mono',monospace;color:var(--dim);font-weight:700;}
.lt-lane-val{position:absolute;bottom:3px;left:0;right:0;text-align:center;font-size:10px;
  font-family:'JetBrains Mono',monospace;font-weight:700;color:#151a20;}

.lt-timer{text-align:center;padding:22px 0 6px;}
.lt-timer-n{font-size:58px;font-weight:700;line-height:1;letter-spacing:-.02em;
  font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;}
.lt-timer-l{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);
  margin-top:8px;font-family:'JetBrains Mono',monospace;font-weight:600;}

.lt-row{display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;
  border-bottom:1px solid var(--rule);font-size:13px;}
.lt-row:last-child{border-bottom:none;}
.lt-row-k{color:var(--muted);font-size:12px;}
.lt-row-v{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;font-weight:500;}

.lt-table{width:100%;border-collapse:collapse;font-size:12px;
  font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;}
.lt-table th{text-align:right;color:var(--dim);font-weight:600;font-size:9px;letter-spacing:.1em;
  text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--rule);}
.lt-table th:first-child,.lt-table td:first-child{text-align:left;}
.lt-table td{text-align:right;padding:8px 0;border-bottom:1px solid rgba(46,56,70,.5);}
.lt-table tr:last-child td{border-bottom:none;}

.lt-note{font-size:12px;color:var(--muted);line-height:1.6;}
.lt-flag{border-left:2px solid var(--signal);padding:2px 0 2px 11px;margin:11px 0;font-size:12.5px;line-height:1.55;}
.lt-flag b{color:var(--ink);font-weight:600;}
.lt-flag.cool{border-color:var(--cool);}
.lt-flag.hot{border-color:var(--hot);}

.lt-chips{display:flex;gap:6px;flex-wrap:wrap;}
.lt-chip{border:1px solid var(--rule);background:transparent;color:var(--muted);border-radius:999px;
  padding:6px 12px;font-size:11px;cursor:pointer;font-family:inherit;font-weight:600;}
.lt-chip.on{background:var(--signal);color:#171310;border-color:var(--signal);}
.lt-chip:focus-visible{outline:2px solid var(--signal);outline-offset:2px;}

.lt-open{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;
  background:transparent;border:none;border-bottom:1px solid var(--rule);color:var(--ink);
  padding:11px 6px;cursor:pointer;font-family:inherit;text-align:left;border-radius:5px;
  transition:background .12s;}
.lt-open:last-child{border-bottom:none;}
.lt-open:hover{background:var(--panel2);}
.lt-open:focus-visible{outline:2px solid var(--signal);outline-offset:-2px;}
.lt-open-l{font-size:13px;font-weight:500;}
.lt-open-s{font-size:10.5px;color:var(--dim);font-family:'JetBrains Mono',monospace;margin-top:3px;}
.lt-spark{display:flex;gap:2px;align-items:flex-end;height:22px;width:58px;flex-shrink:0;}
.lt-spark span{flex:1;border-radius:1px;min-height:2px;}
.lt-chev{color:var(--dim);font-size:16px;flex-shrink:0;}

.lt-foot{display:flex;gap:10px;margin-top:14px;}
.lt-foot > *{flex:1;}

@media (prefers-reduced-motion: reduce){.lt-root *{transition:none !important;animation:none !important;}}
@media (max-width:520px){ .lt-g3{grid-template-columns:1fr 1fr;} .lt-h1{font-size:22px;} }
`;

/* Navigation — new in the web version; the artifact was a single screen. */
export const navCss = `
.lt-nav{display:flex;align-items:center;justify-content:space-between;
  padding:4px 0 14px;border-bottom:1px solid var(--rule);margin-bottom:4px;}
.lt-nav-links{display:flex;gap:18px;margin-top:6px;}
.lt-navlink{font-size:13px;font-weight:600;color:var(--muted);text-decoration:none;
  padding:4px 0;border-bottom:2px solid transparent;}
.lt-navlink:hover{color:var(--ink);}
.lt-navlink.active{color:var(--signal);border-bottom-color:var(--signal);}
`;


/* Analyze page — list + lens layout. All new; the artifact had no
   equivalent screen. */
export const analyzeCss = `
.lt-analyze{display:grid;grid-template-columns:minmax(320px,420px) 1fr;gap:14px;align-items:start;}
@media (max-width:900px){.lt-analyze{grid-template-columns:1fr;}}

.lt-list{max-height:52vh;overflow-y:auto;margin:0 -4px;}
.lt-item{display:flex;align-items:center;gap:10px;padding:9px 6px;border-radius:8px;
  border:1px solid transparent;}
.lt-item:hover{background:var(--panel2);}
.lt-item.on{border-color:var(--rule);background:var(--panel2);}
.lt-item-main{flex:1;min-width:0;}
.lt-item-t{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lt-item-s{font-size:11px;color:var(--muted);margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lt-item-acts{display:flex;gap:8px;flex-shrink:0;}
.lt-item-th{font-size:11px;color:var(--signal);margin-top:2px;font-weight:600;}

.lt-check{display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;}
.lt-check input{accent-color:var(--signal);width:15px;height:15px;cursor:pointer;}
.lt-swatch{width:9px;height:9px;border-radius:2px;border:1px solid var(--rule);display:inline-block;}

.lt-linkbtn{background:none;border:none;padding:2px 4px;cursor:pointer;font-size:11px;
  font-weight:600;color:var(--muted);text-decoration:none;font-family:inherit;}
.lt-linkbtn:hover{color:var(--signal);}
.lt-linkbtn.danger:hover{color:var(--hot);}

.lt-seg{display:flex;gap:4px;flex-wrap:wrap;}
.lt-seg-b{background:var(--panel2);border:1px solid var(--rule);color:var(--muted);
  border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;
  font-family:inherit;}
.lt-seg-b:hover{color:var(--ink);}
.lt-seg-b.on{background:var(--sel);border-color:#E4EAF1;color:var(--ground);
  box-shadow:0 0 0 1px rgba(255,255,255,.14);}
.lt-seg-b.on:hover{background:#D6DEE8;color:var(--ground);}
.lt-seg.sm .lt-seg-b{padding:3px 8px;font-size:10px;}
.lt-underlist{display:flex;align-items:center;justify-content:space-between;
  gap:10px;padding:6px 4px 0;}

.lt-tile-cap{font-size:10px;color:var(--dim);margin:2px 0 6px;}
.lt-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media (max-width:520px){.lt-tiles{grid-template-columns:1fr;}}
.lt-tile{background:var(--panel2);border:1px solid var(--rule);border-radius:9px;padding:12px 14px;}
.lt-tile-h{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);
  font-weight:700;font-family:'JetBrains Mono',monospace;}
.lt-tile-m{color:var(--dim);font-weight:500;letter-spacing:.04em;text-transform:none;}
.lt-tile-v{font-size:34px;font-weight:700;line-height:1.05;margin-top:7px;color:var(--signal);}
.lt-tile-u{font-size:10px;color:var(--dim);margin-top:1px;font-family:'JetBrains Mono',monospace;}
.lt-tile-hr{font-size:17px;font-weight:600;margin-top:7px;color:var(--ink);}
.lt-tile-d{font-size:10px;margin-top:5px;font-family:'JetBrains Mono',monospace;}

.lt-picker-l{font-size:9px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--dim);font-weight:600;margin-bottom:3px;font-family:'JetBrains Mono',monospace;}
`;


/* Capture page — two-column laptop layout, plus the threshold stat
   tiles shared with Review. */
export const captureCss = `
.lt-capture{display:grid;grid-template-columns:minmax(360px,1fr) minmax(380px,1.1fr);
  gap:14px;align-items:start;}
@media (max-width:960px){.lt-capture{grid-template-columns:1fr;}}

.lt-stat{background:var(--panel2);border:1px solid var(--rule);border-radius:8px;padding:11px 12px;}
.lt-stat-l{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);
  font-weight:600;font-family:'JetBrains Mono',monospace;}
.lt-stat-v{font-size:20px;font-weight:700;margin-top:5px;color:var(--ink);}
.lt-stat-s{font-size:11px;color:var(--muted);margin-top:2px;}

.lt-btn:disabled{opacity:.4;cursor:not-allowed;}

.lt-resume{display:flex;align-items:center;justify-content:space-between;gap:12px;
  flex-wrap:wrap;background:var(--panel2);border:1px solid var(--signal);
  border-radius:8px;padding:12px 14px;margin-bottom:16px;}
.lt-resume-t{font-size:13px;font-weight:700;color:var(--signal);}
.lt-resume-s{font-size:11px;color:var(--muted);margin-top:2px;}

.lt-gate{display:flex;align-items:center;justify-content:center;min-height:80vh;}
`;

export const css = baseCss + navCss + analyzeCss + captureCss;
