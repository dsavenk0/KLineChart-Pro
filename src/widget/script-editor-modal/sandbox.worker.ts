import TA from '../../utils/TA'

/**
 * Sandbox Web Worker for Custom TradingView-style Scripts.
 * 
 * Executes user-provided Pine-Script-like JavaScript code in an isolated thread.
 * Secures the execution by shadowing global APIs (fetch, XMLHttpRequest, Worker, etc.)
 * so the script cannot make network requests or spawn sub-workers.
 * 
 * Injected Context:
 * - `TA`: The technical analysis utility library
 * - `dataList`: The current array of chart candles (KLineData[])
 * - `params`: An array of numerical parameters from the user's input
 * 
 * @param {MessageEvent} e - Contains code strings and data
 */
self.onmessage = function (e) {
    const { code, dataList, params, scriptId } = e.data

    try {
        // To prevent network requests and sub-worker creation from the script,
        // we can shadow common APIs by passing undefined to the Function constructor.
        const shadowKeys = [
            'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker',
            'SharedWorker', 'importScripts', 'self', 'caches', 'indexedDB'
        ]

        // We construct a new function. Its arguments will be the shadow keys + TA, dataList, params.
        const allArgs = [...shadowKeys, 'TA', 'dataList', 'params', `
            "use strict";
            ${code}
        `]

        const fn = new Function(...allArgs)

        // Pass undefined for all shadowed keys
        const shadowValues = shadowKeys.map(() => undefined)

        const result = fn(...shadowValues, TA, dataList, params)

        self.postMessage({ success: true, scriptId, result })

    } catch (err: any) {
        self.postMessage({ success: false, scriptId, error: err.message || err.toString() })
    }
}
