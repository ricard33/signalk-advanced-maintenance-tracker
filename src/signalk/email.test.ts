import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_EMAIL_OPTIONS, EmailOptions, withDefaults } from '../config';
import { migrate } from '../db/database';
import { TasksRepo } from '../db/tasks.repo';
import { TaskDTO } from '../types';
import {
  buildEmail,
  buildTaskUrl,
  EmailNotifier,
  MailMessage,
  NotifiedStore,
} from './email';

function makeTask(overrides: Partial<TaskDTO>): TaskDTO {
  return {
    id: 1,
    slug: 'engine-oil-change',
    name: 'Engine oil change',
    description: null,
    tags: [],
    runtime_interval: null,
    time_interval: null,
    time_interval_unit: null,
    runtime_path: null,
    runtime_warning_hours: null,
    time_warning_days: null,
    last_maintenance: null,
    last_runtime: null,
    is_recurring: false,
    is_archived: false,
    equipment_id: null,
    equipment_name: null,
    equipment_slug: null,
    consumables: [],
    created_at: '',
    updated_at: '',
    current_runtime: null,
    elapsed_runtime: null,
    remaining_runtime: null,
    due_runtime_at: null,
    runtime_fraction: null,
    runtime_status: null,
    elapsed_time_ms: null,
    due_date: null,
    scheduled_due_date: null,
    scheduled_remaining_ms: null,
    scheduled_fraction: null,
    scheduled_status: null,
    due_date_remaining_ms: null,
    due_date_fraction: null,
    due_date_status: null,
    remaining_time_ms: null,
    time_fraction: null,
    time_status: null,
    status: 'ok',
    status_rank: 2,
    urgency: 0,
    ...overrides,
  };
}

const CONFIG: EmailOptions = {
  ...DEFAULT_EMAIL_OPTIONS,
  enabled: true,
  smtpHost: 'smtp.example.com',
  from: 'Boat <boat@example.com>',
  to: 'me@example.com, crew@example.com',
  baseUrl: 'https://boat.local:3443/',
};

/** In-memory NotifiedStore standing in for the DB-backed one. */
function memoryStore(): NotifiedStore & { data: Map<number, string> } {
  const data = new Map<number, string>();
  return {
    data,
    load: () => new Map(data),
    set: (id, status) => {
      if (status === null) data.delete(id);
      else data.set(id, status);
    },
  };
}

function makeNotifier(opts: Partial<EmailOptions> = {}, store = memoryStore()) {
  const app = { error: vi.fn() };
  const transport = { sendMail: vi.fn().mockResolvedValue(undefined) };
  const notifier = new EmailNotifier(
    app,
    { ...CONFIG, ...opts },
    store,
    transport,
  );
  return { app, transport, store, notifier };
}

function sent(transport: { sendMail: ReturnType<typeof vi.fn> }) {
  return transport.sendMail.mock.calls.map((c) => c[0] as MailMessage);
}

