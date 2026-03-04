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

const vwap: IndicatorTemplate = {
    name: 'VWAP',
    shortName: 'VWAP',
    calcParams: [],
    figures: [
        { key: 'vwap', title: 'VWAP: ', type: 'line' }
    ],
    calc: (dataList: KLineData[]) => {
        let cumulativeVolume = 0
        let cumulativePriceVolume = 0
        let lastDate = ''
        return dataList.map((kLineData: KLineData) => {
            const date = new Date(kLineData.timestamp).toLocaleDateString()
            if (date !== lastDate) {
                cumulativeVolume = 0
                cumulativePriceVolume = 0
                lastDate = date
            }
            const price = (kLineData.high + kLineData.low + kLineData.close) / 3
            cumulativeVolume += (kLineData.volume ?? 0)
            cumulativePriceVolume += price * (kLineData.volume ?? 0)
            return {
                vwap: cumulativePriceVolume / (cumulativeVolume || 1)
            }
        })
    }
}

export default vwap
