# KLineChart Pro — QUANTIX Extended Edition

A professional financial charting platform built on top of **KLineChart Pro**, heavily extended with custom drawing tools, indicators, state management, and UX improvements. Designed to rival tools like TradingView and velo.xyz.

[![License](https://badgen.net/github/license/klinecharts/pro)](LICENSE)

---

## 🌟 What's New in This Fork

### 🖊 Drawing Tools

| Tool | Description |
| ---- | ----------- |
| **Brush** | Freehand tool with Bezier smoothing. Custom circle cursor matching brush size. Color picker (presets + full picker), thickness, and opacity sliders. **Auto-restarts after each stroke** — no re-clicks needed. |
| **Measure** | Price change %, bar count, and time between two points. |
| **Long / Short Position** | R/R calculators with TP/SL levels and percentage labels. |
| **Elliott Wave** | 5-wave cycle markup with numbered vertices. |
| **Gann Fan** | Geometric Gann-angle fans (1×1, 1×2, ...). |
| **Fibonacci** | Extended fib retracements, channels, spirals, extensions. |
| **Parallel Channel** | Two-point channel with draggable lines. |

> **Auto-retrigger**: All drawing tools automatically re-activate after completing a shape — draw continuously without clicking the toolbar again. Press the **Cursor** button to exit drawing mode.

---

### 🖱 Drawing Bar UX

- **Cursor / Navigate button** — top of the bar, deactivates any active drawing and returns to pan/zoom. Highlights when active.
- **Tool memory** — each group button remembers the last-selected sub-tool and re-activates it on click.
- **Tooltips** — native `title` attributes on all buttons, localized via i18n.
- **Brush popover** — color presets, full color picker, thickness slider, opacity slider. All changes live-update the cursor and active stroke.

---

### ↩ Undo / Redo

Full **undo/redo history** covering both drawing overlays and indicators.

| Action | Coverage |
| ------ | -------- |
| Draw overlay | Each completed drawing is one undo step |
| Remove all drawings | Restores all with their original positions |
| Add / remove indicator | Via modal or tooltip close button |

- **`← Undo`** and **`→ Redo`** buttons in the top toolbar (after Full Screen)
- **Keyboard shortcuts**: `Ctrl+Z` = Undo · `Ctrl+Y` / `Ctrl+Shift+Z` = Redo
- Buttons are greyed out when their stack is empty
- Redo stack is correctly cleared when a new action is performed
- Full overlay geometry (point coordinates) is captured via `getOverlayById` at draw-end — so redo restores completed drawings, not blank interactive tools

---

### 📈 Custom Indicators

All indicators use the shared `TA.ts` math library for precision-matched calculations.

#### Main Chart (Overlay)

| Indicator | Notes |
| --------- | ----- |
| **BOLL TV** | Bollinger Bands matching TradingView's math |
| **Ichimoku Cloud** | Full Ichimoku with Tenkan, Kijun, Senkou A/B, Chikou |
| **SuperTrend** | ATR-based trend indicator with dynamic zone coloring |
| **HMA** | Hull Moving Average — high smoothing, minimal lag |
| **VWAP** | Volume-weighted average price |
| **Pivot Points** | Standard S/R levels (R1-R2, S1-S2) |
| **MA Ribbon** | Multi-MA overlay for trend visualization |

#### Sub-pane

| Indicator | Notes |
| --------- | ----- |
| **MACD TV** | 4-color histogram: growing/shrinking × positive/negative. MACD `#2962FF`, Signal `#FF6D00`. Registered as `MACD_TV` to avoid conflict with built-in MACD |
| **RSI TV** | RMA-based RSI with MA line, dashed levels at 70/50/30, background fill 30–70 |
| **CCI** | Commodity Channel Index |
| **Stochastic** | %K and %D lines, matches TradingView's calculation |

---

### 📊 Indicator UX

- **Collapsible Panes**: Clicking the "Visibility" (Eye) icon on any sub-indicator instantly collapses its pane to a minimal 30px height instead of just hiding the line, maximizing screen space without losing the indicator's configuration. Clicking it again restores it to its previous height.
- **Sub-Indicator Reordering**: Each sub-indicator pane features `↑` and `↓` arrows in its tooltip header. Clicking these instantly shifts the pane up or down relative to other sub-indicators, inherently retaining its new placement within the chart layout state.

---

### 💾 State Management

- **ChartStateManager** — full serialization of indicators, drawings, zoom/scroll, and symbol/period.
- **ChartLayoutManager** — save/load named layouts to `localStorage`. Multiple layouts supported.
- **Auto-save** — debounced 5-second auto-save on any chart change.
- **Custom Script Indicators** — `ScriptEditorModal` allows writing JS indicator scripts that are saved with the layout.

---

### 🎨 Script Indicator Editor JS

A built-in **Pine Script–style JavaScript editor** for creating fully custom indicators directly inside the platform — no build step, no plugins.

#### How it works

1. Open via the **`Script`** button in the top toolbar.
2. Write a JS function body in the textarea — the code runs on every candle array.
3. Click **▶ Run** (or press `Ctrl+Enter`) — the script executes in an isolated sandboxed function and the result appears on the chart immediately.
4. Adjust parameters and re-run — only the result pane updates, your code stays intact.

#### Script contract

Your script receives three injected variables and must `return` an array:

| Variable | Type | Description |
| -------- | ---- | ----------- |
| `dataList` | `KLineData[]` | Full candle history — `{ open, high, low, close, volume, timestamp }` |
| `params` | `number[]` | Comma-separated numbers from the **Params** input (e.g. `14, 26, 9`) |
| `TA` | `object` | Built-in technical analysis library (see below) |

**Return value**: an array with one object per candle. Each key becomes a colored line on the chart:

```js
// Each key → one series line
return dataList.map((d, i) => ({
  myLine: someValue[i],
  signal: anotherValue[i]
}))
```

#### Available `TA` functions

| Function | Signature | Description |
| -------- | --------- | ----------- |
| `TA.ema` | `(values, period)` | Exponential Moving Average |
| `TA.sma` | `(values, period)` | Simple Moving Average |
| `TA.rma` | `(values, period)` | Smoothed / RMA (Wilder's MA) |
| `TA.wma` | `(values, period)` | Weighted Moving Average |
| `TA.rsi` | `(values, period)` | Relative Strength Index |
| `TA.macd` | `(values, fast, slow, signal)` | Returns `{ macd, signal, histogram }` arrays |
| `TA.bollinger` | `(values, period, multiplier)` | Returns `{ upper, mid, lower }` arrays |
| `TA.atr` | `(highs, lows, closes, period)` | Average True Range |
| `TA.stoch` | `(highs, lows, closes, kPeriod, dPeriod, smooth)` | Returns `{ k, d }` |
| `TA.hma` | `(values, period)` | Hull Moving Average |
| `TA.tr` | `(highs, lows, closes)` | True Range array |
| `TA.stddev` | `(values, period)` | Standard Deviation |

#### Full working example

```js
// Dual EMA Cross with RSI confirmation
const period  = params[0] ?? 14
const fast    = params[1] ?? 9
const closes  = dataList.map(d => d.close)

const emaFast = TA.ema(closes, fast)
const emaSlow = TA.ema(closes, period)
const rsi     = TA.rsi(closes, period)

return closes.map((_, i) => ({
  ema_fast: emaFast[i],
  ema_slow: emaSlow[i],
  rsi:      rsi[i]
}))
```

#### UI controls

| Control | Description |
| ------- | ----------- |
| **Name** | Display name for the indicator in the chart pane header |
| **Params** | Comma-separated numbers accessible as `params[0]`, `params[1]`, … |
| **Placement** | `Sub Indicator` (own pane below) or `Main Indicator` (overlaid on candles) |
| **▶ Run** / `Ctrl+Enter` | Execute the script and apply it to the chart |
| **Remove** | Remove the current script indicator from the chart |
| **📂 Import** | Load a `.js`, `.ts`, or `.txt` file into the editor (filename auto-fills Name) |
| **💾 Export** | Download the current script as a `.js` file |
| **Reset** | Restore the built-in example template |
| **Tab** | Inserts 2-space indent (does not leave the editor) |

#### Sandbox security

Scripts run inside an **isolated `new Function()` scope** with the following globals deliberately shadowed to `undefined`:  
`fetch` · `XMLHttpRequest` · `WebSocket` · `Worker` · `SharedWorker` · `importScripts` · `self` · `caches` · `indexedDB`

This prevents the script from making network requests, spawning sub-workers, or accessing storage — safe to run arbitrary user code.

#### Persistence

Custom script indicators are serialized into the layout via `extendData.isCustomScript` — the code and params are saved with the layout and fully restored when a layout is loaded.

---

### 🌍 i18n

Full **English** and **Chinese** (zh-CN) support across all menus, tooltips, and modals.

---

## 🚀 Getting Started

```bash
cd klinecharts-pro-source
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` with the debug page at `/debug`.

---

## 🗂 Project Structure

```text
klinecharts-pro-source/
├── src/
│   ├── extension/
│   │   ├── indicator/          # Custom indicators (MACD_TV, RSI_TV, MA_Ribbon, ...)
│   │   ├── brush.ts            # Brush drawing overlay
│   │   ├── ChartStateManager.ts
│   │   └── ChartLayoutManager.ts
│   ├── widget/
│   │   ├── drawing-bar/        # Drawing toolbar + icons
│   │   ├── indicator-modal/    # Indicator picker
│   │   └── script-editor-modal/
│   └── utils/
│       └── TA.ts               # Shared math library (EMA, RMA, MACD, RSI, ...)
└── debug/                      # Development debug page
```

---

## ©️ License

Apache License V2 — based on [klinecharts/pro](https://github.com/klinecharts/pro).
