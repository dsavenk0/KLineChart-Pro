/**
 * SaveLoadMenu
 * A toolbar dropdown for saving and loading named chart layouts.
 * Integrates with ChartLayoutManager (localStorage persistence) and
 * ChartStateManager (serialization/deserialization).
 */

import { Component, createSignal, Show, For } from 'solid-js'
import { Chart, OverlayCreate } from 'klinecharts'
import { SymbolInfo, Period } from '../../types'
import ChartLayoutManager, { LayoutEntry } from '../../extension/ChartLayoutManager'
import i18n from '../../i18n'

export interface SaveLoadMenuProps {
    locale: string
    getChart: () => Chart | null
    getSymbol: () => SymbolInfo
    getPeriod: () => Period
    getOverlays: () => OverlayCreate[]
    onLoadState: (state: any) => void
    onClose: () => void
}

const SaveLoadMenu: Component<SaveLoadMenuProps> = props => {

    const [saveMode, setSaveMode] = createSignal(false)
    const [saveName, setSaveName] = createSignal('')
    const [layouts, setLayouts] = createSignal<LayoutEntry[]>(ChartLayoutManager.listLayouts())
    const [flash, setFlash] = createSignal('')

    const refreshLayouts = () => setLayouts(ChartLayoutManager.listLayouts())

    const handleSave = () => {
        const chart = props.getChart()
        if (!chart) return

        const name = saveName().trim() || `${props.getSymbol().ticker} ${props.getPeriod().text}`
        ChartLayoutManager.saveLayout(
            name,
            chart,
            props.getSymbol(),
            props.getPeriod(),
            props.getOverlays()
        )
        setSaveName('')
        setSaveMode(false)
        refreshLayouts()
        setFlash(i18n('layout_saved', props.locale))
        setTimeout(() => setFlash(''), 2000)
    }

    const handleLoad = (entry: LayoutEntry) => {
        const state = ChartLayoutManager.loadLayout(entry.id)
        if (state) {
            props.onLoadState(state)
            props.onClose()
        }
    }

    const handleDelete = (e: MouseEvent, id: string) => {
        e.stopPropagation()
        ChartLayoutManager.deleteLayout(id)
        refreshLayouts()
    }

    const formatDate = (ts: number) =>
        new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    return (
        <div class="save-load-modal-overlay" onClick={() => props.onClose()}>
            <div class="save-load-modal" onClick={e => e.stopPropagation()}>

                <div class="save-load-modal-header">
                    <div class="save-load-modal-title">
                        <svg viewBox="0 0 20 20" width="16" height="16">
                            <path fill="currentColor" d="M15.5,1H3.5C2.12,1,1,2.12,1,3.5v13C1,17.88,2.12,19,3.5,19h13c1.38,0,2.5-1.12,2.5-2.5V4.5L15.5,1z M10,17c-1.93,0-3.5-1.57-3.5-3.5S8.07,10,10,10s3.5,1.57,3.5,3.5S11.93,17,10,17z M13,7H4V3h9V7z" />
                        </svg>
                        <span>{i18n('layouts', props.locale)}</span>
                    </div>
                    <button class="save-load-modal-close" onClick={props.onClose}>✕</button>
                </div>

                <div class="save-load-modal-content">
                    {/* Save section */}
                    <Show when={!saveMode()}>
                        <div class="save-load-action-row">
                            <button class="save-load-btn primary" onClick={() => setSaveMode(true)}>
                                + {i18n('save_layout', props.locale)}
                            </button>
                        </div>
                    </Show>

                    <Show when={saveMode()}>
                        <div class="save-load-save-form">
                            <input
                                class="save-load-input"
                                value={saveName()}
                                onInput={e => setSaveName((e.target as HTMLInputElement).value)}
                                placeholder={i18n('layout_name_placeholder', props.locale)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                                autofocus
                            />
                            <div class="save-load-form-actions">
                                <button class="save-load-btn primary" onClick={handleSave}>{i18n('confirm', props.locale)}</button>
                                <button class="save-load-btn" onClick={() => setSaveMode(false)}>{i18n('cancel', props.locale)}</button>
                            </div>
                        </div>
                    </Show>

                    {/* Flash feedback */}
                    <Show when={flash()}>
                        <div class="save-load-flash">{flash()}</div>
                    </Show>

                    {/* Layouts list */}
                    <Show when={layouts().length > 0}>
                        <div class="save-load-divider" />
                        <div class="save-load-list">
                            <For each={layouts()}>
                                {entry => (
                                    <div class="save-load-entry" onClick={() => handleLoad(entry)}>
                                        <div class="save-load-entry-info">
                                            <span class="save-load-entry-name">{entry.name}</span>
                                            <span class="save-load-entry-meta">{entry.symbol} · {entry.resolution} · {formatDate(entry.lastModified)}</span>
                                        </div>
                                        <button
                                            class="save-load-delete"
                                            title={i18n('delete_layout', props.locale)}
                                            onClick={e => handleDelete(e, entry.id)}
                                        >✕</button>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>

                    <Show when={layouts().length === 0 && !saveMode()}>
                        <div class="save-load-empty">{i18n('no_layouts', props.locale)}</div>
                    </Show>
                </div>
            </div>
        </div>
    )
}

export default SaveLoadMenu
