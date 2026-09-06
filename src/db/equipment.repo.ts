import type { DatabaseSync } from 'node:sqlite';
import { EquipmentRow } from '../types';

export interface NewEquipment {
  slug: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  warranty_until: string | null;
}

const COLUMNS = `id, slug, name, description, brand, model, serial_number,
  purchase_date, purchase_price, warranty_until, created_at, updated_at`;

export class EquipmentRepo {
  constructor(private db: DatabaseSync) {}

  create(e: NewEquipment, nowIso: string): EquipmentRow {
    const result = this.db
      .prepare(
        `INSERT INTO equipment (slug, name, description, brand, model,
           serial_number, purchase_date, purchase_price, warranty_until,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.slug,
        e.name,
        e.description,
        e.brand,
        e.model,
        e.serial_number,
        e.purchase_date,
        e.purchase_price,
        e.warranty_until,
        nowIso,
        nowIso,
      );
    return this.getById(Number(result.lastInsertRowid))!;
  }

  getById(id: number): EquipmentRow | undefined {
    return this.db
      .prepare(`SELECT ${COLUMNS} FROM equipment WHERE id = ?`)
      .get(id) as EquipmentRow | undefined;
  }

  getBySlug(slug: string): EquipmentRow | undefined {
    return this.db
      .prepare(`SELECT ${COLUMNS} FROM equipment WHERE slug = ?`)
      .get(slug) as EquipmentRow | undefined;
  }

  /** Stable total order (name, then id) so successive requests don't reshuffle. */
  list(): EquipmentRow[] {
    return this.db
      .prepare(
        `SELECT ${COLUMNS} FROM equipment ORDER BY name COLLATE NOCASE, id`,
      )
      .all() as unknown as EquipmentRow[];
  }

  /** One query, id -> row, for resolving equipment on list DTOs. */
  byId(): Map<number, EquipmentRow> {
    const rows = this.list();
    const map = new Map<number, EquipmentRow>();
    for (const r of rows) map.set(r.id, r);
    return map;
  }

  slugExists(slug: string, excludeId?: number): boolean {
    const row =
      excludeId != null
        ? this.db
            .prepare(`SELECT 1 AS x FROM equipment WHERE slug = ? AND id != ?`)
            .get(slug, excludeId)
        : this.db
            .prepare(`SELECT 1 AS x FROM equipment WHERE slug = ?`)
            .get(slug);
    return row !== undefined;
  }

  update(id: number, e: NewEquipment, nowIso: string): void {
    this.db
      .prepare(
        `UPDATE equipment SET slug = ?, name = ?, description = ?, brand = ?,
           model = ?, serial_number = ?, purchase_date = ?, purchase_price = ?,
           warranty_until = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        e.slug,
        e.name,
        e.description,
        e.brand,
        e.model,
        e.serial_number,
        e.purchase_date,
        e.purchase_price,
        e.warranty_until,
        nowIso,
        id,
      );
  }

  delete(id: number): void {
    this.db.prepare(`DELETE FROM equipment WHERE id = ?`).run(id);
  }

  count(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS n FROM equipment`)
      .get() as {
      n: number;
    };
    return row.n;
  }

  /** equipment_id -> { tasks, logs } reference counts, one pair of queries. */
  linkCounts(): Map<number, { tasks: number; logs: number }> {
    const map = new Map<number, { tasks: number; logs: number }>();
    const bump = (id: number, key: 'tasks' | 'logs', n: number) => {
      const entry = map.get(id) ?? { tasks: 0, logs: 0 };
      entry[key] = n;
      map.set(id, entry);
    };
    const taskRows = this.db
      .prepare(
        `SELECT equipment_id AS id, COUNT(*) AS n FROM tasks
         WHERE equipment_id IS NOT NULL GROUP BY equipment_id`,
      )
      .all() as unknown as { id: number; n: number }[];
    for (const r of taskRows) bump(r.id, 'tasks', r.n);
    const logRows = this.db
      .prepare(
        `SELECT equipment_id AS id, COUNT(*) AS n FROM log_entries
         WHERE equipment_id IS NOT NULL GROUP BY equipment_id`,
      )
      .all() as unknown as { id: number; n: number }[];
    for (const r of logRows) bump(r.id, 'logs', r.n);
    return map;
  }
}
