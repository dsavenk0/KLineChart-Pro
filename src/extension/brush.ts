import { OverlayTemplate, registerFigure, Coordinate, Point } from 'klinecharts'

/**
 * Optimized Euclidean distance utility.
 */
function getSqSegDist(p: Coordinate, p1: Coordinate, p2: Coordinate) {
    let x = p1.x
    let y = p1.y
    let dx = p2.x - x
    let dy = p2.y - y

    if (dx !== 0 || dy !== 0) {
        const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy)
        if (t > 1) {
            x = p2.x
            y = p2.y
        } else if (t > 0) {
            x += dx * t
            y += dy * t
        }
    }

    dx = p.x - x
    dy = p.y - y
    return dx * dx + dy * dy
}

/**
 * Douglas-Peucker simplification mask generator.
 * Uses a mask to preserve high-precision data points while reducing rendering overhead.
 */
function rdpMask(points: Coordinate[], epsilon: number): Uint8Array {
    const len = points.length
    const markers = new Uint8Array(len)
    if (len <= 2) {
        markers.fill(1)
        return markers
    }

    const sqEpsilon = epsilon * epsilon
    markers[0] = markers[len - 1] = 1

    const stack = [[0, len - 1]]
    while (stack.length > 0) {
        const [first, last] = stack.pop()!
        let maxSqDist = 0
        let index = 0

        for (let i = first + 1; i < last; i++) {
            const sqDist = getSqSegDist(points[i], points[first], points[last])
            if (sqDist > maxSqDist) {
                maxSqDist = sqDist
                index = i
            }
        }

        if (maxSqDist > sqEpsilon) {
            markers[index] = 1
            stack.push([first, index])
            stack.push([index, last])
        }
    }
    return markers
}

// Register a custom figure for the smooth brush path
registerFigure({
    name: 'brush_path',
    draw: (ctx, attrs, styles) => {
        const { coordinates } = attrs
        if (coordinates.length < 2) return

        ctx.save()
        ctx.setLineDash([])
        ctx.strokeStyle = styles.color || '#1677ff'
        ctx.lineWidth = styles.size || 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(coordinates[0].x, coordinates[0].y)

        if (coordinates.length === 2) {
            ctx.lineTo(coordinates[1].x, coordinates[1].y)
        } else {
            // Quadratic Bezier smoothing for premium look
            for (let i = 1; i < coordinates.length - 2; i++) {
                const xc = (coordinates[i].x + coordinates[i + 1].x) / 2
                const yc = (coordinates[i].y + coordinates[i + 1].y) / 2
                ctx.quadraticCurveTo(coordinates[i].x, coordinates[i].y, xc, yc)
            }
            const last = coordinates.length - 2
            ctx.quadraticCurveTo(
                coordinates[last].x,
                coordinates[last].y,
                coordinates[last + 1].x,
                coordinates[last + 1].y
            )
        }

        ctx.stroke()
        ctx.restore()
    },
    checkEventOn: (coordinate, attrs, styles) => {
        const { coordinates } = attrs
        if (!coordinates || coordinates.length < 2) return false

        const radius = (styles?.size ?? 2) / 2 + 4
        const sqRadius = radius * radius

        for (let i = 0; i < coordinates.length - 1; i++) {
            const sqDist = getSqSegDist(coordinate, coordinates[i], coordinates[i + 1])
            if (sqDist <= sqRadius) return true
        }
        return false
    }
})

interface BrushDataPoint {
    timestamp: number
    value: number
}

interface BrushData {
    // Persistent stable points (timestamp/price anchor)
    points: BrushDataPoint[]
    isDirty: boolean
}

const brush: OverlayTemplate = {
    name: 'brush',
    totalStep: 3,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,

    // ─── State: Drawing ─────────────────────────────────────────────────────────
    onDrawing: (params) => {
        const { overlay, x, y } = params
        if (x === undefined || y === undefined || overlay.currentStep !== 2) return true

        const chart = (window as any).chartWidget
        if (!chart) return true

        if (!overlay.extendData) {
            overlay.extendData = { points: [], isDirty: false } as BrushData
        }

        const data = overlay.extendData as BrushData
        const lastDataPoint = data.points[data.points.length - 1]

        // Jitter suppression (distance check in pixel space)
        if (lastDataPoint) {
            const lastPx = chart.convertToPixel({ timestamp: lastDataPoint.timestamp, value: lastDataPoint.value }, { paneId: overlay.paneId }) as Coordinate
            const dx = x - lastPx.x
            const dy = y - lastPx.y
            if (dx * dx + dy * dy < 4) return true
        }

        // Capture STABLE Point data (contains Unix timestamp)
        const point = chart.convertFromPixel({ x, y }, { paneId: overlay.paneId }) as Point
        if (point.timestamp !== undefined) {
            data.points.push({
                timestamp: point.timestamp,
                value: point.value!
            })
        }
        return true
    },

    onDrawEnd: (params) => {
        const { overlay } = params
        const data = overlay.extendData as BrushData | undefined
        if (data) data.isDirty = true
        return true
    },

    // ─── Render ─────────────────────────────────────────────────────────────────
    createPointFigures: ({ overlay, xAxis, yAxis, defaultStyles }) => {
        const data = overlay.extendData as BrushData | undefined
        if (!data || !xAxis || !yAxis) return []

        let { points } = data

        const chart = (window as any).chartWidget
        if (!chart) return []

        // --- 1. Post-drawing Simplification (runs once) ---
        if (data.isDirty && points.length > 2) {
            const pixelPoints: Coordinate[] = points.map(p => {
                const px = chart.convertToPixel({ timestamp: p.timestamp, value: p.value }, { paneId: overlay.paneId })
                return { x: px.x!, y: px.y! }
            })

            const markers = rdpMask(pixelPoints, 1.0)
            const simplified: BrushDataPoint[] = []
            for (let i = 0; i < points.length; i++) {
                if (markers[i]) simplified.push(points[i])
            }
            data.points = simplified
            points = data.points
            data.isDirty = false
        }

        if (points.length < 2) return []

        // --- 2. Render: Map stable data-space back to current screen pixels ---
        const coordinates: Coordinate[] = []
        for (const p of points) {
            // HIGH PRECISION MAPPING: SMC MODE
            // Using the global chart converter ensures that even fractional 
            // timestamps (between candles) are mapped with perfect zoom scaling.
            const px = chart.convertToPixel({ timestamp: p.timestamp, value: p.value }, { paneId: overlay.paneId }) as Coordinate
            if (px.x !== undefined && px.y !== undefined) {
                coordinates.push({
                    x: Math.round(px.x),
                    y: Math.round(px.y)
                })
            }
        }

        if (coordinates.length < 2) return []

        return [
            {
                type: 'brush_path',
                attrs: { coordinates },
                styles: {
                    color: overlay.styles?.line?.color ?? defaultStyles?.line?.color ?? '#1677ff',
                    size: overlay.styles?.line?.size ?? defaultStyles?.line?.size ?? 2
                }
            }
        ]
    }
}

export default brush
