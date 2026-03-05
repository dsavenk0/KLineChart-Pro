/**
 * ScriptEditorModal
 * TradingView Pine Script–style editor for custom JS indicators.
 *
 * Contract for user scripts:
 *   Input:  `TA`        – technical-analysis utility object
 *           `dataList`  – KLineData[] (open, high, low, close, volume, timestamp)
 *           `params`    – number[] from the "Parameters" input row
 *   Output: return an array of plain objects, one per candle.
 *           Each key becomes a named series on the chart.
 *
 * Example:
 *   const closes = dataList.map(d => d.close)
 *   const rsi = TA.rsi(closes, params[0])
 *   return rsi.map(v => ({ rsi: v }))
 */

import { Component, createSignal, Show } from 'solid-js'
import { Chart, registerIndicator } from 'klinecharts'
import TA from '../../utils/TA'

// ─── Default template shown on first open ───────────────────────────────────
const DEFAULT_SCRIPT = `// Custom Indicator - Pine Script Style
// Available: TA, dataList, params

const period = params[0] ?? 14
const closes = dataList.map(d => d.close)
const highs   = dataList.map(d => d.high)
const lows    = dataList.map(d => d.low)

// ── Example: RSI + Bollinger Bands ──────────────────────────────────
const rsi  = TA.rsi(closes, period)
const boll = TA.bollinger(closes, period, 2)

// Return one object per candle – each key = one line on chart
return rsi.map((v, i) => ({
  rsi:   v,
  upper: boll.upper[i],
  mid:   boll.mid[i],
  lower: boll.lower[i],
}))`

// ─── Series colors pool ──────────────────────────────────────────────────────
const SERIES_COLORS = ['#2962FF', '#FF6D00', '#00BCD4', '#E91E63', '#76FF03', '#FFD600']

// Counter to give each custom script a unique indicator name
let scriptCounter = 0

export interface ScriptEditorModalProps {
    locale: string
    getChart: () => Chart | null
    onClose: () => void
}

