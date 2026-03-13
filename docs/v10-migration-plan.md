# KLineChart v10 Beta — Migration Plan

## Overview

This document maps every breaking change introduced in KLineChart v10 to the affected files in this codebase, and describes the exact code changes required.

Current version: `klinecharts ^9.8.12`
Target version: `klinecharts ^10.0.0-beta1`

---

## Breaking Changes Summary

| # | Category | v9 API | v10 API | Impact |
|---|----------|--------|---------|--------|
| 1 | Chart init | `customApi.formatDate(fmt, ts, format, type)` | `formatter.formatDate({ dateTimeFormat, timestamp, format, type })` | HIGH |
| 2 | Data loading | `loadMore(cb)` + `applyMoreData()` | `setDataLoader(loader)` | HIGH |
| 3 | Data update | `applyNewData()` + `updateData()` | `setDataLoader(loader)` | HIGH |
| 4 | Precision | `setPriceVolumePrecision(p, v)` | `setSymbol(symbolInfo)` | MEDIUM |
| 5 | Indicators query | `getIndicatorByPaneId(paneId, name)` | `getIndicators(filter?)` | HIGH |
| 6 | Overlays query | `getOverlayById(id)` | `getOverlays(filter?)` | HIGH |
| 7 | Tooltip icons | `createTooltipDataSource → { icons }` | `createTooltipDataSource → { features }` | HIGH |
| 8 | Tooltip icon click | `ActionType.OnTooltipIconClick` | `onIndicatorTooltipFeatureClick` (subscribeAction) | HIGH |
| 9 | Tooltip style | `defaultStyles.tooltip.icons[n]` | `defaultStyles.tooltip.features[n]` | HIGH |
| 10 | Init option | `options.layout[n].position` | `options.layout[n].order` | LOW |
| 11 | Style — yAxis | `yAxis.position`, `yAxis.type`, `yAxis.inside` | `axis.*` (window config) | MEDIUM |
| 12 | Style — tooltip | `candle.tooltip.icons` | `candle.tooltip.features` | MEDIUM |
| 13 | Indicator `calc()` | Returns `Array<T>` | Returns `Record<timestamp, T>` | HIGH |
| 14 | Draw utils | `utils.drawLine()`, `utils.drawCircle()`, etc. | `getFigureClass(name)` | LOW |
| 15 | `createIndicator()` | Returns indicator object | Returns indicator ID (`string`) | MEDIUM |

---

## Affected Files

### `src/ChartProComponent.tsx`
- Lines 353–384: `customApi.formatDate` → `formatter.formatDate`
- Lines 425–432: `loadMore` + `applyMoreData` → `setDataLoader`
- Lines 537: `setPriceVolumePrecision` → `setSymbol`
- Lines 556–558: `applyNewData` + `updateData` → `setDataLoader`
- Lines 489: `getIndicatorByPaneId` → `getIndicators`
- Lines 914, 942: `getOverlayById` → `getOverlays`
- Lines 55–69: `createTooltipDataSource { icons }` → `{ features }`
- Lines 59–69: `defaultStyles.tooltip.icons[n]` → `defaultStyles.tooltip.features[n]`
- Lines 437: `ActionType.OnTooltipIconClick` → `onIndicatorTooltipFeatureClick`
- Lines 591–689: `icons: [...]` in indicator config → `features: [...]`

### `src/extension/ChartLayoutManager.ts`
- Lines 96, 179: `getIndicatorByPaneId()` → `getIndicators()`
- Line 117: `getOverlayById` → `getOverlays`
- Lines 212–224: `createTooltipDataSource { icons }` + `defaultStyles.tooltip.icons` → `features`

### `src/widget/script-editor-modal/index.tsx`
- Lines 136–148: `createTooltipDataSource { icons }` + `defaultStyles.tooltip.icons` → `features`

### `src/widget/setting-modal/data.ts`
- Line 53: `yAxis.type` style key → axis config

