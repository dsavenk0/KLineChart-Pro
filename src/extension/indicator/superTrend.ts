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

const superTrend: any = {
    name: 'SuperTrend',
    shortName: 'SuperTrend',
    calcParams: [10, 3],
    figures: [
        { key: 'up', title: 'Up: ', type: 'line' },
        { key: 'down', title: 'Down: ', type: 'line' }
    ],
    calc: (dataList: KLineData[], indicator: Indicator) => {
        const period = indicator.calcParams[0] as number
        const factor = indicator.calcParams[1] as number

        const highs = dataList.map(d => d.high)
        const lows = dataList.map(d => d.low)
        const closes = dataList.map(d => d.close)
        const atr = TA.atr(highs, lows, closes, period)

        let trend = 1 // 1 for up, -1 for down
        let up = 0
        let down = 0

        return dataList.map((kLineData: KLineData, index: number) => {
            const currentAtr = atr[index]
            if (currentAtr === null) return { up: null, down: null }

            const mid = (kLineData.high + kLineData.low) / 2
            const basicUpper = mid + factor * currentAtr
            const basicLower = mid - factor * currentAtr

            if (index === 0 || atr[index - 1] === null) {
                up = basicUpper
                down = basicLower
            } else {
                const prevUp = up
                const prevDown = down
                const prevCloseItem = dataList[index - 1].close

                up = basicUpper < prevUp || prevCloseItem > prevUp ? basicUpper : prevUp
                down = basicLower > prevDown || prevCloseItem < prevDown ? basicLower : prevDown
            }

            if (trend === 1 && kLineData.close < down) {
                trend = -1
            } else if (trend === -1 && kLineData.close > up) {
                trend = 1
            }

            return {
                up: trend === 1 ? down : null,
                down: trend === -1 ? up : null
            }
        })
    }
}

export default superTrend
