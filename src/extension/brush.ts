import { OverlayTemplate, registerFigure, Coordinate, Axis } from 'klinecharts'

// Optimized RDP using squared distances for better performance
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

// Iterative RDP to avoid stack overflow on very long paths
function rdp(points: Coordinate[], epsilon: number) {
    const len = points.length
    if (len <= 2) return points

    const sqEpsilon = epsilon * epsilon
    const markers = new Uint8Array(len)
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

    const result: Coordinate[] = []
    for (let i = 0; i < len; i++) {
        if (markers[i]) result.push(points[i])
    }
    return result
}

// Register a custom figure for the smooth brush path
registerFigure({
    name: 'brush_path',
    draw: (ctx, attrs, styles) => {
        const { coordinates } = attrs
        if (coordinates.length < 2) return

        ctx.save()
        // KLineChart handles canvas scaling, but we ensure the line rendering remains crisp.
        // Reset line dash to prevent bleeding from other figures.
        ctx.setLineDash([])
        ctx.strokeStyle = styles.color || '#f00'
        ctx.lineWidth = styles.size || 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(coordinates[0].x, coordinates[0].y)

        if (coordinates.length === 2) {
            ctx.lineTo(coordinates[1].x, coordinates[1].y)
        } else {
            // Quadratic Bezier smoothing with midpoints for better visual quality
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
    // Raw pixel buffer collected during drawing — drained in createPointFigures
    pixels: Array<{ x: number; y: number }>
    // Persistent data-space points (zoom/pan safe)
    points: BrushDataPoint[]
    isDirty: boolean
    paneId?: string
}

const brush: OverlayTemplate = {
    name: 'brush',
    totalStep: 3,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,

    // ─── State: Drawing ─────────────────────────────────────────────────────────
    // NOTE: xAxis/yAxis are NOT available inside onDrawing (OverlayEvent type).
    // So we buffer raw pixel coords here and convert them to {timestamp, value}
    // immediately in createPointFigures, which does have axis access.
    onDrawing: (params) => {
        const { overlay, x, y } = params
        const paneId = (params as any).paneId
        if (x === undefined || y === undefined) return true
        if (overlay.currentStep !== 2) return true

        if (!overlay.extendData) {
            overlay.extendData = {
                pixels: [],
                points: [],
                isDirty: false,
                paneId
            } as BrushData
        }

        const data = overlay.extendData as BrushData
        if (data.paneId && data.paneId !== paneId) {
            return true
        }

        const lastPixel = data.pixels[data.pixels.length - 1]

        // 2px threshold to suppress jitter while keeping fidelity
        if (lastPixel) {
            const dx = x - lastPixel.x
            const dy = y - lastPixel.y
            if (dx * dx + dy * dy < 4) return true
        }

        data.pixels.push({ x, y })
        return true
    },

    // ─── State: Finished ────────────────────────────────────────────────────────
    // Mark as dirty so RDP simplification runs once on the next render pass.
    onDrawEnd: (params) => {
        const { overlay } = params
        const data = overlay.extendData as BrushData | undefined
        if (data) {
            data.isDirty = true
        }
        return true
    },

    // ─── Render ─────────────────────────────────────────────────────────────────
    // Convert data-space points back to pixels for rendering.
    // On the first render after drawing ends, run RDP to simplify the path.
    createPointFigures: ({ overlay, xAxis, yAxis, defaultStyles }) => {
        const data = overlay.extendData as BrushData | undefined
        if (!data || !xAxis || !yAxis) return []

        // ── Drain pixel buffer → data-space (happens every render during drawing) ──
        if (data.pixels.length > 0) {
            for (const p of data.pixels) {
                data.points.push({
                    timestamp: xAxis.convertFromPixel(p.x),
                    value: yAxis.convertFromPixel(p.y)
                })
            }
            data.pixels = []
        }

        let { points } = data

        // ── Post-drawing RDP simplification (runs once after draw ends) ──
        if (data.isDirty && points.length > 2) {
            // Convert to pixel space for metric-consistent simplification
            const pixelPoints = points.map(p => ({
                x: xAxis.convertToPixel(p.timestamp),
                y: yAxis.convertToPixel(p.value)
            }))

            const simplified = rdp(pixelPoints, 1.5)

            data.points = simplified.map(p => ({
                timestamp: xAxis.convertFromPixel(p.x),
                value: yAxis.convertFromPixel(p.y)
            }))
            points = data.points
            data.isDirty = false
        }

        if (points.length < 2) return []

        // Map data-space back to pixel coordinates for the current viewport
        const coordinates = points.map(p => ({
            x: xAxis.convertToPixel(p.timestamp),
            y: yAxis.convertToPixel(p.value)
        }))

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
