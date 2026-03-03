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

import { OverlayTemplate } from 'klinecharts'

const fibRetracement: OverlayTemplate = {
    name: 'fibRetracement',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, bounding }) => {
        if (coordinates.length > 1) {
            const lines: any[] = []
            const texts: any[] = []
            const x1 = coordinates[0].x
            const x2 = bounding.width
            const y1 = coordinates[0].y
            const y2 = coordinates[1].y
            const diff = y2 - y1
            const levels = [
                { level: 0, text: '0(0.00%)' },
                { level: 0.236, text: '0.236(23.6%)' },
                { level: 0.382, text: '0.382(38.2%)' },
                { level: 0.5, text: '0.5(50.0%)' },
                { level: 0.618, text: '0.618(61.8%)' },
                { level: 0.786, text: '0.786(78.6%)' },
                { level: 1, text: '1(100.0%)' }
            ]
            levels.forEach(level => {
                const y = y1 + diff * level.level
                lines.push({ coordinates: [{ x: x1, y }, { x: x2, y }] })
                texts.push({
                    x: x1,
                    y,
                    text: level.text,
                    align: 'left',
                    baseline: 'bottom'
                })
            })
            return [
                {
                    type: 'line',
                    attrs: lines
                },
                {
                    type: 'text',
                    attrs: texts
                }
            ]
        }
        return []
    }
}

export default fibRetracement
