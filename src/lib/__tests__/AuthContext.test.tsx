import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

const mockAuth = { currentUser: null };
const mockSignInWithPopup = jest.fn();
const mockSignInWithRedirect = jest.fn();
const mockReauthenticateWithPopup = jest.fn();
const mockGetRedirectResult = jest.fn();
const mockOnAuthStateChanged = jest.fn();

class MockGoogleAuthProvider {
  static credentialFromResult = jest.fn(() => ({ accessToken: 'token-123' }));

  customParameters: Record<string, string> | null = null;
  scopes: string[] = [];

  setCustomParameters(params: Record<string, string>) {
    this.customParameters = params;
  }

  addScope(scope: string) {
    this.scopes.push(scope);
  }
}

jest.mock('@/lib/firebase', () => ({
  app: {},
  lazyFirebaseAuth: jest.fn(() => Promise.resolve(mockAuth)),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: MockGoogleAuthProvider,
  getRedirectResult: mockGetRedirectResult,
  onAuthStateChanged: mockOnAuthStateChanged,
  reauthenticateWithPopup: mockReauthenticateWithPopup,
  signInWithPopup: mockSignInWithPopup,
  signInWithRedirect: mockSignInWithRedirect,
  signOut: jest.fn(),
}));

function renderAuthProbe() {
  let mountedAuthContext: ReturnType<typeof useAuth> | null = null;
  const container = document.createElement('div');
  document.body.appendChild(container);

  function Probe() {
    const authContext = useAuth();
    React.useEffect(() => {
      mountedAuthContext = authContext;
    }, [authContext]);
    return null;
  }

  const root = ReactDOM.createRoot(container);
  act(() => {
    root.render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });

  return {
    getAuthContext: () => {
      if (!mountedAuthContext) throw new Error('Auth context not mounted');
      return mountedAuthContext;
    },
    cleanup: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

describe('AuthContext Google login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    mockGetRedirectResult.mockResolvedValue(null);
    mockSignInWithPopup.mockResolvedValue({});
    mockSignInWithRedirect.mockResolvedValue(undefined);
    mockReauthenticateWithPopup.mockResolvedValue({});
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return jest.fn();
    });
  });

  it('uses popup login without Drive consent scope for primary Google login', async () => {
    const { getAuthContext, cleanup } = renderAuthProbe();
    const toastListener = jest.fn();
    window.addEventListener('noa:toast', toastListener);

    await act(async () => {
      await Promise.resolve();
      await getAuthContext().signInWithGoogle();
    });

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    expect(mockSignInWithRedirect).not.toHaveBeenCalled();
    const provider = mockSignInWithPopup.mock.calls[0][1] as MockGoogleAuthProvider;
    expect(provider.customParameters).toEqual({ prompt: 'select_account' });
    expect(provider.scopes).toEqual([]);
    expect(toastListener).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ message: 'Google 로그인 창을 여는 중입니다.', variant: 'info' }),
    }));
    expect(JSON.parse(window.sessionStorage.getItem('noa_google_login_last_stage') ?? '{}')).toMatchObject({
      stage: 'popup-result-ok',
    });

    window.removeEventListener('noa:toast', toastListener);
    cleanup();
  });

  it('falls back to redirect when the browser blocks the popup', async () => {
    mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    const { getAuthContext, cleanup } = renderAuthProbe();

    await act(async () => {
      await Promise.resolve();
      await getAuthContext().signInWithGoogle();
    });

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    expect(mockSignInWithRedirect).toHaveBeenCalledTimes(1);
    const provider = mockSignInWithRedirect.mock.calls[0][1] as MockGoogleAuthProvider;
    expect(provider.customParameters).toEqual({ prompt: 'select_account' });
    expect(provider.scopes).toEqual([]);
    expect(JSON.parse(window.sessionStorage.getItem('noa_google_login_last_stage') ?? '{}')).toMatchObject({
      stage: 'redirect-start',
    });

    cleanup();
  });

  it('keeps Drive permission request isolated to Drive token refresh', async () => {
    const { getAuthContext, cleanup } = renderAuthProbe();

    await act(async () => {
      await Promise.resolve();
      await getAuthContext().refreshAccessToken();
    });

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    const provider = mockSignInWithPopup.mock.calls[0][1] as MockGoogleAuthProvider;
    expect(provider.scopes).toEqual(['https://www.googleapis.com/auth/drive.file']);
    expect(provider.customParameters).toBeNull();

    cleanup();
  });
});
