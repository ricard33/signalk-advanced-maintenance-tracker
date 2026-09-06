/**
 * Equipment create/edit form (§7.5). On create the slug is a live preview
 * derived from the name until edited; on edit it is an editable field with a
 * deep-link warning. Equipment models a boat component (engine, hull, mast,
 * instrument, safety gear) that is maintained or repaired.
 */
import { html } from '../lib/html.js';
import { useState } from '../../vendor/preact-hooks.js';
import { Modal } from './Modal.js';
import { FormError } from './FormError.js';
import { MarkdownView } from './MarkdownView.js';
import { TagInput } from './TagInput.js';
import { createEquipment, updateEquipment, useTags } from '../api/hooks.js';
import { slugify } from '../lib/slug.js';
import { toDateInput } from '../lib/format.js';
import { toast } from '../lib/toasts.js';

/** @typedef {import('../types.js').EquipmentDTO} EquipmentDTO */
/** @typedef {import('../types.js').EquipmentInput} EquipmentInput */

/**
 * @param {{ equipment: EquipmentDTO|null, onClose: () => void, onSaved?: (e: EquipmentDTO) => void }} props
 */
export function EquipmentFormModal(props) {
  const eq = props.equipment || null;
  const isEdit = !!eq;

  const [name, setName] = useState(eq ? eq.name : '');
  const [slug, setSlug] = useState(eq ? eq.slug : '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(
    eq && eq.description ? eq.description : '',
  );
  const [preview, setPreview] = useState(false);
  const [brand, setBrand] = useState(eq && eq.brand ? eq.brand : '');
  const [model, setModel] = useState(eq && eq.model ? eq.model : '');
  const [serial, setSerial] = useState(
    eq && eq.serial_number ? eq.serial_number : '',
  );
  const [purchaseDate, setPurchaseDate] = useState(
    eq && eq.purchase_date ? toDateInput(eq.purchase_date) : '',
  );
  const [purchasePrice, setPurchasePrice] = useState(
    eq && eq.purchase_price !== null && eq.purchase_price !== undefined
      ? String(eq.purchase_price)
      : '',
  );
  const [warranty, setWarranty] = useState(
    eq && eq.warranty_until ? toDateInput(eq.warranty_until) : '',
  );
  const [tags, setTags] = useState(
    /** @type {string[]} */ (eq ? eq.tags.slice() : []),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const tagsRes = useTags();
  const suggestions = (
    tagsRes.data && tagsRes.data.data ? tagsRes.data.data : []
  ).map((/** @type {import('../types.js').TagDTO} */ t) => t.name);

  const effectiveSlug = slugTouched ? slug : slugify(name || '');
  const slugChanged = isEdit && eq && effectiveSlug !== eq.slug;

  /** @param {Event} e */
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    /** @type {EquipmentInput} */
    const input = {
      name: name.trim(),
      description: description.trim() ? description : null,
      brand: brand.trim() ? brand.trim() : null,
      model: model.trim() ? model.trim() : null,
      serial_number: serial.trim() ? serial.trim() : null,
      purchase_date: purchaseDate || null,
      warranty_until: warranty || null,
      tags: tags,
    };
    if (purchasePrice.trim() !== '') {
      const price = Number(purchasePrice);
      if (!isFinite(price) || price < 0) {
        setError('Purchase price must be a non-negative number.');
        return;
      }
      input.purchase_price = price;
    } else {
      input.purchase_price = null;
    }
    if (isEdit && eq) {
      if (slugChanged) input.slug = effectiveSlug;
    } else if (slugTouched && slug.trim()) {
      input.slug = slug;
    }

    setBusy(true);
    try {
      const saved =
        isEdit && eq
          ? await updateEquipment(eq.slug, input)
          : await createEquipment(input);
      toast(isEdit ? 'Equipment updated.' : 'Equipment added.', 'success');
      if (props.onSaved) props.onSaved(saved);
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setBusy(false);
    }
  };

  const footer = html`
    <button type="button" class="btn" onClick=${props.onClose} disabled=${busy}>
      Cancel
    </button>
    <button
      type="submit"
      form="equipment-form"
      class="btn btn-primary"
      disabled=${busy}
    >
      ${busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add equipment'}
    </button>
  `;

  return html`
    <${Modal}
      title=${isEdit ? 'Edit equipment' : 'New equipment'}
      onClose=${props.onClose}
      footer=${footer}
    >
      <form id="equipment-form" onSubmit=${onSubmit}>
        <${FormError} message=${error} />

        <div class="field">
          <label class="field-label" for="equipment-name">Name</label>
          <input
            id="equipment-name"
            class="input"
            value=${name}
            onInput=${(/** @type {any} */ e) => setName(e.currentTarget.value)}
          />
        </div>

        <div class="field">
          <label class="field-label" for="equipment-slug">Slug</label>
          <input
            id="equipment-slug"
            class="input slug-preview"
            value=${effectiveSlug}
            onInput=${(/** @type {any} */ e) => {
              setSlugTouched(true);
              setSlug(e.currentTarget.value);
            }}
          />
          ${
            slugChanged
              ? html`<div class="field-hint">
                  <i class="bi bi-exclamation-triangle" /> Changing the slug
                  breaks existing deep links to this equipment.
                </div>`
              : html`<div class="field-hint">Used in the equipment's URL.</div>`
          }
        </div>

        <div class="field">
          <label class="field-label" for="equipment-description">
            Description (markdown)${' '}
            <button
              type="button"
              class="btn-link"
              onClick=${() => setPreview(!preview)}
            >
              ${preview ? 'edit' : 'preview'}
            </button>
          </label>
          ${
            preview
              ? html`<div class="card">
                  <${MarkdownView}
                    markdown=${description || '_Nothing to preview._'}
                  />
                </div>`
              : html`<textarea
                  id="equipment-description"
                  class="textarea"
                  value=${description}
                  onInput=${(/** @type {any} */ e) => setDescription(e.currentTarget.value)}
                />`
          }
        </div>

        <div class="field-row">
          <div class="field">
            <label class="field-label" for="equipment-brand">Brand</label>
            <input
              id="equipment-brand"
              class="input"
              value=${brand}
              onInput=${(/** @type {any} */ e) => setBrand(e.currentTarget.value)}
            />
          </div>
          <div class="field">
            <label class="field-label" for="equipment-model">Model</label>
            <input
              id="equipment-model"
              class="input"
              value=${model}
              onInput=${(/** @type {any} */ e) => setModel(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class="field">
          <label class="field-label" for="equipment-serial">Serial number</label>
          <input
            id="equipment-serial"
            class="input"
            value=${serial}
            onInput=${(/** @type {any} */ e) => setSerial(e.currentTarget.value)}
          />
        </div>

        <div class="field-row">
          <div class="field">
            <label class="field-label" for="equipment-purchase-date">
              Purchase date
            </label>
            <input
              id="equipment-purchase-date"
              class="input"
              type="date"
              value=${purchaseDate}
              onInput=${(/** @type {any} */ e) => setPurchaseDate(e.currentTarget.value)}
            />
          </div>
          <div class="field">
            <label class="field-label" for="equipment-price">
              Purchase price
            </label>
            <input
              id="equipment-price"
              class="input"
              type="number"
              min="0"
              step="any"
              value=${purchasePrice}
              onInput=${(/** @type {any} */ e) => setPurchasePrice(e.currentTarget.value)}
            />
          </div>
        </div>

        <div class="field">
          <label class="field-label" for="equipment-warranty">
            Warranty until
          </label>
          <input
            id="equipment-warranty"
            class="input"
            type="date"
            value=${warranty}
            onInput=${(/** @type {any} */ e) => setWarranty(e.currentTarget.value)}
          />
        </div>

        <div class="field">
          <label class="field-label">Tags</label>
          <${TagInput}
            value=${tags}
            onChange=${setTags}
            suggestions=${suggestions}
          />
        </div>
      </form>
    <//>
  `;
}
