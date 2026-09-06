import { describe, expect, it } from 'vitest';
import { openDatabase } from './database';
import { EquipmentRepo, NewEquipment } from './equipment.repo';

const NOW = '2026-07-11T12:00:00.000Z';

function base(overrides: Partial<NewEquipment> = {}): NewEquipment {
  return {
    slug: 'port-engine',
    name: 'Port engine',
    description: null,
    brand: null,
    model: null,
    serial_number: null,
    purchase_date: null,
    purchase_price: null,
    warranty_until: null,
    ...overrides,
  };
}

function setup() {
  const db = openDatabase(':memory:');
  return { db, repo: new EquipmentRepo(db) };
}

describe('EquipmentRepo', () => {
  it('starts empty', () => {
    const { repo } = setup();
    expect(repo.list()).toEqual([]);
    expect(repo.count()).toBe(0);
  });

  it('creates, reads back by id and slug, and preserves every column', () => {
    const { repo } = setup();
    const row = repo.create(
      base({
        brand: 'Yanmar',
        model: '3YM30',
        serial_number: 'ABC-123',
        purchase_date: '2020-05-01T00:00:00.000Z',
        purchase_price: 8500,
        warranty_until: '2023-05-01T00:00:00.000Z',
      }),
      NOW,
    );
    expect(row.id).toBe(1);
    expect(repo.getBySlug('port-engine')).toEqual(row);
    expect(repo.getById(1)?.brand).toBe('Yanmar');
    expect(repo.getById(1)?.purchase_price).toBe(8500);
    expect(row.created_at).toBe(NOW);
  });

  it('lists in a stable total order (name, then id)', () => {
    const { repo } = setup();
    repo.create(base({ slug: 'b', name: 'Bilge pump' }), NOW);
    repo.create(base({ slug: 'a1', name: 'Anchor' }), NOW);
    repo.create(base({ slug: 'a2', name: 'Anchor' }), NOW);
    expect(repo.list().map((e) => e.slug)).toEqual(['a1', 'a2', 'b']);
  });

  it('update rewrites the mutable columns and bumps updated_at', () => {
    const { repo } = setup();
    const row = repo.create(base(), NOW);
    repo.update(
      row.id,
      base({ name: 'Port engine (rebuilt)', brand: 'Yanmar' }),
      '2026-08-01T00:00:00.000Z',
    );
    const after = repo.getById(row.id)!;
    expect(after.name).toBe('Port engine (rebuilt)');
    expect(after.brand).toBe('Yanmar');
    expect(after.updated_at).toBe('2026-08-01T00:00:00.000Z');
  });

  it('slugExists honours the exclude id', () => {
    const { repo } = setup();
    const row = repo.create(base(), NOW);
    expect(repo.slugExists('port-engine')).toBe(true);
    expect(repo.slugExists('port-engine', row.id)).toBe(false);
    expect(repo.slugExists('nope')).toBe(false);
  });

  it('byId returns a lookup map', () => {
    const { repo } = setup();
    repo.create(base({ slug: 'a', name: 'A' }), NOW);
    repo.create(base({ slug: 'b', name: 'B' }), NOW);
    const map = repo.byId();
    expect(map.get(1)?.name).toBe('A');
    expect(map.get(2)?.name).toBe('B');
  });

  it('linkCounts sums linked tasks and log entries per equipment', () => {
    const { db, repo } = setup();
    repo.create(base({ slug: 'a', name: 'A' }), NOW);
    repo.create(base({ slug: 'b', name: 'B' }), NOW);
    db.prepare(
      `INSERT INTO tasks (slug, name, equipment_id, created_at, updated_at)
       VALUES ('t1', 'T1', 1, ?, ?), ('t2', 'T2', 1, ?, ?), ('t3', 'T3', 2, ?, ?)`,
    ).run(NOW, NOW, NOW, NOW, NOW, NOW);
    db.prepare(
      `INSERT INTO log_entries (task_id, maintenance_date, equipment_id, created_at)
       VALUES (1, ?, 1, ?)`,
    ).run(NOW, NOW);

    const counts = repo.linkCounts();
    expect(counts.get(1)).toEqual({ tasks: 2, logs: 1 });
    expect(counts.get(2)).toEqual({ tasks: 1, logs: 0 });
  });

  it('cascades equipment_tags and SET NULLs links on delete', () => {
    const { db, repo } = setup();
    const row = repo.create(base(), NOW);
    db.prepare(`INSERT INTO tags (name) VALUES ('Engines')`).run();
    db.prepare(
      `INSERT INTO equipment_tags (equipment_id, tag_id) VALUES (?, 1)`,
    ).run(row.id);
    db.prepare(
      `INSERT INTO tasks (slug, name, equipment_id, created_at, updated_at)
       VALUES ('t', 'T', ?, ?, ?)`,
    ).run(row.id, NOW, NOW);

    repo.delete(row.id);

    expect(
      (
        db.prepare(`SELECT COUNT(*) AS n FROM equipment_tags`).get() as {
          n: number;
        }
      ).n,
    ).toBe(0);
    expect(
      (
        db
          .prepare(`SELECT equipment_id AS e FROM tasks WHERE slug = 't'`)
          .get() as {
          e: number | null;
        }
      ).e,
    ).toBe(null);
  });
});
