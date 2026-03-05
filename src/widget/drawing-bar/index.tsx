/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, createMemo, createSignal, onMount, onCleanup } from 'solid-js'

import { OverlayCreate, OverlayMode } from 'klinecharts'

import { List } from '../../component'
import {
  createSingleLineOptions, createMoreLineOptions,
  createPolygonOptions, createFibonacciOptions, createWaveOptions,
  createRiskOptions,
  createMagnetOptions,
  Icon
} from './icons'
import i18n from '../../i18n'

export interface DrawingBarProps {
  locale: string
  onDrawingItemClick: (overlay: OverlayCreate) => void
  onModeChange: (mode: string) => void,
  onLockChange: (lock: boolean) => void
  onVisibleChange: (visible: boolean) => void
  onRemoveClick: (groupId: string) => void
  onCursorClick: () => void
}

const GROUP_ID = 'drawing_tools'

const DrawingBar: Component<DrawingBarProps> = props => {
  const [singleLineIcon, setSingleLineIcon] = createSignal('horizontalStraightLine')
  const [moreLineIcon, setMoreLineIcon] = createSignal('priceChannelLine')
  const [polygonIcon, setPolygonIcon] = createSignal('circle')
  const [fibonacciIcon, setFibonacciIcon] = createSignal('fibonacciLine')
  const [waveIcon, setWaveIcon] = createSignal('xabcd')
  const [riskIcon, setRiskIcon] = createSignal('longPosition')

  const [modeIcon, setModeIcon] = createSignal('weak_magnet')
  const [mode, setMode] = createSignal('normal')

  const [lock, setLock] = createSignal(false)

  const [visible, setVisible] = createSignal(true)

  const [popoverKey, setPopoverKey] = createSignal('')

  const [brushColor, setBrushColor] = createSignal('#1677ff')
  const [brushSize, setBrushSize] = createSignal(2)
  const [brushOpacity, setBrushOpacity] = createSignal(1)
  const [brushActive, setBrushActive] = createSignal(false)
  const [cursorActive, setCursorActive] = createSignal(true)

  // Scroll state — tracks whether the bar overflows and needs a scroll arrow
  const [showScrollDown, setShowScrollDown] = createSignal(false)
  let barRef: HTMLDivElement | undefined
  let scrollRef: HTMLDivElement | undefined

  const updateScrollBtn = () => {
    if (!scrollRef) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 2)
  }

  onMount(() => {
    if (!scrollRef) return
    updateScrollBtn()
    const ro = new ResizeObserver(updateScrollBtn)
    ro.observe(scrollRef)
    scrollRef.addEventListener('scroll', updateScrollBtn)
    onCleanup(() => {
      ro.disconnect()
      scrollRef?.removeEventListener('scroll', updateScrollBtn)
    })
  })

  /**
   * Generates a custom SVG cursor for the brush tool. 
   * Represented as a circle that matches the currently selected thickness (size).
   * Dual-ring construction (transparent fill + white outer stroke) ensures visibility 
   * against both dark and light chart backgrounds.
   * 
   * @param {string} color - The current brush color (hex or rgba)
   * @param {number} size - The current brush thickness in pixels
   * @returns {string} - CSS cursor property value containing the inline SVG
   */
  const makeBrushCursor = (color: string, size: number): string => {
    const r = size / 2          // radius = half the stroke width — exact match
    const pad = 2               // 2px padding so border isn't clipped
    const dim = Math.ceil(r * 2 + pad * 2)
    const cx = dim / 2
    const encoded = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}">` +
      `<circle cx="${cx}" cy="${cx}" r="${r}" fill="${color}" fill-opacity="0.25" stroke="white" stroke-width="1"/>` +
      `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="1"/>` +
      `</svg>`
    )
    return `url("data:image/svg+xml,${encoded}") ${cx} ${cx}, crosshair`
  }

  /**
   * Overrides klinecharts internal canvas cursor.
   * By default, klinecharts forces a 'crosshair' cursor when drawing tools are active.
   * This injects a global style tag with !important to force the custom brush cursor instead.
   * 
   * @param {string} cursor - The generated CSS cursor string, or empty string to reset to default
   */
  const setChartCursor = (cursor: string) => {
    let styleTag = document.getElementById('brush-cursor-override') as HTMLStyleElement | null
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = 'brush-cursor-override'
      document.head.appendChild(styleTag)
    }
    styleTag.textContent = cursor
      ? `.klinecharts-pro-widget, .klinecharts-pro-widget * { cursor: ${cursor} !important; }`
      : ''
  }

  /**
   * Activates the brush tool and prepares the chart for drawing.
   * Converts HEX colors to RGBA to properly apply the selected opacity slider value.
   * Note: We avoid parseInt fallback logic `|| 255` which causes bugs when RGB channels are 0 (e.g. yellow).
   * 
   * @param {string} colorStr - Color string (hex or direct variable)
   * @param {number} size - Brush line thickness
   * @param {number} opacity - Alpha transparency value (0.1 - 1.0)
   */
  const activateBrush = (colorStr: string, size: number, opacity: number) => {
    // Parse hex color correctly — no fallback `|| value` which corrupts zero-valued channels
    let finalColor = colorStr
    if (colorStr.startsWith('#') && colorStr.length === 7) {
      const r = parseInt(colorStr.slice(1, 3), 16)
      const g = parseInt(colorStr.slice(3, 5), 16)
      const b = parseInt(colorStr.slice(5, 7), 16)
      finalColor = `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    setCursorActive(false)
    props.onDrawingItemClick({
      groupId: GROUP_ID,
      name: 'brush',
      visible: visible(),
      lock: lock(),
      mode: mode() as OverlayMode,
      styles: { line: { color: finalColor, size } },
      // Auto-restart brush after each stroke — no extra click needed
      onDrawEnd: () => {
        activateBrush(brushColor(), brushSize(), brushOpacity())
      }
    } as any)
    // Show custom brush cursor and mark brush as active
    setBrushActive(true)
    setChartCursor(makeBrushCursor(colorStr, size))
  }

  const overlays = createMemo(() => {
    return [
      { key: 'singleLine', icon: singleLineIcon(), list: createSingleLineOptions(props.locale), setter: setSingleLineIcon },
      { key: 'moreLine', icon: moreLineIcon(), list: createMoreLineOptions(props.locale), setter: setMoreLineIcon },
      { key: 'polygon', icon: polygonIcon(), list: createPolygonOptions(props.locale), setter: setPolygonIcon },
      { key: 'fibonacci', icon: fibonacciIcon(), list: createFibonacciOptions(props.locale), setter: setFibonacciIcon },
      { key: 'wave', icon: waveIcon(), list: createWaveOptions(props.locale), setter: setWaveIcon },
      { key: 'risk', icon: riskIcon(), list: createRiskOptions(props.locale), setter: setRiskIcon }
    ]
  })

  const modes = createMemo(() => createMagnetOptions(props.locale))

  return (
    <div
      class="klinecharts-pro-drawing-bar"
      ref={barRef}>
      {/* Scrollable content area */}
      <div
        class="drawing-bar-scroll-area"
        ref={scrollRef}>
        {/* Cursor / navigate tool — deactivates any drawing and returns to pan mode */}
        <div class="drawing-bar-item">
          <span
            style="width:32px;height:32px"
            title={i18n('cursor_tool', props.locale)}
            onClick={() => {
              setCursorActive(true)
              setBrushActive(false)
              setChartCursor('')
              props.onCursorClick()
            }}>
            {cursorActive()
              ? <Icon name="cursor" class="selected icon-overlay" />
              : <Icon name="cursor" class="icon-overlay" />
            }
          </span>
        </div>
        <span class="split-line" />
        {
          overlays().map(item => {
            return (
              <div
                class="drawing-bar-item"
                tabIndex={0}
                onBlur={() => { setPopoverKey('') }}>
                <span
                  style="width:32px;height:32px"
                  title={String(item.list.find(d => d.key === item.icon)?.text ?? item.icon)}
                  onClick={() => {
                    setCursorActive(false)
                    props.onDrawingItemClick({ groupId: GROUP_ID, name: item.icon, visible: visible(), lock: lock(), mode: mode() as OverlayMode })
                  }}>
                  <Icon name={item.icon} class="icon-overlay" />
                </span>
                <div
                  class="icon-arrow"
                  onClick={() => {
                    if (item.key === popoverKey()) {
                      setPopoverKey('')
                    } else {
                      setPopoverKey(item.key)
                    }
                  }}>
                  <svg
                    class={item.key === popoverKey() ? 'rotate' : ''}
                    viewBox="0 0 4 6">
                    <path d="M1.07298,0.159458C0.827521,-0.0531526,0.429553,-0.0531526,0.184094,0.159458C-0.0613648,0.372068,-0.0613648,0.716778,0.184094,0.929388L2.61275,3.03303L0.260362,5.07061C0.0149035,5.28322,0.0149035,5.62793,0.260362,5.84054C0.505822,6.05315,0.903789,6.05315,1.14925,5.84054L3.81591,3.53075C4.01812,3.3556,4.05374,3.0908,3.92279,2.88406C3.93219,2.73496,3.87113,2.58315,3.73964,2.46925L1.07298,0.159458Z" stroke="none" stroke-opacity="0" />
                  </svg>
                </div>
                {
                  item.key === popoverKey() && (
                    <List class="list">
                      {
                        item.list.map(data => (
                          <li
                            onClick={() => {
                              item.setter(data.key)
                              setCursorActive(false)
                              props.onDrawingItemClick({ groupId: GROUP_ID, name: data.key, lock: lock(), mode: mode() as OverlayMode })
                              setPopoverKey('')
                              setBrushActive(false)
                              setChartCursor('')  // reset brush cursor when another tool is selected
                            }}>
                            <Icon name={data.key} class="icon-overlay" />
                            <span style="padding-left:8px">{data.text}</span>
                          </li>
                        ))
                      }
                    </List>
                  )
                }
              </div>
            )
          })
        }
        <div
          class="drawing-bar-item"
          tabIndex={0}
          onBlur={(e) => {
            if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
              setPopoverKey('')
            }
          }}>
          <span
            style="width:32px;height:32px;position:relative;display:flex;align-items:center;justify-content:center"
            title={i18n('brush', props.locale)}
            onClick={() => {
              activateBrush(brushColor(), brushSize(), brushOpacity())
            }}>
            <Icon name="brush" class="icon-overlay" />
            {/* Color dot indicator — shows currently selected brush color */}
            <span style={{
              position: 'absolute',
              bottom: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '10px',
              height: '3px',
              'border-radius': '2px',
              'background-color': brushColor(),
              'pointer-events': 'none'
            }} />
          </span>
          <div
            class="icon-arrow"
            onClick={() => {
              if (popoverKey() === 'brush') {
                setPopoverKey('')
              } else {
                setPopoverKey('brush')
              }
            }}>
            <svg
              class={popoverKey() === 'brush' ? 'rotate' : ''}
              viewBox="0 0 4 6">
              <path d="M1.07298,0.159458C0.827521,-0.0531526,0.429553,-0.0531526,0.184094,0.159458C-0.0613648,0.372068,-0.0613648,0.716778,0.184094,0.929388L2.61275,3.03303L0.260362,5.07061C0.0149035,5.28322,0.0149035,5.62793,0.260362,5.84054C0.505822,6.05315,0.903789,6.05315,1.14925,5.84054L3.81591,3.53075C4.01812,3.3556,4.05374,3.0908,3.92279,2.88406C3.93219,2.73496,3.87113,2.58315,3.73964,2.46925L1.07298,0.159458Z" stroke="none" stroke-opacity="0" />
            </svg>
          </div>
          {
            popoverKey() === 'brush' && (
              <div class="list" style="padding:16px;display:flex;flex-direction:column;gap:12px;width:220px;border-radius:4px;cursor:default">
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <span style="font-size:14px;color:var(--klinecharts-pro-text-color)">Color</span>
                  <div style="display:flex;align-items:center;gap:6px">
                    {['#f92855', '#2bca73', '#1677ff', '#ffac00', '#ffffff'].map(c => (
                      <div
                        style={{
                          width: '18px', height: '18px', 'border-radius': '50%',
                          'background-color': c, cursor: 'pointer',
                          border: brushColor() === c ? '2px solid var(--klinecharts-pro-primary-color)' : '1px solid var(--klinecharts-pro-border-color)'
                        }}
                        onClick={() => {
                          setBrushColor(c)
                          activateBrush(c, brushSize(), brushOpacity())
                        }}
                      />
                    ))}
                    <div style="position:relative;width:18px;height:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid var(--klinecharts-pro-border-color)">
                      <div style={{
                        width: '14px',
                        height: '14px',
                        'border-radius': '50%',
                        background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'
                      }} />
                      <input
                        type="color"
                        value={brushColor()}
                        onChange={(e) => {
                          const val = e.currentTarget.value
                          setBrushColor(val)
                          activateBrush(val, brushSize(), brushOpacity())
                        }}
                        onInput={(e) => {
                          const val = e.currentTarget.value
                          setBrushColor(val)
                          // Re-activate brush immediately on every color pick so it stays ready
                          activateBrush(val, brushSize(), brushOpacity())
                        }}
                        style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;color-scheme:dark;"
                      />
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <span style="font-size:14px;color:var(--klinecharts-pro-text-color)">Thickness: {brushSize()}</span>
                  <input type="range" min="1" max="10" value={brushSize()}
                    onInput={(e) => {
                      const s = parseInt(e.currentTarget.value)
                      setBrushSize(s)
                      // Always update cursor and re-activate brush on every slider move
                      setChartCursor(makeBrushCursor(brushColor(), s))
                      activateBrush(brushColor(), s, brushOpacity())
                    }}
                    class="klinecharts-pro-brush-slider" />
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <span style="font-size:14px;color:var(--klinecharts-pro-text-color)">Opacity: {brushOpacity()}</span>
                  <input type="range" min="0.1" max="1" step="0.1" value={brushOpacity()}
                    onInput={(e) => setBrushOpacity(parseFloat(e.currentTarget.value))}
                    onChange={(e) => {
                      // On mouse-up: re-activate brush with new opacity so it's ready to draw
                      const op = parseFloat(e.currentTarget.value)
                      setBrushOpacity(op)
                      activateBrush(brushColor(), brushSize(), op)
                    }}
                    class="klinecharts-pro-brush-slider" />
                </div>
              </div>
            )
          }
        </div>
        <span class="split-line" />
        <div
          class="drawing-bar-item"
          tabIndex={0}
          onBlur={() => { setPopoverKey('') }}>
          <span
            style="width:32px;height:32px"
            title={mode() === 'normal' ? i18n('weak_magnet', props.locale) : i18n(modeIcon(), props.locale)}
            onClick={() => {
              let currentMode = modeIcon()
              if (mode() !== 'normal') {
                currentMode = 'normal'
              }
              setMode(currentMode)
              props.onModeChange(currentMode)
            }}>
            {
              modeIcon() === 'weak_magnet'
                ? (mode() === 'weak_magnet' ? <Icon name="weak_magnet" class="selected icon-overlay" /> : <Icon name="weak_magnet" class="icon-overlay" />)
                : (mode() === 'strong_magnet' ? <Icon name="strong_magnet" class="selected icon-overlay" /> : <Icon name="strong_magnet" class="icon-overlay" />)
            }
          </span>
          <div
            class="icon-arrow"
            onClick={() => {
              if (popoverKey() === 'mode') {
                setPopoverKey('')
              } else {
                setPopoverKey('mode')
              }
            }}>
            <svg
              class={popoverKey() === 'mode' ? 'rotate' : ''}
              viewBox="0 0 4 6">
              <path d="M1.07298,0.159458C0.827521,-0.0531526,0.429553,-0.0531526,0.184094,0.159458C-0.0613648,0.372068,-0.0613648,0.716778,0.184094,0.929388L2.61275,3.03303L0.260362,5.07061C0.0149035,5.28322,0.0149035,5.62793,0.260362,5.84054C0.505822,6.05315,0.903789,6.05315,1.14925,5.84054L3.81591,3.53075C4.01812,3.3556,4.05374,3.0908,3.92279,2.88406C3.93219,2.73496,3.87113,2.58315,3.73964,2.46925L1.07298,0.159458Z" stroke="none" stroke-opacity="0" />
            </svg>
          </div>
          {
            popoverKey() === 'mode' && (
              <List class="list">
                {
                  modes().map(data => (
                    <li
                      onClick={() => {
                        setModeIcon(data.key)
                        setMode(data.key)
                        props.onModeChange(data.key)
                        setPopoverKey('')
                      }}>
                      <Icon name={data.key} class="icon-overlay" />
                      <span style="padding-left:8px">{data.text}</span>
                    </li>
                  ))
                }
              </List>
            )
          }
        </div>
        <div
          class="drawing-bar-item">
          <span
            style="width:32px;height:32px"
            title={lock() ? i18n('unlock', props.locale) : i18n('lock', props.locale)}
            onClick={() => {
              const currentLock = !lock()
              setLock(currentLock)
              props.onLockChange(currentLock)
            }}>
            {
              lock() ? <Icon name="lock" class="icon-overlay" /> : <Icon name="unlock" class="icon-overlay" />
            }
          </span>
        </div>
        <div
          class="drawing-bar-item">
          <span
            style="width:32px;height:32px"
            title={visible() ? i18n('hide_drawings', props.locale) : i18n('show_drawings', props.locale)}
            onClick={() => {
              const v = !visible()
              setVisible(v)
              props.onVisibleChange(v)
            }}>
            {
              visible() ? <Icon name="visible" class="icon-overlay" /> : <Icon name="invisible" class="icon-overlay" />
            }
          </span>
        </div>
        <span class="split-line" />
        <div
          class="drawing-bar-item">
          <span
            style="width:32px;height:32px"
            title={i18n('remove_drawings', props.locale)}
            onClick={() => {
              props.onRemoveClick(GROUP_ID)
              setChartCursor('')  // reset cursor when drawings are cleared
            }}>
            <Icon name="remove" class="icon-overlay" />
          </span>
        </div>
      </div>
      {/* Scroll-down arrow — shown only when items are clipped */}
      {showScrollDown() && (
        <button
          class="drawing-bar-scroll-btn"
          title="Scroll down to see more tools"
          onClick={() => {
            scrollRef?.scrollBy({ top: 120, behavior: 'smooth' })
          }}>
          <svg viewBox="0 0 10 6" width="10" height="6">
            <path d="M0 0L5 6L10 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default DrawingBar