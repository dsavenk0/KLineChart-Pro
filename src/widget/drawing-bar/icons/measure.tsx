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
        <path d="M4 8 L4 24 M28 8 L28 24 M4 16 L28 16" stroke="currentColor" stroke-width="2" fill="none" />
        <path d="M8 12 L8 20 M12 14 L12 18 M16 12 L16 20 M20 14 L20 18 M24 12 L24 20" stroke="currentColor" stroke-width="1.5" fill="none" />
    </svg>
)
