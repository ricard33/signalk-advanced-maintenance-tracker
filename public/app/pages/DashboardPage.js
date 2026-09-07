/**
 * Home dashboard (§7.4): the boat's maintenance state at a glance. Three
 * clickable count tiles (overdue / due-soon tasks, equipment), the next few
 * tasks to do, and the latest log entries. Composes existing list endpoints —
 * no dedicated backend.
 */
import { html } from '../lib/html.js';
import { useTasks, useLogs, useEquipmentList } from '../api/hooks.js';
import {
  formatDate,
  formatRemainingHours,
  formatRemainingTime,
} from '../lib/format.js';
import { StatusBadge } from '../components/StatusBadge.js';

/** @typedef {import('../types.js').TaskDTO} TaskDTO */
/** @typedef {import('../types.js').LogDTO} LogDTO */

/** Compact "time left" for a task row: the merged time dimension, falling back
 * to runtime headroom, then a dash. @param {TaskDTO} t */
function remainingText(t) {
  if (t.remaining_time_ms !== null && t.remaining_time_ms !== undefined)
    return formatRemainingTime(t.remaining_time_ms);
  if (t.remaining_runtime !== null && t.remaining_runtime !== undefined)
    return formatRemainingHours(t.remaining_runtime);
  return '—';
}

export function DashboardPage() {
  const overdueRes = useTasks({ status: 'overdue', pageSize: 3 });
  const dueSoonRes = useTasks({ status: 'due_soon', pageSize: 3 });
  const equipmentRes = useEquipmentList({ pageSize: 1 });
  const logsRes = useLogs({ pageSize: 3 });

  const overdue = overdueRes.data ? overdueRes.data.total : 0;
  const dueSoon = dueSoonRes.data ? dueSoonRes.data.total : 0;
  const equipmentCount = equipmentRes.data ? equipmentRes.data.total : 0;

  const nextUp = (overdueRes.data ? overdueRes.data.data : [])
    .concat(dueSoonRes.data ? dueSoonRes.data.data : [])
    .slice(0, 3);
  const logs = logsRes.data ? logsRes.data.data : [];

  return html`
    <div>
      <div class="dash-tiles">
        <a
          class=${'dash-tile' + (overdue > 0 ? ' overdue' : '')}
          href="#/tasks?status=overdue"
        >
          <span class="dash-num">${overdue}</span>
          <span class="dash-label">Overdue</span>
        </a>
        <a
          class=${'dash-tile' + (dueSoon > 0 ? ' due_soon' : '')}
          href="#/tasks?status=due_soon"
        >
          <span class="dash-num">${dueSoon}</span>
          <span class="dash-label">Due soon</span>
        </a>
        <a class="dash-tile" href="#/equipment">
          <span class="dash-num">${equipmentCount}</span>
          <span class="dash-label">Equipment</span>
        </a>
      </div>

      <div class="dash-grid">
        <div class="card">
          <h3>Next up</h3>
          ${
            nextUp.length
              ? html`<ul class="dash-list">
                  ${nextUp.map(
                    (/** @type {TaskDTO} */ t) => html`<li key=${t.id}>
                      <a href=${'#/tasks/' + encodeURIComponent(t.slug)}>
                        <span class="dash-item-main">
                          <${StatusBadge} status=${t.status} />
                          <span class="dash-name">${t.name}</span>
                        </span>
                        <span class=${'remaining ' + (t.status || '')}
                          >${remainingText(t)}</span
                        >
                      </a>
                    </li>`,
                  )}
                </ul>`
              : html`<p class="dash-empty">Nothing due right now.</p>`
          }
        </div>

        <div class="card">
          <h3>Recent log</h3>
          ${
            logs.length
              ? html`<ul class="dash-list">
                  ${logs.map(
                    (/** @type {LogDTO} */ e) => html`<li key=${e.id}>
                      ${
                        e.task_slug !== null
                          ? html`<a
                              href=${'#/tasks/' + encodeURIComponent(e.task_slug)}
                            >
                              <span class="dash-item-main"
                                ><span class="dash-name">${e.task_name}</span></span
                              >
                              <span class="muted"
                                >${formatDate(e.maintenance_date)}</span
                              >
                            </a>`
                          : html`<div class="dash-row-static">
                              <span class="dash-item-main"
                                ><span class="dash-name">${e.title}</span></span
                              >
                              <span class="muted"
                                >${formatDate(e.maintenance_date)}</span
                              >
                            </div>`
                      }
                    </li>`,
                  )}
                </ul>`
              : html`<p class="dash-empty">No maintenance logged yet.</p>`
          }
        </div>
      </div>
    </div>
  `;
}
