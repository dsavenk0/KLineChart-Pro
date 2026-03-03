import { KLineChartPro, DefaultDatafeed } from '../src'

const chart = new KLineChartPro({
    container: 'chart-container',
    symbol: {
        exchange: 'NASDAQ',
        market: 'stocks',
        name: 'AAPL',
        shortName: 'AAPL',
        ticker: 'AAPL',
        pricePrecision: 2,
        volumePrecision: 0,
        priceCurrency: 'USD',
        type: 'stock'
    },
    period: { multiplier: 1, timespan: 'minute', text: '1m' },
    theme: 'dark',
    locale: 'en-US',
    datafeed: new DefaultDatafeed(import.meta.env.VITE_MASSIVE_API_KEY)
})

document.getElementById('save-btn')?.addEventListener('click', () => {
    const state = chart.saveState()
    localStorage.setItem('klinecharts_pro_debug_state', JSON.stringify(state))
    console.log('State saved:', state)
    alert('State saved to localStorage and console!')
})

document.getElementById('load-btn')?.addEventListener('click', () => {
    const stateStr = localStorage.getItem('klinecharts_pro_debug_state')
    if (stateStr) {
        const state = JSON.parse(stateStr)
        chart.loadState(state)
        console.log('State loaded:', state)
    } else {
        alert('No state found in localStorage!')
    }
})

let theme = 'dark'
document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
    theme = (e.target as HTMLInputElement).checked ? 'light' : 'dark'
    chart.setTheme(theme)
    document.body.style.backgroundColor = theme === 'dark' ? '#151517' : '#ffffff'
})
