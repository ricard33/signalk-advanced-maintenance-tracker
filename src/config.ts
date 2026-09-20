/** SignalK alarm states, most to least severe (plus "none" = no notification). */
export type AlarmState =
  'none' | 'normal' | 'alert' | 'warn' | 'alarm' | 'emergency';

const ALARM_STATES: AlarmState[] = [
  'none',
  'normal',
  'alert',
  'warn',
  'alarm',
  'emergency',
];

export type EmailLanguage = 'en' | 'fr';

/** E-mail alerts for due-soon / overdue tasks (§10.3). */
export interface EmailOptions {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  /** true = implicit TLS (usually port 465); false = plain / STARTTLS. */
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  from: string;
  /** Recipients, comma- or semicolon-separated. */
  to: string;
  /** Origin of the SignalK server, e.g. https://boat.local:3443. Used to
   * build the link to the task; blank omits the link. */
  baseUrl: string;
  language: EmailLanguage;
}

export interface PluginOptions {
  enablePublishPaths: boolean;
  enableNotifications: boolean;
  alarmStateOk: AlarmState;
  alarmStateDueSoon: AlarmState;
  alarmStateOverdue: AlarmState;
  runtimeNotifyLeadHours: number;
  timeNotifyLeadDays: number;
  recomputeIntervalMs: number;
  /** Base URL for signalk-stowage-mgmt's API, e.g.
   * http://localhost:3000/plugins/signalk-stowage-mgmt. Empty string
   * disables the inventory integration entirely (default) — this is an
   * explicit opt-in, not autodetected (docs/inventory-interaction.md). */
  stowageMgmtUrl: string;
  email: EmailOptions;
}

export const DEFAULT_EMAIL_OPTIONS: EmailOptions = {
  enabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  from: '',
  to: '',
  baseUrl: '',
  language: 'en',
};

export const DEFAULT_OPTIONS: PluginOptions = {
  enablePublishPaths: true,
  enableNotifications: true,
  alarmStateOk: 'none',
  alarmStateDueSoon: 'warn',
  alarmStateOverdue: 'alarm',
  runtimeNotifyLeadHours: 10,
  timeNotifyLeadDays: 7,
  recomputeIntervalMs: 60000,
  stowageMgmtUrl: '',
  email: DEFAULT_EMAIL_OPTIONS,
};

export type PartialPluginOptions = Partial<Omit<PluginOptions, 'email'>> & {
  email?: Partial<EmailOptions>;
};

export function withDefaults(options?: PartialPluginOptions): PluginOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...(options ?? {}),
    // `email` is nested, so it needs its own merge — a saved config that
    // predates the section (or sets only some fields) keeps the defaults.
    email: { ...DEFAULT_EMAIL_OPTIONS, ...(options?.email ?? {}) },
  };
}

const alarmStateProperty = (title: string, defaultValue: AlarmState) => ({
  type: 'string',
  title,
  enum: [...ALARM_STATES],
  default: defaultValue,
});

