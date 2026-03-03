import { Indicator, IndicatorTemplate, KLineData } from 'klinecharts'
import TA from '../../utils/TA'

/**
 * Custom TradingView-style RSI (Relative Strength Index) Indicator for klinecharts.
 * 
 * Features:
 * - Uses RMA (Wilder's Smoothing) for gains/losses calculation to strictly match TradingView math.
 * - Includes an SMA line based on the RSI value.
 * - Custom canvas rendering (via draw callback) for the 70/50/30 dashed levels.
 * - Custom gradient fills (red above 70, green below 30) identical to TV's visual style.
 * 
 * @type {IndicatorTemplate}
 * @property {string} name - Internal unique identifier ('RSI_TV')
 * @property {string} shortName - Display name on the chart ('RSI')
 * @property {number[]} calcParams - [RSI Period, RSI MA Period]. Default is [14, 14].
 */
const rsi_tv: IndicatorTemplate = {
    name: 'RSI_TV',
    shortName: 'RSI',
    calcParams: [14, 14],
    // Only 2 real data figures — the level lines are drawn manually in draw()
    figures: [
        {
            key: 'rsi',
            title: 'RSI: ',
            type: 'line',
            styles: () => ({ color: '#7E57C2', size: 1.5 })
        },
        {
            key: 'rsi_ma',
            title: 'MA: ',
            type: 'line',
            styles: () => ({ color: '#FFEE58', size: 1.2 })
        }
    ],

    calc: (dataList: KLineData[], indicator: Indicator) => {
        const rsiPeriod = indicator.calcParams[0] as number
        const maPeriod = indicator.calcParams[1] as number
        const closes = dataList.map(d => d.close)

        /**
         * TradingView uses Wilder's RMA (Rolling Moving Average) for RSI.
         * Formula: RMA[i] = (RMA[i-1] * (length - 1) + value[i]) / length
         * TA.rsi() internally calls TA.rma() — exact match to Pine Script's rsi().
         */
        const rsiValues = TA.rsi(closes, rsiPeriod)

        /**
         * SMA of RSI values for the signal/MA line.
         * Replace nulls with 0 for SMA seed only; the final value is masked back.
         */
        const nonNullRsi = rsiValues.map(v => v ?? 0)
        const maValues = TA.sma(nonNullRsi, maPeriod)

        return dataList.map((_, i) => {
            const rsi = rsiValues[i]
            const rsi_ma = (rsi !== null && maValues[i] !== null) ? maValues[i] : null
            return { rsi, rsi_ma }
        })
    },

    /**
     * Custom draw — TradingView-style RSI fill.
     * Fills the area between the RSI line and level 70 (red) when RSI > 70,
     * and between RSI line and level 30 (green/teal) when RSI < 30.
     * Also draws dashed level lines at 70, 50, 30.
     */
    draw: ({ ctx, indicator, visibleRange, bounding, barSpace, yAxis }: any): boolean => {
        const { from, to } = visibleRange
        const resultData = indicator.result as Array<{ rsi: number | null } | null>

        const y70 = yAxis.convertToPixel(70)
        const y50 = yAxis.convertToPixel(50)
        const y30 = yAxis.convertToPixel(30)

        const left = bounding.left
        const right = bounding.left + bounding.width

        // ── X position for bar at index i ─────────────────────────────────────
        // Rightmost visible bar is at right - halfBar; going left by barSpace.bar per step
        const getX = (i: number): number =>
            right - barSpace.halfBar - (to - 1 - i) * barSpace.bar

        ctx.save()

        // ── Fill zone between RSI line and a threshold ────────────────────────
        const fillZone = (
            yThreshold: number,
            above: boolean,       // true = fill when RSI > threshold
            fillColor: string,    // solid fill color for polygon
            gradFrom: string,     // gradient start color (at threshold)
            gradTo: string        // gradient end color (away from threshold)
        ) => {
            const compare = above
                ? (v: number) => v > (above ? 70 : 30)
                : (v: number) => v < 30

            let i = from
            while (i < to) {
                // Find start of a segment where RSI is in the zone
                while (i < to) {
                    const d = resultData[i]
                    const v = d?.rsi
                    if (v !== null && v !== undefined && compare(v)) break
                    i++
                }
                if (i >= to) break

                // Collect consecutive points in this zone
                const pts: { x: number; y: number }[] = []
                while (i < to) {
                    const d = resultData[i]
                    const v = d?.rsi
                    if (v === null || v === undefined || !compare(v)) break
                    pts.push({ x: getX(i), y: yAxis.convertToPixel(v) })
                    i++
                }
                if (pts.length === 0) continue

                // Build polygon: start at threshold → RSI line → back to threshold
                ctx.beginPath()
                ctx.moveTo(pts[0].x, yThreshold)
                for (const p of pts) ctx.lineTo(p.x, p.y)
                ctx.lineTo(pts[pts.length - 1].x, yThreshold)
                ctx.closePath()

                // Gradient from threshold outward
                const gradY1 = yThreshold
                const gradY2 = above ? Math.min(...pts.map(p => p.y)) - 5 : Math.max(...pts.map(p => p.y)) + 5
                const grad = ctx.createLinearGradient(0, gradY1, 0, gradY2)
                grad.addColorStop(0, gradFrom)
                grad.addColorStop(1, gradTo)

                ctx.globalAlpha = 1
                ctx.fillStyle = grad
                ctx.fill()
            }
        }

        // Overbought: RSI > 70 → fill between RSI line and y70, red gradient
        fillZone(y70, true, '#EF5350', 'rgba(239,83,80,0.0)', 'rgba(239,83,80,0.35)')
        // Oversold:   RSI < 30 → fill between RSI line and y30, teal gradient
        fillZone(y30, false, '#26A69A', 'rgba(38,166,154,0.0)', 'rgba(38,166,154,0.35)')

        // ── Dashed level lines ────────────────────────────────────────────────
        const drawDash = (y: number, color: string, alpha: number) => {
            ctx.beginPath()
            ctx.globalAlpha = alpha
            ctx.setLineDash([5, 4])
            ctx.strokeStyle = color
            ctx.lineWidth = 1
            ctx.moveTo(left, y)
            ctx.lineTo(right, y)
            ctx.stroke()
        }

        ctx.globalAlpha = 1
        drawDash(y70, '#EF5350', 0.7)
        drawDash(y30, '#26A69A', 0.7)
        drawDash(y50, '#aaaaaa', 0.3)

        ctx.restore()
        return false   // let klinecharts draw RSI/MA lines on top
    }
}

export default rsi_tv
