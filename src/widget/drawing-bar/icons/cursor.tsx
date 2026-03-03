/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Standard mouse cursor / pointer icon — used for the "navigate/pan" mode in the drawing bar */
export default (className?: string) => (
    <svg class={className} viewBox="0 0 24 24" fill="none">
        <g transform="translate(3.5, 2) scale(0.7)">
            <path
                d="M5.5 3.5L5.5 17L8.5 14L11.5 20.5L13.5 19.5L10.5 13L14.5 13L5.5 3.5Z"
                fill="currentColor"
                stroke="currentColor"
                stroke-width="0.5"
                stroke-linejoin="round"
            />
        </g>
    </svg>
)