### `src/extension/indicator/*.ts` (all 11 indicators)
- `calc()` return value: `return dataList.map(...)` → `return dataList.reduce((acc, d, i) => { acc[d.timestamp] = ...; return acc }, {})`

---

## Step-by-Step Migration

### Step 1 — Update dependency

```diff
// package.json
"peerDependencies": {
-  "klinecharts": "^9.8.12"
+  "klinecharts": "^10.0.0-beta1"
}
```

```bash
npm install klinecharts@10.0.0-beta1
```

---

### Step 2 — `customApi` → `formatter` (`ChartProComponent.tsx:353`)

**v9:**
```typescript
widget = init(widgetRef!, {
  customApi: {
    formatDate: (dateTimeFormat: Intl.DateTimeFormat, timestamp, format: string, type: FormatDateType) => {
      // ...
    }
  }
})
```

**v10:**
```typescript
widget = init(widgetRef!, {
  formatter: {
    formatDate: ({ dateTimeFormat, timestamp, format, type }: {
      dateTimeFormat: Intl.DateTimeFormat
      timestamp: number
      format: string
      type: FormatDateType
    }) => {
      // same logic, parameters now destructured from object
    }
  }
})
```

Remove `FormatDateType` import if no longer used elsewhere; it may still exist in v10.

---

### Step 3 — Data loading: `loadMore` + `applyMoreData` → `setDataLoader` (`ChartProComponent.tsx:425–432`)

**v9:**
```typescript
widget?.loadMore(timestamp => {
  props.datafeed.getHistoryKLineData(symbol, period, timestamp)
    .then(kLineDataList => {
      widget?.applyMoreData(kLineDataList, kLineDataList.length > 0)
    })
})
```

**v10:**
The `setDataLoader` API allows the library to call a loader function when more data is needed. The exact signature from v10 docs:
```typescript
widget?.setDataLoader({
  load: ({ symbol, period, timestamp, callback }) => {
    props.datafeed.getHistoryKLineData(symbol, period, timestamp)
      .then(kLineDataList => {
        callback(kLineDataList, kLineDataList.length > 0)
      })
  }
})
```

> **Note:** The `setDataLoader` API may also subsume `applyNewData` / `updateData`. Refer to v10 full docs for the complete `DataLoader` interface. The `setSymbol` / `setPeriod` methods introduced in v10 may be the new trigger for initial data load.

---

### Step 4 — `applyNewData` + `updateData` → `setDataLoader` (`ChartProComponent.tsx:556–558`)

**v9:**
```typescript
widget?.applyNewData(kLineDataList, kLineDataList.length > 0)
// or
widget?.updateData(data)
```

**v10:** Both methods are removed. All data feeding goes through `setDataLoader`. When the symbol/period changes, call:
```typescript
widget?.setSymbol(symbolInfo)
widget?.setPeriod(periodInfo)
widget?.resetData()  // triggers the loader
```

The loader's `callback` replaces `applyNewData`. For real-time tick updates, investigate the new v10 API (likely `appendData` or similar — check v10 docs).

---

### Step 5 — `setPriceVolumePrecision` → `setSymbol` (`ChartProComponent.tsx:537`)

**v9:**
```typescript
widget?.setPriceVolumePrecision(s?.pricePrecision ?? 2, s?.volumePrecision ?? 0)
```

**v10:**
```typescript
widget?.setSymbol({
  pricePrecision: s?.pricePrecision ?? 2,
  volumePrecision: s?.volumePrecision ?? 0,
  // include other symbol fields as needed
})
```

---

### Step 6 — `getIndicatorByPaneId` → `getIndicators` (2 files)

**v9 (`ChartProComponent.tsx:489`):**
```typescript
const indicator = widget?.getIndicatorByPaneId(data.paneId, data.indicatorName) as Indicator
```

**v10:**
```typescript
const indicators = widget?.getIndicators({ paneId: data.paneId, name: data.indicatorName })
const indicator = indicators?.[0] as Indicator
```

