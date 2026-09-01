# Grid Lab — design system for Lactate

Visual system for the lactate step-test tool. Instrument-first: a dark
console, hairline rules, one monospace family, two accents, and an 80s
grid field as the only texture. Retro reads through **colour and grid**,
never through decoration, gloss, or rounded shapes.

Grounded in a read of `src/theme.js`, `src/App.jsx`, `src/pages/Analyze.jsx`,
`src/pages/Capture.jsx`, `src/pages/Review.jsx` and `README.md` at
`main`. Every class those files use is defined in `handoff/theme.js`.

Reference mockup: `2c Grid Lab` in `Vaporwave Looks.dc.html`.
Visual guide: `Grid Lab Guide.dc.html`.
Drop-in stylesheet: `handoff/theme.js` → replaces `src/theme.js`.

---

## 1. Installation

1. Copy `handoff/theme.js` over `src/theme.js`. Every selector name from
   the old theme is preserved, so `App.jsx`, `Capture.jsx`, `Review.jsx`
   and `Analyze.jsx` keep working unchanged.
2. New exports to adopt:
   - `SERIES` — the overlay series palette (replaces the local `SERIES`
     array in `Analyze.jsx`; delete that one and import this).
   - `chart` — Recharts values (grid, ticks, tooltip, dash patterns).
   - `C.bright`, `C.rule2`, `C.zone1..4` — new tokens, see §2.
3. Inline overrides in the pages that now fight the system — delete them:
   - `Capture.jsx` / `Review.jsx`: `contentStyle={{ …borderRadius: 8 }}` on
     both `<Tooltip>`s → `contentStyle={chart.tooltip}`.
   - Both files: `<CartesianGrid strokeDasharray="2 4">` → solid
     `stroke={chart.grid}`, no dasharray.
   - `Capture.jsx`: `style={{ borderColor: C.signal }}` on the resumed-test
     card and `borderColor: C.hot` on the save-error card → the flag
     pattern (`.lt-flag`, `.lt-flag.hot`), which is a left edge not a
     full border.
   - `Review.jsx`: `.lt-card` chart wells → wrap the `ResponsiveContainer`
     in `.lt-gridfield`.
4. Markup changes worth making (all additive, in this order of value):
   - Masthead: wrap `.lt-nav` content in `.lt-nav-inner` and add
     `.lt-horizon` to `.lt-nav` for the grid horizon.
   - Chart well: wrap the `ResponsiveContainer` in
     `<div className="lt-gridfield">` with 1px `--rule` border.
   - Nav links become a joined strip (no `gap`), active link is a filled
     magenta block — CSS already does this.
   - Analyze pickers: wrap the axis/LT1/LT2 groups in `.lt-pickers`.
   - Add a `.lt-status` strip at the bottom of Analyze for the backend
     note + export link.

---

## 2. Tokens

### Surfaces
| token | hex | use |
| --- | --- | --- |
| `--ground` | `#05080E` | page background, only the page |
| `--panel` | `#0A0F18` | cards, list rows, tiles, stat blocks |
| `--panel2` | `#070B13` | recessed: inputs, chart wells, masthead |
| `--rule` | `#17232F` | every 1px border |
| `--rule2` | `#0F1A25` | dividers *inside* a panel (row separators) |

Three surfaces only. No fourth grey, no elevation shadows — depth comes
from rules, not shadow.

### Text
| token | hex | use |
| --- | --- | --- |
| `--bright` | `#F4F8FD` | page title, hero stat secondary line |
| `--ink` | `#DBE6F2` | body, values, row labels |
| `--muted` | `#4F6274` | secondary labels, module titles, axis ticks |
| `--dim` | `#3F5162` | micro-labels, meta, disabled text |
| `--ghost` | `#24313F` | empty swatch borders, placeholder text |

### Accents — exactly two
| token | hex | meaning |
| --- | --- | --- |
| `--signal` | `#FF4FA3` | magenta. Primary action, active nav, LT2, series 1, selection edge |
| `--cool` | `#35D6C0` | teal. LT1, improvement, focus ring, series 2 |

Never introduce a third accent. If something needs distinguishing, use
the series palette or a rule weight, not a new hue.

