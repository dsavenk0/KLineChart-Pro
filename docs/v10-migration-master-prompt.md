# Master Prompt — KLineChart v10 Beta Migration

Paste this prompt verbatim to an AI agent to execute the full migration.

---

```
You are performing a precise migration of the KLineChart-Pro library from
klinecharts v9.8.12 to klinecharts v10.0.0-beta1.

The working directory is /home/user/KLineChart-Pro.
All changes must be committed to branch: claude/plan-v10-migration-xhBKU

## CONTEXT

This is a SolidJS + TypeScript library that wraps KLineChart. It has:
- 1 main chart component: src/ChartProComponent.tsx
- 1 state manager: src/extension/ChartLayoutManager.ts
- 11 custom indicators: src/extension/indicator/*.ts
- 3 widget files using tooltip icons API:
    src/widget/script-editor-modal/index.tsx
    src/widget/save-load-menu/index.tsx  (no klinecharts changes needed here)
- 1 settings data file: src/widget/setting-modal/data.ts

## BEFORE YOU START

1. Read the ENTIRE content of every file you will modify before making changes.
2. After all edits, run: npm run build-core
   Fix every TypeScript error before committing.
3. Commit after each logical group of changes (not one giant commit).
4. Push to origin claude/plan-v10-migration-xhBKU when done.

## STEP 0 — Install v10 beta

In package.json change peerDependencies:
  "klinecharts": "^9.8.12"  →  "klinecharts": "^10.0.0-beta1"

Run: npm install klinecharts@10.0.0-beta1 --legacy-peer-deps

Commit: "chore: upgrade klinecharts peer dependency to v10.0.0-beta1"

## STEP 1 — Fix imports in src/ChartProComponent.tsx

Remove from the import line (line ~19):
  TooltipIconPosition, ActionType, FormatDateType

These types are removed or no longer needed after the changes below.
Keep all other imports (utils, Nullable, Chart, DomPosition, etc.).

If FormatDateType still exists in v10 types you may keep it — check by
running tsc and seeing if it errors.

## STEP 2 — customApi → formatter  (ChartProComponent.tsx ~line 353)

FIND this block inside the init() call:
```typescript
      customApi: {
        formatDate: (dateTimeFormat: Intl.DateTimeFormat, timestamp, format: string, type: FormatDateType) => {
```

REPLACE with:
```typescript
      formatter: {
        formatDate: ({ dateTimeFormat, timestamp, format, type }: { dateTimeFormat: Intl.DateTimeFormat, timestamp: number, format: string, type: any }) => {
```

The function body and all the switch/case logic inside stays IDENTICAL.
Only the outer signature changes: positional params → single destructured object.

## STEP 3 — tooltip icons → features  (3 locations)

### 3a. createIndicator helper function (ChartProComponent.tsx, function createIndicator ~line 48)

FIND:
```typescript
      const icons = []
      const isSub = paneOptions?.id !== 'candle_pane'
      if (indicator.visible) {
        icons.push(defaultStyles.tooltip.icons[1])
        icons.push(defaultStyles.tooltip.icons[2])
        icons.push(defaultStyles.tooltip.icons[3])
      } else {
        icons.push(defaultStyles.tooltip.icons[0])
        icons.push(defaultStyles.tooltip.icons[2])
        icons.push(defaultStyles.tooltip.icons[3])
      }
      if (isSub) {
        icons.push(defaultStyles.tooltip.icons[4])
        icons.push(defaultStyles.tooltip.icons[5])
      }
      return { icons }
```

REPLACE with (rename icons→features everywhere, .icons[n]→.features[n]):
```typescript
      const features = []
      const isSub = paneOptions?.id !== 'candle_pane'
      if (indicator.visible) {
        features.push(defaultStyles.tooltip.features[1])
        features.push(defaultStyles.tooltip.features[2])
        features.push(defaultStyles.tooltip.features[3])
      } else {
        features.push(defaultStyles.tooltip.features[0])
        features.push(defaultStyles.tooltip.features[2])
        features.push(defaultStyles.tooltip.features[3])
      }
      if (isSub) {
        features.push(defaultStyles.tooltip.features[4])
        features.push(defaultStyles.tooltip.features[5])
      }
      return { features }
```

### 3b. setStyles tooltip config (ChartProComponent.tsx ~line 591)

FIND:
```typescript
        indicator: {
          tooltip: {
            icons: [
```

REPLACE with:
```typescript
        indicator: {
          tooltip: {
            features: [
```

Then for EVERY icon object inside that array, REMOVE the line:
```typescript
              position: TooltipIconPosition.Middle,
```
(There are 6 such objects. Remove only the position line from each; keep all other fields.)

### 3c. script-editor-modal (src/widget/script-editor-modal/index.tsx ~line 136)

FIND the createTooltipDataSource block:
```typescript
                createTooltipDataSource: ({ indicator, defaultStyles }: any) => {
                    const icons = []
                    ...
                    icons.push(defaultStyles.tooltip.icons[1])
                    ...
                    return { icons }
```

Apply the SAME rename as 3a: icons→features, .icons[n]→.features[n], return { features }.

### 3d. ChartLayoutManager.ts (src/extension/ChartLayoutManager.ts ~line 212)

FIND the createTooltipDataSource block inside restoreState():
```typescript
                            createTooltipDataSource: ({ indicator: ind, defaultStyles }: any) => {
                                const icons = []
                                ...
                                icons.push(defaultStyles.tooltip.icons[1])
                                ...
                                return { icons } as any
```

Apply the SAME rename as 3a: icons→features, .icons[n]→.features[n], return { features }.

Commit: "feat: migrate tooltip icons to features for klinecharts v10"

## STEP 4 — subscribeAction: OnTooltipIconClick → onIndicatorTooltipFeatureClick
(ChartProComponent.tsx ~line 437)

FIND:
```typescript
    widget?.subscribeAction(ActionType.OnTooltipIconClick, (data) => {
```

REPLACE with:
```typescript
    widget?.subscribeAction('onIndicatorTooltipFeatureClick' as any, (data: any) => {
```

The callback body stays the same. The `data` object field names may have
changed in v10 — after running the app, verify that data.paneId,
data.indicatorName (may now be data.name), and data.iconId (may now be
data.featureId) are correct. For now cast `data` as `any` to avoid TS errors.

## STEP 5 — getIndicatorByPaneId → getIndicators

### 5a. ChartProComponent.tsx ~line 489

FIND:
```typescript
            const indicator = widget?.getIndicatorByPaneId(data.paneId, data.indicatorName) as Indicator
```

REPLACE with:
```typescript
            const indicator = (widget?.getIndicators({ paneId: data.paneId, name: data.indicatorName }) as Indicator[])?.[0] ?? null
```

### 5b. ChartLayoutManager.ts saveState() ~line 96

FIND:
```typescript
        const indicatorMap = chart.getIndicatorByPaneId() as Map<string, Map<string, Indicator>>

        indicatorMap.forEach((paneIndicators, paneId) => {
            paneIndicators.forEach(indicator => {
                indicators.push({
                    paneId,
                    name: indicator.name,
                    calcParams: indicator.calcParams,
                    styles: indicator.styles,
                    visible: indicator.visible,
                    zLevel: indicator.zLevel,
                    extendData: indicator.extendData
                })
            })
        })
```

REPLACE with:
```typescript
        const indicatorList = chart.getIndicators() as Indicator[]

        indicatorList.forEach(indicator => {
            indicators.push({
                paneId: (indicator as any).paneId,
                name: indicator.name,
                calcParams: indicator.calcParams,
                styles: indicator.styles,
                visible: indicator.visible,
                zLevel: indicator.zLevel,
                extendData: indicator.extendData
            })
        })
```

### 5c. ChartLayoutManager.ts restoreState() ~line 179

FIND:
```typescript
        const indicatorMap = chart.getIndicatorByPaneId() as Map<string, Map<string, Indicator>>
        indicatorMap.forEach((paneIndicators, paneId) => {
            paneIndicators.forEach((_, name) => chart.removeIndicator(paneId, name))
        })
```

REPLACE with:
```typescript
        const indicatorList = chart.getIndicators() as Indicator[]
        indicatorList.forEach(ind => {
            chart.removeIndicator((ind as any).paneId, ind.name)
        })
```

## STEP 6 — getOverlayById → getOverlays

### 6a. ChartProComponent.tsx ~line 914

FIND:
```typescript
                    const fullOverlay = finishedId ? widget?.getOverlayById(finishedId) : null
```

REPLACE with:
```typescript
                    const fullOverlay = finishedId ? (widget?.getOverlays({ id: finishedId } as any)?.[0] ?? null) : null
```

### 6b. ChartProComponent.tsx ~line 942

FIND:
```typescript
                .map(o => widget?.getOverlayById((o as any).id))
```

REPLACE with:
```typescript
                .map(o => widget?.getOverlays({ id: (o as any).id } as any)?.[0])
```

### 6c. ChartLayoutManager.ts saveState() ~line 117

FIND:
```typescript
                const actual = chart.getOverlayById(o.id)
```

REPLACE with:
```typescript
                const actual = chart.getOverlays({ id: o.id } as any)?.[0]
```

Commit: "feat: migrate query APIs for klinecharts v10 (getIndicators, getOverlays)"

## STEP 7 — Data loading: loadMore + applyMoreData → setDataLoader
(ChartProComponent.tsx)

### 7a. Replace loadMore + applyMoreData (~line 425)

FIND:
```typescript
    widget?.loadMore(timestamp => {
      props.datafeed.getHistoryKLineData(symbol, period, timestamp)
        .then(kLineDataList => {
          widget?.applyMoreData(kLineDataList, kLineDataList.length > 0)
        })
    })
```

REPLACE with:
```typescript
    widget?.setDataLoader({
      load: ({ timestamp, callback }: any) => {
        props.datafeed.getHistoryKLineData(symbol, period, timestamp)
          .then((kLineDataList: any[]) => {
            callback(kLineDataList, kLineDataList.length > 0)
          })
      }
    } as any)
```

### 7b. Replace applyNewData (~line 556)

FIND:
```typescript
          widget?.applyNewData(kLineDataList, kLineDataList.length > 0)
```

REPLACE with:
```typescript
          widget?.applyNewData?.(kLineDataList, kLineDataList.length > 0)
          // TODO v10: applyNewData removed, migrate to setDataLoader + setSymbol/setPeriod
```

NOTE: If `applyNewData` is truly removed in v10 and causes a compile error,
use a type cast: `(widget as any)?.applyNewData(kLineDataList, kLineDataList.length > 0)`
This is a temporary shim — mark with TODO for the data loading refactor.

### 7c. Replace updateData (~line 558)

FIND:
```typescript
            widget?.updateData(data)
```

REPLACE with:
```typescript
            ;(widget as any)?.updateData?.(data)
            // TODO v10: updateData removed, migrate to appendData or setDataLoader
```

Commit: "feat: migrate data loading APIs toward klinecharts v10 (partial)"

## STEP 8 — setPriceVolumePrecision → setSymbol (ChartProComponent.tsx ~line 537)

FIND:
```typescript
          widget?.setPriceVolumePrecision(s?.pricePrecision ?? 2, s?.volumePrecision ?? 0)
```

REPLACE with:
```typescript
          widget?.setSymbol({
            pricePrecision: s?.pricePrecision ?? 2,
            volumePrecision: s?.volumePrecision ?? 0
          } as any)
```

Commit: "feat: replace setPriceVolumePrecision with setSymbol for klinecharts v10"

## STEP 9 — Indicator calc() return type (all 11 files)

For EACH file in src/extension/indicator/, the calc() function currently
returns `dataList.map(...)` producing an Array. In v10 it must return an
object keyed by timestamp: `Record<number, ResultType>`.

The pattern to apply to every indicator:

BEFORE (example):
```typescript
    calc: (dataList: KLineData[], indicator: Indicator) => {
      return dataList.map((d, i) => ({
        value: someComputation(d, i)
      }))
    }
```

AFTER:
```typescript
    calc: (dataList: KLineData[], indicator: Indicator) => {
      const result: Record<number, any> = {}
      dataList.forEach((d, i) => {
        result[d.timestamp] = { value: someComputation(d, i) }
      })
      return result
    }
```

For indicators with complex internal logic that builds an intermediate array
first (e.g. ichimoku, superTrend, hma, stochastic), keep the internal array
computation intact and only change the final return to build a Record:

BEFORE (complex example):
```typescript
      const results = dataList.map((d, i) => {
        // complex multi-step calc
        return { line1: v1, line2: v2 }
      })
      return results
```

AFTER:
```typescript
      const resultsArray = dataList.map((d, i) => {
        // complex multi-step calc — UNCHANGED
        return { line1: v1, line2: v2 }
      })
      // Convert to timestamp-keyed record for v10
      const result: Record<number, any> = {}
      dataList.forEach((d, i) => { result[d.timestamp] = resultsArray[i] })
      return result
```

Files to update (read each one first, then apply):
- src/extension/indicator/ma_ribbon.ts
- src/extension/indicator/ichimoku.ts
- src/extension/indicator/boll_tv.ts
- src/extension/indicator/superTrend.ts
- src/extension/indicator/hma.ts
- src/extension/indicator/vwap.ts
- src/extension/indicator/pivotPoints.ts
- src/extension/indicator/macd_tv.ts
- src/extension/indicator/rsi_tv.ts
- src/extension/indicator/cci.ts
- src/extension/indicator/stochastic.ts

IMPORTANT — ChartLayoutManager.ts script indicator shim (~line 200):
The dynamically-registered script indicator does:
```typescript
            calc: () => result,
```
where `result` is the output of user-supplied code. Since user scripts
return arrays (v9 convention), wrap it with a compatibility converter:
```typescript
            calc: (dataList: KLineData[]) => {
              // result is from user script (may be array or record)
              if (Array.isArray(result)) {
                const rec: Record<number, any> = {}
                dataList.forEach((d, i) => { rec[d.timestamp] = result[i] ?? {} })
                return rec
              }
              return result
            },
```

Commit: "feat: migrate all indicator calc() to timestamp-keyed record for klinecharts v10"

## STEP 10 — yAxis.type style key (src/widget/setting-modal/data.ts ~line 53)

FIND:
```typescript
      key: 'yAxis.type',
```

This setting controls log/normal/percentage scale. In v10 the y-axis type
moved to a window-level `axis` config. Update the key to the new path.
Check the v10 types — if `Styles` still has a `yAxis.type` path, leave it.
If TypeScript errors on it, comment it out with a TODO:
```typescript
      // key: 'yAxis.type',  // TODO v10: yAxis.type moved to axis config, update key
      key: 'yAxis.type',
```

Commit: "chore: note yAxis style key migration for klinecharts v10"

## STEP 11 — Build verification

Run: npm run build-core

For every TypeScript error:
1. If it's about a removed type (ActionType, TooltipIconPosition, FormatDateType):
   - Remove the import.
   - Replace the usage with `as any` cast or string literal.
2. If it's about a removed method (applyNewData, updateData, loadMore, etc.):
   - Cast as `(widget as any)?.methodName(...)`.
3. If it's about getIndicators/getOverlays filter type:
   - Cast filter arg as `any`.
4. Do NOT suppress errors with @ts-ignore without a comment explaining why.

Fix all errors, then run build again to confirm zero errors.

Commit: "fix: resolve TypeScript errors from klinecharts v10 API changes"

## STEP 12 — Final push

git push -u origin claude/plan-v10-migration-xhBKU

## IMPORTANT NOTES

1. DO NOT rewrite logic — only change the API call signatures.
   The business logic inside formatDate, indicator calc formulas,
   overlay drawing code, etc. must stay byte-for-byte identical.

2. The `(widget as any)` casts in Steps 7 and 8 are INTENTIONAL for
   methods that may not yet have full v10 type definitions in beta.

3. The script editor (src/widget/script-editor-modal/index.tsx) also
   registers indicators dynamically via registerIndicator. Its calc()
   output comes from user code — apply the same Array→Record shim as
   in ChartLayoutManager.ts Step 9.

4. After committing all steps, add a brief summary to
   docs/v10-migration-plan.md under a new section "## Migration Status"
   listing which steps are done and any remaining TODOs.
```
