import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import { html } from '../../public/app/lib/html.js';
import { DashboardPage } from '../../public/app/pages/DashboardPage.js';
import { authState } from '../../public/app/auth/auth.js';
import { mockFetch, makeTask } from './helpers.js';

/** @param {number} runtime_hours */
function logRow(id, over) {
  return Object.assign(
    {
      id,
      task_id: 1,
      title: null,
      maintenance_date: '2026-05-0' + id + 'T00:00:00.000Z',
      runtime_hours: null,
      notes: null,
      logged_by: 'admin',
      created_at: '2026-05-0' + id + 'T00:00:00.000Z',
      task_slug: 'oil-change',
      task_name: 'Oil change',
      tags: [],
      equipment_id: null,
      equipment_slug: null,
      equipment_name: null,
    },
    over || {},
  );
}

function routes(over) {
  const o = over || {};
  return [
    {
      match: (m, u) =>
        m === 'GET' &&
        u.indexOf('/api/tasks?') !== -1 &&
        u.indexOf('status=overdue') !== -1,
      body: {
        data: o.overdueTasks || [
          makeTask({ id: 11, slug: 'a', name: 'Overdue A', status: 'overdue' }),
        ],
        total: o.overdue === undefined ? 2 : o.overdue,
        page: 1,
        pageSize: 3,
      },
    },
    {
      match: (m, u) =>
        m === 'GET' &&
        u.indexOf('/api/tasks?') !== -1 &&
        u.indexOf('status=due_soon') !== -1,
      body: {
        data: o.dueSoonTasks || [
          makeTask({ id: 22, slug: 'b', name: 'Soon B', status: 'due_soon' }),
        ],
        total: o.dueSoon === undefined ? 1 : o.dueSoon,
        page: 1,
        pageSize: 3,
      },
    },
    {
      match: (m, u) => m === 'GET' && u.indexOf('/api/equipment') !== -1,
      body: {
        data: [],
        total: o.equipment === undefined ? 4 : o.equipment,
        page: 1,
        pageSize: 1,
      },
    },
    {
      match: (m, u) => m === 'GET' && u.indexOf('/api/logs') !== -1,
      body: {
        data: o.logs || [logRow(1), logRow(2), logRow(3)],
        total: (o.logs || [1, 1, 1]).length,
        page: 1,
        pageSize: 3,
      },
    },
  ];
}

describe('DashboardPage (§7.4)', () => {
  it('shows the three count tiles with links', async () => {
    mockFetch(routes());
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${DashboardPage} />`);

    await waitFor(() =>
      expect(document.querySelector('.dash-tile .dash-num').textContent).toBe(
        '2',
      ),
    );
    const tiles = Array.from(document.querySelectorAll('.dash-tile'));
    expect(tiles.map((t) => t.getAttribute('href'))).toEqual([
      '#/tasks?status=overdue',
      '#/tasks?status=due_soon',
      '#/equipment',
    ]);
    expect(tiles[0].querySelector('.dash-num').textContent).toBe('2');
    expect(tiles[1].querySelector('.dash-num').textContent).toBe('1');
    expect(tiles[2].querySelector('.dash-num').textContent).toBe('4');
    // semantic colour classes when the count is > 0
    expect(tiles[0].className).toContain('overdue');
    expect(tiles[1].className).toContain('due_soon');
  });

  it('lists the next tasks (overdue first) as links to their detail page', async () => {
    mockFetch(routes());
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${DashboardPage} />`);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Overdue A/ })).toBeTruthy(),
    );
    const links = Array.from(document.querySelectorAll('.dash-list li a')).map(
      (a) => a.getAttribute('href'),
    );
    // overdue A, then due-soon B, then the task-linked recent log entry
    expect(links.slice(0, 2)).toEqual(['#/tasks/a', '#/tasks/b']);
    expect(screen.getByRole('link', { name: /Overdue A/ })).toBeTruthy();
  });

  it('recent log: task entries link, standalone entries are plain text', async () => {
    mockFetch(
      routes({
        logs: [
          logRow(1),
          logRow(2, {
            task_id: null,
            task_slug: null,
            task_name: null,
            title: 'Bought new charts',
          }),
        ],
      }),
    );
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${DashboardPage} />`);

    await waitFor(() =>
      expect(screen.getByText('Bought new charts')).toBeTruthy(),
    );
    expect(
      screen.queryByRole('link', { name: 'Bought new charts' }),
    ).toBeNull();
  });

  it('empty states', async () => {
    mockFetch(
      routes({
        overdue: 0,
        dueSoon: 0,
        equipment: 0,
        overdueTasks: [],
        dueSoonTasks: [],
        logs: [],
      }),
    );
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${DashboardPage} />`);

    await waitFor(() =>
      expect(screen.getByText('Nothing due right now.')).toBeTruthy(),
    );
    expect(screen.getByText('No maintenance logged yet.')).toBeTruthy();
    expect(document.querySelector('.dash-tile').className.trim()).toBe(
      'dash-tile',
    );
  });
});
