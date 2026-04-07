/**
 * Navigation Integration Tests
 * Verifies that all major page routes export valid modules.
 * Does NOT render React components — only checks module structure.
 */

// Page modules under src/app/ that should be importable
const PAGE_ROUTES: { route: string; modulePath: string }[] = [
  { route: '/', modulePath: '@/app/page' },
  { route: '/studio', modulePath: '@/app/studio/page' },
  { route: '/code-studio', modulePath: '@/app/code-studio/page' },
  { route: '/translation-studio', modulePath: '@/app/translation-studio/page' },
  { route: '/network', modulePath: '@/app/network/page' },
  { route: '/archive', modulePath: '@/app/archive/page' },
  { route: '/codex', modulePath: '@/app/codex/page' },
  { route: '/tools', modulePath: '@/app/tools/page' },
];

// Mock next/navigation since page modules use it
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// Mock next/dynamic to avoid async imports during testing
jest.mock('next/dynamic', () => {
  return () => {
    const DynamicComponent = () => null;
    DynamicComponent.displayName = 'DynamicMock';
    return DynamicComponent;
  };
});

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children }: { children: React.ReactNode }) => children;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock next/image
jest.mock('next/image', () => {
  const MockImage = () => null;
  MockImage.displayName = 'MockImage';
  return MockImage;
});

// Mock firebase/auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getSession: jest.fn(), onAuthStateChange: jest.fn() },
    from: () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }),
  }),
}));

describe('Page route modules', () => {
  test('all route module paths are defined', () => {
    expect(PAGE_ROUTES.length).toBeGreaterThanOrEqual(8);
  });

  test.each(PAGE_ROUTES)(
    '$route module is importable',
    async ({ modulePath }) => {
      // Dynamic import — if it throws, the module is broken
      const mod = await import(modulePath);
      expect(mod).toBeDefined();
    },
  );

  test('root page (/) has a default export', async () => {
    const mod = await import('@/app/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  test('studio page has a default export', async () => {
    const mod = await import('@/app/studio/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  test('code-studio page has a default export', async () => {
    const mod = await import('@/app/code-studio/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});
