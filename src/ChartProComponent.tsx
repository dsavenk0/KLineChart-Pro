/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createSignal, createEffect, onMount, Show, onCleanup, startTransition, Component } from 'solid-js'

import {
  init, dispose, utils, Nullable, Chart, OverlayMode, Styles,
  TooltipIconPosition, ActionType, PaneOptions, Indicator, DomPosition, FormatDateType,
  OverlayCreate
} from 'klinecharts'

import lodashSet from 'lodash/set'
import lodashClone from 'lodash/cloneDeep'

import { SelectDataSourceItem, Loading } from './component'

import {
  PeriodBar, DrawingBar, IndicatorModal, TimezoneModal, SettingModal,
  ScreenshotModal, IndicatorSettingModal, SymbolSearchModal, SaveLoadMenu, ScriptEditorModal
} from './widget'

import { translateTimezone } from './widget/timezone-modal/data'

import { SymbolInfo, Period, ChartProOptions, ChartPro } from './types'
import ChartLayoutManager, { ChartState } from './extension/ChartLayoutManager'

export interface ChartProComponentProps extends Required<Omit<ChartProOptions, 'container' | 'onStateChange'>> {
  onStateChange?: (state: any) => void
  ref: (chart: ChartPro) => void
}

interface PrevSymbolPeriod {
  symbol: SymbolInfo
  period: Period
}

function createIndicator(widget: Nullable<Chart>, indicatorName: string, isStack?: boolean, paneOptions?: PaneOptions): Nullable<string> {
  if (indicatorName === 'VOL') {
    paneOptions = { gap: { bottom: 2 }, ...paneOptions }
  }
  return widget?.createIndicator({
    name: indicatorName,
    // @ts-expect-error
    createTooltipDataSource: ({ indicator, defaultStyles }) => {
      const icons = []
      if (indicator.visible) {
        icons.push(defaultStyles.tooltip.icons[1])
        icons.push(defaultStyles.tooltip.icons[2])
        icons.push(defaultStyles.tooltip.icons[3])
      } else {
        icons.push(defaultStyles.tooltip.icons[0])
        icons.push(defaultStyles.tooltip.icons[2])
        icons.push(defaultStyles.tooltip.icons[3])
      }
      return { icons }
    }
  }, isStack, paneOptions) ?? null
}

