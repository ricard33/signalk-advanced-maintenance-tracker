/**
 * Filter-chip container (§7.4). On phones (≤640px) the chip rows collapse
 * behind a "Filters" button so a long equipment / tag list doesn't push the
 * table off-screen; the active filters stay visible as removable chips. On
 * wider screens the rows are always shown and the toggle is hidden (CSS).
 *
 * jsdom has no `matchMedia`, so `open` starts true under test and the wrapped
 * chip rows render exactly as before.
 */
import { html } from '../lib/html.js';
import { useState } from '../../vendor/preact-hooks.js';

/**
 * @param {{
 *   count: number,
 *   activeChips: { label: string, onRemove: () => void }[],
 *   onClearAll: () => void,
 *   children: any,
 * }} props
 */
export function FilterBar(props) {
  const [open, setOpen] = useState(
    !(window.matchMedia && window.matchMedia('(max-width: 640px)').matches),
  );
  const count = props.count || 0;
  return html`
    <div class="filter-bar">
      <button
        type="button"
        class="btn filters-toggle"
        aria-expanded=${open}
        onClick=${() => setOpen(!open)}
      >
        <i class="bi bi-funnel" />Filters${count ? ' (' + count + ')' : ''}
      </button>
      ${
        !open && count
          ? html`<div class="filter-active">
              ${props.activeChips.map(
                (c) => html`<button
                  type="button"
                  key=${c.label}
                  class="chip selected"
                  onClick=${c.onRemove}
                >
                  ${c.label}<i class="bi bi-x" />
                </button>`,
              )}
              <button
                type="button"
                class="btn-link"
                onClick=${props.onClearAll}
              >
                Clear all
              </button>
            </div>`
          : null
      }
      <div class=${'chip-filters' + (open ? '' : ' collapsed')}>
        ${props.children}
      </div>
    </div>
  `;
}
