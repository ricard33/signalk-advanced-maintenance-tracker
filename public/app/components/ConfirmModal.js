import { html } from '../lib/html.js';
import { tr } from '../lib/i18n.js';
import { useState } from '../../vendor/preact-hooks.js';
import { Modal } from './Modal.js';
import { FormError } from './FormError.js';

/**
 * Simple confirmation modal (§7.5, delete flows).
 * @param {{
 *   title: string,
 *   message: any,
 *   confirmLabel?: string,
 *   onConfirm: () => Promise<void>|void,
 *   onClose: () => void,
 * }} props
 */
export function ConfirmModal(props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await props.onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Operation failed'));
      setBusy(false);
    }
  };

  const footer = html`
    <button type="button" class="btn" onClick=${props.onClose} disabled=${busy}>
      ${tr('Cancel')}
    </button>
    <button
      type="button"
      class="btn btn-danger"
      onClick=${confirm}
      disabled=${busy}
    >
      ${busy ? tr('Working…') : props.confirmLabel || tr('Delete')}
    </button>
  `;

  return html`
    <${Modal}
      title=${props.title}
      narrow
      onClose=${props.onClose}
      footer=${footer}
    >
      <${FormError} message=${error} />
      <p style="margin:0">${props.message}</p>
    <//>
  `;
}
