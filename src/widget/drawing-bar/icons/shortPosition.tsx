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

export default (cls?: string) => (
    <svg class={cls} viewBox="0 0 22 22">
        <rect x="3" y="4" width="16" height="7" fill="rgba(255, 0, 0, 0.5)" />
        <rect x="3" y="11" width="16" height="7" fill="rgba(0, 255, 0, 0.5)" />
        <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" stroke-width="1.5" />
    </svg>
)
