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
import TA from '../../utils/TA'

const hma: any = {
    name: 'HMA',
    shortName: 'HMA',
    calcParams: [9],
    figures: [
        { key: 'hma', title: 'HMA: ', type: 'line' }
    ],
    calc: (dataList: KLineData[], indicator: Indicator) => {
        const period = indicator.calcParams[0] as number
        const halfPeriod = Math.floor(period / 2)
        const sqrtPeriod = Math.floor(Math.sqrt(period))

        const closes = dataList.map(d => d.close)
        const wma1 = TA.wma(closes, halfPeriod)
        const wma2 = TA.wma(closes, period)

        const diff = wma1.map((v, i) => {
            if (v !== null && wma2[i] !== null) {
                return 2 * v - (wma2[i] as number)
            }
            return null
        })

        const diffValues = diff.filter(v => v !== null) as number[]
        const finalHma = TA.wma(diffValues, sqrtPeriod)

        let finalIndex = 0
        return diff.map((v) => {
            if (v === null) return { hma: null }
            const res = finalHma[finalIndex++]
            return { hma: res }
        })
    }
}

export default hma
