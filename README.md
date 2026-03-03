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

### 💾 State Management

- **ChartStateManager** — full serialization of indicators, drawings, zoom/scroll, and symbol/period.
- **ChartLayoutManager** — save/load named layouts to `localStorage`. Multiple layouts supported.
- **Auto-save** — debounced 5-second auto-save on any chart change.
- **Custom Script Indicators** — `ScriptEditorModal` allows writing JS indicator scripts that are saved with the layout.

---

### 🎨 Script Editor

- Monaco-powered JS editor for custom indicators.
- Sandboxed execution via Web Worker — global APIs are shadowed for safety.
- Access to `TA`, `dataList`, and `params` inside scripts.
- **Import / Export** buttons to save/load scripts as `.js` or `.txt` files.

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