**v9 (`ChartLayoutManager.ts:96, 179`):**
```typescript
const indicatorMap = chart.getIndicatorByPaneId() as Map<string, Map<string, Indicator>>
// then iterates: indicatorMap.forEach((paneMap, paneId) => { paneMap.forEach((ind, name) => { ... }) })
```

**v10:**
```typescript
const indicators = chart.getIndicators() as Indicator[]
// re-group manually or adapt iteration logic:
indicators.forEach(ind => {
  const paneId = ind.paneId
  const name = ind.name
  // ... same logic
})
```

> The return type changes from `Map<paneId, Map<name, Indicator>>` to `Indicator[]`. The `ChartLayoutManager` save/restore logic will need adapting to the flat array structure.

---

### Step 7 — `getOverlayById` → `getOverlays` (2 files)

**v9 (`ChartProComponent.tsx:914`):**
```typescript
const fullOverlay = finishedId ? widget?.getOverlayById(finishedId) : null
```

**v10:**
```typescript
const fullOverlay = finishedId
  ? (widget?.getOverlays({ id: finishedId })?.[0] ?? null)
  : null
```

**v9 (`ChartProComponent.tsx:942`):**
```typescript
.map(o => widget?.getOverlayById((o as any).id))
```

**v10:**
```typescript
.map(o => widget?.getOverlays({ id: (o as any).id })?.[0])
```

**v9 (`ChartLayoutManager.ts:117`):**
```typescript
const actual = chart.getOverlayById(o.id)
```

**v10:**
```typescript
const actual = chart.getOverlays({ id: o.id })?.[0]
```

---

### Step 8 — Tooltip `icons` → `features` (3 files)

This affects three patterns:

#### 8a. `createTooltipDataSource` return value

**v9:**
```typescript
createTooltipDataSource: ({ indicator, defaultStyles }) => {
  const icons = []
  if (condition) icons.push(defaultStyles.tooltip.icons[1])
  return { icons }
}
```

**v10:**
```typescript
createTooltipDataSource: ({ indicator, defaultStyles }) => {
  const features = []
  if (condition) features.push(defaultStyles.tooltip.features[1])
  return { features }
}
```

Rename: `icons` → `features` both in the array variable and the return key.
Rename: `defaultStyles.tooltip.icons[n]` → `defaultStyles.tooltip.features[n]`.

Affected locations:
- `ChartProComponent.tsx:55–69`
- `ChartLayoutManager.ts:212–224`
- `widget/script-editor-modal/index.tsx:136–148`

#### 8b. Indicator creation config (`ChartProComponent.tsx:591–689`)

**v9:**
```typescript
return widget?.createIndicator({
  name: indicatorName,
  createTooltipDataSource: (...) => { ... },
}, isStack, {
  id: 'candle_pane',
  icons: [
    { id: 'visible', position: TooltipIconPosition.Middle, ... },
    ...
  ]
})
```

**v10:**
```typescript
return widget?.createIndicator({
  name: indicatorName,
  createTooltipDataSource: (...) => { ... },
}, isStack, {
  id: 'candle_pane',
  features: [
    { id: 'visible', ... },
    ...
  ]
})
```

Also remove `TooltipIconPosition` import — check if `position` field still exists or is removed.

---

### Step 9 — `ActionType.OnTooltipIconClick` → `onIndicatorTooltipFeatureClick` (`ChartProComponent.tsx:437`)

**v9:**
```typescript
widget?.subscribeAction(ActionType.OnTooltipIconClick, (data) => {
  // data.indicatorName, data.iconId, data.paneId
})
```

**v10:**
```typescript
widget?.subscribeAction('onIndicatorTooltipFeatureClick', (data) => {
  // verify field names in v10 docs: data.name, data.featureId, data.paneId
})
```

Check v10 docs for exact field names in the callback payload.

Remove `ActionType` import if no longer used anywhere.
Remove `TooltipIconPosition` import as well.

---

### Step 10 — Indicator `calc()` return type (all 11 indicators)

**v9 (all indicators use `Array.map`):**
```typescript
calc: (dataList: KLineData[], indicator: Indicator) => {
  return dataList.map((d, i) => ({
    value: computedValue
  }))
}
```

