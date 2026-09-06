import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import { html } from '../../public/app/lib/html.js';
import { TaskFormModal } from '../../public/app/components/TaskFormModal.js';
import { mockFetch, makeTask, makeEquipment } from './helpers.js';

const BASE_ROUTES = [
  {
    match: (m, u) => m === 'GET' && u.indexOf('/api/tags') !== -1,
    body: { data: [] },
  },
  {
    match: (m, u) => m === 'GET' && u.indexOf('/api/health') !== -1,
    body: { defaults: { runtime_warning_hours: 10, time_warning_days: 7 } },
  },
  {
    match: (m, u) =>
      m === 'GET' && u.indexOf('/signalk/v1/api/vessels/self') !== -1,
    body: {},
  },
];

const equipmentRoute = (list) => ({
  match: (m, u) => m === 'GET' && u.indexOf('/api/equipment') !== -1,
  body: { data: list, total: list.length, page: 1, pageSize: 500 },
});

describe('TaskFormModal — equipment (§5.9)', () => {
  it('renders the equipment select with the task list as options', async () => {
    mockFetch([
      ...BASE_ROUTES,
      equipmentRoute([makeEquipment({ id: 4, name: 'Port engine' })]),
    ]);
    render(html`<${TaskFormModal} task=${null} onClose=${vi.fn()} />`);
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Port engine' })).toBeTruthy(),
    );
    expect(screen.getByRole('option', { name: '— None —' })).toBeTruthy();
  });

  it('picking an equipment pre-fills its tags and submits equipment_id', async () => {
    const fn = mockFetch([
      ...BASE_ROUTES,
      equipmentRoute([
        makeEquipment({
          id: 4,
          name: 'Port engine',
          tags: ['Engines', 'Port'],
        }),
      ]),
      {
        match: (m, u) => m === 'POST' && u.indexOf('/api/tasks') !== -1,
        status: 201,
        body: { id: 9, slug: 'oil' },
      },
    ]);
    const onClose = vi.fn();
    render(html`<${TaskFormModal} task=${null} onClose=${onClose} />`);
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Port engine' })).toBeTruthy(),
    );
    fireEvent.input(screen.getByLabelText('Name'), {
      target: { value: 'Oil change' },
    });
    fireEvent.input(screen.getByLabelText('Equipment'), {
      target: { value: '4' },
    });
    // the equipment's tags appear as chips
    await waitFor(() => expect(screen.getByText('Engines')).toBeTruthy());
    expect(screen.getByText('Port')).toBeTruthy();
    // give the recurring task an interval so it validates
    fireEvent.input(screen.getByLabelText('Time interval'), {
      target: { value: '6' },
    });
    fireEvent.submit(document.getElementById('task-form'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const call = fn.mock.calls.find((c) => c[1] && c[1].method === 'POST');
    const body = JSON.parse(call[1].body);
    expect(body.equipment_id).toBe(4);
    expect(body.tags).toEqual(['Engines', 'Port']);
  });

  it('prefills the select from an edited task', async () => {
    mockFetch([
      ...BASE_ROUTES,
      equipmentRoute([makeEquipment({ id: 4, name: 'Port engine' })]),
    ]);
    render(
      html`<${TaskFormModal}
        task=${makeTask({ equipment_id: 4, equipment_name: 'Port engine', equipment_slug: 'port-engine' })}
        onClose=${vi.fn()}
      />`,
    );
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Port engine' })).toBeTruthy(),
    );
    expect(
      /** @type {HTMLSelectElement} */ (screen.getByLabelText('Equipment'))
        .value,
    ).toBe('4');
  });
});
