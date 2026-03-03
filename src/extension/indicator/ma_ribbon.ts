import { Indicator, KLineData } from 'klinecharts'
import TA from '../../utils/TA'

// A beautiful gradient palette for the MA Ribbon (from blue -> cyan -> green -> yellow -> red -> purple)
const colors = [
    '#001CFF', '#0055FF', '#008CFF', '#00C4FF', '#00FFED',
    '#00FF8E', '#2EFF00', '#B7FF00', '#FFE100', '#FF9100',
    '#FF4400', '#FF0000', '#C4003E', '#8A007B', '#4E00B8'
];

const ma_ribbon: any = {
    name: 'MA_Ribbon',
    shortName: 'Ribbon',
    series: 'price',
    calcParams: [10, 20, 30, 40], // Default periods
    // Pre-declare up to 15 figures to support dynamic arrays of calcParams.
    // If fewer params are used, the extra lines will just silently not render.
    figures: Array.from({ length: 15 }).map((_, i) => ({
        key: `ma${i}`,
        title: `MA${i + 1}: `,
        type: 'line',
        styles: () => ({ color: colors[i] })
    })),
    calc: (dataList: KLineData[], indicator: Indicator) => {
        const params = indicator.calcParams as number[];
        const closes = dataList.map(d => d.close);

        // Bound calculation to max predefined colors to prevent overflow
        const count = Math.min(params.length, colors.length);

        // Pre-calculate all EMA arrays
        const emas: ((number | null)[])[] = [];
        for (let i = 0; i < count; i++) {
            emas.push(TA.ema(closes, params[i]));
        }

        // Zip the vertical items into dicts per Kline bar
        return dataList.map((_, i) => {
            const barData: any = {};
            for (let j = 0; j < count; j++) {
                barData[`ma${j}`] = emas[j][i];
            }
            return barData;
        });
    }
}

/**
 * Custom TradingView-style MA Ribbon Indicator for klinecharts.
 * 
 * Displays multiple Exponential Moving Averages (EMA) with gradually changing periods.
 * Uses a 15-color gradient palette ranging from blue, cyan, green, yellow, red, to purple.
 * 
 * @type {IndicatorTemplate}
 * @property {string} name - Internal unique identifier ('MA_Ribbon')
 * @property {string} shortName - Display name on the chart ('Ribbon')
 * @property {string} series - 'price', meaning it overlays on the main candlestick chart
 * @property {number[]} calcParams - Array of EMA periods. Default is [10, 20, 30, 40]. Supports up to 15 periods.
 */
export default ma_ribbon