const ChartProComponent: Component<ChartProComponentProps> = props => {
  let widgetRef: HTMLDivElement | undefined = undefined
  let widget: Nullable<Chart> = null

  let priceUnitDom: HTMLElement

  let loading = false

  const [theme, setTheme] = createSignal(props.theme)
  const [styles, setStyles] = createSignal(props.styles)
  const [locale, setLocale] = createSignal(props.locale)

  const [symbol, setSymbol] = createSignal(props.symbol)
  const [period, setPeriod] = createSignal(props.period)
  // ─── Action-based Undo / Redo ────────────────────────────────────────────
  // Each entry describes a single reversible action. Overlays store the full
  // Overlay object (with points) captured via getOverlayById after drawing,
  // so redo can recreate completed drawings — not blank interactive overlays.
  type HistoryAction =
    | { type: 'overlay_added'; overlay: any }
    | { type: 'overlays_removed'; saved: any[] }
    | { type: 'indicator_toggled'; name: string; isMain: boolean; paneId: string; added: boolean }

  const [undoStack, setUndoStack] = createSignal<HistoryAction[]>([])
  const [redoStack, setRedoStack] = createSignal<HistoryAction[]>([])

  /** Track the ID of the pending (not-yet-drawn) retrigger overlay. */
  let pendingOverlayId: string | null = null

  /** Push a new action onto the undo stack and clear redo. */
  const pushUndoAction = (action: HistoryAction) => {
    setUndoStack(prev => [...prev, action])
    setRedoStack([])
  }

  /** Cancel any outstanding pending (not yet drawn) overlay before undo/redo. */
  const cancelPending = () => {
    if (pendingOverlayId) {
      widget?.removeOverlay({ id: pendingOverlayId })
      setOverlays(prev => prev.filter(o => (o as any).id !== pendingOverlayId))
      pendingOverlayId = null
    }
  }

  /** Apply an action forward (redo direction) or reverse it (undo direction). */
  const applyAction = (action: HistoryAction, dir: 'undo' | 'redo') => {
    if (action.type === 'overlay_added') {
      if (dir === 'undo') {
        widget?.removeOverlay({ id: action.overlay.id })
        setOverlays(prev => prev.filter(o => (o as any).id !== action.overlay.id))
      } else {
        // Recreate with full overlay data (including points) — renders as completed drawing
        const restored = { ...action.overlay }
        delete restored.onDrawEnd
        delete restored.onRemoved
        widget?.createOverlay({
          ...restored,
          onRemoved: (params: any) => {
            setOverlays(prev => prev.filter(o => (o as any).id !== params.overlay.id))
            return true
          }
        } as any)
        setOverlays(prev => [...prev, { name: restored.name, id: restored.id, groupId: restored.groupId }])
      }
    } else if (action.type === 'overlays_removed') {
      if (dir === 'undo') {
        action.saved.forEach((overlay: any) => {
          const restored = { ...overlay }
          delete restored.onDrawEnd
          delete restored.onRemoved
          widget?.createOverlay({
            ...restored,
            onRemoved: (params: any) => {
              setOverlays(prev => prev.filter(o => (o as any).id !== params.overlay.id))
              return true
            }
          } as any)
        })
        setOverlays(action.saved.map((o: any) => ({ name: o.name, id: o.id, groupId: o.groupId })))
      } else {
        setOverlays([])
        widget?.removeOverlay({ groupId: 'drawing_tools' })
      }
    } else if (action.type === 'indicator_toggled') {
      const shouldAdd = dir === 'undo' ? !action.added : action.added
      if (shouldAdd) {
        if (action.isMain) {
          createIndicator(widget, action.name, true, { id: 'candle_pane' })
          setMainIndicators(prev => [...prev, action.name])
        } else {
          const paneId = createIndicator(widget, action.name) ?? action.paneId
          setSubIndicators((prev: any) => ({ ...prev, [action.name]: paneId }))
        }
      } else {
        if (action.isMain) {
          widget?.removeIndicator('candle_pane', action.name)
          setMainIndicators(prev => prev.filter(n => n !== action.name))
        } else {
          widget?.removeIndicator(action.paneId, action.name)
          setSubIndicators((prev: any) => { const n = { ...prev }; delete n[action.name]; return n })
        }
      }
    }
    triggerAutoSave()
  }

  /** Undo the last action. Single click or Ctrl+Z. */
  const handleUndo = () => {
    cancelPending()
    const stack = undoStack()
    if (stack.length === 0) return
    const action = stack[stack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, action])
    applyAction(action, 'undo')
  }

  /** Redo the last undone action. Single click or Ctrl+Y. */
  const handleRedo = () => {
    cancelPending()
    const stack = redoStack()
    if (stack.length === 0) return
    const action = stack[stack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    setUndoStack(prev => [...prev, action])
    applyAction(action, 'redo')
  }

  /** Keyboard shortcut handler: Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo. */
  const handleKeyDown = (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey
    if (!ctrl) return
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
    if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); handleRedo() }
  }

  const [overlays, setOverlays] = createSignal<OverlayCreate[]>([])
  const [indicatorModalVisible, setIndicatorModalVisible] = createSignal(false)
  const [mainIndicators, setMainIndicators] = createSignal([...(props.mainIndicators!)])
  const [subIndicators, setSubIndicators] = createSignal({})

  const [timezoneModalVisible, setTimezoneModalVisible] = createSignal(false)
  const [timezone, setTimezone] = createSignal<SelectDataSourceItem>({ key: props.timezone, text: translateTimezone(props.timezone, props.locale) })

  const [settingModalVisible, setSettingModalVisible] = createSignal(false)
  const [widgetDefaultStyles, setWidgetDefaultStyles] = createSignal<Styles>()

  const [screenshotUrl, setScreenshotUrl] = createSignal('')

  const [drawingBarVisible, setDrawingBarVisible] = createSignal(props.drawingBarVisible)

  const [symbolSearchModalVisible, setSymbolSearchModalVisible] = createSignal(false)

  const [scriptEditorVisible, setScriptEditorVisible] = createSignal(false)
  const [saveLoadModalVisible, setSaveLoadModalVisible] = createSignal(false)

  const [loadingVisible, setLoadingVisible] = createSignal(false)

  const [indicatorSettingModalParams, setIndicatorSettingModalParams] = createSignal({
    visible: false, indicatorName: '', paneId: '', calcParams: [] as Array<any>
  })

  let autoSaveTimer: number | undefined
  let lastSavedState: Nullable<ChartState> = null

  const triggerAutoSave = () => {
    if (autoSaveTimer) {
      window.clearTimeout(autoSaveTimer)
    }
    autoSaveTimer = window.setTimeout(() => {
      if (widget) {
        const currentState = ChartLayoutManager.saveState(widget, symbol(), period(), overlays())
        if (!ChartLayoutManager.isSameState(currentState, lastSavedState)) {
          lastSavedState = currentState
          props.onStateChange?.(currentState)
        }
      }
    }, 5000)
  }

  props.ref({
    setTheme,
    getTheme: () => theme(),
    setStyles,
    getStyles: () => widget!.getStyles(),
    setLocale,
    getLocale: () => locale(),
    setTimezone: (timezone: string) => { setTimezone({ key: timezone, text: translateTimezone(props.timezone, locale()) }) },
    getTimezone: () => timezone().key,
    setSymbol,
    getSymbol: () => symbol(),
    setPeriod,
    getPeriod: () => period(),
    saveState: () => {
      const state = ChartLayoutManager.saveState(widget!, symbol(), period(), overlays())
      lastSavedState = state
      return state
    },
    loadState: (state: any) => {
      if (state) {
        if (state.meta?.symbol) setSymbol(state.meta.symbol)
        if (state.meta?.period) setPeriod(state.meta.period)
        const restoredDrawings = ChartLayoutManager.restoreState(widget!, state, (params: any) => {
          setOverlays(prev => prev.filter(o => o.id !== params.overlay.id))
          return true
        })
        setOverlays(restoredDrawings)
        lastSavedState = state
      }
    }
  })

  const documentResize = () => {
    widget?.resize()
  }

  const adjustFromTo = (period: Period, toTimestamp: number, count: number) => {
    let to = toTimestamp
    let from = to
    switch (period.timespan) {
      case 'minute': {
        to = to - (to % (60 * 1000))
        from = to - count * period.multiplier * 60 * 1000
        break
      }
      case 'hour': {
        to = to - (to % (60 * 60 * 1000))
        from = to - count * period.multiplier * 60 * 60 * 1000
        break
      }
      case 'day': {
        to = to - (to % (24 * 60 * 60 * 1000))
        from = to - count * period.multiplier * 24 * 60 * 60 * 1000
        break
      }
      case 'week': {
        const date = new Date(to)
        const week = date.getDay()
        const dif = week === 0 ? 6 : week - 1
        to = to - dif * 24 * 60 * 60 * 1000
        const newDate = new Date(to)
        to = new Date(`${newDate.getFullYear()}-${newDate.getMonth() + 1}-${newDate.getDate()}`).getTime()
        from = to - count * period.multiplier * 7 * 24 * 60 * 60 * 1000
        break
      }
      case 'month': {
        const date = new Date(to)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        to = new Date(`${year}-${month}-01`).getTime()
        const fromDate = new Date(to)
        fromDate.setMonth(fromDate.getMonth() - count * period.multiplier)
        from = fromDate.getTime()
        break
      }
      case 'year': {
        const date = new Date(to)
        const year = date.getFullYear()
        to = new Date(`${year}-01-01`).getTime()
        const fromDate = new Date(to)
        fromDate.setFullYear(fromDate.getFullYear() - count * period.multiplier)
        from = fromDate.getTime()
        break
      }
    }
    return [from, to]
  }

  onMount(() => {
    window.addEventListener('resize', documentResize)
    window.addEventListener('keydown', handleKeyDown)
    console.log('ChartProComponent onMount, widgetRef:', widgetRef)
    if (!widgetRef) {
      console.error('ChartProComponent onMount: widgetRef is MISSING!')
    }
    widget = init(widgetRef!, {
      customApi: {
        formatDate: (dateTimeFormat: Intl.DateTimeFormat, timestamp, format: string, type: FormatDateType) => {
          const p = period()
          switch (p.timespan) {
            case 'minute': {
              if (type === FormatDateType.XAxis) {
                return utils.formatDate(dateTimeFormat, timestamp, 'HH:mm')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD HH:mm')
            }
            case 'hour': {
              if (type === FormatDateType.XAxis) {
                return utils.formatDate(dateTimeFormat, timestamp, 'MM-DD HH:mm')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD HH:mm')
            }
            case 'day':
            case 'week': return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD')
            case 'month': {
              if (type === FormatDateType.XAxis) {
                return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD')
            }
            case 'year': {
              if (type === FormatDateType.XAxis) {
                return utils.formatDate(dateTimeFormat, timestamp, 'YYYY')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD')
            }
          }
          return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD HH:mm')
        }
      }
    })
    console.log('KLineChart init result:', widget)

    if (widget) {
      const watermarkContainer = widget.getDom('candle_pane', DomPosition.Main)
      if (watermarkContainer) {
        let watermark = document.createElement('div')
        watermark.className = 'klinecharts-pro-watermark'
        if (utils.isString(props.watermark)) {
          const str = (props.watermark as string).replace(/(^\s*)|(\s*$)/g, '')
          watermark.innerHTML = str
        } else {
          watermark.appendChild(props.watermark as Node)
        }
        watermarkContainer.appendChild(watermark)
      }

      const priceUnitContainer = widget.getDom('candle_pane', DomPosition.YAxis)
      priceUnitDom = document.createElement('span')
      priceUnitDom.className = 'klinecharts-pro-price-unit'
      priceUnitContainer?.appendChild(priceUnitDom)
    }

    mainIndicators().forEach(indicator => {
      createIndicator(widget, indicator, true, { id: 'candle_pane' })
    })
    const subIndicatorMap = {}
    props.subIndicators!.forEach(indicator => {
      const paneId = createIndicator(widget, indicator, true)
      if (paneId) {
        // @ts-expect-error
        subIndicatorMap[indicator] = paneId
      }
    })
    setSubIndicators(subIndicatorMap)
    console.log('Sub-indicators initialized:', subIndicatorMap)
    widget?.loadMore(timestamp => {
      loading = true
      const get = async () => {
        const p = period()
        const [to] = adjustFromTo(p, timestamp!, 1)
        const [from] = adjustFromTo(p, to, 500)
        const kLineDataList = await props.datafeed.getHistoryKLineData(symbol(), p, from, to)
        widget?.applyMoreData(kLineDataList, kLineDataList.length > 0)
        loading = false
      }
      get()
    })
    widget?.subscribeAction(ActionType.OnTooltipIconClick, (data) => {
      if (data.indicatorName) {
        switch (data.iconId) {
          case 'visible': {
            widget?.overrideIndicator({ name: data.indicatorName, visible: true }, data.paneId)
            triggerAutoSave()
            break
          }
          case 'invisible': {
            widget?.overrideIndicator({ name: data.indicatorName, visible: false }, data.paneId)
            triggerAutoSave()
            break
          }
          case 'setting': {
            const indicator = widget?.getIndicatorByPaneId(data.paneId, data.indicatorName) as Indicator
            setIndicatorSettingModalParams({
              visible: true, indicatorName: data.indicatorName, paneId: data.paneId, calcParams: indicator.calcParams
            })
            break
          }
          case 'close': {
            const isMain = data.paneId === 'candle_pane'
            pushUndoAction({
              type: 'indicator_toggled',
              name: data.indicatorName,
              isMain,
              paneId: data.paneId,
              added: false
            })
            if (isMain) {
              const newMainIndicators = [...mainIndicators()]
              widget?.removeIndicator('candle_pane', data.indicatorName)
              newMainIndicators.splice(newMainIndicators.indexOf(data.indicatorName), 1)
              setMainIndicators(newMainIndicators)
            } else {
              const newIndicators = { ...subIndicators() }
              widget?.removeIndicator(data.paneId, data.indicatorName)
              // @ts-expect-error
              delete newIndicators[data.indicatorName]
              setSubIndicators(newIndicators)
            }
            triggerAutoSave()
          }
        }
      }
    })
  })

  onCleanup(() => {
    window.removeEventListener('resize', documentResize)
    window.removeEventListener('keydown', handleKeyDown)
    dispose(widgetRef!)
  })

  createEffect(() => {
    const s = symbol()
    if (s?.priceCurrency) {
      priceUnitDom.innerHTML = s?.priceCurrency.toLocaleUpperCase()
      priceUnitDom.style.display = 'flex'
    } else {
      priceUnitDom.style.display = 'none'
    }
    widget?.setPriceVolumePrecision(s?.pricePrecision ?? 2, s?.volumePrecision ?? 0)
  })

  createEffect((prev?: PrevSymbolPeriod) => {
    if (!loading) {
      if (prev) {
        props.datafeed.unsubscribe(prev.symbol, prev.period)
      }
      const s = symbol()
      const p = period()
      setLoadingVisible(true)
      const get = async () => {
        try {
          const now = new Date().getTime()
          // Use a larger count (1000) and wider range for initial load to bridge overnight gaps
          const [from, to] = adjustFromTo(p, now, 1000)
          console.log('Requesting initial data:', { s, p, from, to, fromDate: new Date(from).toISOString(), toDate: new Date(to).toISOString() })
          const kLineDataList = await props.datafeed.getHistoryKLineData(s, p, from, to)
          console.log(`Initial data received: ${kLineDataList.length} bars`)
          widget?.applyNewData(kLineDataList, kLineDataList.length > 0)
          props.datafeed.subscribe(s, p, data => {
            widget?.updateData(data)
          })
        } catch (e) {
          console.error('Initial data load failed:', e)
        } finally {
          loading = false
          setLoadingVisible(false)
        }
      }
      get()
      return { symbol: s, period: p }
    }
    return prev
  })

  createEffect(() => {
    symbol()
    period()
    mainIndicators()
    subIndicators()
    overlays()
    if (!loading) {
      triggerAutoSave()
    }
  })

  createEffect(() => {
    const t = theme()
    widget?.setStyles(t)
    const color = t === 'dark' ? '#929AA5' : '#76808F'
    widget?.setStyles({
      indicator: {
        tooltip: {
          icons: [
            {
              id: 'visible',
              position: TooltipIconPosition.Middle,
              marginLeft: 8,
              marginTop: 7,
              marginRight: 0,
              marginBottom: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              icon: '\ue903',
              fontFamily: 'icomoon',
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            },
            {
              id: 'invisible',
              position: TooltipIconPosition.Middle,
              marginLeft: 8,
              marginTop: 7,
              marginRight: 0,
              marginBottom: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              icon: '\ue901',
              fontFamily: 'icomoon',
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            },
            {
              id: 'setting',
              position: TooltipIconPosition.Middle,
              marginLeft: 6,
              marginTop: 7,
              marginBottom: 0,
              marginRight: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              icon: '\ue902',
              fontFamily: 'icomoon',
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            },
            {
              id: 'close',
              position: TooltipIconPosition.Middle,
              marginLeft: 6,
              marginTop: 7,
              marginRight: 0,
              marginBottom: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              icon: '\ue900',
              fontFamily: 'icomoon',
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            }
          ]
        }
      }
    })
  })

  createEffect(() => {
    widget?.setLocale(locale())
  })

  createEffect(() => {
    widget?.setTimezone(timezone().key)
  })

  createEffect(() => {
    if (styles()) {
      widget?.setStyles(styles())
      setWidgetDefaultStyles(lodashClone(widget!.getStyles()))
    }
  })

  return (
    <>
      <i class="icon-close klinecharts-pro-load-icon" />
      <Show when={symbolSearchModalVisible()}>
        <SymbolSearchModal
          locale={props.locale}
          datafeed={props.datafeed}
          onSymbolSelected={symbol => { setSymbol(symbol) }}
          onClose={() => { setSymbolSearchModalVisible(false) }} />
      </Show>
      <Show when={indicatorModalVisible()}>
        <IndicatorModal
          locale={props.locale}
          mainIndicators={mainIndicators()}
          subIndicators={subIndicators()}
          onClose={() => { setIndicatorModalVisible(false) }}
          onMainIndicatorChange={data => {
            pushUndoAction({
              type: 'indicator_toggled',
              name: data.name,
              isMain: true,
              paneId: 'candle_pane',
              added: data.added
            })
            const newMainIndicators = [...mainIndicators()]
            if (data.added) {
              createIndicator(widget, data.name, true, { id: 'candle_pane' })
              newMainIndicators.push(data.name)
            } else {
              widget?.removeIndicator('candle_pane', data.name)
              newMainIndicators.splice(newMainIndicators.indexOf(data.name), 1)
            }
            setMainIndicators(newMainIndicators)
            triggerAutoSave()
          }}
          onSubIndicatorChange={data => {
            const paneIdForUndo = data.paneId ?? ''
            pushUndoAction({
              type: 'indicator_toggled',
              name: data.name,
              isMain: false,
              paneId: paneIdForUndo,
              added: data.added
            })
            const newSubIndicators = { ...subIndicators() }
            if (data.added) {
              const paneId = createIndicator(widget, data.name)
              if (paneId) {
                // @ts-expect-error
                newSubIndicators[data.name] = paneId
              }
            } else {
              if (data.paneId) {
                widget?.removeIndicator(data.paneId, data.name)
                // @ts-expect-error
                delete newSubIndicators[data.name]
              }
            }
            setSubIndicators(newSubIndicators)
            triggerAutoSave()
          }} />
      </Show>
      <Show when={timezoneModalVisible()}>
        <TimezoneModal
          locale={props.locale}
          timezone={timezone()}
          onClose={() => { setTimezoneModalVisible(false) }}
          onConfirm={setTimezone}
        />
      </Show>
      <Show when={settingModalVisible()}>
        <SettingModal
          locale={props.locale}
          currentStyles={utils.clone(widget!.getStyles())}
          onClose={() => { setSettingModalVisible(false) }}
          onChange={style => {
            widget?.setStyles(style)
            triggerAutoSave()
          }}
          onRestoreDefault={(options: SelectDataSourceItem[]) => {
            const style = {}
            options.forEach(option => {
              const key = option.key
              lodashSet(style, key, utils.formatValue(widgetDefaultStyles(), key))
            })
            widget?.setStyles(style)
          }}
        />
      </Show>
      <Show when={screenshotUrl().length > 0}>
        <ScreenshotModal
          locale={props.locale}
          url={screenshotUrl()}
          onClose={() => { setScreenshotUrl('') }}
        />
      </Show>
      <Show when={indicatorSettingModalParams().visible}>
        <IndicatorSettingModal
          locale={props.locale}
          params={indicatorSettingModalParams()}
          onClose={() => { setIndicatorSettingModalParams({ visible: false, indicatorName: '', paneId: '', calcParams: [] }) }}
          onConfirm={(params) => {
            const modalParams = indicatorSettingModalParams()
            widget?.overrideIndicator({ name: modalParams.indicatorName, calcParams: params }, modalParams.paneId)
            triggerAutoSave()
          }}
        />
      </Show>
      <PeriodBar
        locale={props.locale}
        symbol={symbol()}
        spread={drawingBarVisible()}
        period={period()}
        periods={props.periods}
        onMenuClick={async () => {
          try {
            await startTransition(() => setDrawingBarVisible(!drawingBarVisible()))
            widget?.resize()
          } catch (e) { }
        }}
        onSymbolClick={() => { setSymbolSearchModalVisible(!symbolSearchModalVisible()) }}
        onPeriodChange={setPeriod}
        onIndicatorClick={() => { setIndicatorModalVisible((visible => !visible)) }}
        onTimezoneClick={() => { setTimezoneModalVisible((visible => !visible)) }}
        onSettingClick={() => { setSettingModalVisible((visible => !visible)) }}
        onScreenshotClick={() => {
          if (widget) {
            const url = widget.getConvertPictureUrl(true, 'jpeg', props.theme === 'dark' ? '#151517' : '#ffffff')
            setScreenshotUrl(url)
          }
        }}
        onSaveLoadClick={() => setSaveLoadModalVisible(v => !v)}
        onScriptEditorClick={() => setScriptEditorVisible(v => !v)}
        canUndo={undoStack().length > 0}
        canRedo={redoStack().length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
      <Show when={saveLoadModalVisible()}>
        <SaveLoadMenu
          locale={props.locale}
          getChart={() => widget}
          getSymbol={symbol}
          getPeriod={period}
          getOverlays={overlays}
          onLoadState={(state) => {
            if (state) {
              if (state.meta?.symbol) setSymbol(state.meta.symbol)
              if (state.meta?.period) setPeriod(state.meta.period)
              const restoredDrawings = ChartLayoutManager.restoreState(widget!, state, (params: any) => {
                setOverlays(prev => prev.filter(o => o.id !== params.overlay.id))
                return true
              })
              setOverlays(restoredDrawings)
            }
          }}
          onClose={() => setSaveLoadModalVisible(false)}
        />
      </Show>
      <Show when={scriptEditorVisible()}>
        <ScriptEditorModal
          locale={props.locale}
          getChart={() => widget}
          onClose={() => setScriptEditorVisible(false)}
        />
      </Show>
      <div
        class="klinecharts-pro-content">
        <Show when={loadingVisible()}>
          <Loading />
        </Show>
        <Show when={drawingBarVisible()}>
          <DrawingBar
            locale={props.locale}
            onDrawingItemClick={overlay => {
              const createWithRetrigger = (oc: OverlayCreate) => {
                const originalOnDrawEnd = (oc as any).onDrawEnd
                const id = widget?.createOverlay({
                  ...oc,
                  onRemoved: (params: any) => {
                    if (pendingOverlayId === params.overlay.id) pendingOverlayId = null
                    setOverlays(prev => prev.filter(o => (o as any).id !== params.overlay.id))
                    return true
                  },
                  onDrawEnd: (event: any) => {
                    const finishedId = id as string
                    // Capture the FULL overlay (with points) for reliable redo reconstruction
                    const fullOverlay = finishedId ? widget?.getOverlayById(finishedId) : null
                    if (fullOverlay) {
                      pushUndoAction({ type: 'overlay_added', overlay: fullOverlay })
                    }
                    pendingOverlayId = null
                    // Brush uses its own retrigger; other tools auto-retrigger
                    if (originalOnDrawEnd) {
                      originalOnDrawEnd(event)
                    } else {
                      createWithRetrigger(oc)
                    }
                  }
                } as any)
                if (utils.isString(id)) {
                  pendingOverlayId = id as string
                  setOverlays(prev => [...prev, { ...oc, id: id as string }])
                }
              }
              cancelPending()
              createWithRetrigger(overlay)
            }}
            onModeChange={mode => { widget?.overrideOverlay({ mode: mode as OverlayMode }) }}
            onLockChange={lock => { widget?.overrideOverlay({ lock }) }}
            onVisibleChange={visible => { widget?.overrideOverlay({ visible }) }}
            onRemoveClick={(groupId) => {
              cancelPending()
              // Save full overlay data for all current overlays before removing
              const savedOverlays = overlays()
                .map(o => widget?.getOverlayById((o as any).id))
                .filter(Boolean)
              pushUndoAction({ type: 'overlays_removed', saved: savedOverlays })
              setOverlays([])
              widget?.removeOverlay({ groupId })
            }}
            onCursorClick={() => {
              cancelPending()
            }} />
        </Show>
        <div
          ref={widgetRef}
          class='klinecharts-pro-widget'
          data-drawing-bar-visible={drawingBarVisible()} />
      </div>
    </>
  )
}

export default ChartProComponent
