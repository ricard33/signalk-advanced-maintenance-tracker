/**
 * Maintenance schedule (§7.4): the boat's whole recurring programme on one
 * page — every recurring task with its intervals, grouped by equipment. The
 * order is alphabetical throughout (equipment, then task) so the page reads
 * the same on every visit, whatever is due. Composes `GET /tasks` — no
 * dedicated backend.
 */
import { html } from '../lib/html.js';
import { useState, useRef } from '../../vendor/preact-hooks.js';
import { useTaskPages } from '../api/hooks.js';
import { formatDate, formatHours } from '../lib/format.js';
import { StatusBadge } from '../components/StatusBadge.js';

/** @typedef {import('../types.js').TaskDTO} TaskDTO */

/**
 * @typedef {Object} ScheduleGroup
 * @property {string|null} slug null = tasks linked to no equipment
 * @property {string|null} name
 * @property {TaskDTO[]} tasks
 */

/** The API's page-size ceiling (MAX_PAGE_SIZE in src/service.ts). */
const PAGE_SIZE = 20;

/**
 * Case-insensitive name order; the immutable id breaks ties so equal names
 * never swap between polls.
 * @param {{ name: string|null, id: number }} a
 * @param {{ name: string|null, id: number }} b
 */
function byName(a, b) {
  return (
    String(a.name).localeCompare(String(b.name), undefined, {
      sensitivity: 'base',
    }) || a.id - b.id
  );
}

/**
 * Active recurring tasks bucketed by equipment: groups A→Z with the
 * equipment-less tasks last, tasks A→Z within each group.
 * @param {TaskDTO[]} tasks
 * @returns {ScheduleGroup[]}
 */
export function groupSchedule(tasks) {
  /** @type {Record<string, { id: number, group: ScheduleGroup }>} */
  const byEquipment = {};
  /** @type {TaskDTO[]} */
  const unlinked = [];
  tasks.forEach((t) => {
    if (!t.is_recurring || t.is_archived) return;
    if (t.equipment_id === null || t.equipment_id === undefined) {
      unlinked.push(t);
      return;
    }
    const key = String(t.equipment_id);
    if (!byEquipment[key]) {
      byEquipment[key] = {
        id: t.equipment_id,
        group: { slug: t.equipment_slug, name: t.equipment_name, tasks: [] },
      };
    }
    byEquipment[key].group.tasks.push(t);
  });

  const groups = Object.keys(byEquipment)
    .map((key) => byEquipment[key])
    .sort((a, b) =>
      byName(
        { name: a.group.name, id: a.id },
        { name: b.group.name, id: b.id },
      ),
    )
    .map((entry) => entry.group);
  if (unlinked.length) groups.push({ slug: null, name: null, tasks: unlinked });
  groups.forEach((g) => g.tasks.sort(byName));
  return groups;
}

const COLUMN_COUNT = 5;

export function SchedulePage() {
  const [pageCount, setPageCount] = useState(1);
  const tasksRes = useTaskPages(
    { sort: 'name', pageSize: PAGE_SIZE },
    pageCount,
  );
  // Asking for one more page is a new resource that starts empty; keep showing
  // the list already on screen until the longer one arrives.
  const shown = useRef(
    /** @type {import('../types.js').Page<TaskDTO>|null} */ (null),
  );
  if (tasksRes.data) shown.current = tasksRes.data;
  const page = shown.current;

  if (tasksRes.error && !page) {
    return html`<div class="error-box">
      Failed to load the schedule: ${tasksRes.error.message}
    </div>`;
  }
  if (!page) {
    return html`<div class="table-loading">Loading…</div>`;
  }

  const groups = groupSchedule(page.data);
  const remaining = page.total - page.data.length;
  const loadingMore = !tasksRes.data;

  return html`
    <div>
      <div class="page-header">
        <h1 class="page-title">Maintenance schedule</h1>
      </div>
      <div class="table-wrap">
        <table class="table schedule-table">
          <thead>
            <tr>
              <th>Task</th>
              <th class="num">Runtime interval</th>
              <th class="num">Time interval</th>
              <th>Status</th>
              <th class="num">Last done</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(
              (g) => html`
                <tr key=${'group:' + (g.slug || '')} class="group-row">
                  <th colspan=${COLUMN_COUNT} scope="colgroup">
                    ${
                      g.slug !== null
                        ? html`<a
                            href=${'#/equipment/' + encodeURIComponent(g.slug)}
                            >${g.name}</a
                          >`
                        : 'No equipment'
                    }
                  </th>
                </tr>
                ${g.tasks.map(
                  (t) => html`<tr key=${t.id}>
                    <td class="col-name">
                      <a href=${'#/tasks/' + encodeURIComponent(t.slug)}
                        >${t.name}</a
                      >
                    </td>
                    <td class="num">
                      ${
                        t.runtime_interval !== null
                          ? 'every ' + formatHours(t.runtime_interval)
                          : '—'
                      }
                    </td>
                    <td class="num">
                      ${
                        t.time_interval !== null
                          ? 'every ' +
                            t.time_interval +
                            ' ' +
                            t.time_interval_unit
                          : '—'
                      }
                    </td>
                    <td><${StatusBadge} status=${t.status} /></td>
                    <td class="num">
                      ${t.last_maintenance ? formatDate(t.last_maintenance) : 'never'}
                    </td>
                  </tr>`,
                )}
              `,
            )}
          </tbody>
        </table>
        ${
          groups.length === 0
            ? html`<div class="table-empty">No recurring tasks yet.</div>`
            : null
        }
      </div>
      ${
        remaining > 0
          ? html`<div class="load-more">
              <span class="muted"
                >Showing ${page.data.length} of ${' ' + page.total} tasks.</span
              >
              <button
                type="button"
                class="btn"
                disabled=${loadingMore}
                onClick=${() => setPageCount(pageCount + 1)}
              >
                ${loadingMore ? 'Loading…' : 'Load more tasks'}
              </button>
            </div>`
          : null
      }
    </div>
  `;
}
