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

export default (className?: string) => (
    <svg class={className} viewBox="0 0 32 32">
        <path d="M4 6 L28 6 M4 11 L28 11 M4 16 L28 16 M4 21 L28 21 M4 26 L28 26" stroke="currentColor" stroke-width="2" fill="none" />
        <path d="M10 4 L10 28" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" fill="none" />
    </svg>
)
