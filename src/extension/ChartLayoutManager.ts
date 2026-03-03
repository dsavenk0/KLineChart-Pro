/**
 * ChartLayoutManager
 * 
 * Manages saving and loading named, multi-slot chart layouts via `localStorage`.
 * It wraps the `ChartStateManager` which serializes the current chart instance,
 * symbol, period, and overlays. 
 * 
 * Each layout is stored as a `LayoutEntry` that retains full `ChartState` alongside 
 * display metadata (ticker, resolution, timeframe, name).
 * 
 * Storage Structure:
 * - Index Key (`klinecharts_layout_index`): Array of UUID strings
 * - Data Keys (`klinecharts_layout_{uuid}`): Serialized `LayoutEntry` JSON
 */

import { Chart, OverlayCreate } from 'klinecharts'
import ChartStateManager, { ChartState } from './ChartStateManager'
import { SymbolInfo, Period } from '../types'

const STORAGE_KEY_PREFIX = 'klinecharts_layout:'
const INDEX_KEY = 'klinecharts_layout_index'

export interface LayoutEntry {
    id: string
    name: string
    symbol: string      // ticker for display
    resolution: string  // period text e.g. "1m"
    timestamp: number   // created
    lastModified: number
    state: ChartState
}

// ─── Simple UUID generator (no dependency) ────────────────────────────────────
function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
}

export default class ChartLayoutManager {

    // ── List ────────────────────────────────────────────────────────────────────

    /** Return all saved layout IDs in creation order. */
    static listIds(): string[] {
        try {
            const raw = localStorage.getItem(INDEX_KEY)
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    }

    /** Return all saved layout entries (metadata + state). */
    static listLayouts(): LayoutEntry[] {
        return this.listIds()
            .map(id => this.getEntry(id))
            .filter((e): e is LayoutEntry => e !== null)
    }

    // ── Save ────────────────────────────────────────────────────────────────────

    /**
     * Serialize the current chart and save it as a named layout.
     * @returns The generated layout ID.
     */
    static saveLayout(
        name: string,
        chart: Chart,
        symbol: SymbolInfo,
        period: Period,
        overlays: OverlayCreate[]
    ): string {
        const state = ChartStateManager.saveState(chart, symbol, period, overlays)
        const id = uuid()
        const now = Date.now()

        const entry: LayoutEntry = {
            id,
            name: name.trim() || `Layout ${new Date(now).toLocaleString()}`,
            symbol: symbol.ticker,
            resolution: period.text,
            timestamp: now,
            lastModified: now,
            state
        }

        this.writeEntry(entry)
        return id
    }

    /**
     * Overwrite an existing layout slot with the current chart state.
     */
    static updateLayout(
        id: string,
        chart: Chart,
        symbol: SymbolInfo,
        period: Period,
        overlays: OverlayCreate[]
    ): boolean {
        const existing = this.getEntry(id)
        if (!existing) return false

        const state = ChartStateManager.saveState(chart, symbol, period, overlays)
        const updated: LayoutEntry = {
            ...existing,
            symbol: symbol.ticker,
            resolution: period.text,
            lastModified: Date.now(),
            state
        }
        localStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(updated))
        return true
    }

    // ── Load ────────────────────────────────────────────────────────────────────

    /**
     * Retrieve the ChartState for a given layout ID.
     */
    static loadLayout(id: string): ChartState | null {
        const entry = this.getEntry(id)
        return entry?.state ?? null
    }

    // ── Delete ──────────────────────────────────────────────────────────────────

    static deleteLayout(id: string): void {
        localStorage.removeItem(STORAGE_KEY_PREFIX + id)
        const ids = this.listIds().filter(i => i !== id)
        localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
    }

    // ── Rename ──────────────────────────────────────────────────────────────────

    static renameLayout(id: string, name: string): boolean {
        const entry = this.getEntry(id)
        if (!entry) return false
        const updated = { ...entry, name: name.trim(), lastModified: Date.now() }
        localStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(updated))
        return true
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    private static getEntry(id: string): LayoutEntry | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_PREFIX + id)
            return raw ? JSON.parse(raw) : null
        } catch {
            return null
        }
    }

    private static writeEntry(entry: LayoutEntry): void {
        localStorage.setItem(STORAGE_KEY_PREFIX + entry.id, JSON.stringify(entry))
        const ids = this.listIds()
        if (!ids.includes(entry.id)) {
            ids.push(entry.id)
            localStorage.setItem(INDEX_KEY, JSON.stringify(ids))
        }
    }
}
