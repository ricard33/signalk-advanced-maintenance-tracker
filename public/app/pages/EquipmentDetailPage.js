/**
 * Equipment detail (§7.4): the component's fields + tags, plus the tasks and
 * log entries linked to it. Edit / delete affordances render only when logged
 * in (§7.7).
 */
import { html } from '../lib/html.js';
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
      Failed to load equipment: ${eqRes.error.message}
    </div>`;
  }
  if (!eq) {
    return html`<div class="table-loading">Loading…</div>`;
  }

  const tasks = tasksRes.data ? tasksRes.data.data : [];
  const logs = logsRes.data ? logsRes.data.data : [];

  /** @type {import('../components/Table.js').Column[]} */
  const taskColumns = [
    {
      key: 'status',
      label: 'Status',
      render: (/** @type {TaskDTO} */ t) =>
        html`<${StatusBadge} status=${t.status} />`,
    },
    {
      key: 'name',
      label: 'Name',
      className: 'col-name',
      render: (/** @type {TaskDTO} */ t) =>
        html`<a href=${'#/tasks/' + encodeURIComponent(t.slug)}>${t.name}</a>`,
    },
    {
      key: 'remaining_runtime',
      label: 'Runtime Left',
      className: 'num hide-sm',
      render: (/** @type {TaskDTO} */ t) =>
        html`<span class=${'remaining ' + (t.runtime_status || '')}
          >${formatRemainingHours(t.remaining_runtime)}</span
        >`,
    },
  ];

  /** @type {import('../components/Table.js').Column[]} */
  const logColumns = [
    {
      key: 'task',
      label: 'Task',
      render: (/** @type {LogDTO} */ e) =>
        e.task_slug !== null
          ? html`<a href=${'#/tasks/' + encodeURIComponent(e.task_slug)}
              >${e.task_name}</a
            >`
          : e.title,
    },
    {
      key: 'maintenance_date',
      label: 'Date',
      className: 'num',
      render: (/** @type {LogDTO} */ e) => formatDate(e.maintenance_date),
    },
    {
      key: 'runtime_hours',
      label: 'Runtime',
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
          aria-label="Edit log entry"
          title="Edit"
          onClick=${() => setEditingEntry(e)}
        >
          <i class="bi bi-pencil" />
        </button>
        <button
          type="button"
          class="btn-icon danger"
          aria-label="Delete log entry"
          title="Delete"
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
                    <i class="bi bi-pencil" />Edit
                  </button>
                  <button
                    type="button"
                    class="btn btn-danger"
                    onClick=${() => setDeleting(true)}
                  >
                    <i class="bi bi-trash" />Delete
                  </button>
                </span>
              `
            : null
        }
      </div>

      <div class="detail-grid">
        <div class="card">
          <h3>Details</h3>
          <${StatTable}
            rows=${[
              { label: 'Brand', value: eq.brand },
              { label: 'Model', value: eq.model },
              { label: 'Serial number', value: eq.serial_number },
              {
                label: 'Purchased',
                value: eq.purchase_date ? formatDate(eq.purchase_date) : null,
              },
              {
                label: 'Price',
                value:
                  eq.purchase_price !== null && eq.purchase_price !== undefined
                    ? String(eq.purchase_price)
                    : null,
              },
              {
                label: 'Warranty until',
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
              ? html`<p class="muted" style="margin:0">No details recorded.</p>`
              : null
          }
        </div>

        ${
          eq.description
            ? html`<div class="card">
                <h3>Description</h3>
                <${MarkdownView} markdown=${eq.description} />
              </div>`
            : null
        }
      </div>

      <h2 class="page-title" style="font-size:17px">
        Tasks (${tasks.length})
      </h2>
      <${Table}
        columns=${taskColumns}
        rows=${tasks}
        loading=${tasksRes.loading}
        emptyMessage="No tasks linked to this equipment."
      />

      <h2 class="page-title" style="font-size:17px;margin-top:16px">
        Log entries (${logs.length})
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
        emptyMessage="No log entries linked to this equipment."
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
              title="Delete log entry"
              message=${
                deletingEntry.task_id !== null
                  ? "Delete this log entry? The task's last-maintenance data will be recomputed."
                  : 'Delete this log entry? This cannot be undone.'
              }
              onConfirm=${async () => {
                await deleteLog(
                  deletingEntry.id,
                  deletingEntry.task_slug || undefined,
                );
                toast('Log entry deleted.', 'success');
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
              title="Delete equipment"
              message=${
                'Delete "' +
                eq.name +
                '"? ' +
                (eq.task_count || eq.log_count
                  ? eq.task_count +
                    ' task(s) and ' +
                    eq.log_count +
                    ' log entr(ies) will be unlinked (their history is kept).'
                  : 'This cannot be undone.')
              }
              onConfirm=${async () => {
                await deleteEquipment(eq.slug);
                toast('Equipment deleted.', 'success');
                navigate('/equipment');
              }}
              onClose=${() => setDeleting(false)}
            />`
          : null
      }
    </div>
  `;
}
