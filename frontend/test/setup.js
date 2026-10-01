import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/preact';

// jsdom has no layout, so scrollIntoView (used by FormError) is missing.
Element.prototype.scrollIntoView = () => {};
import { resetResources } from '../../public/app/api/resource.js';
import { authState, loginModalOpen } from '../../public/app/auth/auth.js';
import { toasts } from '../../public/app/lib/toasts.js';
import { route, parseHash } from '../../public/app/lib/router.js';
import { lang } from '../../public/app/lib/i18n.js';

afterEach(() => {
  cleanup();
  resetResources();
  authState.value = { checked: false, isLoggedIn: false, username: null };
  loginModalOpen.value = false;
  toasts.value = [];
  lang.value = 'en';
  location.hash = '';
  route.value = parseHash('');
});
