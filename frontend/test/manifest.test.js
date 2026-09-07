import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// vitest runs with cwd = frontend/
const publicDir = join(process.cwd(), '..', 'public') + '/';
const manifest = JSON.parse(
  readFileSync(publicDir + 'manifest.webmanifest', 'utf8'),
);

describe('manifest.webmanifest (§7.10)', () => {
  it('declares the fields a browser needs to offer install', () => {
    expect(typeof manifest.name).toBe('string');
    expect(typeof manifest.short_name).toBe('string');
    expect(manifest.display).toBe('standalone');
    expect(typeof manifest.background_color).toBe('string');
    expect(typeof manifest.theme_color).toBe('string');
  });

  it('keeps id / start_url / scope relative so it works under the plugin mount', () => {
    for (const key of ['id', 'start_url', 'scope']) {
      expect(manifest[key], key).toMatch(/^\.\.?\//);
    }
  });

  it('ships 192 and 512 png icons with both "any" and "maskable" purposes', () => {
    const has = (size) =>
      manifest.icons.some(
        (i) => i.sizes === size + 'x' + size && i.type === 'image/png',
      );
    expect(has(192)).toBe(true);
    expect(has(512)).toBe(true);

    const purposes = manifest.icons.map((i) => i.purpose || 'any').join(' ');
    expect(purposes).toMatch(/\bany\b/);
    expect(purposes).toMatch(/\bmaskable\b/);
  });

  it('points every icon at a file that exists under public/', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(publicDir + icon.src), icon.src).toBe(true);
    }
  });

  it('has shortcuts whose (pre-hash) target resolves under public/', () => {
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    for (const s of manifest.shortcuts) {
      expect(typeof s.name).toBe('string');
      expect(s.url).toMatch(/^\.\//);
      const path = s.url.split('#')[0].replace(/^\.\//, '');
      const target = path === '' ? 'index.html' : path;
      expect(existsSync(publicDir + target), s.url).toBe(true);
    }
  });
});
