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

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
}

const measure: OverlayTemplate = {
    name: 'measure',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: (params: any) => {
        const { overlay, coordinates, yAxis } = params
        if (coordinates.length < 2 || !yAxis) return []

        const startPoint = overlay.points[0]
        const endPoint = overlay.points[1]
        const startCoord = coordinates[0]
        const endCoord = coordinates[1]

        const diff = endPoint.value - startPoint.value
        const percent = ((diff / startPoint.value) * 100).toFixed(2)
        const bars = Math.abs((endPoint.dataIndex ?? 0) - (startPoint.dataIndex ?? 0))
        const time = formatDuration(Math.abs((endPoint.timestamp ?? 0) - (startPoint.timestamp ?? 0)))

        const isUp = diff >= 0
        const color = isUp ? 'rgba(38, 166, 154, 0.2)' : 'rgba(239, 83, 80, 0.2)'
        const strokeColor = isUp ? '#26a69a' : '#ef5350'

        const rectX = Math.min(startCoord.x, endCoord.x)
        const rectY = Math.min(startCoord.y, endCoord.y)
        const rectWidth = Math.abs(startCoord.x - endCoord.x)
        const rectHeight = Math.abs(startCoord.y - endCoord.y)

        const infoLines = [
            `${isUp ? '▲' : '▼'} ${diff.toFixed(2)} (${percent}%)`,
            `${bars} bars, ${time}`
        ]

        const textX = endCoord.x
        const textY = endCoord.y + (isUp ? -40 : 20)

        const textFigures = infoLines.map((line, i) => ({
            type: 'text',
            attrs: {
                x: textX,
                y: textY + i * 16,
                text: line,
                align: 'center',
                baseline: 'middle'
            },
            styles: { color: '#fff', backgroundColor: strokeColor, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 }
        }))

        return [
            // Background
            {
                type: 'rect',
                attrs: {
                    x: rectX,
                    y: rectY,
                    width: rectWidth,
                    height: rectHeight
                },
                styles: { style: 'fill', color: color }
            },
            // Connecting line
            {
                type: 'line',
                attrs: {
                    coordinates: [startCoord, endCoord]
                },
                styles: { color: strokeColor, style: 'dash' }
            },
            ...textFigures
        ]
    }
}

export default measure