describe('EmailNotifier', () => {
  it('mails a task that becomes due soon, once', async () => {
    const { transport, notifier } = makeNotifier();
    const task = makeTask({ status: 'due_soon' });
    await notifier.publishAll([task]);
    await notifier.publishAll([task]);
    expect(transport.sendMail).toHaveBeenCalledTimes(1);
    expect(sent(transport)[0].to).toBe('me@example.com, crew@example.com');
  });

  it('mails again when due soon turns overdue', async () => {
    const { transport, notifier } = makeNotifier();
    await notifier.publishAll([makeTask({ status: 'due_soon' })]);
    await notifier.publishAll([makeTask({ status: 'overdue' })]);
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
    expect(sent(transport)[1].subject).toContain('overdue');
  });

  it('does not mail for ok / todo / pending / archived', async () => {
    const { transport, notifier } = makeNotifier();
    for (const status of ['ok', 'todo', 'pending', 'archived'] as const) {
      await notifier.publishAll([makeTask({ status })]);
    }
    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it('mails again after the task returns to ok and falls due again', async () => {
    const { transport, store, notifier } = makeNotifier();
    await notifier.publishAll([makeTask({ status: 'overdue' })]);
    await notifier.publishAll([makeTask({ status: 'ok' })]);
    expect(store.data.size).toBe(0);
    await notifier.publishAll([makeTask({ status: 'overdue' })]);
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
  });

  it('does not re-send after a restart (marker is persisted)', async () => {
    const store = memoryStore();
    const first = makeNotifier({}, store);
    await first.notifier.publishAll([makeTask({ status: 'overdue' })]);
    expect(first.transport.sendMail).toHaveBeenCalledTimes(1);

    const second = makeNotifier({}, store); // new instance, same store
    await second.notifier.publishAll([makeTask({ status: 'overdue' })]);
    expect(second.transport.sendMail).not.toHaveBeenCalled();
  });

  it('sends nothing when disabled or incompletely configured', async () => {
    for (const opts of [
      { enabled: false },
      { smtpHost: '' },
      { from: ' ' },
      { to: ' , ' },
    ]) {
      const { transport, notifier } = makeNotifier(opts);
      await notifier.publishAll([makeTask({ status: 'overdue' })]);
      expect(transport.sendMail).not.toHaveBeenCalled();
    }
  });

  it('logs a failed send and retries on the next recompute', async () => {
    const { app, transport, store, notifier } = makeNotifier();
    transport.sendMail.mockRejectedValueOnce(new Error('connection refused'));
    const task = makeTask({ status: 'overdue' });

    await notifier.publishAll([task]);
    expect(app.error).toHaveBeenCalledWith(
      expect.stringContaining('connection refused'),
    );
    expect(store.data.size).toBe(0);

    await notifier.publishAll([task]);
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
    expect(store.data.get(1)).toBe('overdue');
  });

  it('keeps going after one task fails', async () => {
    const { transport, notifier } = makeNotifier();
    transport.sendMail.mockRejectedValueOnce(new Error('boom'));
    await notifier.publishAll([
      makeTask({ id: 1, slug: 'a', status: 'overdue' }),
      makeTask({ id: 2, slug: 'b', status: 'overdue' }),
    ]);
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
  });
});

describe('TasksRepo notified-status marker', () => {
  it('round-trips through the database', () => {
    const db = new DatabaseSync(':memory:');
    migrate(db);
    const repo = new TasksRepo(db);
    const task = repo.create(
      {
        slug: 't',
        name: 'T',
        description: null,
        runtime_interval: null,
        time_interval: 6,
        time_interval_unit: 'months',
        runtime_path: null,
        due_date: null,
        runtime_warning_hours: null,
        time_warning_days: null,
        last_maintenance: null,
        last_runtime: null,
        seed_last_maintenance: null,
        seed_last_runtime: null,
        is_archived: 0,
        is_recurring: 1,
        equipment_id: null,
      },
      '2026-01-01T00:00:00.000Z',
    );
    expect(repo.notifiedStatuses().size).toBe(0);
    repo.setNotifiedStatus(task.id, 'overdue');
    expect(repo.notifiedStatuses().get(task.id)).toBe('overdue');
    repo.setNotifiedStatus(task.id, null);
    expect(repo.notifiedStatuses().size).toBe(0);
  });
});

describe('buildTaskUrl', () => {
  it('builds the hash-route link, tolerating trailing slashes', () => {
    const expected =
      'https://boat.local:3443/signalk-advanced-maintenance-tracker/#/tasks/engine-oil-change';
    expect(buildTaskUrl('https://boat.local:3443', 'engine-oil-change')).toBe(
      expected,
    );
    expect(
      buildTaskUrl(' https://boat.local:3443/// ', 'engine-oil-change'),
    ).toBe(expected);
  });

  it('returns null for a blank base URL', () => {
    expect(buildTaskUrl('  ', 'x')).toBeNull();
  });
});

describe('buildEmail', () => {
  const overdue = makeTask({
    status: 'overdue',
    description: 'Change oil & filter\nUse 15W-40',
    scheduled_due_date: '2026-09-10',
    scheduled_remaining_ms: -9 * 86_400_000,
    remaining_runtime: -3.24,
    due_runtime_at: 1200,
    equipment_name: 'Volvo D2-40',
    tags: ['engine', 'yearly'],
  });

  it('presents the task, description, due date and link', () => {
    const mail = buildEmail(overdue, CONFIG);
    expect(mail.subject).toBe('[Maintenance] Engine oil change — overdue');
    expect(mail.from).toBe('Boat <boat@example.com>');
    expect(mail.html).toContain('Engine oil change');
    expect(mail.html).toContain('Change oil &amp; filter<br>Use 15W-40');
    expect(mail.html).toContain('September 10, 2026');
    expect(mail.html).toContain('overdue by 9 days');
    expect(mail.html).toContain('overdue by 3.2 h');
    expect(mail.html).toContain('Volvo D2-40');
    expect(mail.html).toContain(
      'href="https://boat.local:3443/signalk-advanced-maintenance-tracker/#/tasks/engine-oil-change"',
    );
    expect(mail.text).toContain('Due date: September 10, 2026');
    expect(mail.text).toContain('#/tasks/engine-oil-change');
  });

  it('picks the more urgent of scheduled and one-time due dates', () => {
    const mail = buildEmail(
      makeTask({
        status: 'due_soon',
        scheduled_due_date: '2026-12-01',
        scheduled_remaining_ms: 60 * 86_400_000,
        due_date: '2026-09-25',
        due_date_remaining_ms: 5 * 86_400_000,
      }),
      CONFIG,
    );
    expect(mail.html).toContain('September 25, 2026');
    expect(mail.html).toContain('in 5 days');
    expect(mail.html).not.toContain('December');
  });

  it('escapes HTML in user-provided fields', () => {
    const mail = buildEmail(
      makeTask({
        status: 'overdue',
        name: '<script>alert(1)</script>',
        description: '<img src=x onerror=alert(1)>',
        tags: ['"><b>'],
      }),
      CONFIG,
    );
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('&quot;&gt;&lt;b&gt;');
  });

  it('omits the link when no base URL is configured', () => {
    const mail = buildEmail(overdue, { ...CONFIG, baseUrl: '' });
    expect(mail.html).not.toContain('<a href');
    expect(mail.text).not.toContain('#/tasks');
  });

  it('renders in French', () => {
    const mail = buildEmail(overdue, { ...CONFIG, language: 'fr' });
    expect(mail.subject).toBe(
      '[Maintenance] Engine oil change — échéance dépassée',
    );
    expect(mail.html).toContain('lang="fr"');
    expect(mail.html).toContain('10 septembre 2026');
    expect(mail.html).toContain('en retard de 9 jours');
    expect(mail.html).toContain('Ouvrir la tâche');
    expect(mail.html).toContain('Heures moteur');
  });

  it('keeps the subject on one line', () => {
    const mail = buildEmail(
      makeTask({ status: 'due_soon', name: 'Line one\r\nBcc: x@evil' }),
      CONFIG,
    );
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});

describe('withDefaults email merge', () => {
  it('fills a missing email section with defaults', () => {
    expect(withDefaults({}).email).toEqual(DEFAULT_EMAIL_OPTIONS);
  });

  it('keeps unspecified email fields at their defaults', () => {
    const opts = withDefaults({ email: { enabled: true, smtpHost: 'h' } });
    expect(opts.email.enabled).toBe(true);
    expect(opts.email.smtpHost).toBe('h');
    expect(opts.email.smtpPort).toBe(587);
    expect(opts.email.language).toBe('en');
  });
});
