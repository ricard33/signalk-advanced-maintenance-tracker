import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { html } from '../../public/app/lib/html.js';
import { FilterBar } from '../../public/app/components/FilterBar.js';

// jsdom has no window.matchMedia, so FilterBar mounts open: the wrapped chip
// rows render exactly as the pages' own tests expect.

describe('FilterBar (§7.4)', () => {
  it('renders the toggle open with the chip rows shown when there is no matchMedia', () => {
    const { container } = render(
      html`<${FilterBar} count=${0} activeChips=${[]} onClearAll=${() => {}}>
        <div class="chips"><span>hi</span></div>
      <//>`,
    );
    const toggle = screen.getByRole('button', { name: /Filters/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.chip-filters').className).not.toContain(
      'collapsed',
    );
    expect(container.querySelector('.filter-active')).toBeNull();
  });

  it('shows the active count in the toggle label', () => {
    render(
      html`<${FilterBar}
        count=${2}
        activeChips=${[
          { label: 'A', onRemove: () => {} },
          { label: 'B', onRemove: () => {} },
        ]}
        onClearAll=${() => {}}
      >
        <div />
      <//>`,
    );
    expect(screen.getByRole('button', { name: /Filters \(2\)/ })).toBeTruthy();
  });

  it('collapses the chip rows on toggle click', () => {
    const { container } = render(
      html`<${FilterBar} count=${0} activeChips=${[]} onClearAll=${() => {}}>
        <div class="chips" />
      <//>`,
    );
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const toggle = screen.getByRole('button', { name: /Filters/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.chip-filters').className).toContain(
      'collapsed',
    );
  });

  it('renders removable active chips and Clear all once collapsed with a count', () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    render(
      html`<${FilterBar}
        count=${1}
        activeChips=${[{ label: 'Port engine', onRemove }]}
        onClearAll=${onClearAll}
      >
        <div class="chips" />
      <//>`,
    );
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.click(screen.getByRole('button', { name: /Port engine/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
