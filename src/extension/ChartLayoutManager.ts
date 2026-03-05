/**
 * ChartLayoutManager
 *
 * Single unified manager that handles both:
 *   - Full chart state serialization (indicators, drawings, zoom/scroll, symbol/period)
 *   - Named, multi-slot layout persistence via `localStorage`
 *
 * Previously these responsibilities were split between ChartStateManager and
 * ChartLayoutManager.  They are now combined here.  ChartStateManager.ts is
 * kept as a thin re-export shim for backward compatibility.
 *
 * Storage Structure:
 *   Index Key  (`klinecharts_layout_index`)      : Array of UUID strings
 *   Data Keys  (`klinecharts_layout_{uuid}`)     : Serialized LayoutEntry JSON
 */

import { Chart, Indicator, OverlayCreate, registerIndicator } from 'klinecharts'
import lodashIsEqual from 'lodash/isEqual'
import { SymbolInfo, Period } from '../types'
import TA from '../utils/TA'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChartState {
    version: string
    meta: {
        symbol: SymbolInfo
        period: Period
        timestamp: number
        lastModified: number
    }
    view: {
        visibleRange: any
    }
    indicators: Array<{
        paneId: string
        name: string
        calcParams: any[]
        styles: any
        visible: boolean
        zLevel: number
        extendData: any
    }>
    drawings: Array<OverlayCreate & { paneId?: string }>
}

export interface LayoutEntry {
    id: string
    name: string
    symbol: string      // ticker for display
    resolution: string  // period text e.g. "1m"
    timestamp: number   // created
    lastModified: number
    state: ChartState
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATE_VERSION = '1.0'
const STORAGE_KEY_PREFIX = 'klinecharts_layout:'
const INDEX_KEY = 'klinecharts_layout_index'

function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// ChartLayoutManager
// ─────────────────────────────────────────────────────────────────────────────

export default class ChartLayoutManager {

    // ══════════════════════════════════════════════════════════════════════════
    // STATE SERIALIZATION  (formerly ChartStateManager)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Serialize the complete chart state:
     * indicators, drawings (with full point data), zoom/scroll, symbol & period.
     */
    static saveState(
        chart: Chart,
        symbol: SymbolInfo,
        period: Period,
        overlays: OverlayCreate[]
    ): ChartState {
        // ── Indicators ────────────────────────────────────────────────────────
        const indicators: ChartState['indicators'] = []
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

        // ── Drawings ──────────────────────────────────────────────────────────
        const drawings: ChartState['drawings'] = []

        overlays.forEach(o => {
            if (o.id) {
                const actual = chart.getOverlayById(o.id)
                if (actual && actual.name !== 'brush' || (actual?.name === 'brush' && actual.points && actual.points.length > 0)) {
                    drawings.push({
                        id: actual!.id,
                        groupId: actual!.groupId,
                        paneId: actual!.paneId,
                        name: actual!.name,
                        points: actual!.points,
                        styles: actual!.styles,
                        visible: actual!.visible,
                        lock: actual!.lock,
                        mode: actual!.mode,
                        modeSensitivity: actual!.modeSensitivity,
                        zLevel: actual!.zLevel,
                        extendData: actual!.extendData
                    })
                }
            } else if (o.name && o.name !== 'brush') {
                drawings.push(o)
            }
        })

        return {
            version: STATE_VERSION,
            meta: {
                symbol,
                period,
                timestamp: Date.now(),
                lastModified: Date.now()
            },
            view: {
                visibleRange: chart.getVisibleRange()
            },
            indicators,
            drawings
        }
    }

    /**
     * Deep-compare two states, ignoring volatile timestamps.
     */
    static isSameState(state1: ChartState | null, state2: ChartState | null): boolean {
        if (!state1 || !state2) return state1 === state2
        const s1 = { ...state1, meta: { ...state1.meta, timestamp: 0, lastModified: 0 } }
        const s2 = { ...state2, meta: { ...state2.meta, timestamp: 0, lastModified: 0 } }
        return lodashIsEqual(s1, s2)
    }

