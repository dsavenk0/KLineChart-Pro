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

import { Component, createSignal } from 'solid-js'

import { Modal, List, Checkbox } from '../../component'

import i18n from '../../i18n'

type OnIndicatorChange = (
  params: {
    name: string
    paneId: string
    added: boolean
  }
) => void

export interface IndicatorModalProps {
  locale: string
  mainIndicators: string[]
  subIndicators: object
  onMainIndicatorChange: OnIndicatorChange
  onSubIndicatorChange: OnIndicatorChange
  onClose: () => void
}

const ALL_MAIN_INDICATORS = [
  'MA', 'EMA', 'SMA', 'BOLL', 'SAR', 'BBI', 'VWAP', 'SuperTrend', 'HMA', 'PivotPoints', 'Ichimoku', 'BOLL_TV', 'MA_Ribbon'
];

const ALL_SUB_INDICATORS = [
  'MA', 'EMA', 'VOL', 'MACD', 'BOLL', 'KDJ',
  'RSI', 'BIAS', 'BRAR', 'CCI', 'DMI',
  'CR', 'PSY', 'DMA', 'TRIX', 'OBV',
  'VR', 'WR', 'MTM', 'EMV', 'SAR',
  'SMA', 'ROC', 'PVT', 'BBI', 'AO',
  'RSI_TV', 'MACD_TV', 'CCI', 'Stochastic'
];

const IndicatorModal: Component<IndicatorModalProps> = props => {
  const [searchQuery, setSearchQuery] = createSignal('')

  const filteredMainIndicators = () => ALL_MAIN_INDICATORS.filter(name =>
    name.toLowerCase().includes(searchQuery().toLowerCase())
  );

  const filteredSubIndicators = () => ALL_SUB_INDICATORS.filter(name =>
    name.toLowerCase().includes(searchQuery().toLowerCase())
  );

  return (
    <Modal
      title={i18n('indicator', props.locale)}
      width={400}
      onClose={props.onClose}>

      <div style={{ padding: '0 20px', "margin-top": '12px', "margin-bottom": '12px' }}>
        <input
          type="text"
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          placeholder="Search indicators..."
          style={{
            width: '100%',
            padding: '8px 12px',
            "border-radius": '4px',
            border: '1px solid var(--klinecharts-pro-border-color)',
            background: 'var(--klinecharts-pro-popover-background-color)',
            color: 'var(--klinecharts-pro-text-color)',
            "box-sizing": 'border-box'
          }}
        />
      </div>

      <List
        class="klinecharts-pro-indicator-modal-list">

        {filteredMainIndicators().length > 0 && <li class="title">{i18n('main_indicator', props.locale)}</li>}
        {
          filteredMainIndicators().map(name => {
            const checked = props.mainIndicators.includes(name)
            return (
              <li
                class="row"
                onClick={_ => {
                  props.onMainIndicatorChange({ name, paneId: 'candle_pane', added: !checked })
                }}>
                <Checkbox checked={checked} label={i18n(name.toLowerCase(), props.locale)} />
              </li>
            )
          })
        }

        {filteredSubIndicators().length > 0 && <li class="title">{i18n('sub_indicator', props.locale)}</li>}
        {
          filteredSubIndicators().map(name => {
            const checked = name in props.subIndicators
            return (
              <li
                class="row"
                onClick={_ => {
                  // @ts-expect-error
                  props.onSubIndicatorChange({ name, paneId: props.subIndicators[name] ?? '', added: !checked });
                }}>
                <Checkbox checked={checked} label={i18n(name.toLowerCase(), props.locale)} />
              </li>
            )
          })
        }

        {filteredMainIndicators().length === 0 && filteredSubIndicators().length === 0 && (
          <li style={{ "text-align": 'center', padding: '20px', color: 'var(--klinecharts-pro-text-second-color)' }}>
            No indicators found
          </li>
        )}
      </List>
    </Modal>
  )
}

export default IndicatorModal
