/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Chart, Indicator, OverlayCreate, registerIndicator } from 'klinecharts'
import lodashIsEqual from 'lodash/isEqual'
import { SymbolInfo, Period } from '../types'
import SandboxWorker from '../widget/script-editor-modal/sandbox.worker?worker'
import TA from '../utils/TA'

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

export default class ChartStateManager {
    private static readonly VERSION = '1.0'

    /**
     * Save the complete state of the chart.
     */
    static saveState(chart: Chart, symbol: SymbolInfo, period: Period, overlays: OverlayCreate[]): ChartState {
        const indicators: any[] = []
        const indicatorMap = chart.getIndicatorByPaneId() as Map<string, Map<string, Indicator>>

        indicatorMap.forEach((paneIndicators, paneId) => {
            paneIndicators.forEach((indicator) => {
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

        const drawings: Array<OverlayCreate & { paneId?: string }> = []

        // The `overlays` prop contains the list of user-created drawings.
        // It's possible the user added overlays via the UI that aren't perfectly synced here.
        // So let's fall back to getting the overlay data directly via the chart if possible.
        // The safest way without undocumented APIs in klinecharts v9 is to use the IDs we do have,
        // but if klinecharts exports `getOverlayByPaneId`, we will use it!
        // In v9, it's actually `chart.getOverlay()` if no params are passed, or similar.
        // We'll iterate the passed `overlays` first.
        overlays.forEach(o => {
            if (o.id) {
                const actual = chart.getOverlayById(o.id)
                if (actual && actual.name !== 'brush' || (actual?.name === 'brush' && actual.points && actual.points.length > 0)) {
                    drawings.push({
                        id: actual.id,
                        groupId: actual.groupId,
                        paneId: actual.paneId,
                        name: actual.name,
                        points: actual.points,
                        styles: actual.styles,
                        visible: actual.visible,
                        lock: actual.lock,
                        mode: actual.mode,
                        modeSensitivity: actual.modeSensitivity,
                        zLevel: actual.zLevel,
                        extendData: actual.extendData
                    })
                }
            } else if (o.name && o.name !== 'brush') {
                drawings.push(o)
            }
        })

        return {
            version: this.VERSION,
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
     * Check if two states are effectively the same (ignoring timestamps).
     */
    static isSameState(state1: ChartState | null, state2: ChartState | null): boolean {
        if (!state1 || !state2) return state1 === state2

        // Compare meaningful data, ignore meta.timestamp and meta.lastModified
        const s1 = { ...state1, meta: { ...state1.meta, timestamp: 0, lastModified: 0 } }
        const s2 = { ...state2, meta: { ...state2.meta, timestamp: 0, lastModified: 0 } }

        return lodashIsEqual(s1, s2)
    }

    /**
     * Restore the chart state.
     * @returns The restored overlays with updated IDs
     */
    static restoreState(chart: Chart, state: ChartState, onOverlayRemoved?: (params: any) => boolean): OverlayCreate[] {
        if (!state || state.version !== this.VERSION) return []

        // 0. Clear existing state
        chart.removeOverlay()

        const indicatorMap = chart.getIndicatorByPaneId() as Map<string, Map<string, Indicator>>
        indicatorMap.forEach((paneIndicators, paneId) => {
            paneIndicators.forEach((_, name) => {
                chart.removeIndicator(paneId, name)
            })
        })

        // 1. Restore Indicators
        if (state.indicators) {
            state.indicators.forEach(indicator => {
                if (indicator.extendData?.isCustomScript) {
                    // Re-register custom script indicator
                    const code = indicator.extendData.code
                    const fn = new Function(
                        'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker',
                        'SharedWorker', 'importScripts', 'self', 'caches', 'indexedDB',
                        'TA', 'dataList', 'params', `
                        "use strict";
                        ${code}
                    `)

                    const dataList = (chart as any).getDataList?.() ?? []
                    const shadowValues = Array(9).fill(undefined)

                    try {
                        const result = fn(...shadowValues, TA, dataList, indicator.calcParams)
                        registerIndicator({
                            name: indicator.name,
                            shortName: indicator.name.replace('_custom_script_', 'Script #'), // Best effort name restore
                            calcParams: indicator.calcParams,
                            figures: (result && result.length > 0 ? Object.keys(result[0] || {}).filter(k => k !== 'timestamp') : ['value']).map((key, i) => {
                                const SERIES_COLORS = ['#2962FF', '#FF6D00', '#00BCD4', '#E91E63', '#76FF03', '#FFD600']
                                return {
                                    key,
                                    title: `${key}: `,
                                    type: 'line',
                                    styles: () => ({ color: SERIES_COLORS[i % SERIES_COLORS.length] })
                                }
                            }) as any,
                            calc: () => result,
                            extendData: indicator.extendData
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
                const id = chart.createOverlay({
                    ...overlay,
                    onRemoved: onOverlayRemoved
                })
                if (typeof id === 'string') {
                    restoredDrawings.push({ ...overlay, id })
                }
            })
        }

        // 3. Restore Viewport (if possible)
        return restoredDrawings
    }
}
