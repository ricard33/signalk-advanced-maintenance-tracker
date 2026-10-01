import { describe, it, expect } from 'vitest';
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from '@testing-library/preact';
import { html } from '../../public/app/lib/html.js';
import {
  SchedulePage,
  groupSchedule,
} from '../../public/app/pages/SchedulePage.js';
import { authState } from '../../public/app/auth/auth.js';
import { mockFetch, makeTask } from './helpers.js';

const port = {
  equipment_id: 1,
  equipment_slug: 'port-engine',
  equipment_name: 'Port engine',
};
const windlass = {
  equipment_id: 2,
  equipment_slug: 'anchor-windlass',
  equipment_name: 'anchor windlass',
};

function tasksRoute(tasks, total) {
  return [
    {
      match: (m, u) => m === 'GET' && u.indexOf('/api/tasks?') !== -1,
      body: {
        data: tasks,
        total: total === undefined ? tasks.length : total,
        page: 1,
        pageSize: 200,
      },
    },
  ];
}

describe('groupSchedule (§7.4)', () => {
  it('orders equipment then tasks alphabetically, unlinked tasks last', () => {
    const groups = groupSchedule([
      makeTask(Object.assign({ id: 1, name: 'Oil change' }, port)),
      makeTask({ id: 2, name: 'Check flares' }),
      makeTask(Object.assign({ id: 3, name: 'belt inspection' }, port)),
      makeTask(Object.assign({ id: 4, name: 'Grease gearbox' }, windlass)),
    ]);
    expect(groups.map((g) => g.name)).toEqual([
      'anchor windlass',
      'Port engine',
      null,
    ]);
    expect(groups[1].tasks.map((t) => t.name)).toEqual([
      'belt inspection',
      'Oil change',
    ]);
  });

  it('leaves out one-off todos and archived tasks', () => {
    const groups = groupSchedule([
      makeTask({ id: 1, name: 'Todo', is_recurring: false }),
      makeTask({ id: 2, name: 'Old', is_archived: true }),
    ]);
    expect(groups).toEqual([]);
  });
});

describe('SchedulePage (§7.4)', () => {
  it('lists recurring tasks under their equipment with intervals, status and last date', async () => {
    mockFetch(
      tasksRoute([
        makeTask(
          Object.assign(
            {
              id: 1,
              slug: 'oil-change',
              name: 'Oil change',
              status: 'overdue',
            },
            port,
          ),
        ),
        makeTask({
          id: 2,
          slug: 'check-flares',
          name: 'Check flares',
          runtime_interval: null,
          time_interval: 3,
          time_interval_unit: 'years',
          last_maintenance: null,
          status: 'pending',
        }),
      ]),
    );
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${SchedulePage} />`);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Oil change' })).toBeTruthy(),
    );

    // equipment heading links to the equipment page; unlinked group comes last
    const heading = screen.getByRole('link', { name: 'Port engine' });
    expect(heading.getAttribute('href')).toBe('#/equipment/port-engine');
    const rows = screen.getAllByRole('row');
    expect(
      rows.slice(1).map((r) => r.textContent.trim().split(/\s+/)[0]),
    ).toEqual(['Port', 'Oil', 'No', 'Check']);

    const oil = within(rows[2]);
    expect(oil.getByText('every 200 h')).toBeTruthy();
    expect(oil.getByText('every 12 months')).toBeTruthy();
    expect(oil.getByText('Overdue')).toBeTruthy();
    expect(oil.getByText('2026-01-15')).toBeTruthy();

    const flares = within(rows[4]);
    expect(flares.getByText('—')).toBeTruthy();
    expect(flares.getByText('every 3 years')).toBeTruthy();
    expect(flares.getByText('never')).toBeTruthy();
  });

  it('shows an empty state when nothing is recurring', async () => {
    mockFetch(tasksRoute([makeTask({ is_recurring: false })]));
    render(html`<${SchedulePage} />`);
    await waitFor(() =>
      expect(screen.getByText('No recurring tasks yet.')).toBeTruthy(),
    );
  });

  it('Load more fetches the next page and merges it into the list', async () => {
    const fn = mockFetch([
      {
        match: (m, u) =>
          m === 'GET' &&
          u.indexOf('/api/tasks?') !== -1 &&
          u.indexOf('page=2') !== -1,
        body: {
          data: [
            makeTask(
              Object.assign({ id: 2, slug: 'belt', name: 'Belt check' }, port),
            ),
          ],
          total: 2,
          page: 2,
          pageSize: 200,
        },
      },
      ...tasksRoute(
        [
          makeTask(
            Object.assign({ id: 1, slug: 'oil', name: 'Oil change' }, port),
          ),
        ],
        2,
      ),
    ]);
    render(html`<${SchedulePage} />`);
    await waitFor(() =>
      expect(screen.getByText(/Showing 1 of\s+2 tasks/)).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load more tasks' }));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Belt check' })).toBeTruthy(),
    );
    // merged and re-sorted under the same equipment, nothing left to load
    const rows = screen.getAllByRole('row');
    expect(
      rows.slice(1).map((r) => r.textContent.trim().split(/\s+/)[0]),
    ).toEqual(['Port', 'Belt', 'Oil']);
    expect(
      screen.queryByRole('button', { name: 'Load more tasks' }),
    ).toBeNull();
    expect(
      fn.mock.calls.some((c) => String(c[0]).indexOf('page=2') !== -1),
    ).toBe(true);
  });

  it('offers no Load more when everything fits in one page', async () => {
    mockFetch(tasksRoute([makeTask(port)]));
    render(html`<${SchedulePage} />`);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Port engine' })).toBeTruthy(),
    );
    expect(
      screen.queryByRole('button', { name: 'Load more tasks' }),
    ).toBeNull();
  });
});
