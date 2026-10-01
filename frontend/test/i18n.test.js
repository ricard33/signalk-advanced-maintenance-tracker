import { describe, it, expect, beforeEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/preact';
import { html } from '../../public/app/lib/html.js';
import { lang, setLang, tr } from '../../public/app/lib/i18n.js';
import { fr } from '../../public/app/i18n/fr.js';
import { LangToggle } from '../../public/app/components/LangToggle.js';
import { StatusBadge } from '../../public/app/components/StatusBadge.js';
import {
  formatElapsedTime,
  formatRemainingHours,
  formatRemainingTime,
  formatRuntimeInterval,
  formatTimeInterval,
  statusLabel,
} from '../../public/app/lib/format.js';

// vitest runs with cwd = frontend/
const APP_DIR = join(process.cwd(), '..', 'public', 'app');
const DAY = 24 * 3600 * 1000;

/** Every .js file under public/app except the dictionaries themselves. */
function sourceFiles(dir) {
  let files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== 'i18n') files = files.concat(sourceFiles(full));
    } else if (name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

/** The literal first argument of every tr() call in the app. */
function usedKeys() {
  const keys = new Set();
  const call = /\btr\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  for (const file of sourceFiles(APP_DIR)) {
    const source = readFileSync(file, 'utf8');
    let m;
    while ((m = call.exec(source))) {
      const raw = m[1] !== undefined ? m[1] : m[2];
      keys.add(raw.replace(/\\(.)/g, '$1'));
    }
  }
  return keys;
}

describe('i18n (§7.11)', () => {
  beforeEach(() => {
    localStorage.removeItem('smt-lang');
  });

  it('falls back to the English key and fills placeholders', () => {
    expect(tr('Log in')).toBe('Log in');
    expect(tr('Tasks ({n})', { n: 3 })).toBe('Tasks (3)');
    lang.value = 'fr';
    expect(tr('Log in')).toBe('Connexion');
    expect(tr('Tasks ({n})', { n: 3 })).toBe('Tâches (3)');
    expect(tr('not in the dictionary')).toBe('not in the dictionary');
  });

  it('has a French entry for every string the app translates, and no stale ones', () => {
    const used = usedKeys();
    const missing = Array.from(used).filter((k) => fr[k] === undefined);
    const stale = Object.keys(fr).filter((k) => !used.has(k));
    expect(missing).toEqual([]);
    expect(stale).toEqual([]);
  });

  it('keeps the placeholders of each string in its translation', () => {
    const names = (s) => (s.match(/\{\w+\}/g) || []).sort();
    for (const key of Object.keys(fr)) {
      expect(names(fr[key]), key).toEqual(names(key));
    }
  });

  it('translates statuses, durations and intervals', () => {
    lang.value = 'fr';
    expect(statusLabel('overdue')).toBe('Échue');
    expect(statusLabel('due_soon')).toBe('Échéance proche');
    expect(formatRemainingTime(3 * DAY)).toBe('3 jours');
    expect(formatRemainingTime(-1 * DAY)).toBe('en retard de 1 jour');
    expect(formatRemainingHours(-20)).toBe('en retard de 20 h');
    expect(formatElapsedTime(-3 * DAY)).toBe('dans 3 jours');
    expect(formatTimeInterval(2, 'weeks')).toBe('toutes les 2 semaines');
    expect(formatTimeInterval(12, 'months')).toBe('tous les 12 mois');
    expect(formatRuntimeInterval(200)).toBe('toutes les 200 h');
  });

  it('the header switch flips the language, re-renders and remembers it', () => {
    render(html`<${LangToggle} /><${StatusBadge} status="overdue" />`);
    expect(screen.getByText('Overdue')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Passer en français' }));
    expect(lang.value).toBe('fr');
    expect(screen.getByText('Échue')).toBeTruthy();
    expect(localStorage.getItem('smt-lang')).toBe('fr');
    expect(document.documentElement.getAttribute('lang')).toBe('fr');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(screen.getByText('Overdue')).toBeTruthy();
    setLang('en');
  });
});
