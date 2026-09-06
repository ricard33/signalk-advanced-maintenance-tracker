/**
 * Equipment list (§7.4): the boat's components. Server-side
 * search/filter/sort/paging; create/edit/delete affordances render only when
 * logged in (§7.7).
 */
import { html } from '../lib/html.js';
import { useState, useEffect } from '../../vendor/preact-hooks.js';
import { useEquipmentList, useTags, deleteEquipment } from '../api/hooks.js';
import { useAuth } from '../auth/auth.js';
import { useListParams } from '../lib/useListParams.js';
import { Table } from '../components/Table.js';
import { Pagination } from '../components/Pagination.js';
import { EquipmentFormModal } from '../components/EquipmentFormModal.js';
import { ConfirmModal } from '../components/ConfirmModal.js';
import { toast } from '../lib/toasts.js';

/** @typedef {import('../types.js').EquipmentDTO} EquipmentDTO */

const PAGE_SIZE = 20;

export function EquipmentListPage() {
  const { params, update } = useListParams();
  const auth = useAuth();

  const page = parseInt(params.page || '1', 10) || 1;
  const search = params.search || '';
  const tagsCsv = params.tags || '';
  const sort = params.sort || '';
  const order = params.order || '';

  const [searchText, setSearchText] = useState(search);
  useEffect(() => {
    setSearchText(search);
  }, [search]);
  useEffect(() => {
    if (searchText === search) return undefined;
    const timer = setTimeout(
      () => update({ search: searchText, page: undefined }),
      300,
    );
    return () => clearTimeout(timer);
  }, [searchText]);

  const listRes = useEquipmentList({
    search: search || undefined,
    tags: tagsCsv || undefined,
    sort: sort || undefined,
    order: order || undefined,
    page: page,
    pageSize: PAGE_SIZE,
  });
  const tagsRes = useTags();

  /** @type {[EquipmentDTO|null|undefined, any]} undefined=closed, null=create */
  const [editor, setEditor] = useState(/** @type {any} */ (undefined));
  const [deleting, setDeleting] = useState(
    /** @type {EquipmentDTO|null} */ (null),
  );

  const selectedTags = tagsCsv ? tagsCsv.split(',').filter(Boolean) : [];
  /** @param {string} tag */
  const selectTag = (tag) =>
    update({
      tags: selectedTags.indexOf(tag) === -1 ? tag : undefined,
      page: undefined,
    });

  /** @param {string} key */
  const onSort = (key) => {
    if (sort === key) update({ order: order === 'asc' ? 'desc' : 'asc' });
    else update({ sort: key, order: 'asc' });
  };

  /** @type {import('../components/Table.js').Column[]} */
  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      className: 'col-name',
      render: (/** @type {EquipmentDTO} */ e) =>
        html`<a href=${'#/equipment/' + encodeURIComponent(e.slug)}
          >${e.name}</a
        >`,
    },
    {
      key: 'tags',
      label: 'Tags',
      className: 'cell-tags',
      render: (/** @type {EquipmentDTO} */ e) =>
        e.tags.length
          ? html`<div class="chips">
              ${e.tags.map((tag) => html`<span key=${tag} class="tag">${tag}</span>`)}
            </div>`
          : html`<span class="muted">—</span>`,
    },
    {
      key: 'brand',
      label: 'Brand',
      className: 'hide-sm',
      render: (/** @type {EquipmentDTO} */ e) =>
        e.brand || html`<span class="muted">—</span>`,
    },
    {
      key: 'model',
      label: 'Model',
      className: 'hide-sm',
      render: (/** @type {EquipmentDTO} */ e) =>
        e.model || html`<span class="muted">—</span>`,
    },
    {
      key: 'task_count',
      label: 'Tasks',
      className: 'num hide-sm',
      render: (/** @type {EquipmentDTO} */ e) => e.task_count,
    },
    {
      key: 'log_count',
      label: 'Log',
      className: 'num hide-sm',
      render: (/** @type {EquipmentDTO} */ e) => e.log_count,
    },
  ];
  if (auth.isLoggedIn) {
    columns.push({
      key: 'actions',
      label: '',
      className: 'actions',
      render: (/** @type {EquipmentDTO} */ e) => html`
        <button
          type="button"
          class="btn-icon primary"
          aria-label=${'Edit ' + e.name}
          title="Edit"
          onClick=${() => setEditor(e)}
        >
          <i class="bi bi-pencil" />
        </button>
        <button
          type="button"
          class="btn-icon danger"
          aria-label=${'Delete ' + e.name}
          title="Delete"
          onClick=${() => setDeleting(e)}
        >
          <i class="bi bi-trash" />
        </button>
      `,
    });
  }

  const tagList = tagsRes.data ? tagsRes.data.data : [];
  const pageData = listRes.data;

  return html`
    <div>
      <div class="toolbar">
        <div class="search-box">
          <i class="bi bi-search" />
          <input
            class="input"
            placeholder="Search equipment…"
            aria-label="Search equipment"
            value=${searchText}
            onInput=${(/** @type {any} */ e) => setSearchText(e.currentTarget.value)}
          />
        </div>
        ${
          auth.isLoggedIn
            ? html`
                <button
                  type="button"
                  class="btn btn-success toolbar-action"
                  onClick=${() => setEditor(null)}
                >
                  <i class="bi bi-plus-lg" />New Equipment
                </button>
              `
            : null
        }
      </div>

      ${
        tagList.length
          ? html`<div class="chip-filters">
              <div class="chips" role="group" aria-labelledby="eq-tag-filter-label">
                <span class="chips-label" id="eq-tag-filter-label">TAGS:</span>
                ${tagList.map(
                  (tag) => html`
                    <button
                      type="button"
                      key=${tag.name}
                      class=${'chip' + (selectedTags.indexOf(tag.name) !== -1 ? ' selected' : '')}
                      aria-pressed=${selectedTags.indexOf(tag.name) !== -1}
                      onClick=${() => selectTag(tag.name)}
                    >
                      ${tag.name}
                    </button>
                  `,
                )}
              </div>
            </div>`
          : null
      }

      ${
        listRes.error && !pageData
          ? html`<div class="error-box">
              Failed to load equipment: ${listRes.error.message}
            </div>`
          : html`
              <${Table}
                columns=${columns}
                rows=${pageData ? pageData.data : []}
                sort=${sort}
                order=${order}
                onSort=${onSort}
                loading=${listRes.loading}
                emptyMessage=${search || tagsCsv ? 'No equipment matches your filters.' : 'No equipment yet.'}
              />
              ${
                pageData
                  ? html`<${Pagination}
                      page=${pageData.page}
                      pageSize=${pageData.pageSize}
                      total=${pageData.total}
                      onPage=${(/** @type {number} */ p) => update({ page: p })}
                    />`
                  : null
              }
            `
      }

      ${
        editor !== undefined
          ? html`<${EquipmentFormModal}
              equipment=${editor}
              onClose=${() => setEditor(undefined)}
            />`
          : null
      }
      ${
        deleting
          ? html`<${ConfirmModal}
              title="Delete equipment"
              message=${
                'Delete "' +
                deleting.name +
                '"? ' +
                (deleting.task_count || deleting.log_count
                  ? deleting.task_count +
                    ' task(s) and ' +
                    deleting.log_count +
                    ' log entr(ies) will be unlinked (their history is kept).'
                  : 'This cannot be undone.')
              }
              onConfirm=${async () => {
                await deleteEquipment(deleting.slug);
                toast('Equipment deleted.', 'success');
                setDeleting(null);
              }}
              onClose=${() => setDeleting(null)}
            />`
          : null
      }
    </div>
  `;
}
