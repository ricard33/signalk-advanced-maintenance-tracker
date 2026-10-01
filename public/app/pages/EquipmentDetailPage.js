/**
 * Equipment detail (§7.4): the component's fields + tags, plus the tasks and
 * log entries linked to it. Edit / delete affordances render only when logged
 * in (§7.7).
 */
import { html } from '../lib/html.js';
import { tr } from '../lib/i18n.js';
import { useState } from '../../vendor/preact-hooks.js';
import {
  useEquipment,
  useTasks,
  useLogs,
  deleteEquipment,
  deleteLog,
} from '../api/hooks.js';
import { useAuth } from '../auth/auth.js';
import {
  formatDate,
  formatHours,
  formatRemainingHours,
  formatRemainingTime,
} from '../lib/format.js';
import { navigate } from '../lib/router.js';
import { toast } from '../lib/toasts.js';
import { Table } from '../components/Table.js';
import { StatTable } from '../components/StatTable.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { MarkdownView } from '../components/MarkdownView.js';
import { EquipmentFormModal } from '../components/EquipmentFormModal.js';
import { LogEntryModal } from '../components/LogEntryModal.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

/** @typedef {import('../types.js').EquipmentDTO} EquipmentDTO */
/** @typedef {import('../types.js').TaskDTO} TaskDTO */
/** @typedef {import('../types.js').LogDTO} LogDTO */

