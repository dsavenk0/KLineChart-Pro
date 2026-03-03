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

import { Indicator, KLineData } from 'klinecharts'

const ichimoku: any = {
    name: 'Ichimoku',
    shortName: 'Ichimoku',
    calcParams: [9, 26, 52, 26],
    figures: [
        { key: 'tenkan', title: 'Tenkan: ', type: 'line' },
        { key: 'kijun', title: 'Kijun: ', type: 'line' },
        { key: 'chikou', title: 'Chikou: ', type: 'line' },
        { key: 'spanA', title: 'Span A: ', type: 'line' },
        { key: 'spanB', title: 'Span B: ', type: 'line' }
    ],
    calc: (dataList: KLineData[], indicator: Indicator) => {
        const params = indicator.calcParams as number[]
        const tenkanPeriod = params[0]
        const kijunPeriod = params[1]
        const spanBPeriod = params[2]
        const offset = params[3]

        const result: any[] = []

        const highLowAvg = (data: KLineData[], start: number, end: number) => {
            let high = -Infinity
            let low = Infinity
            for (let i = start; i <= end; i++) {
                high = Math.max(high, data[i].high)
                low = Math.min(low, data[i].low)
            }
            return (high + low) / 2
        }

        dataList.forEach((kLineData: KLineData, index: number) => {
            const item: any = {
                tenkan: null,
                kijun: null,
                chikou: null,
                spanA: null,
                spanB: null
            }

            // Tenkan-sen
            if (index >= tenkanPeriod - 1) {
                item.tenkan = highLowAvg(dataList, index - tenkanPeriod + 1, index)
            }

            // Kijun-sen
            if (index >= kijunPeriod - 1) {
                item.kijun = highLowAvg(dataList, index - kijunPeriod + 1, index)
            }

            // Chikou Span (Lagging Span)
            // It is projected backward by 'offset' periods. 
            // In KLineChart, to show it at current candle representing 'offset' candles ago:
            if (index + offset < dataList.length) {
                item.chikou = dataList[index + offset].close
            }

            // Senkou Spans are projected forward. 
            // We calculate them for the current index and return them.
            // The chart will automatically handle the visual offset if we return them at index + offset?
            // No, we should return the values at the index they should appear.
            // KLineChart's indicator 'calc' returns an array of the same length as dataList.
            // For forward projection, we calculate the values for 'index - offset'.

            const prevIndex = index - offset
            if (prevIndex >= 0) {
                const prevTenkan = prevIndex >= tenkanPeriod - 1 ? highLowAvg(dataList, prevIndex - tenkanPeriod + 1, prevIndex) : null
                const prevKijun = prevIndex >= kijunPeriod - 1 ? highLowAvg(dataList, prevIndex - kijunPeriod + 1, prevIndex) : null

                if (prevTenkan !== null && prevKijun !== null) {
                    item.spanA = (prevTenkan + prevKijun) / 2
                }

                if (prevIndex >= spanBPeriod - 1) {
                    item.spanB = highLowAvg(dataList, prevIndex - spanBPeriod + 1, prevIndex)
                }
            }

            result.push(item)
        })

        return result
    }
}

export default ichimoku
