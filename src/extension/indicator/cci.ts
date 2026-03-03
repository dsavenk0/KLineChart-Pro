import { Indicator, KLineData } from 'klinecharts'
import TA from '../../utils/TA'

const cci: any = {
    name: 'CCI',
    shortName: 'CCI',
    calcParams: [20],
    figures: [
        { key: 'cci', title: 'CCI: ', type: 'line' }
    ],
    calc: (dataList: KLineData[], indicator: Indicator) => {
        const period = indicator.calcParams[0] as number
        const highs = dataList.map(d => d.high)
        const lows = dataList.map(d => d.low)
        const closes = dataList.map(d => d.close)
        const cciValues = TA.cci(highs, lows, closes, period)
        return cciValues.map(v => ({ cci: v }))
    }
}

export default cci
