/**
 * Interface language (§7.11). English is the source language: the English
 * text is the lookup key, so `tr('Log in')` returns the active language's
 * string and falls back to the key itself — an untranslated string degrades to
 * English instead of to a blank or a key name.
 *
 * `tr()` reads the `lang` signal, so a component calling it while rendering
 * re-renders when the language changes.
 */
import { signal } from '../../vendor/signals.js';
import { fr } from '../i18n/fr.js';

/** @typedef {'en'|'fr'} Lang */

const STORAGE_KEY = 'smt-lang';

/** @type {Lang[]} */
export const LANGUAGES = ['en', 'fr'];

/** @type {Record<string, Record<string, string>>} */
const DICTIONARIES = { fr: fr };

/**
 * @param {string|null|undefined} tag BCP 47 tag ("fr-CA") or bare code
 * @returns {Lang|null}
 */
function supported(tag) {
  const code = String(tag || '')
    .slice(0, 2)
    .toLowerCase();
  return LANGUAGES.indexOf(/** @type {Lang} */ (code)) !== -1
    ? /** @type {Lang} */ (code)
    : null;
}

/** @returns {Lang} */
function initialLang() {
  let stored;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null; // storage can be blocked; fall through to the browser
  }
  const saved = supported(stored);
  if (saved) return saved;
  // The browser's preferred languages, most wanted first; the first one the
  // app speaks wins. Anything else is English.
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const wanted =
    nav && nav.languages && nav.languages.length
      ? nav.languages
      : [nav ? nav.language : ''];
  for (let i = 0; i < wanted.length; i++) {
    const match = supported(wanted[i]);
    if (match) return match;
  }
  return 'en';
}

/** @type {import('../../vendor/signals.js').Signal<Lang>} */
export const lang = signal(initialLang());

/**
 * Translate an English source string, filling `{name}` placeholders.
 * @param {string} key the English text
 * @param {Record<string, string|number|null|undefined>} [params]
 * @returns {string}
 */
export function tr(key, params) {
  const dict = DICTIONARIES[lang.value];
  const text = dict && dict[key] !== undefined ? dict[key] : key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, function (whole, name) {
    return params[name] === undefined || params[name] === null
      ? whole
      : String(params[name]);
  });
}

/** Keep <html lang> in step with the interface language. */
export function applyLang() {
  document.documentElement.setAttribute('lang', lang.value);
}

/** @param {Lang} next */
export function setLang(next) {
  lang.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // non-fatal: the choice just won't persist
  }
  applyLang();
}