### Lactate zone ramp
Severity of a *reading*, not identity of a *test*: `zone1 #35D6C0` (<2.0),
`zone2 #FFB03A` (<3.0), `zone3 #FF8A4C` (<4.5), `zone4 #FF3B5C` (≥4.5).
Use only for lane fills and single-reading colouring. Never for series.

### Series (overlay order)
`#FF4FA3` `#35D6C0` `#A78BFF` `#FFB03A` `#FF7A5C` `#5AA9FF`

Test colour is assigned by selection order and must agree across
checkbox, swatch, list threshold line, curve, and reference lines.

### Spacing
`4 · 8 · 12 · 16 · 24 · 32` (`--s1`…`--s6`). Panel padding 16. Row
padding 12/10. Gap between control groups 18. Nothing between these.

### Shape
- **Radius: 0. Everywhere.** The theme enforces it with
  `.lt-root * { border-radius: 0 !important }` — that guard rail stays
  until no component fights it.
- Borders are 1px `--rule`. Selection is a **2px left edge** in an
  accent. Emphasis edges are never 3px+ (that was 2d, rejected).
- Adjacent controls **join** (shared border via `border-left:none`),
  they don't sit in a row with gaps. Applies to segments, chips, nav.
- No shadows. The one exception is the analyze column divider's
  `inset -3px 0 0 -2px` offset hairline, which reads as a double rule.

---

## 3. Type

One family: **JetBrains Mono** (400/500/700), `font-variant-numeric:
tabular-nums` globally. No second family — the mono *is* the identity.

| role | size | weight | tracking | case |
| --- | --- | --- | --- | --- |
| hero stat | 52px | 700 | −.02em | — |
| timer | 64px | 700 | −.02em | — |
| page title | 26px | 500 | −.01em | UPPER |
| value | 17px | 400 | 0 | — |
| body / row | 12.5px | 400 | 0 | sentence |
| meta | 10.5px | 400 | .06em | UPPER |
| label | 10px | 500 | .2em | UPPER |
| micro | 9px | 500 | .22em | UPPER |
| brand | 11px | 500 | .46em | UPPER |

Rules: nothing below 9px. Tracking rises as size falls — small type is
always tracked and uppercase. Body copy is never uppercase. Numerals are
never tracked.

---

## 4. Texture — the 80s tell

Two grid fields, both pure decoration, both `pointer-events:none`, never
under running text:

- `.lt-horizon` — masthead only. 44px magenta verticals + 12px teal
  horizontals, masked to fade upward, anchored to the bottom edge.
- `.lt-gridfield` — chart wells and empty states. 44 × 22px teal grid at
  5–7% opacity.

At most one horizon per page and one grid field per panel. No scanlines
in this direction (that was 1c/2b); the grid replaces them.

---

## 5. Components

**Masthead** (`.lt-nav` + `.lt-horizon`) — brand at .46em tracking in
teal, page name at 26px, joined nav strip with the active item as a
filled magenta block, right-aligned three-line status meta.

**Segmented control** (`.lt-seg` / `.lt-seg-b`) — joined squares. Active
is inverted ink (`--sel` fill, `--ground` text) — *not* an accent, so a
control never looks like plotted data. Micro-label above via
`.lt-picker-l`. Group them in `.lt-pickers`.

**Chips / athlete filter** (`.lt-chips` / `.lt-chip`) — same joined
strip, `.on` inverted. Chips filter; segments switch view.

**List row** (`.lt-item`) — 12px vertical padding, hairline `--rule2`
divider, transparent 2px left edge. States: hover `--panel`; selected
`--panel` + magenta left edge + `--bright` title; row meta uppercase in
`--dim`; the per-test threshold line in the test's series colour.

**Stat tiles** (`.lt-tiles` / `.lt-tile`) — joined pair sharing one
border. Micro label, 52px accent numeral (LT1 teal via `.lt-tile-v.cool`,
LT2 magenta), unit micro-label, 17px bpm line, delta in teal (improving)
or `--warm` (regressing) with `.down`.

**Buttons** (`.lt-btn`) — uppercase, .16em tracking, square. Primary is
a magenta fill with `#2A0A1A` text. Secondary is a hairline outline.
Ghost has no border. One primary per view.