/** @param {{ slug: string }} props */
export function EquipmentDetailPage(props) {
  const auth = useAuth();
  const eqRes = useEquipment(props.slug);
  const tasksRes = useTasks({ equipment: props.slug, pageSize: 200 });
  const logsRes = useLogs({ equipment: props.slug, pageSize: 200 });

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingEntry, setEditingEntry] = useState(
    /** @type {LogDTO|null} */ (null),
  );
  const [deletingEntry, setDeletingEntry] = useState(
    /** @type {LogDTO|null} */ (null),
  );

  const eq = eqRes.data;
  if (eqRes.error && !eq) {
    return html`<div class="error-box">
      ${tr('Failed to load equipment: {error}', { error: eqRes.error.message })}
    </div>`;
  }
  if (!eq) {
    return html`<div class="table-loading">${tr('Loading…')}</div>`;
  }

  const tasks = tasksRes.data ? tasksRes.data.data : [];
  const logs = logsRes.data ? logsRes.data.data : [];

  /** @type {import('../components/Table.js').Column[]} */
  const taskColumns = [
    {
      key: 'status',
      label: tr('Status'),
      render: (/** @type {TaskDTO} */ t) =>
        html`<${StatusBadge} status=${t.status} />`,
    },
    {
      key: 'name',
      label: tr('Name'),
      className: 'col-name',
      render: (/** @type {TaskDTO} */ t) =>
        html`<a href=${'#/tasks/' + encodeURIComponent(t.slug)}>${t.name}</a>`,
    },
    {
      key: 'remaining_runtime',
      label: tr('Runtime Left'),
      className: 'num hide-sm',
      render: (/** @type {TaskDTO} */ t) =>
        html`<span class=${'remaining ' + (t.runtime_status || '')}
          >${formatRemainingHours(t.remaining_runtime)}</span
        >`,
    },
    {
      key: 'remaining_time',
      label: tr('Time left'),
      className: 'num hide-sm',
      render: (/** @type {TaskDTO} */ t) =>
        html`<span class=${'remaining ' + (t.time_status || '')}
          >${formatRemainingTime(t.remaining_time_ms)}</span
        >`,
    },
  ];

  /** @type {import('../components/Table.js').Column[]} */
  const logColumns = [
    {
      key: 'task',
      label: tr('Task'),
      render: (/** @type {LogDTO} */ e) =>
        e.task_slug !== null
          ? html`<a href=${'#/tasks/' + encodeURIComponent(e.task_slug)}
              >${e.task_name}</a
            >`
          : e.title,
    },
    {
      key: 'maintenance_date',
      label: tr('Date'),
      className: 'num',
      render: (/** @type {LogDTO} */ e) => formatDate(e.maintenance_date),
    },
    {
      key: 'runtime_hours',
      label: tr('Runtime'),
      className: 'num hide-sm',
      render: (/** @type {LogDTO} */ e) => formatHours(e.runtime_hours),
    },
  ];
  if (auth.isLoggedIn) {
    logColumns.push({
      key: 'actions',
      label: '',
      className: 'actions',
      render: (/** @type {LogDTO} */ e) => html`
        <button
          type="button"
          class="btn-icon primary"
          aria-label=${tr('Edit log entry')}
          title=${tr('Edit')}
          onClick=${() => setEditingEntry(e)}
        >
          <i class="bi bi-pencil" />
        </button>
        <button
          type="button"
          class="btn-icon danger"
          aria-label=${tr('Delete log entry')}
          title=${tr('Delete')}
          onClick=${() => setDeletingEntry(e)}
        >
          <i class="bi bi-trash" />
        </button>
      `,
    });
  }

  return html`
    <div>
      <div class="page-header">
        <h1 class="page-title">
          ${eq.name}
          ${
            eq.tags.length
              ? html`<span class="chips">
                  ${eq.tags.map((tag) => html`<span key=${tag} class="tag">${tag}</span>`)}
                </span>`
              : null
          }
        </h1>
        ${
          auth.isLoggedIn
            ? html`
                <span class="page-actions">
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick=${() => setEditing(true)}
                  >
                    <i class="bi bi-pencil" />${tr('Edit')}
                  </button>
                  <button
                    type="button"
                    class="btn btn-danger"
                    onClick=${() => setDeleting(true)}
                  >
                    <i class="bi bi-trash" />${tr('Delete')}
                  </button>
                </span>
              `
            : null
        }
      </div>

      <div class="detail-grid">
        <div class="card">
          <h3>${tr('Details')}</h3>
          <${StatTable}
            rows=${[
              { label: tr('Brand'), value: eq.brand },
              { label: tr('Model'), value: eq.model },
              { label: tr('Serial number'), value: eq.serial_number },
              {
                label: tr('Purchased'),
                value: eq.purchase_date ? formatDate(eq.purchase_date) : null,
              },
              {
                label: tr('Price'),
                value:
                  eq.purchase_price !== null && eq.purchase_price !== undefined
                    ? String(eq.purchase_price)
                    : null,
              },
              {
                label: tr('Warranty until'),
                value: eq.warranty_until ? formatDate(eq.warranty_until) : null,
              },
            ]}
          />
          ${
            !eq.brand &&
            !eq.model &&
            !eq.serial_number &&
            !eq.purchase_date &&
            eq.purchase_price === null &&
            !eq.warranty_until
              ? html`<p class="muted" style="margin:0">${tr('No details recorded.')}</p>`
              : null
          }
        </div>

        ${
          eq.description
            ? html`<div class="card">
                <h3>${tr('Description')}</h3>
                <${MarkdownView} markdown=${eq.description} />
              </div>`
            : null
        }
      </div>

      <h2 class="page-title" style="font-size:17px">
        ${tr('Tasks ({n})', { n: tasks.length })}
      </h2>
      <${Table}
        columns=${taskColumns}
        rows=${tasks}
        loading=${tasksRes.loading}
        emptyMessage=${tr('No tasks linked to this equipment.')}
      />

      <h2 class="page-title" style="font-size:17px;margin-top:16px">
        ${tr('Log entries ({n})', { n: logs.length })}
      </h2>
      <${Table}
        columns=${logColumns}
        rows=${logs}
        renderDetail=${(/** @type {LogDTO} */ e) =>
          e.notes
            ? html`<div class="log-notes">
                <div class="log-notes-body">
                  <${MarkdownView} markdown=${e.notes} />
                </div>
              </div>`
            : null}
        loading=${logsRes.loading}
        emptyMessage=${tr('No log entries linked to this equipment.')}
      />

      ${
        editingEntry
          ? html`<${LogEntryModal}
              entry=${editingEntry}
              onClose=${() => setEditingEntry(null)}
            />`
          : null
      }
      ${
        deletingEntry
          ? html`<${ConfirmModal}
              title=${tr('Delete log entry')}
              message=${
                deletingEntry.task_id !== null
                  ? tr(
                      "Delete this log entry? The task's last-maintenance data will be recomputed.",
                    )
                  : tr('Delete this log entry? This cannot be undone.')
              }
              onConfirm=${async () => {
                await deleteLog(
                  deletingEntry.id,
                  deletingEntry.task_slug || undefined,
                );
                toast(tr('Log entry deleted.'), 'success');
                setDeletingEntry(null);
              }}
              onClose=${() => setDeletingEntry(null)}
            />`
          : null
      }

      ${
        editing
          ? html`<${EquipmentFormModal}
              equipment=${eq}
              onClose=${() => setEditing(false)}
              onSaved=${(/** @type {EquipmentDTO} */ saved) => {
                if (saved.slug !== props.slug)
                  navigate('/equipment/' + encodeURIComponent(saved.slug));
              }}
            />`
          : null
      }
      ${
        deleting
          ? html`<${ConfirmModal}
              title=${tr('Delete equipment')}
              message=${
                tr('Delete "{name}"?', { name: eq.name }) +
                ' ' +
                (eq.task_count || eq.log_count
                  ? tr(
                      '{tasks} task(s) and {logs} log entr(ies) will be unlinked (their history is kept).',
                      { tasks: eq.task_count, logs: eq.log_count },
                    )
                  : tr('This cannot be undone.'))
              }
              onConfirm=${async () => {
                await deleteEquipment(eq.slug);
                toast(tr('Equipment deleted.'), 'success');
                navigate('/equipment');
              }}
              onClose=${() => setDeleting(false)}
            />`
          : null
      }
    </div>
  `;
}