    /**
     * Restore a previously saved chart state.
     * Clears existing overlays/indicators, then re-creates them from `state`.
     * @returns The restored overlay list (with final IDs assigned by klinecharts).
     */
    static restoreState(
        chart: Chart,
        state: ChartState,
        onOverlayRemoved?: (params: any) => boolean
    ): OverlayCreate[] {
        if (!state || state.version !== STATE_VERSION) return []

        // 0. Clear existing state
        chart.removeOverlay()
        const indicatorMap = chart.getIndicatorByPaneId() as Map<string, Map<string, Indicator>>
        indicatorMap.forEach((paneIndicators, paneId) => {
            paneIndicators.forEach((_, name) => chart.removeIndicator(paneId, name))
        })

        // 1. Restore Indicators
        if (state.indicators) {
            state.indicators.forEach(indicator => {
                if (indicator.extendData?.isCustomScript) {
                    // Re-register custom script indicators sandboxed from global APIs
                    const fn = new Function(
                        'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker',
                        'SharedWorker', 'importScripts', 'self', 'caches', 'indexedDB',
                        'TA', 'dataList', 'params',
                        `"use strict";\n${indicator.extendData.code}`
                    )
                    const dataList = (chart as any).getDataList?.() ?? []
                    const shadowValues = Array(9).fill(undefined)
                    try {
                        const result = fn(...shadowValues, TA, dataList, indicator.calcParams)
                        registerIndicator({
                            name: indicator.name,
                            shortName: indicator.name.replace('_custom_script_', 'Script #'),
                            calcParams: indicator.calcParams,
                            figures: (result && result.length > 0
                                ? Object.keys(result[0] || {}).filter((k: string) => k !== 'timestamp')
                                : ['value']
                            ).map((key: string, i: number) => {
                                const COLORS = ['#2962FF', '#FF6D00', '#00BCD4', '#E91E63', '#76FF03', '#FFD600']
                                return { key, title: `${key}: `, type: 'line', styles: () => ({ color: COLORS[i % COLORS.length] }) }
                            }) as any,
                            calc: () => result,
                            extendData: indicator.extendData,
                            createTooltipDataSource: ({ indicator: ind, defaultStyles }: any) => {
                                const icons = []
                                const isSub = indicator.extendData?.placement !== 'main'
                                if (ind.visible) {
                                    icons.push(defaultStyles.tooltip.icons[1])
                                    icons.push(defaultStyles.tooltip.icons[3])
                                } else {
                                    icons.push(defaultStyles.tooltip.icons[0])
                                    icons.push(defaultStyles.tooltip.icons[3])
                                }
                                if (isSub) {
                                    icons.push(defaultStyles.tooltip.icons[4])
                                    icons.push(defaultStyles.tooltip.icons[5])
                                }
                                return { icons } as any
                            }
                        })
                    } catch (e) {
                        console.error('Failed to restore custom script indicator', e)
                    }
                }

                chart.createIndicator(
                    {
                        name: indicator.name,
                        calcParams: indicator.calcParams,
                        styles: indicator.styles,
                        visible: indicator.visible,
                        zLevel: indicator.zLevel,
                        extendData: indicator.extendData
                    },
                    indicator.paneId !== 'candle_pane',
                    { id: indicator.paneId }
                )
            })
        }

        // 2. Restore Drawings
        const restoredDrawings: OverlayCreate[] = []
        if (state.drawings) {
            state.drawings.forEach(overlay => {
                const id = chart.createOverlay({ ...overlay, onRemoved: onOverlayRemoved })
                if (typeof id === 'string') {
                    restoredDrawings.push({ ...overlay, id })
                }
            })
        }

        // 3. Viewport restore (future: chart.setVisibleRange)
        return restoredDrawings
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LAYOUT PERSISTENCE  (localStorage CRUD)
    // ══════════════════════════════════════════════════════════════════════════

    /** Return all saved layout IDs in creation order. */
    static listIds(): string[] {
        try {
            const raw = localStorage.getItem(INDEX_KEY)
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    }

    /** Return all saved layout entries (metadata + state). */
    static listLayouts(): LayoutEntry[] {
        return this.listIds()
            .map(id => this.getEntry(id))
            .filter((e): e is LayoutEntry => e !== null)
    }

    /**
     * Serialize the current chart and save it as a named layout.
     * @returns The generated layout ID.
     */
    static saveLayout(
        name: string,
        chart: Chart,
        symbol: SymbolInfo,
        period: Period,
        overlays: OverlayCreate[]
    ): string {
        const state = this.saveState(chart, symbol, period, overlays)
        const id = uuid()
        const now = Date.now()
        const entry: LayoutEntry = {
            id,
            name: name.trim() || `Layout ${new Date(now).toLocaleString()}`,
            symbol: symbol.ticker,
            resolution: period.text,
            timestamp: now,
            lastModified: now,
            state
        }
        this.writeEntry(entry)
        return id
    }

    /**
     * Overwrite an existing layout slot with the current chart state.
     */
    static updateLayout(
        id: string,
        chart: Chart,
        symbol: SymbolInfo,
        period: Period,
        overlays: OverlayCreate[]
    ): boolean {
        const existing = this.getEntry(id)
        if (!existing) return false
        const state = this.saveState(chart, symbol, period, overlays)
        const updated: LayoutEntry = {
            ...existing,
            symbol: symbol.ticker,
            resolution: period.text,
            lastModified: Date.now(),
            state
        }
        localStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(updated))
        return true
    }

    /**
     * Retrieve the ChartState for a given layout ID.
     */
    static loadLayout(id: string): ChartState | null {
        return this.getEntry(id)?.state ?? null
    }

    static deleteLayout(id: string): void {
        localStorage.removeItem(STORAGE_KEY_PREFIX + id)
        const ids = this.listIds().filter(i => i !== id)
        localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
    }

    static renameLayout(id: string, name: string): boolean {
        const entry = this.getEntry(id)
        if (!entry) return false
        const updated = { ...entry, name: name.trim(), lastModified: Date.now() }
        localStorage.setItem(STORAGE_KEY_PREFIX + entry.id, JSON.stringify(updated))
        return true
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private static getEntry(id: string): LayoutEntry | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_PREFIX + id)
            return raw ? JSON.parse(raw) : null
        } catch {
            return null
        }
    }

    private static writeEntry(entry: LayoutEntry): void {
        localStorage.setItem(STORAGE_KEY_PREFIX + entry.id, JSON.stringify(entry))
        const ids = this.listIds()
        if (!ids.includes(entry.id)) {
            ids.push(entry.id)
            localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
        }
    }
}
