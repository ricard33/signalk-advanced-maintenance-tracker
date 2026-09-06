import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import { html } from '../../public/app/lib/html.js';
import { EquipmentListPage } from '../../public/app/pages/EquipmentListPage.js';
import { authState } from '../../public/app/auth/auth.js';
import { route, parseHash } from '../../public/app/lib/router.js';
import { mockFetch, apiRoutes, makeEquipment } from './helpers.js';

describe('EquipmentListPage (§7.4)', () => {
  it('lists equipment with tags, counts, and a detail link', async () => {
    mockFetch(
      apiRoutes({
        equipment: [
          makeEquipment({
            name: 'Port engine',
            brand: 'Yanmar',
            tags: ['Engines'],
            task_count: 3,
            log_count: 1,
          }),
        ],
      }),
    );
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${EquipmentListPage} />`);
    await waitFor(() => expect(screen.getByText('Port engine')).toBeTruthy());
    expect(screen.getByText('Port engine').getAttribute('href')).toBe(
      '#/equipment/port-engine',
    );
    expect(screen.getByText('Yanmar')).toBeTruthy();
    expect(document.querySelector('.table td.cell-tags .tag').textContent).toBe(
      'Engines',
    );
  });

  it('logged out: no New Equipment button or row actions', async () => {
    mockFetch(apiRoutes({ equipment: [makeEquipment()] }));
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${EquipmentListPage} />`);
    await waitFor(() => expect(screen.getByText('Port engine')).toBeTruthy());
    expect(screen.queryByText('New Equipment')).toBeNull();
    expect(screen.queryByLabelText('Edit Port engine')).toBeNull();
  });

  it('logged in: opens the create modal from New Equipment', async () => {
    mockFetch(apiRoutes({ equipment: [], tags: [] }));
    authState.value = { checked: true, isLoggedIn: true, username: 'admin' };
    render(html`<${EquipmentListPage} />`);
    await waitFor(() => expect(screen.getByText('New Equipment')).toBeTruthy());
    fireEvent.click(screen.getByText('New Equipment'));
    expect(screen.getByText('New equipment')).toBeTruthy();
    expect(document.getElementById('equipment-form')).toBeTruthy();
  });

  it('filters by tag chip through the URL', async () => {
    const fn = mockFetch(
      apiRoutes({
        equipment: [],
        tags: [{ id: 1, name: 'Engines', count: 2 }],
      }),
    );
    route.value = parseHash('#/equipment');
    authState.value = { checked: true, isLoggedIn: false, username: null };
    render(html`<${EquipmentListPage} />`);
    await waitFor(() => expect(screen.getByText('Engines')).toBeTruthy());
    fireEvent.click(screen.getByText('Engines'));
    await waitFor(() => {
      const call = fn.mock.calls.find(
        (c) =>
          String(c[0]).indexOf('/api/equipment?') !== -1 &&
          String(c[0]).indexOf('tags=Engines') !== -1,
      );
      expect(call).toBeTruthy();
    });
  });
});
