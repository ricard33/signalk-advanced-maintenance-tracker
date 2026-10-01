/**
 * Footer auth control (§7.7): a plain "Log in" link when anonymous,
 * "Log out" when authenticated.
 */
import { html } from '../lib/html.js';
import { tr } from '../lib/i18n.js';
import { useAuth } from '../auth/auth.js';

export function AuthControl() {
  const auth = useAuth();
  if (!auth.isLoggedIn) {
    return html`
      <button type="button" class="btn-link" onClick=${auth.openLoginModal}>
        ${tr('Log in')}
      </button>
    `;
  }
  return html`
    <button type="button" class="btn-link" onClick=${() => auth.logout()}>
      ${tr('Log out')}
    </button>
  `;
}
