import { html } from '../lib/html.js';
import { tr } from '../lib/i18n.js';
import { theme, toggleTheme } from '../lib/theme.js';

export function ThemeToggle() {
  const current = theme.value;
  return html`
    <button
      type="button"
      class="btn-icon"
      aria-label=${current === 'dark' ? tr('Switch to light theme') : tr('Switch to dark theme')}
      title=${current === 'dark' ? tr('Light theme') : tr('Dark theme')}
      onClick=${toggleTheme}
    >
      <i class=${'bi ' + (current === 'dark' ? 'bi-sun' : 'bi-moon-stars')} />
    </button>
  `;
}
