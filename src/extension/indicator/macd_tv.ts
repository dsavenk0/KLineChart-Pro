import { Indicator, KLineData } from 'klinecharts'
import TA from '../../utils/TA'

const macd_tv: any = {
    name: 'MACD_TV',
    shortName: 'MACD',
    calcParams: [12, 26, 9],
    figures: [
        {
            key: 'histogram', title: 'Histogram: ', type: 'bar', baseValue: 0,
            styles: (data: any, indicator: any, defaultStyles: any) => {
                const current = data.current?.histogram ?? 0
                const pre = data.prev?.histogram ?? 0
                let color = '#26A69A' // Default growing positive (bright green)

                if (current > 0) {
                    color = current > pre ? '#26A69A' : '#B2DFDB' // Growing vs shrinking positive
                } else if (current < 0) {
                    color = current < pre ? '#FF5252' : '#FFCDD2' // Growing (more negative) vs shrinking (less negative) negative
                } else {
                    // If exactly 0, use a neutral color or inherit the previous state's color if needed.
                    color = '#B2DFDB'
                }

                return { color }
            }
        },
        { key: 'macd', title: 'MACD: ', type: 'line', styles: () => ({ color: '#2962FF' }) },
        { key: 'signal', title: 'Signal: ', type: 'line', styles: () => ({ color: '#FF6D00' }) }
    ],
    calc: (dataList: KLineData[], indicator: Indicator) => {
        const fast = indicator.calcParams[0] as number
        const slow = indicator.calcParams[1] as number
        const signalLen = indicator.calcParams[2] as number

        const closes = dataList.map(d => d.close)

        // TA.macd calculates:
        // dif (MACD Line) = EMA(fast) - EMA(slow)
        // dea (Signal Line) = EMA(dif, signalLen)
        // macd (Histogram) = dif - dea
        const { dif, dea, macd } = TA.macd(closes, fast, slow, signalLen)

        return dataList.map((_, i) => ({
            macd: dif[i],        // The MACD line
            signal: dea[i],      // The Signal line
            histogram: macd[i]   // The Histogram
        }))
    }
}

/**
 * Custom TradingView-style MACD (Moving Average Convergence Divergence) Indicator.
 * 
 * Accurately replicates TradingView's mathematics and visual representation.
 * Features a 4-color histogram that indicates momentum acceleration/deceleration.
 * 
 * @type {IndicatorTemplate}
 * @property {string} name - Overrides the default klinecharts 'MACD'
 * @property {string} shortName - Display name ('MACD')
 * @property {number[]} calcParams - [Fast EMA Period, Slow EMA Period, Signal EMA Period]. Default: [12, 26, 9].
 */
export default macd_tv
