import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import { html } from '../../public/app/lib/html.js';
import { EquipmentDetailPage } from '../../public/app/pages/EquipmentDetailPage.js';
import { authState } from '../../public/app/auth/auth.js';
import { route, parseHash } from '../../public/app/lib/router.js';
import { mockFetch, makeEquipment, makeTask } from './helpers.js';

/** A task-linked log entry sitting on the equipment. */
function logEntry(overrides) {
  return Object.assign(
    {
      id: 9,
      task_id: 1,
      title: null,
      maintenance_date: '2026-05-01T00:00:00.000Z',
      runtime_hours: 1200,
      notes: null,
      logged_by: 'admin',
      created_at: '2026-05-01T00:00:00.000Z',
      task_slug: 'oil-change',
      task_name: 'Oil change',
      tags: [],
      equipment_id: 1,
      equipment_slug: 'port-engine',
      equipment_name: 'Port engine',
    },
    overrides || {},
  );
}

function routes(eq, tasks, logs) {
  return [
    {
      match: (m, u) => m === 'GET' && u.indexOf('/api/equipment/') !== -1,
      body: eq,
    },
    {
      match: (m, u) => m === 'GET' && u.indexOf('/api/tags') !== -1,
      body: { data: [] },
    },
    {
      match: (m, u) => m === 'GET' && u.indexOf('/api/tasks?') !== -1,
      body: {
        data: tasks || [],
        total: (tasks || []).length,
        page: 1,
        pageSize: 200,
      },
    },
    {
      match: (m, u) => m === 'GET' && u.indexOf('/api/logs') !== -1,
      body: {
        data: logs || [],
        total: (logs || []).length,
        page: 1,
        pageSize: 200,
      },
    },
  ];
}

describe('EquipmentDetailPage (§7.4)', () => {
  it('shows details, tags, and the linked tasks / log entries', async () => {
    mockFetch(
      routes(
        makeEquipment({
          name: 'Port engine',
          brand: 'Yanmar',
          model: '3YM30',
          tags: ['Engines'],
        }),
        [makeTask({ name: 'Oil change', slug: 'oil-change' })],
        [
          {
            id: 9,
            task_id: 1,
            title: null,
            maintenance_date: '2026-05-01T00:00:00.000Z',
            runtime_hours: 1200,
            notes: null,
            logged_by: 'admin',
            created_at: '2026-05-01T00:00:00.000Z',
            task_slug: 'oil-change',
            task_name: 'Oil change',
            tags: [],
            equipment_slug: 'port-engine',
            equipment_name: 'Port engine',
          },
        ],
      ),
    );
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${EquipmentDetailPage} slug="port-engine" />`);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Details' })).toBeTruthy(),
    );
    expect(screen.getByText('Yanmar')).toBeTruthy();
    expect(screen.getByText('3YM30')).toBeTruthy();
    expect(screen.getByText('Engines')).toBeTruthy();
    // linked task + log tables (the task name links from both tables)
    expect(
      screen.getAllByRole('link', { name: 'Oil change' }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tasks (1)')).toBeTruthy();
    expect(screen.getByText('Log entries (1)')).toBeTruthy();
  });

  it('logged in: Delete confirms and navigates back to the list', async () => {
    const fn = mockFetch([
      ...routes(makeEquipment({ name: 'Port engine' }), [], []),
      {
        match: (m, u) =>
          m === 'DELETE' && u.indexOf('/api/equipment/port-engine') !== -1,
        status: 204,
      },
    ]);
    route.value = parseHash('#/equipment/port-engine');
    authState.value = { checked: true, isLoggedIn: true, username: 'admin' };
    render(html`<${EquipmentDetailPage} slug="port-engine" />`);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Details' })).toBeTruthy(),
    );
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() =>
      expect(screen.getByText('Delete equipment')).toBeTruthy(),
    );
    // the modal's confirm button (the last "Delete" in the DOM)
    const deletes = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deletes[deletes.length - 1]);
    await waitFor(() => {
      const call = fn.mock.calls.find((c) => c[1] && c[1].method === 'DELETE');
      expect(call).toBeTruthy();
    });
    await waitFor(() => expect(location.hash).toBe('#/equipment'));
  });

  it('logged out: log rows have no edit/delete buttons', async () => {
    mockFetch(routes(makeEquipment({ name: 'Port engine' }), [], [logEntry()]));
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${EquipmentDetailPage} slug="port-engine" />`);
    await waitFor(() =>
      expect(screen.getByText('Log entries (1)')).toBeTruthy(),
    );
    expect(screen.queryByLabelText('Edit log entry')).toBeNull();
    expect(screen.queryByLabelText('Delete log entry')).toBeNull();
  });

  it('logged in: opens the edit modal for a log entry', async () => {
    mockFetch(routes(makeEquipment({ name: 'Port engine' }), [], [logEntry()]));
    authState.value = { checked: true, isLoggedIn: true, username: 'admin' };
    render(html`<${EquipmentDetailPage} slug="port-engine" />`);
    await waitFor(() =>
      expect(screen.getByLabelText('Edit log entry')).toBeTruthy(),
    );
    fireEvent.click(screen.getByLabelText('Edit log entry'));
    expect(document.getElementById('log-form')).toBeTruthy();
  });

  it('logged in: deletes a log entry via the confirm modal', async () => {
    const fn = mockFetch([
      ...routes(makeEquipment({ name: 'Port engine' }), [], [logEntry()]),
      {
        match: (m, u) => m === 'DELETE' && u.indexOf('/api/logs/9') !== -1,
        status: 204,
      },
    ]);
    authState.value = { checked: true, isLoggedIn: true, username: 'admin' };
    render(html`<${EquipmentDetailPage} slug="port-engine" />`);
    await waitFor(() =>
      expect(screen.getByLabelText('Delete log entry')).toBeTruthy(),
    );
    fireEvent.click(screen.getByLabelText('Delete log entry'));
    await waitFor(() =>
      expect(screen.getByText('Delete log entry')).toBeTruthy(),
    );
    const deletes = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deletes[deletes.length - 1]);
    await waitFor(() => {
      const call = fn.mock.calls.find(
        (c) =>
          c[1] &&
          c[1].method === 'DELETE' &&
          String(c[0]).indexOf('/api/logs/9') !== -1,
      );
      expect(call).toBeTruthy();
    });
  });
});