export const schema = {
  type: 'object',
  properties: {
    enablePublishPaths: {
      type: 'boolean',
      title: 'Publish task data to SignalK paths',
      description:
        'Publish each task to maintenance.{slug}.data and its status to maintenance.{slug}.status',
      default: DEFAULT_OPTIONS.enablePublishPaths,
    },
    enableNotifications: {
      type: 'boolean',
      title: 'Enable notifications',
      description:
        'Publish overdue/upcoming status to notifications.maintenance.*',
      default: DEFAULT_OPTIONS.enableNotifications,
    },
    alarmStateOk: alarmStateProperty(
      'Alarm state for up-to-date tasks',
      DEFAULT_OPTIONS.alarmStateOk,
    ),
    alarmStateDueSoon: alarmStateProperty(
      'Alarm state for due-soon tasks',
      DEFAULT_OPTIONS.alarmStateDueSoon,
    ),
    alarmStateOverdue: alarmStateProperty(
      'Alarm state for overdue tasks',
      DEFAULT_OPTIONS.alarmStateOverdue,
    ),
    runtimeNotifyLeadHours: {
      type: 'number',
      title: 'Runtime lead window (hours)',
      minimum: 0,
      description:
        'Tasks within this many runtime hours of due are "due soon". 0 disables the warning — tasks go straight from OK to overdue. Individual tasks can override this.',
      default: DEFAULT_OPTIONS.runtimeNotifyLeadHours,
    },
    timeNotifyLeadDays: {
      type: 'number',
      title: 'Time lead window (days)',
      minimum: 0,
      description:
        'Tasks within this many days of due are "due soon". 0 disables the warning — tasks go straight from OK to overdue. Individual tasks can override this.',
      default: DEFAULT_OPTIONS.timeNotifyLeadDays,
    },
    recomputeIntervalMs: {
      type: 'number',
      title: 'Recompute interval (ms)',
      description:
        'How often to re-evaluate task status and refresh notifications',
      default: DEFAULT_OPTIONS.recomputeIntervalMs,
    },
    stowageMgmtUrl: {
      type: 'string',
      title: 'signalk-stowage-mgmt API URL',
      description:
        "Base URL for signalk-stowage-mgmt's API (e.g. http://localhost:3000/plugins/signalk-stowage-mgmt). Leave blank to disable linking tasks to inventory items.",
      default: DEFAULT_OPTIONS.stowageMgmtUrl,
    },
    email: {
      type: 'object',
      title: 'E-mail alerts',
      description:
        'Send an HTML e-mail when a task becomes due soon and again when it becomes overdue (once per change, like the SignalK notifications).',
      properties: {
        enabled: {
          type: 'boolean',
          title: 'Send e-mail alerts',
          default: DEFAULT_EMAIL_OPTIONS.enabled,
        },
        smtpHost: {
          type: 'string',
          title: 'SMTP host',
          default: DEFAULT_EMAIL_OPTIONS.smtpHost,
        },
        smtpPort: {
          type: 'number',
          title: 'SMTP port',
          minimum: 1,
          maximum: 65535,
          description: 'Usually 587 (STARTTLS) or 465 (implicit TLS).',
          default: DEFAULT_EMAIL_OPTIONS.smtpPort,
        },
        smtpSecure: {
          type: 'boolean',
          title: 'Use implicit TLS',
          description:
            'Enable for port 465. Leave off for port 587 (STARTTLS is negotiated automatically).',
          default: DEFAULT_EMAIL_OPTIONS.smtpSecure,
        },
        smtpUser: {
          type: 'string',
          title: 'SMTP user',
          description: 'Leave blank if the server needs no authentication.',
          default: DEFAULT_EMAIL_OPTIONS.smtpUser,
        },
        smtpPassword: {
          type: 'string',
          title: 'SMTP password',
          default: DEFAULT_EMAIL_OPTIONS.smtpPassword,
        },
        from: {
          type: 'string',
          title: 'Sender address',
          description: 'e.g. Boat maintenance <maintenance@example.com>',
          default: DEFAULT_EMAIL_OPTIONS.from,
        },
        to: {
          type: 'string',
          title: 'Recipient(s)',
          description: 'One or more addresses, separated by commas.',
          default: DEFAULT_EMAIL_OPTIONS.to,
        },
        baseUrl: {
          type: 'string',
          title: 'SignalK server base URL',
          description:
            'Used to build the link to the task in the e-mail, e.g. https://boat.local:3443. Leave blank to omit the link.',
          default: DEFAULT_EMAIL_OPTIONS.baseUrl,
        },
        language: {
          type: 'string',
          title: 'E-mail language',
          enum: ['en', 'fr'],
          default: DEFAULT_EMAIL_OPTIONS.language,
        },
      },
    },
  },
};

/** react-jsonschema-form hints (SignalK admin UI): mask the SMTP password. */
export const uiSchema = {
  email: {
    smtpPassword: { 'ui:widget': 'password' },
  },
};