const ScriptEditorModal: Component<ScriptEditorModalProps> = props => {

    const [code, setCode] = createSignal(DEFAULT_SCRIPT)
    const [scriptName, setScriptName] = createSignal('') // New script name state
    const [params, setParams] = createSignal('14')
    const [placement, setPlacement] = createSignal<'main' | 'sub'>('sub') // Placement selection
    const [error, setError] = createSignal('')
    const [status, setStatus] = createSignal('')
    const [running, setRunning] = createSignal(false)
    const [activeId, setActiveId] = createSignal<string | null>(null) // pane ID for current script
    const [activeIndicatorName, setActiveIndicatorName] = createSignal<string | null>(null) // name of current script indicator

    // ── Run the script ───────────────────────────────────────────────────────
    const runScript = () => {
        const chart = props.getChart()
        if (!chart) { setError('Chart not initialized'); return }

        setError('')
        setStatus('Running in sandbox...')
        setRunning(true)

        try {
            // Parse params from comma-separated string
            const parsedParams = params()
                .split(',')
                .map(s => parseFloat(s.trim()))
                .filter(n => !isNaN(n))

            const liveData = (chart as any).getDataList?.() ?? []

            // Execute script inline using new Function() with sandboxed globals
            // (same technique used in ChartLayoutManager.restoreState)
            const shadowKeys = [
                'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker',
                'SharedWorker', 'importScripts', 'self', 'caches', 'indexedDB'
            ]
            const fn = new Function(
                ...shadowKeys,
                'TA', 'dataList', 'params',
                `"use strict";\n${code()}`
            )
            const shadowValues = shadowKeys.map(() => undefined)
            const sampleResult = fn(...shadowValues, TA, liveData, parsedParams)

            if (!Array.isArray(sampleResult)) {
                throw new Error('Script must return an Array.')
            }

            const seriesKeys: string[] = sampleResult.length > 0
                ? Object.keys(sampleResult.find(v => v !== null) ?? {})
                : ['value']

            if (seriesKeys.length === 0) throw new Error('Returned objects have no keys.')

            // ── Build indicator descriptor ───────────────────────────────────
            scriptCounter++
            const indicatorName = `_custom_script_${scriptCounter}`

            const figures = seriesKeys.map((key, i) => {
                const color = SERIES_COLORS[i % SERIES_COLORS.length]
                return {
                    key,
                    title: `${key}: `,
                    type: 'line',
                    styles: () => ({ color })
                }
            })

            registerIndicator({
                name: indicatorName,
                shortName: (scriptName().trim() || `Script #${scriptCounter}`) + (placement() === 'main' ? ' (Main)' : ' (Sub)'),
                calcParams: parsedParams,
                figures: figures as any,
                // Provide pre-calculated result directly since klinecharts calc is synchronous.
                calc: () => sampleResult,
                // We store the script details in extendData so ChartStateManager can serialize them.
                extendData: {
                    isCustomScript: true,
                    code: code(),
                    placement: placement()
                }
            })

            // Remove previous custom indicator pane or main overlay if it exists
            const prevId = activeId()
            const prevName = activeIndicatorName()
            if (prevName && chart) {
                try {
                    chart.removeIndicator(prevId === 'candle_pane' ? 'candle_pane' : prevId!, prevName)
                } catch { }
            }

            // Add to chart
            let paneId: string | null = null
            if (placement() === 'main') {
                paneId = chart.createIndicator({ name: indicatorName }, true, { id: 'candle_pane' })
            } else {
                paneId = chart.createIndicator({ name: indicatorName }, true, undefined)
            }

            setActiveId(typeof paneId === 'string' ? paneId : null)
            setActiveIndicatorName(indicatorName)
            const title = scriptName().trim() || `Script #${scriptCounter}`
            setStatus(`✓ ${title} applied to ${placement() === 'main' ? 'Main Chart' : 'Sub Pane'} — ${seriesKeys.length} series: ${seriesKeys.join(', ')}`)

        } catch (e: any) {
            setError(e?.message ?? String(e))
        } finally {
            setRunning(false)
        }
    }

    // ── Remove the current indicator ─────────────────────────────────────────
    const removeScript = () => {
        const chart = props.getChart()
        const id = activeId()
        const name = activeIndicatorName()
        if (chart && name && id) {
            try { chart.removeIndicator(id, name) } catch { }
            setActiveId(null)
            setActiveIndicatorName(null)
            setStatus('Indicator removed.')
        }
    }

    // ── File I/O (Export & Import) ───────────────────────────────────────────
    const exportScript = () => {
        const content = code()
        const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${scriptName().trim() || 'custom_indicator'}.js`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setStatus('Script exported successfully.')
    }

    const importScript = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.js,.ts,.txt'
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (re) => {
                const content = re.target?.result as string
                if (content) {
                    setCode(content)
                    // Autofill name from filename if empty
                    if (!scriptName()) {
                        setScriptName(file.name.replace(/\.(js|ts|txt)$/i, ''))
                    }
                    setError('')
                    setStatus(`Loaded ${file.name}`)
                }
            }
            reader.readAsText(file)
        }
        input.click()
    }

    return (
        <div class="klinecharts-pro-script-editor-overlay" onClick={() => props.onClose()}>
            <div class="klinecharts-pro-script-editor" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div class="script-editor-header">
                    <div class="script-editor-title">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
                        </svg>
                        <span>Script Indicator Editor</span>
                        <span class="script-editor-badge">JS</span>
                    </div>
                    <button class="script-editor-close" onClick={props.onClose}>✕</button>
                </div>

                {/* Settings row */}
                <div class="script-editor-settings-row">
                    <div class="script-editor-setting">
                        <label class="script-editor-label">Name:</label>
                        <input
                            class="script-editor-name-input"
                            value={scriptName()}
                            onInput={e => setScriptName((e.target as HTMLInputElement).value)}
                            placeholder="My Script"
                        />
                    </div>
                    <div class="script-editor-setting">
                        <label class="script-editor-label">Params:</label>
                        <input
                            class="script-editor-params-input"
                            value={params()}
                            onInput={e => setParams((e.target as HTMLInputElement).value)}
                            placeholder="14, 26, 9"
                        />
                    </div>
                    <div class="script-editor-setting">
                        <label class="script-editor-label">Placement:</label>
                        <div class="script-editor-radio-group">
                            <label class="script-editor-radio-label">
                                <input
                                    type="radio"
                                    name="placement"
                                    value="sub"
                                    checked={placement() === 'sub'}
                                    onChange={() => setPlacement('sub')}
                                />
                                Sub Indicator
                            </label>
                            <label class="script-editor-radio-label">
                                <input
                                    type="radio"
                                    name="placement"
                                    value="main"
                                    checked={placement() === 'main'}
                                    onChange={() => setPlacement('main')}
                                />
                                Main Indicator
                            </label>
                        </div>
                    </div>
                    <Show when={activeIndicatorName()}>
                        <button class="script-editor-btn danger" onClick={removeScript}>Remove</button>
                    </Show>
                </div>

                {/* Code area */}
                <div class="script-editor-code-wrapper">
                    <div class="script-editor-gutter" aria-hidden="true">
                        {code().split('\n').map((_, i) => (
                            <span>{i + 1}</span>
                        ))}
                    </div>
                    <textarea
                        class="script-editor-textarea"
                        value={code()}
                        onInput={e => {
                            setCode((e.target as HTMLTextAreaElement).value)
                            setError('')
                            setStatus('')
                        }}
                        spellcheck={false}
                        autocomplete="off"
                        onKeyDown={e => {
                            // Tab key → insert 2 spaces instead of leaving field
                            if (e.key === 'Tab') {
                                e.preventDefault()
                                const el = e.target as HTMLTextAreaElement
                                const start = el.selectionStart
                                const end = el.selectionEnd
                                const newVal = el.value.substring(0, start) + '  ' + el.value.substring(end)
                                setCode(newVal)
                                requestAnimationFrame(() => {
                                    el.selectionStart = el.selectionEnd = start + 2
                                })
                            }
                            // Ctrl/Cmd+Enter → Run
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault()
                                runScript()
                            }
                        }}
                    />
                </div>

                {/* Status / Error */}
                <Show when={error()}>
                    <div class="script-editor-error">
                        <span class="script-editor-error-icon">⚠</span>
                        {error()}
                    </div>
                </Show>
                <Show when={status() && !error()}>
                    <div class="script-editor-status">{status()}</div>
                </Show>

                {/* Footer */}
                <div class="script-editor-footer">
                    <div style="display:flex; gap: 8px; align-items: center;">
                        <button class="script-editor-btn" onClick={importScript} title="Load from file (.js, .txt, .ts)">
                            <span style="font-size: 14px; margin-right: 4px;">📂</span> Import
                        </button>
                        <button class="script-editor-btn" onClick={exportScript} title="Save to file">
                            <span style="font-size: 14px; margin-right: 4px;">💾</span> Export
                        </button>
                    </div>
                    <div class="script-editor-footer-btns">
                        <span class="script-editor-hint" style="margin-right:8px">Ctrl+Enter to run</span>
                        <button class="script-editor-btn" onClick={() => setCode(DEFAULT_SCRIPT)}>Reset</button>
                        <button class="script-editor-btn primary" disabled={running()} onClick={runScript}>
                            {running() ? '…' : '▶  Run'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default ScriptEditorModal
