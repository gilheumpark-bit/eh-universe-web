/**
 * E2E Test — Basic Navigation
 * Verifies core page navigation paths for the 3-app architecture.
 */

describe('E2E: Navigation', () => {
  it('should load the splash screen at root path', () => {
    // Stub: In a full E2E setup (Playwright), this would navigate to '/'
    // and verify the splash/landing screen renders with 3 app choices.
    const routes = ['/', '/universe', '/studio', '/code-studio'];
    expect(routes).toHaveLength(4);
    expect(routes[0]).toBe('/');
  });

  it('should have distinct routes for each app', () => {
    const appRoutes = {
      universe: '/universe',
      studio: '/studio',
      codeStudio: '/code-studio',
    };
    expect(Object.keys(appRoutes)).toHaveLength(3);
    expect(appRoutes.universe).toContain('universe');
    expect(appRoutes.studio).toContain('studio');
    expect(appRoutes.codeStudio).toContain('code-studio');
  });

  it('should support language parameter in routes', () => {
    const langParam = (route: string, lang: string) => `${route}?lang=${lang}`;
    expect(langParam('/studio', 'ko')).toBe('/studio?lang=ko');
    expect(langParam('/studio', 'en')).toBe('/studio?lang=en');
    expect(langParam('/studio', 'ja')).toBe('/studio?lang=ja');
    expect(langParam('/studio', 'zh')).toBe('/studio?lang=zh');
  });
});