**v10 (return object keyed by timestamp):**
```typescript
calc: (dataList: KLineData[], indicator: Indicator) => {
  return dataList.reduce<Record<number, { value: number }>>((acc, d, i) => {
    acc[d.timestamp] = { value: computedValue }
    return acc
  }, {})
}
```

Affected files (11):
- `src/extension/indicator/ma_ribbon.ts`
- `src/extension/indicator/ichimoku.ts`
- `src/extension/indicator/boll_tv.ts`
- `src/extension/indicator/superTrend.ts`
- `src/extension/indicator/hma.ts`
- `src/extension/indicator/vwap.ts`
- `src/extension/indicator/pivotPoints.ts`
- `src/extension/indicator/macd_tv.ts`
- `src/extension/indicator/rsi_tv.ts`
- `src/extension/indicator/cci.ts`
- `src/extension/indicator/stochastic.ts`

> Also affects dynamically registered indicators in `ChartLayoutManager.ts` and `script-editor-modal/index.tsx` — the script editor exposes `calc` to user code, so a compat wrapper or migration note for user scripts is needed.

---

### Step 11 — Style keys: `yAxis.type` (`setting-modal/data.ts:53`)

**v9:**
```typescript
{ key: 'yAxis.type', ... }  // 'normal' | 'log' | 'percentage'
```

**v10:** Y-axis type is now configured via the window-level `axis` property. Verify new key path in v10 style docs and update the settings modal data accordingly.

---

### Step 12 — `createIndicator()` return type change

**v9:** Returns an `Indicator` object (or null).
**v10:** Returns an indicator ID (`string`) or null.

Audit all call sites for `createIndicator()`. In `ChartLayoutManager.ts` the return value is used to restore state — adapt to use `getIndicators()` to retrieve the full object by ID if needed.

---

## Risks & Notes

1. **`setDataLoader` interface** — The exact method signature for the v10 data loader must be verified against the v10 API docs before implementation. The `DefaultDatafeed.ts` interface may need updating too.

2. **`calc()` timestamp keying** — The new timestamp-keyed return requires every indicator to have `d.timestamp` available as the key. Verify this is always present in `KLineData`.

3. **Script Editor user code** — The script editor allows users to write custom `calc()` functions. This is a **user-facing breaking change**. Consider a compatibility shim that detects Array returns and converts them, or show a migration warning in the editor UI.

4. **`getIndicators()` type** — In v9, `getIndicatorByPaneId()` returned a nested `Map`. In v10, `getIndicators()` returns a flat `Indicator[]`. The `ChartLayoutManager` save logic iterates this structure — the refactor may be significant.

5. **`TooltipIconPosition` removal** — If this type is gone in v10, all icon `position` fields in indicator configs must be removed or replaced.

6. **`FormatDateType` enum** — Verify this still exists in v10 types.

7. **Alpha-only changes** — Some changes (e.g., `calc()` timestamp return) appeared in alpha9. Confirm all alpha changes are stable in beta1.

---

## Execution Order

1. Update `package.json` + install v10 beta
2. Fix TypeScript compile errors (remove deleted imports first)
3. Step 2: `customApi` → `formatter`
4. Steps 6–7: `getIndicatorByPaneId` / `getOverlayById` → new query APIs
5. Steps 8–9: Tooltip `icons` → `features` + action subscription
6. Step 10: All 11 indicator `calc()` return types
7. Steps 3–5: Data loading / `setDataLoader` / `setSymbol` (most complex)
8. Step 11: Style key for yAxis
9. Step 12: Audit `createIndicator()` return usage
10. Run dev server, fix runtime errors
11. Update `peerDependencies` in final package.json

---

## References

- [KLineChart v9 → v10 Migration Guide](https://klinecharts.com/en-US/guide/v9-to-v10)
- [KLineChart Changelog](https://klinecharts.com/en-US/guide/changelog)
- [KLineChart v10.0.0-beta1 Release](https://github.com/klinecharts/KLineChart/releases)
