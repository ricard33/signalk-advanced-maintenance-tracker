import { html } from '../lib/html.js';
import { lang, setLang } from '../lib/i18n.js';

/**
 * Header language switch (§7.11). Shows the current language's code; its
 * tooltip is written in the language it switches to, so it reads right to the
 * person who needs it.
 */
export function LangToggle() {
  const current = lang.value;
  const label = current === 'fr' ? 'Switch to English' : 'Passer en français';
  return html`
    <button
      type="button"
      class="btn-icon lang-toggle"
      aria-label=${label}
      title=${label}
      onClick=${() => setLang(current === 'fr' ? 'en' : 'fr')}
    >
      ${current.toUpperCase()}
    </button>
  `;
}
