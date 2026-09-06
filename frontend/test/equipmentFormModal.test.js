import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import { html } from '../../public/app/lib/html.js';
import { EquipmentFormModal } from '../../public/app/components/EquipmentFormModal.js';
import { mockFetch, makeEquipment } from './helpers.js';

const TAGS_ROUTE = {
  match: (m, u) => m === 'GET' && u.indexOf('/api/tags') !== -1,
  body: { data: [] },
};

describe('EquipmentFormModal (§7.5)', () => {
  it('POSTs a new equipment with all fields and closes', async () => {
    const fn = mockFetch([
      TAGS_ROUTE,
      {
        match: (m, u) => m === 'POST' && u.indexOf('/api/equipment') !== -1,
        status: 201,
        body: { id: 5, slug: 'port-engine', name: 'Port engine' },
      },
    ]);
    const onClose = vi.fn();
    render(
      html`<${EquipmentFormModal} equipment=${null} onClose=${onClose} />`,
    );
    fireEvent.input(screen.getByLabelText('Name'), {
      target: { value: 'Port engine' },
    });
    fireEvent.input(screen.getByLabelText('Brand'), {
      target: { value: 'Yanmar' },
    });
    fireEvent.input(screen.getByLabelText('Purchase price'), {
      target: { value: '8500' },
    });
    fireEvent.submit(document.getElementById('equipment-form'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const call = fn.mock.calls.find((c) => c[1] && c[1].method === 'POST');
    const body = JSON.parse(call[1].body);
    expect(body.name).toBe('Port engine');
    expect(body.brand).toBe('Yanmar');
    expect(body.purchase_price).toBe(8500);
  });

  it('blocks an empty name and a negative price', async () => {
    mockFetch([TAGS_ROUTE]);
    render(
      html`<${EquipmentFormModal} equipment=${null} onClose=${vi.fn()} />`,
    );
    fireEvent.submit(document.getElementById('equipment-form'));
    await waitFor(() =>
      expect(screen.getByText('Name is required.')).toBeTruthy(),
    );

    fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'X' } });
    fireEvent.input(screen.getByLabelText('Purchase price'), {
      target: { value: '-3' },
    });
    fireEvent.submit(document.getElementById('equipment-form'));
    await waitFor(() =>
      expect(
        screen.getByText('Purchase price must be a non-negative number.'),
      ).toBeTruthy(),
    );
  });

  it('edits an existing equipment via PUT and prefills its fields', async () => {
    const fn = mockFetch([
      TAGS_ROUTE,
      {
        match: (m, u) =>
          m === 'PUT' && u.indexOf('/api/equipment/port-engine') !== -1,
        body: { id: 1, slug: 'port-engine', name: 'Port engine' },
      },
    ]);
    const onClose = vi.fn();
    render(
      html`<${EquipmentFormModal}
        equipment=${makeEquipment({ brand: 'Yanmar', tags: ['Engines'] })}
        onClose=${onClose}
      />`,
    );
    expect(screen.getByLabelText('Brand').value).toBe('Yanmar');
    expect(screen.getByText('Engines')).toBeTruthy();
    fireEvent.input(screen.getByLabelText('Model'), {
      target: { value: '3YM30' },
    });
    fireEvent.submit(document.getElementById('equipment-form'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const call = fn.mock.calls.find((c) => c[1] && c[1].method === 'PUT');
    expect(JSON.parse(call[1].body).model).toBe('3YM30');
  });
});