**Inputs** (`.lt-input`) — recessed `--panel2`, 15px mono, focus is a
teal border plus a 1px inset — no glow, no coloured box-shadow bloom.

**Lane strip** (`.lt-lanes`) — **proposed, not in the current build.**
An optional at-a-glance companion to Capture's stage table: 2px gaps,
square lanes, fill height = lactate, fill colour from the zone ramp,
active lane gets a magenta inset edge. Ship the table first.

**Timer** (`.lt-timer`) — used by Capture's warm-up and rest phases.
64px numeral, colour driven inline: `--ink` running, `--warm` under 30s
(warm-up) or 15s (rest), `--signal` at zero. Caption is a 9px .28em
micro-label.

**Stat block** (`.lt-stat`) — Capture's done-phase and Review's threshold
grids, three across in `.lt-grid.lt-g3`. 22px value in `--bright`, 9.5px
tracked label, 10.5px sub. Distinct from `.lt-tile` — tiles are the two
hero Analyze figures, stats are the supporting grid.

**Field** (`.lt-field`) — the markup is
`<label class="lt-field"><span>Label</span><input class="lt-input"></label>`.
The `> span` is the 9px tracked micro-label.

**Banner** (`.lt-resume`) — panel with a 2px magenta left edge and an
uppercase title. Never a filled accent panel.

**Status strip** (`.lt-status`) — bottom-of-page facts (backend, last
write, version) plus the export link. Pinned facts only; never the only
route to a primary action.

**Flags** (`.lt-flag`, `.cool`, `.hot`) — 2px left edge, no background.

**Table** (`.lt-table`) — right-aligned numerals, first column left,
9px tracked uppercase headers on a `--rule` underline, `--rule2` row
lines, no zebra.

---

## 6. Charts (Recharts)

Import `chart` from the theme; never hardcode colours in a chart file.

```js
import { chart, SERIES, C } from "../theme.js";

<CartesianGrid stroke={chart.grid} />            // solid hairline, not dashed
<XAxis tick={chart.tick} />
<Tooltip contentStyle={chart.tooltip} />
<Legend wrapperStyle={chart.legend} />
<Line stroke={SERIES[i % SERIES.length]} strokeWidth={2.5}
      dot={{ r: 3, strokeWidth: 0 }} isAnimationActive={false} />
<ReferenceLine x={lt1} stroke={colour} strokeWidth={1} strokeDasharray={chart.lt1Dash} />
<ReferenceLine x={lt2} stroke={colour} strokeWidth={1} strokeDasharray={chart.lt2Dash} />
```

- Wrap the container in `.lt-gridfield` with a 1px `--rule` border; the
  CSS grid field replaces a dense `CartesianGrid`.
- Curves 2.5px, points are 6px **squares** where hand-drawn (SVG) and
  small round dots in Recharts — squares are preferred if you swap in a
  custom `dot` component.
- **Orientation follows the axis, not a house rule.** Analyze plots
  lactate against intensity, so LT1/LT2 are **vertical** `ReferenceLine x`
  — dotted `1 4` and dashed `7 4`, 1px, in the test's series colour.
  Capture and Review plot lactate on y, so their fixed 4.0 mmol marker
  stays a **horizontal** `ReferenceLine y={4}` — `chart.obla` dash, in
  `--warm` (a fixed reference, not a computed threshold).
- Axis label `mmol/L` upper-left in `--dim`, 10px, .14em tracking.
- Animation off. `prefers-reduced-motion` is already honoured globally.

---

## 7. Rules of thumb

Do:
- Keep radius at 0 and borders at 1px.
- Let the accent pair mean LT2 / LT1 consistently, everywhere.
- Use inverted ink for the selected *control*, accents for *data*.
- Say things in uppercase tracked micro-labels; keep prose lowercase.

Don't:
- Add a third accent, a gradient panel, a glow, or a scanline.
- Round a corner, add a shadow, or fill a banner with accent colour.
- Colour a control with a series colour, or a series with a zone colour.
- Set `borderRadius` or a full accent border in an inline style — the
  theme's radius guard will win and the intent will read as a bug.
- Put texture behind running text.
