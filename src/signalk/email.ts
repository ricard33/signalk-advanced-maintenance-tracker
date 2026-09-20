import * as nodemailer from 'nodemailer';
import { EmailLanguage, EmailOptions } from '../config';
import { TaskDTO } from '../types';

/** Statuses that trigger an e-mail — the same two the SignalK notifications
 * raise (§10.3). Every other status clears the "already notified" marker. */
type AlertStatus = 'due_soon' | 'overdue';

const DAY_MS = 86_400_000;

export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** The slice of a nodemailer transporter we use (also what tests fake). */
export interface MailTransport {
  sendMail(message: MailMessage): Promise<unknown>;
  close?(): void;
}

/** Persistence for "which status was this task last e-mailed about". */
export interface NotifiedStore {
  load(): Map<number, string>;
  set(taskId: number, status: string | null): void;
}

/**
 * Sends an HTML e-mail when a task becomes due soon or overdue — the e-mail
 * twin of NotificationManager (§10.3). One mail per status change: the last
 * status mailed is persisted per task, so neither repeated recomputes nor a
 * plugin restart re-send. A task returning to any other status (ok, archived,
 * …) clears the marker, so its next due date mails again.
 */
export class EmailNotifier {
  private transport: MailTransport | null;
  private notified: Map<number, string> | null = null;
  private inFlight = new Set<number>();

  constructor(
    private app: any,
    private opts: EmailOptions,
    private store: NotifiedStore,
    transport?: MailTransport,
  ) {
    this.transport = transport ?? null;
  }

  /** Enabled and complete enough to actually send. */
  isConfigured(): boolean {
    return (
      this.opts.enabled &&
      this.opts.smtpHost.trim() !== '' &&
      this.opts.from.trim() !== '' &&
      parseRecipients(this.opts.to).length > 0
    );
  }

  /**
   * Mail every task whose status just became due soon / overdue. Sequential,
   * so a burst of due tasks doesn't open a burst of SMTP connections. A failed
   * send is logged and left unmarked, so the next recompute retries it.
   */
  async publishAll(tasks: TaskDTO[]): Promise<void> {
    if (!this.isConfigured()) return;
    const notified = this.loadNotified();

    for (const task of tasks) {
      const target = alertStatus(task);
      const last = notified.get(task.id);
      if (!target) {
        if (last !== undefined) this.mark(task.id, null);
        continue;
      }
      if (target === last || this.inFlight.has(task.id)) continue;

      this.inFlight.add(task.id);
      try {
        await this.getTransport().sendMail(buildEmail(task, this.opts));
        this.mark(task.id, target);
      } catch (err) {
        this.app.error?.(
          `signalk-advanced-maintenance-tracker: e-mail for "${task.slug}" failed: ${err}`,
        );
      } finally {
        this.inFlight.delete(task.id);
      }
    }
  }

  close(): void {
    this.transport?.close?.();
    this.transport = null;
  }

  private loadNotified(): Map<number, string> {
    if (!this.notified) this.notified = this.store.load();
    return this.notified;
  }

  private mark(taskId: number, status: string | null): void {
    this.store.set(taskId, status);
    if (status === null) this.notified?.delete(taskId);
    else this.notified?.set(taskId, status);
  }

  private getTransport(): MailTransport {
    if (!this.transport) {
      const user = this.opts.smtpUser.trim();
      this.transport = nodemailer.createTransport({
        host: this.opts.smtpHost.trim(),
        port: this.opts.smtpPort,
        secure: this.opts.smtpSecure,
        auth: user ? { user, pass: this.opts.smtpPassword } : undefined,
      });
    }
    return this.transport;
  }
}

function alertStatus(task: TaskDTO): AlertStatus | null {
  return task.status === 'due_soon' || task.status === 'overdue'
    ? task.status
    : null;
}

function parseRecipients(to: string): string[] {
  return to
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Link to the task in the webapp (route `#/tasks/:slug`, spec §7.1). */
export function buildTaskUrl(baseUrl: string, slug: string): string | null {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base) return null;
  return `${base}/signalk-advanced-maintenance-tracker/#/tasks/${encodeURIComponent(slug)}`;
}

// ---- content ----

interface Strings {
  subject(name: string, status: AlertStatus): string;
  badge(status: AlertStatus): string;
  description: string;
  dueDate: string;
  runtime: string;
  equipment: string;
  tags: string;
  openTask: string;
  footer: string;
  dueToday: string;
  overdueToday: string;
  inDays(n: number): string;
  overdueByDays(n: number): string;
  inHours(h: number, at: number | null): string;
  overdueByHours(h: number, at: number | null): string;
  dueNow: string;
}

