import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/preact';
import { html } from '../../public/app/lib/html.js';
import { App } from '../../public/app/app.js';
import { authState } from '../../public/app/auth/auth.js';
import { route, parseHash } from '../../public/app/lib/router.js';
import { mockFetch, apiRoutes } from './helpers.js';

describe('App routing (§7.1)', () => {
  it('renders the dashboard at / and the task list at /tasks', async () => {
    mockFetch([
      ...apiRoutes(),
      {
        match: (m, u) => m === 'GET' && u.indexOf('/api/health') !== -1,
        body: { version: '0.0.0-test' },
      },
    ]);
    authState.value = { checked: true, isLoggedIn: false, username: null };

    route.value = parseHash('#/');
    const { rerender } = render(html`<${App} />`);
    await waitFor(() => expect(screen.getByText('Overdue')).toBeTruthy());
    // the "Home" nav link is active
    const home = screen.getByRole('link', { name: 'Home' });
    expect(home.className).toContain('active');

    route.value = parseHash('#/tasks');
    rerender(html`<${App} />`);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search tasks…')).toBeTruthy(),
    );
    expect(screen.getByRole('link', { name: 'Tasks' }).className).toContain(
      'active',
    );
  });
});
