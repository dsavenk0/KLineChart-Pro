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

import { IndicatorTemplate, KLineData } from 'klinecharts'

const pivotPoints: IndicatorTemplate = {
    name: 'PivotPoints',
    shortName: 'Pivot',
    calcParams: [],
    figures: [
        { key: 'p', title: 'P: ', type: 'line' },
        { key: 'r1', title: 'R1: ', type: 'line' },
        { key: 's1', title: 'S1: ', type: 'line' },
        { key: 'r2', title: 'R2: ', type: 'line' },
        { key: 's2', title: 'S2: ', type: 'line' }
    ],
    calc: (dataList: KLineData[]) => {
        let lastP: number | null = null, lastR1: number | null = null, lastS1: number | null = null, lastR2: number | null = null, lastS2: number | null = null
        let lastDate = ''
        let dayHigh = -Infinity, dayLow = Infinity, dayClose = 0

        return dataList.map((kLineData: KLineData, index: number) => {
            const date = new Date(kLineData.timestamp).toLocaleDateString()
            if (date !== lastDate) {
                if (lastDate !== '') {
                    lastP = (dayHigh + dayLow + dayClose) / 3
                    lastR1 = 2 * lastP - dayLow
                    lastS1 = 2 * lastP - dayHigh
                    lastR2 = lastP + (dayHigh - dayLow)
                    lastS2 = lastP - (dayHigh - dayLow)
                }
                dayHigh = kLineData.high
                dayLow = kLineData.low
                dayClose = kLineData.close
                lastDate = date
            } else {
                dayHigh = Math.max(dayHigh, kLineData.high)
                dayLow = Math.min(dayLow, kLineData.low)
                dayClose = kLineData.close
            }

            return {
                p: lastP,
                r1: lastR1,
                s1: lastS1,
                r2: lastR2,
                s2: lastS2
            }
        })
    }
}

export default pivotPoints
