import * as path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { Router } from 'express';
import { PartialPluginOptions, schema, uiSchema, withDefaults } from './config';
import { openDatabase } from './db/database';
import { MaintenanceService } from './service';
import { EmailNotifier } from './signalk/email';
import { NotificationManager } from './signalk/notifications';
import { PathPublisher } from './signalk/paths';
import { RuntimeManager } from './signalk/runtime';
import { mountApi, Services } from './api/router';
import { StowageClient } from './stowage/client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: PLUGIN_VERSION } = require('../package.json');

const PLUGIN_ID = 'signalk-advanced-maintenance-tracker';

export = function (app: any) {
  let db: DatabaseSync | null = null;
  let runtime: RuntimeManager | null = null;
  let notifier: NotificationManager | null = null;
  let emailNotifier: EmailNotifier | null = null;
  let publisher: PathPublisher | null = null;
  let service: MaintenanceService | null = null;
  let timer: NodeJS.Timeout | null = null;
  let services: Services | null = null;

  function recomputeNotifications(): void {
    if (!service) return;
    try {
      const computed = service.listAllComputed();
      notifier?.publishAll(computed);
      publisher?.publishAll(computed);
      // Async and fire-and-forget: a slow or failing SMTP server must not
      // hold up (or break) the SignalK notifications above.
      emailNotifier?.publishAll(computed).catch((err) => {
        app.error?.(`${PLUGIN_ID}: e-mail alerts failed: ${err}`);
      });
    } catch (err) {
      app.error?.(`${PLUGIN_ID}: notification recompute failed: ${err}`);
    }
  }

  function refresh(): void {
    if (!service || !runtime) return;
    runtime.setPaths(service.runtimePaths());
    recomputeNotifications();
  }

  const plugin = {
    id: PLUGIN_ID,
    name: 'Advanced Maintenance Tracker',
    description:
      'Track recurring boat maintenance tasks with runtime- and time-based intervals.',
    schema,
    uiSchema,

    start(options: PartialPluginOptions) {
      const opts = withDefaults(options);
      try {
        const dbPath = path.join(app.getDataDirPath(), 'maintenance.db');
        db = openDatabase(dbPath);
        runtime = new RuntimeManager(app, db);
        notifier = new NotificationManager(app, PLUGIN_ID, opts);
        publisher = new PathPublisher(app, PLUGIN_ID, opts);
        service = new MaintenanceService(db, {
          getRuntime: (p) => runtime!.getHours(p),
          config: {
            runtimeNotifyLeadHours: opts.runtimeNotifyLeadHours,
            timeNotifyLeadDays: opts.timeNotifyLeadDays,
          },
          onMutation: (event) => {
            if (event.clearedSlug) {
              notifier?.clear(event.clearedSlug);
              publisher?.clear(event.clearedSlug);
            }
            refresh();
          },
          stowageClient: opts.stowageMgmtUrl
            ? new StowageClient({ baseUrl: opts.stowageMgmtUrl })
            : undefined,
        });
        const tasksRepo = service.tasks;
        emailNotifier = new EmailNotifier(app, opts.email, {
          load: () => tasksRepo.notifiedStatuses(),
          set: (id, status) => tasksRepo.setNotifiedStatus(id, status),
        });
        runtime.onUpdate(() => recomputeNotifications());
        services = { service, runtime, version: PLUGIN_VERSION };

        refresh();
        timer = setInterval(recomputeNotifications, opts.recomputeIntervalMs);

        const taskCount = service.health().tasks;
        app.setPluginStatus?.(
          `Tracking ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`,
        );
        app.debug?.(`${PLUGIN_ID} started`);
      } catch (err) {
        app.setPluginError?.(`Failed to start: ${err}`);
        throw err;
      }
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      runtime?.stop();
      services = null;
      service = null;
      notifier = null;
      emailNotifier?.close();
      emailNotifier = null;
      publisher = null;
      runtime = null;
      try {
        db?.close();
      } catch {
        // already closed
      }
      db = null;
      app.debug?.(`${PLUGIN_ID} stopped`);
    },

    registerWithRouter(router: Router) {
      // May be called before start(); handlers respond 503 until started.
      mountApi(router, () => services);
    },
  };

  return plugin;
};
