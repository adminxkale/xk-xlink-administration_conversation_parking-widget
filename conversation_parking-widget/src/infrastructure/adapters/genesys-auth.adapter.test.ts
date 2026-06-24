/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateToken, loginWithPKCE, clearToken } from './genesys-auth.adapter';

describe('genesys-auth.adapter', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  describe('validateToken', () => {
    it('returns user data on successful validation', async () => {
      const mockResponse = {
        name: 'Agent Smith',
        id: 'user-001',
        groups: [{ id: 'group-a' }, { id: 'group-b' }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await validateToken('valid-token', 'mypurecloud.com');

      expect(result).toEqual({
        name: 'Agent Smith',
        id: 'user-001',
        groupIds: ['group-a', 'group-b'],
      });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.mypurecloud.com/api/v2/users/me?expand=groups',
        {
          headers: {
            Authorization: 'Bearer valid-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('throws on failed validation (401)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(validateToken('bad-token', 'mypurecloud.com')).rejects.toThrow(
        'Token validation failed with status 401'
      );
    });

    it('returns empty groupIds when user has no groups', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'Solo Agent', id: 'user-002' }),
      });

      const result = await validateToken('valid-token', 'mypurecloud.com');

      expect(result.groupIds).toEqual([]);
    });
  });

  describe('loginWithPKCE', () => {
    it('redirects to Genesys OAuth with PKCE params when no token or code exists', async () => {
      const mockLocation = {
        ...originalLocation,
        origin: 'https://myapp.com',
        pathname: '/widget',
        search: '',
        href: '',
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      // loginWithPKCE never resolves in this case (redirects), so we race with a timeout
      const result = await Promise.race([
        loginWithPKCE('test-client-id', 'mypurecloud.com'),
        new Promise<'redirected'>((resolve) => setTimeout(() => resolve('redirected'), 50)),
      ]);

      expect(result).toBe('redirected');
      expect(mockLocation.href).toContain('https://login.mypurecloud.com/oauth/authorize');
      expect(mockLocation.href).toContain('response_type=code');
      expect(mockLocation.href).toContain('client_id=test-client-id');
      expect(mockLocation.href).toContain('code_challenge_method=S256');
      expect(mockLocation.href).toContain('code_challenge=');
      expect(mockLocation.href).toContain(
        'redirect_uri=' + encodeURIComponent('https://myapp.com/widget')
      );
      expect(sessionStorage.getItem('pkce_code_verifier')).not.toBeNull();
    });

    it('stores environment in localStorage', async () => {
      const mockLocation = {
        ...originalLocation,
        origin: 'https://myapp.com',
        pathname: '/widget',
        search: '',
        href: '',
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      await Promise.race([
        loginWithPKCE('client-id', 'mypurecloud.com.au'),
        new Promise<void>((resolve) => setTimeout(resolve, 50)),
      ]);

      expect(localStorage.getItem('genesys_environment')).toBe('mypurecloud.com.au');
    });

    it('validates stored token and returns user info when token exists', async () => {
      localStorage.setItem('genesys_token', 'stored-token-abc');

      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, origin: 'https://myapp.com', pathname: '/widget', search: '' },
        writable: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'Agent X', id: 'agent-1', groups: [{ id: 'g1' }] }),
      });

      const result = await loginWithPKCE('client-id', 'mypurecloud.com');

      expect(result).toEqual({
        name: 'Agent X',
        id: 'agent-1',
        groupIds: ['g1'],
        token: 'stored-token-abc',
      });
    });

    it('clears invalid stored token and redirects to login', async () => {
      localStorage.setItem('genesys_token', 'expired-token');

      const mockLocation = {
        ...originalLocation,
        origin: 'https://myapp.com',
        pathname: '/widget',
        search: '',
        href: '',
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await Promise.race([
        loginWithPKCE('client-id', 'mypurecloud.com'),
        new Promise<void>((resolve) => setTimeout(resolve, 50)),
      ]);

      expect(localStorage.getItem('genesys_token')).toBeNull();
      expect(mockLocation.href).toContain('response_type=code');
    });

    it('exchanges code for token when URL has ?code= parameter', async () => {
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier-123');

      Object.defineProperty(window, 'location', {
        value: {
          ...originalLocation,
          origin: 'https://myapp.com',
          pathname: '/widget',
          search: '?code=auth-code-xyz',
          href: 'https://myapp.com/widget?code=auth-code-xyz',
        },
        writable: true,
      });

      const mockHistory = { replaceState: vi.fn() };
      Object.defineProperty(window, 'history', { value: mockHistory, writable: true });

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'new-pkce-token' }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'Agent Y', id: 'agent-2', groups: [{ id: 'g2' }] }),
        });

      const result = await loginWithPKCE('client-id', 'mypurecloud.com');

      expect(result).toEqual({
        name: 'Agent Y',
        id: 'agent-2',
        groupIds: ['g2'],
        token: 'new-pkce-token',
      });
      expect(localStorage.getItem('genesys_token')).toBe('new-pkce-token');
      expect(sessionStorage.getItem('pkce_code_verifier')).toBeNull();

      // Verify token exchange was called correctly
      expect(fetch).toHaveBeenCalledWith(
        'https://login.mypurecloud.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    it('throws when code is present but code_verifier is missing', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...originalLocation,
          origin: 'https://myapp.com',
          pathname: '/widget',
          search: '?code=some-code',
        },
        writable: true,
      });

      await expect(loginWithPKCE('client-id', 'mypurecloud.com')).rejects.toThrow(
        'No se encontró el code_verifier.'
      );
    });

    it('skips code exchange when token already exists in localStorage (Strict Mode re-run)', async () => {
      // Simulates the second useEffect run: token was already saved by first run
      localStorage.setItem('genesys_token', 'already-exchanged-token');

      Object.defineProperty(window, 'location', {
        value: {
          ...originalLocation,
          origin: 'https://myapp.com',
          pathname: '/widget',
          search: '?code=stale-code',
        },
        writable: true,
      });

      const mockHistory = { replaceState: vi.fn() };
      Object.defineProperty(window, 'history', { value: mockHistory, writable: true });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'Agent Z', id: 'agent-3', groups: [] }),
      });

      const result = await loginWithPKCE('client-id', 'mypurecloud.com');

      expect(result).toEqual({
        name: 'Agent Z',
        id: 'agent-3',
        groupIds: [],
        token: 'already-exchanged-token',
      });
      // Should have cleaned the ?code= from URL
      expect(mockHistory.replaceState).toHaveBeenCalled();
      // Should have validated token, NOT exchanged code (only 1 fetch for validation)
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.mypurecloud.com/api/v2/users/me?expand=groups',
        expect.any(Object)
      );
    });
  });

  describe('clearToken', () => {
    it('removes token from localStorage', () => {
      localStorage.setItem('genesys_token', 'some-token');

      clearToken();

      expect(localStorage.getItem('genesys_token')).toBeNull();
    });
  });
});
