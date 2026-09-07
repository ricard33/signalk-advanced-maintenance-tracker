/**
 * App shell (§7.2): header (title, nav, theme toggle), route switch, footer
 * (plugin links, auth control), toaster, and the globally-mounted login modal.
 */
import { html } from './lib/html.js';
import { route, matchPath } from './lib/router.js';
import { useHealth } from './api/hooks.js';
import { Toaster } from './components/Toaster.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { AuthControl } from './components/AuthControl.js';
import { LoginModal } from './components/LoginModal.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { TaskListPage } from './pages/TaskListPage.js';
import { TaskDetailPage } from './pages/TaskDetailPage.js';
import { MasterLogPage } from './pages/MasterLogPage.js';
import { EquipmentListPage } from './pages/EquipmentListPage.js';
import { EquipmentDetailPage } from './pages/EquipmentDetailPage.js';

export function App() {
  const current = route.value;
  const detailParams = matchPath('/tasks/:slug', current.path);
  const equipmentDetail = matchPath('/equipment/:slug', current.path);
  const onEquipment = current.path === '/equipment' || !!equipmentDetail;
  const onTasks = current.path === '/tasks' || !!detailParams;
  const health = useHealth();
  const version = health.data && health.data.version;

  let page;
  if (detailParams) {
    page = html`<${TaskDetailPage}
      slug=${detailParams.slug}
      key=${detailParams.slug}
    />`;
  } else if (equipmentDetail) {
    page = html`<${EquipmentDetailPage}
      slug=${equipmentDetail.slug}
      key=${equipmentDetail.slug}
    />`;
  } else if (current.path === '/equipment') {
    page = html`<${EquipmentListPage} />`;
  } else if (current.path === '/log') {
    page = html`<${MasterLogPage} />`;
  } else if (current.path === '/tasks') {
    page = html`<${TaskListPage} />`;
  } else {
    page = html`<${DashboardPage} />`;
  }

  return html`
    <div class="shell">
      <header class="shell-header">
        <a class="shell-title" href="#/">Maintenance Tracker</a>
        <nav class="shell-nav">
          <a
            class=${'nav-link' + (current.path === '/' ? ' active' : '')}
            href="#/"
            >Home</a
          >
          <a
            class=${'nav-link' + (onTasks ? ' active' : '')}
            href="#/tasks"
            >Tasks</a
          >
          <a
            class=${'nav-link' + (onEquipment ? ' active' : '')}
            href="#/equipment"
            >Equipment</a
          >
          <a
            class=${'nav-link' + (current.path === '/log' ? ' active' : '')}
            href="#/log"
            >Log</a
          >
        </nav>
        <${ThemeToggle} />
      </header>
      <main class="shell-main">${page}</main>
      <footer class="shell-footer">
        <div class="shell-footer-links">
          <a
            href="https://www.npmjs.com/package/signalk-maintenance-tracker"
            target="_blank"
            rel="noopener"
            >signalk-maintenance-tracker</a
          >
          ${version && html`<span class="dot-spacer">·</span><span>v${version}</span>`}
        </div>
        <div class="shell-footer-auth">
          <${AuthControl} />
        </div>
      </footer>
      <${Toaster} />
      <${LoginModal} />
    </div>
  `;
}