const STRINGS: Record<EmailLanguage, Strings> = {
  en: {
    subject: (name, s) =>
      `[Maintenance] ${name} — ${s === 'overdue' ? 'overdue' : 'due soon'}`,
    badge: (s) => (s === 'overdue' ? 'Overdue' : 'Due soon'),
    description: 'Description',
    dueDate: 'Due date',
    runtime: 'Engine hours',
    equipment: 'Equipment',
    tags: 'Tags',
    openTask: 'Open task',
    footer: 'Sent by Advanced Maintenance Tracker',
    dueToday: 'due today',
    overdueToday: 'overdue (less than a day)',
    inDays: (n) => (n === 1 ? 'in 1 day' : `in ${n} days`),
    overdueByDays: (n) =>
      n === 1 ? 'overdue by 1 day' : `overdue by ${n} days`,
    inHours: (h, at) => `in ${h} h${at != null ? ` (at ${at} h)` : ''}`,
    overdueByHours: (h, at) =>
      `overdue by ${h} h${at != null ? ` (was due at ${at} h)` : ''}`,
    dueNow: 'due now',
  },
  fr: {
    subject: (name, s) =>
      `[Maintenance] ${name} — ${s === 'overdue' ? 'échéance dépassée' : 'échéance proche'}`,
    badge: (s) => (s === 'overdue' ? 'Échue' : 'Échéance proche'),
    description: 'Description',
    dueDate: 'Échéance',
    runtime: 'Heures moteur',
    equipment: 'Équipement',
    tags: 'Étiquettes',
    openTask: 'Ouvrir la tâche',
    footer: 'Envoyé par Advanced Maintenance Tracker',
    dueToday: "aujourd'hui",
    overdueToday: "en retard (moins d'un jour)",
    inDays: (n) => (n === 1 ? 'dans 1 jour' : `dans ${n} jours`),
    overdueByDays: (n) =>
      n === 1 ? 'en retard de 1 jour' : `en retard de ${n} jours`,
    inHours: (h, at) => `dans ${h} h${at != null ? ` (à ${at} h)` : ''}`,
    overdueByHours: (h, at) =>
      `en retard de ${h} h${at != null ? ` (échéance à ${at} h)` : ''}`,
    dueNow: 'maintenant',
  },
};

const BADGE_COLOR: Record<AlertStatus, string> = {
  overdue: '#c62828',
  due_soon: '#ef6c00',
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function timeText(ms: number, t: Strings): string {
  const days = Math.round(Math.abs(ms) / DAY_MS);
  if (ms >= 0) return days === 0 ? t.dueToday : t.inDays(days);
  return days === 0 ? t.overdueToday : t.overdueByDays(days);
}

function runtimeText(remaining: number, dueAt: number | null, t: Strings) {
  const at = dueAt != null ? round1(dueAt) : null;
  if (remaining > 0) return t.inHours(round1(remaining), at);
  if (remaining === 0) return t.dueNow;
  return t.overdueByHours(round1(-remaining), at);
}

/** The more urgent of the recurring schedule and the one-time due date. */
function dueDateInfo(
  task: TaskDTO,
): { iso: string; remainingMs: number | null } | null {
  const candidates = [
    { iso: task.scheduled_due_date, remainingMs: task.scheduled_remaining_ms },
    { iso: task.due_date, remainingMs: task.due_date_remaining_ms },
  ].filter((c): c is { iso: string; remainingMs: number | null } => !!c.iso);
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) =>
    (b.remainingMs ?? Infinity) < (a.remainingMs ?? Infinity) ? b : a,
  );
}

function formatDate(iso: string, language: EmailLanguage): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // A bare YYYY-MM-DD is a calendar day, not an instant: format it in UTC so
  // it doesn't slip to the previous day west of Greenwich.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'long',
    ...(dateOnly ? { timeZone: 'UTC' } : {}),
  }).format(d);
}

/** Subject, HTML and plain-text bodies for a due-soon / overdue task. */
export function buildEmail(
  task: TaskDTO,
  opts: Pick<EmailOptions, 'from' | 'to' | 'baseUrl' | 'language'>,
): MailMessage {
  const status: AlertStatus =
    task.status === 'overdue' ? 'overdue' : 'due_soon';
  const t = STRINGS[opts.language] ?? STRINGS.en;
  const lang = STRINGS[opts.language] ? opts.language : 'en';

  // label/value rows shown in both bodies
  const rows: [string, string][] = [];
  const due = dueDateInfo(task);
  if (due) {
    const when = formatDate(due.iso, lang);
    rows.push([
      t.dueDate,
      due.remainingMs != null
        ? `${when} — ${timeText(due.remainingMs, t)}`
        : when,
    ]);
  }
  if (task.remaining_runtime != null) {
    rows.push([
      t.runtime,
      runtimeText(task.remaining_runtime, task.due_runtime_at, t),
    ]);
  }
  if (task.equipment_name) rows.push([t.equipment, task.equipment_name]);
  if (task.tags.length > 0) rows.push([t.tags, task.tags.join(', ')]);

  const url = buildTaskUrl(opts.baseUrl, task.slug);
  const subject = t.subject(task.name.replace(/\s+/g, ' ').trim(), status);
  const description = task.description?.trim() || null;

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;color:#222">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e0e0e0">
<tr><td style="padding:24px">
<span style="display:inline-block;padding:3px 10px;border-radius:12px;background:${BADGE_COLOR[status]};color:#ffffff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(t.badge(status))}</span>
<h1 style="margin:12px 0 16px;font-size:20px;color:#111">${escapeHtml(task.name)}</h1>
${
  description
    ? `<p style="margin:0 0 4px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(t.description)}</p>
<p style="margin:0 0 16px;color:#222;line-height:1.5">${escapeHtml(description).replace(/\r?\n/g, '<br>')}</p>`
    : ''
}
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${rowsHtml}</table>
${
  url
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 18px;background:#0b5cad;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">${escapeHtml(t.openTask)}</a></p>`
    : ''
}
</td></tr>
<tr><td style="padding:12px 24px;border-top:1px solid #eee;color:#999;font-size:12px">${escapeHtml(t.footer)}</td></tr>
</table>
</body>
</html>`;

  const text = [
    `${t.badge(status)}: ${task.name}`,
    ...(description ? ['', description] : []),
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(url ? ['', `${t.openTask}: ${url}`] : []),
  ].join('\n');

  return {
    from: opts.from.trim(),
    to: parseRecipients(opts.to).join(', '),
    subject,
    html,
    text,
  };
}
