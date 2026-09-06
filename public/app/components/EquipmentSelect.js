/**
 * Native single-select for linking a task or log entry to a boat component
 * (§5.9). `value` is the equipment id as a string; '' means "none".
 */
import { html } from '../lib/html.js';
import { useEquipmentOptions } from '../api/hooks.js';

/** @typedef {import('../types.js').EquipmentDTO} EquipmentDTO */

/**
 * @param {{ value: string, onChange: (id: string) => void, id?: string }} props
 */
export function EquipmentSelect(props) {
  const res = useEquipmentOptions();
  const list = res.data && res.data.data ? res.data.data : [];
  return html`
    <select
      id=${props.id}
      class="select"
      value=${props.value}
      onInput=${(/** @type {any} */ e) => props.onChange(e.currentTarget.value)}
    >
      <option value="">— None —</option>
      ${list.map(
        (/** @type {EquipmentDTO} */ eq) => html`
          <option key=${eq.id} value=${String(eq.id)}>${eq.name}</option>
        `,
      )}
    </select>
  `;
}

/**
 * Merge an equipment's tags into an existing tag list (case-insensitive union,
 * keeping the caller's order first). Used to pre-fill the Tags field when an
 * equipment is picked in a form.
 * @param {string[]} tags
 * @param {string[]} equipmentTags
 * @returns {string[]}
 */
export function mergeEquipmentTags(tags, equipmentTags) {
  /** @type {Record<string, boolean>} */
  const seen = {};
  for (const t of tags) seen[t.toLowerCase()] = true;
  const merged = tags.slice();
  for (const t of equipmentTags || []) {
    if (!seen[t.toLowerCase()]) {
      seen[t.toLowerCase()] = true;
      merged.push(t);
    }
  }
  return merged;
}
