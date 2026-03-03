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

const gannFan: OverlayTemplate = {
    name: 'gannFan',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, bounding }) => {
        if (coordinates.length > 0) {
            const p1 = coordinates[0]
            const p2 = coordinates[1] || p1
            const lines: any[] = []

            // Gann Fan angles: 1x8, 1x4, 1x3, 1x2, 1x1, 2x1, 3x1, 4x1, 8x1
            // Slopes relative to the 1x1 line formed by p1 and p2
            const dx = p2.x - p1.x
            const dy = p2.y - p1.y

            const ratios = [8, 4, 3, 2, 1, 0.5, 0.333, 0.25, 0.125]

            ratios.forEach(ratio => {
                const targetX = bounding.width
                const targetY = p1.y + dy * (ratio * (targetX - p1.x) / (dx || 1))
                lines.push({ coordinates: [p1, { x: targetX, y: targetY }] })
            })

            return [
                {
                    type: 'line',
                    attrs: lines
                }
            ]
        }
        return []
    }
}

export default gannFan
